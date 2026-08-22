import { randomBytes } from "node:crypto";
import { getSql } from "./db.js";
import { HttpError } from "./http.js";
import { encryptPrivateText } from "./privateData.js";
import { receiptHash, requestHash } from "./identity.js";

const first = (rows, message = "We cannot find the selected record.") => {
  if (!rows[0]) throw new HttpError(404, "not_found", message);
  return rows[0];
};

export const readPublicState = async () => {
  const sql = getSql();
  const [courseRows, lecturerRows, assignmentRows, reviewRows] = await sql.transaction((tx) => [
    tx`
      select c.id::text, c.code::text, c.name::text, u.name::text as university,
             coalesce(f.name::text, 'Uncategorised') as faculty, 'Undergraduate' as level
      from courses c
      join universities u on u.id = c.university_id
      left join faculties f on f.id = c.faculty_id
      where c.state = 'active'
      order by c.created_at desc, c.id desc
    `,
    tx`
      select l.id::text, l.name::text, u.name::text as university
      from lecturers l
      join universities u on u.id = l.university_id
      where l.state = 'active'
      order by l.created_at desc, l.id desc
    `,
    tx`
      select cl.course_id::text as "courseId", cl.lecturer_id::text as "lecturerId"
      from course_lecturers cl
      join courses c on c.id = cl.course_id and c.state = 'active'
      join lecturers l on l.id = cl.lecturer_id and l.state = 'active'
    `,
    tx`
      select id::text, course_id::text as "courseId", lecturer_id::text as "lecturerId",
             semester, academic_year::text as year, course_rating as "courseRating",
             lecturer_rating as "lecturerRating", workload, body,
             'published' as status, published_at as "createdAt"
      from public_reviews
      order by published_at asc, id asc
      limit 500
    `,
  ], { isolationLevel: "RepeatableRead", readOnly: true });

  return { courses: courseRows, lecturers: lecturerRows, assignments: assignmentRows, reviews: reviewRows };
};

export const createReview = async (request, input) => {
  const sql = getSql();
  const identity = requestHash(request, "review");
  const receipt = randomBytes(24).toString("base64url");
  const hashedReceipt = receiptHash(receipt);
  const rows = await sql`
    with selected_university as (
      insert into universities (name) values (${input.course.university})
      on conflict (name) do update set name = excluded.name
      returning id
    ), selected_faculty as (
      insert into faculties (university_id, name)
      select id, ${input.course.faculty} from selected_university
      on conflict (university_id, name) do update set name = excluded.name
      returning id, university_id
    ), selected_course as (
      insert into courses (university_id, faculty_id, code, name, created_by_hash)
      select university_id, id, ${input.course.code}, ${input.course.name}, ${identity}
      from selected_faculty
      on conflict (university_id, code) do update set code = excluded.code
      returning id, university_id
    ), selected_lecturer as (
      insert into lecturers (university_id, name, created_by_hash)
      select university_id, ${input.lecturer.name}, ${identity} from selected_course
      on conflict (university_id, name) do update set name = excluded.name
      returning id
    ), linked as (
      insert into course_lecturers (course_id, lecturer_id, first_seen_year, last_seen_year)
      select selected_course.id, selected_lecturer.id, ${input.year}, ${input.year}
      from selected_course, selected_lecturer
      on conflict (course_id, lecturer_id) do update
        set first_seen_year = least(course_lecturers.first_seen_year, excluded.first_seen_year),
            last_seen_year = greatest(course_lecturers.last_seen_year, excluded.last_seen_year)
      returning course_id, lecturer_id
    ), inserted_review as (
      insert into reviews (
        submission_key_hash, receipt_hash, course_id, lecturer_id, semester, academic_year,
        course_rating, lecturer_rating, workload, submitted_course_name,
        submitted_faculty_name, body, moderation
      )
      select ${identity}, ${hashedReceipt}, course_id, lecturer_id, ${input.semester}, ${input.year},
             ${input.courseRating}, ${input.lecturerRating}, ${input.workload}, ${input.course.name},
             ${input.course.faculty}, ${input.body}, 'pending'
      from linked
      returning id, moderation, created_at
    ), queued as (
      insert into moderation_jobs (kind, target_id)
      select 'review', id from inserted_review
      returning id
    )
    select id::text, moderation::text as status, created_at as "createdAt"
    from inserted_review
  `;
  return { review: first(rows), receipt };
};

export const createReport = async (request, input) => {
  const sql = getSql();
  const identity = requestHash(request, "report");
  const urgent = ["Threat or immediate safety", "Personal information or doxxing"].includes(input.reason);
  const rows = await sql`
    with inserted_report as (
      insert into review_reports (
        review_id, reporter_key_hash, reason, details, urgent, previous_review_state
      )
      select id, ${identity}, ${input.reason}, ${input.details}, ${urgent}, moderation
      from reviews where id = ${input.reviewId} and moderation = 'published'
      returning id, review_id, state, urgent, created_at
    ), temporarily_held as (
      update reviews r set moderation = 'held'
      from inserted_report report
      where r.id = report.review_id and report.urgent
      returning r.id
    ), queued as (
      insert into moderation_jobs (kind, target_id, priority)
      select 'report', id, case when urgent then 100 else 20 end from inserted_report
      returning id
    )
    select id::text, review_id::text as "reviewId", state::text as status,
           urgent, created_at as "createdAt"
    from inserted_report
  `;
  return first(rows, "That review is no longer available for reports.");
};

export const createAppeal = async (request, input) => {
  const sql = getSql();
  const identity = requestHash(request, "appeal");
  const contact = encryptPrivateText(input.contact);
  const submittedReceiptHash = input.receipt ? receiptHash(input.receipt) : null;
  const rows = await sql`
    with inserted_appeal as (
      insert into review_appeals (review_id, report_id, appeal_key_hash, details, contact_ciphertext)
      select r.id, ${input.reportId ?? null}, ${identity}, ${input.details}, ${contact}
      from reviews r
      where r.moderation in ('published', 'held', 'rejected', 'removed') and (
        (${input.reportId ?? null}::uuid is not null
          and r.id = ${input.reviewId ?? null}
          and exists (
            select 1 from review_reports rr
            where rr.id = ${input.reportId ?? null} and rr.review_id = r.id
          ))
        or (${submittedReceiptHash}::text is not null and r.receipt_hash = ${submittedReceiptHash})
      )
      returning id, review_id, report_id, state, created_at
    ), queued as (
      insert into moderation_jobs (kind, target_id, priority)
      select 'appeal', id, 30 from inserted_appeal
      returning id
    )
    select id::text, review_id::text as "reviewId", report_id::text as "reportId",
           state::text as status, created_at as "createdAt"
    from inserted_appeal
  `;
  return first(rows, "That review or report is no longer available for appeal.");
};

export const createReply = async (request, input) => {
  const sql = getSql();
  const email = encryptPrivateText(input.email);
  const rows = await sql`
    with inserted_reply as (
      insert into lecturer_replies (review_id, lecturer_id, verification_email_ciphertext, body)
      select r.id, r.lecturer_id, ${email}, ${input.body}
      from reviews r
      where r.id = ${input.reviewId} and r.moderation = 'published'
      returning id, review_id, lecturer_id, moderation, created_at
    ), queued as (
      insert into moderation_jobs (kind, target_id, priority)
      select 'reply', id, 20 from inserted_reply
      returning id
    )
    select id::text, review_id::text as "reviewId", lecturer_id::text as "lecturerId",
           moderation::text as status, created_at as "createdAt"
    from inserted_reply
  `;
  return first(rows, "That review is no longer available for a reply.");
};

export const loadModerationTarget = async (kind, targetId) => {
  const sql = getSql();
  if (kind === "review") {
    return first(await sql`
      select r.id::text,
        concat_ws(E'\n',
          'Course: ' || c.code::text || ': ' || r.submitted_course_name::text,
          'University: ' || u.name::text,
          'Faculty: ' || r.submitted_faculty_name::text,
          'Lecturer: ' || l.name::text,
          'Review: ' || r.body
        ) as text,
        null::jsonb as report
      from reviews r
      join courses c on c.id = r.course_id
      join universities u on u.id = c.university_id
      join lecturers l on l.id = r.lecturer_id
      where r.id = ${targetId}
    `);
  }
  if (kind === "report") {
    return first(await sql`
      select rr.id::text, r.body as text,
             jsonb_build_object('reason', rr.reason, 'details', rr.details) as report
      from review_reports rr join reviews r on r.id = rr.review_id where rr.id = ${targetId}
    `);
  }
  if (kind === "appeal") {
    return first(await sql`
      select a.id::text, r.body as text,
             jsonb_build_object('reason', 'Appeal', 'details', a.details) as report
      from review_appeals a join reviews r on r.id = a.review_id where a.id = ${targetId}
    `);
  }
  if (kind === "reply") {
    return first(await sql`select id::text, body as text, null::jsonb as report from lecturer_replies where id = ${targetId}`);
  }
  throw new HttpError(400, "invalid_job", "The moderation job type is invalid.");
};

const decisionValues = (result) => ({
  action: result.decision.action,
  status: result.decision.status,
  reasons: result.decision.reasonCodes,
  model: result.model,
  version: result.decision.version,
  agents: JSON.stringify(result.agents),
});

export const saveAutomatedDecision = async (kind, targetId, result) => {
  const sql = getSql();
  const value = decisionValues(result);

  if (kind === "review") {
    await sql`
      with previous as (
        select moderation from reviews where id = ${targetId}
      ), changed as (
        update reviews set
          moderation = ${value.status}::moderation_state,
          published_at = case when ${value.status} = 'published' then coalesce(published_at, now()) else published_at end,
          removed_at = case when ${value.status} = 'removed' then now() else removed_at end
        where id = ${targetId}
        returning moderation, course_id, lecturer_id, submitted_course_name, submitted_faculty_name
      ), activated_course as (
        update courses c set
          name = changed.submitted_course_name,
          faculty_id = (
            select f.id from faculties f
            where f.university_id = c.university_id and f.name = changed.submitted_faculty_name
          ),
          state = 'active'
        from changed
        where c.id = changed.course_id and c.state = 'pending'
          and changed.moderation = 'published'
      ), activated_lecturer as (
        update lecturers l set state = 'active'
        from changed
        where l.id = changed.lecturer_id and l.state = 'pending'
          and changed.moderation = 'published'
      )
      insert into moderation_decisions (
        kind, review_id, action, previous_state, new_state, reason_codes,
        model, core_version, agent_findings, automated
      )
      select 'review', ${targetId}, ${value.action}, previous.moderation, changed.moderation,
             ${value.reasons}, ${value.model}, ${value.version}, ${value.agents}::jsonb, true
      from previous, changed
    `;
    return;
  }

  if (kind === "report") {
    await sql`
      with target as (
        select review_id from review_reports where id = ${targetId}
      ), previous as (
        select r.id, r.moderation from reviews r join target on target.review_id = r.id
      ), changed as (
        update reviews r set moderation = case
          when ${value.action} in ('hide', 'hold') then 'held'::moderation_state
          when ${value.action} = 'remove' then 'removed'::moderation_state
          else r.moderation end,
          removed_at = case when ${value.action} = 'remove' then now() else r.removed_at end
        from target where r.id = target.review_id returning r.moderation
      ), case_update as (
        update review_reports set
          state = case when ${value.action} = 'no_action' and not urgent then 'resolved'::case_state else state end,
          resolved_at = case when ${value.action} = 'no_action' and not urgent then now() else resolved_at end
        where id = ${targetId}
      )
      insert into moderation_decisions (
        kind, report_id, action, previous_state, new_state, reason_codes,
        model, core_version, agent_findings, automated
      )
      select 'report', ${targetId}, ${value.action}, previous.moderation, changed.moderation,
             ${value.reasons}, ${value.model}, ${value.version}, ${value.agents}::jsonb, true
      from previous, changed
    `;
    return;
  }

  if (kind === "appeal") {
    await sql`
      insert into moderation_decisions (
        kind, appeal_id, action, reason_codes, model, core_version, agent_findings, automated
      ) values (
        'appeal', ${targetId}, ${value.action}, ${value.reasons}, ${value.model},
        ${value.version}, ${value.agents}::jsonb, true
      )
    `;
    return;
  }

  await sql`
    insert into moderation_decisions (
      kind, reply_id, action, reason_codes, model, core_version, agent_findings, automated
    ) values (
      'reply', ${targetId}, ${value.action}, ${value.reasons}, ${value.model},
      ${value.version}, ${value.agents}::jsonb, true
    )
  `;
};

export const claimTargetJob = async (kind, targetId) => {
  const sql = getSql();
  const rows = await sql`
    update moderation_jobs set state = 'running', attempts = attempts + 1,
      locked_at = now(), updated_at = now(), last_error = null
    where kind = ${kind} and target_id = ${targetId}
      and state in ('queued', 'retry') and run_after <= now()
    returning id::text, kind::text, target_id::text as "targetId", attempts, max_attempts as "maxAttempts"
  `;
  return rows[0] ?? null;
};

export const claimJobs = async (limit = 5) => {
  const sql = getSql();
  return sql`
    with recovered as (
      update moderation_jobs set state = 'retry', locked_at = null, run_after = now(),
        last_error = 'worker_timeout', updated_at = now()
      where state = 'running' and locked_at < now() - interval '10 minutes'
    ), picked as (
      select id from moderation_jobs
      where state in ('queued', 'retry') and run_after <= now()
      order by priority desc, run_after, created_at
      for update skip locked
      limit ${limit}
    )
    update moderation_jobs j set state = 'running', attempts = attempts + 1,
      locked_at = now(), updated_at = now(), last_error = null
    from picked where j.id = picked.id
    returning j.id::text, j.kind::text, j.target_id::text as "targetId",
              j.attempts, j.max_attempts as "maxAttempts"
  `;
};

export const finishJob = async (job, complete, errorCode = null) => {
  const sql = getSql();
  if (complete) {
    await sql`
      update moderation_jobs set state = 'complete', locked_at = null,
        last_error = null, updated_at = now() where id = ${job.id}
    `;
    return;
  }

  const dead = job.attempts >= job.maxAttempts;
  const delaySeconds = Math.min(3_600, 30 * 2 ** Math.max(0, job.attempts - 1));
  await sql`
    update moderation_jobs set state = ${dead ? "dead" : "retry"}::job_state,
      locked_at = null, last_error = ${errorCode ?? "agent_unavailable"},
      run_after = now() + (${delaySeconds} * interval '1 second'), updated_at = now()
    where id = ${job.id}
  `;
};

export const deleteExpiredData = async () => {
  const sql = getSql();
  const results = await sql.transaction((tx) => [
    tx`delete from rate_limit_buckets where expires_at < now() returning 1`,
    tx`delete from review_signals where expires_at < now() returning 1`,
    tx`update courses set created_by_hash = null where created_by_hash is not null and created_at < now() - interval '30 days' returning 1`,
    tx`update lecturers set created_by_hash = null where created_by_hash is not null and created_at < now() - interval '30 days' returning 1`,
    tx`update reviews set submission_key_hash = null where submission_key_hash is not null and created_at < now() - interval '30 days' returning 1`,
    tx`update review_reports set reporter_key_hash = null where reporter_key_hash is not null and created_at < now() - interval '30 days' returning 1`,
    tx`update review_appeals set appeal_key_hash = null where appeal_key_hash is not null and created_at < now() - interval '30 days' returning 1`,
    tx`delete from reviews where moderation in ('rejected', 'removed') and coalesce(removed_at, created_at) < now() - interval '90 days' returning 1`,
    tx`delete from review_reports where state in ('resolved', 'closed') and coalesce(resolved_at, created_at) < now() - interval '12 months' returning 1`,
    tx`delete from review_appeals where state in ('resolved', 'closed') and coalesce(resolved_at, created_at) < now() - interval '12 months' returning 1`,
    tx`delete from lecturer_replies where moderation = 'rejected' and created_at < now() - interval '90 days' returning 1`,
  ]);
  return results.map((rows) => rows.length);
};
