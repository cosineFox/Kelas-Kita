import { getSql } from "./db.js";
import { HttpError } from "./http.js";
import { decryptPrivateText } from "./privateData.js";

const normaliseItem = (item) => ({
  ...item,
  urgent: Boolean(item.urgent),
  attempts: Number(item.attempts ?? 0),
  agentFindings: item.agentFindings ?? [],
});

export const readModerationQueue = async () => {
  const sql = getSql();
  const [reviews, reports, appeals, replies] = await sql.transaction((tx) => [
    tx`
      select 'review' as kind, r.id::text as "targetId", r.id::text as "reviewId",
        c.code::text as "courseCode", c.name::text as "courseName", l.name::text as "lecturerName",
        r.body, null::text as details, null::bytea as contact, r.moderation::text as state,
        false as urgent, r.created_at as "createdAt", j.state::text as "jobState",
        j.attempts, j.last_error as "lastError", d.action::text as "lastAction",
        d.reason_codes as "reasonCodes", d.agent_findings as "agentFindings"
      from reviews r
      join courses c on c.id = r.course_id
      join lecturers l on l.id = r.lecturer_id
      left join moderation_jobs j on j.kind = 'review' and j.target_id = r.id
      left join lateral (
        select action, reason_codes, agent_findings from moderation_decisions
        where review_id = r.id order by created_at desc limit 1
      ) d on true
      -- Rejected reviews are terminal history, not active work. Held reviews
      -- remain here because an operator still needs to publish or reject them.
      where r.moderation in ('pending', 'held')
    `,
    tx`
      select 'report' as kind, rr.id::text as "targetId", r.id::text as "reviewId",
        c.code::text as "courseCode", c.name::text as "courseName", l.name::text as "lecturerName",
        r.body, concat(rr.reason, E'\n', rr.details) as details, null::bytea as contact,
        rr.state::text as state, rr.urgent, rr.created_at as "createdAt",
        j.state::text as "jobState", j.attempts, j.last_error as "lastError",
        d.action::text as "lastAction", d.reason_codes as "reasonCodes", d.agent_findings as "agentFindings"
      from review_reports rr
      join reviews r on r.id = rr.review_id
      join courses c on c.id = r.course_id
      join lecturers l on l.id = r.lecturer_id
      left join moderation_jobs j on j.kind = 'report' and j.target_id = rr.id
      left join lateral (
        select action, reason_codes, agent_findings from moderation_decisions
        where report_id = rr.id order by created_at desc limit 1
      ) d on true
      where rr.state in ('pending', 'appealed')
    `,
    tx`
      select 'appeal' as kind, a.id::text as "targetId", r.id::text as "reviewId",
        c.code::text as "courseCode", c.name::text as "courseName", l.name::text as "lecturerName",
        r.body, a.details, a.contact_ciphertext as contact, a.state::text as state,
        false as urgent, a.created_at as "createdAt", j.state::text as "jobState",
        j.attempts, j.last_error as "lastError", d.action::text as "lastAction",
        d.reason_codes as "reasonCodes", d.agent_findings as "agentFindings"
      from review_appeals a
      join reviews r on r.id = a.review_id
      join courses c on c.id = r.course_id
      join lecturers l on l.id = r.lecturer_id
      left join moderation_jobs j on j.kind = 'appeal' and j.target_id = a.id
      left join lateral (
        select action, reason_codes, agent_findings from moderation_decisions
        where appeal_id = a.id order by created_at desc limit 1
      ) d on true
      where a.state = 'pending'
    `,
    tx`
      select 'reply' as kind, lr.id::text as "targetId", r.id::text as "reviewId",
        c.code::text as "courseCode", c.name::text as "courseName", l.name::text as "lecturerName",
        lr.body, 'Lecturer right of reply'::text as details,
        lr.verification_email_ciphertext as contact, lr.moderation::text as state,
        false as urgent, lr.created_at as "createdAt", j.state::text as "jobState",
        j.attempts, j.last_error as "lastError", d.action::text as "lastAction",
        d.reason_codes as "reasonCodes", d.agent_findings as "agentFindings"
      from lecturer_replies lr
      join reviews r on r.id = lr.review_id
      join courses c on c.id = r.course_id
      join lecturers l on l.id = lr.lecturer_id
      left join moderation_jobs j on j.kind = 'reply' and j.target_id = lr.id
      left join lateral (
        select action, reason_codes, agent_findings from moderation_decisions
        where reply_id = lr.id order by created_at desc limit 1
      ) d on true
      where lr.moderation in ('pending', 'held')
    `,
  ], { isolationLevel: "RepeatableRead", readOnly: true });

  return [...reviews, ...reports, ...appeals, ...replies]
    .map((item) => normaliseItem({
      ...item,
      contact: item.contact ? decryptPrivateText(item.contact) : null,
    }))
    .sort((left, right) => Number(right.urgent) - Number(left.urgent) || new Date(left.createdAt) - new Date(right.createdAt));
};

// Terminal cases are kept for operator audit, but never mixed into active work.
// This deliberately excludes published reviews so the history view remains a
// useful record of rejects, removals and resolved reports/appeals.
export const readModerationHistory = async () => {
  const sql = getSql();
  const [reviews, reports, appeals, replies] = await sql.transaction((tx) => [
    tx`
      select 'review' as kind, r.id::text as "targetId", r.id::text as "reviewId",
        c.code::text as "courseCode", c.name::text as "courseName", l.name::text as "lecturerName",
        r.body, null::text as details, null::bytea as contact, r.moderation::text as state,
        false as urgent, coalesce(r.removed_at, r.created_at) as "createdAt",
        j.state::text as "jobState", j.attempts, j.last_error as "lastError", d.action::text as "lastAction",
        d.reason_codes as "reasonCodes", d.agent_findings as "agentFindings"
      from reviews r
      join courses c on c.id = r.course_id
      join lecturers l on l.id = r.lecturer_id
      left join moderation_jobs j on j.kind = 'review' and j.target_id = r.id
      left join lateral (
        select action, reason_codes, agent_findings from moderation_decisions
        where review_id = r.id order by created_at desc limit 1
      ) d on true
      where r.moderation in ('rejected', 'removed')
    `,
    tx`
      select 'report' as kind, rr.id::text as "targetId", r.id::text as "reviewId",
        c.code::text as "courseCode", c.name::text as "courseName", l.name::text as "lecturerName",
        r.body, concat(rr.reason, E'\n', rr.details) as details, null::bytea as contact,
        rr.state::text as state, rr.urgent, coalesce(rr.resolved_at, rr.created_at) as "createdAt",
        j.state::text as "jobState", j.attempts, j.last_error as "lastError",
        d.action::text as "lastAction", d.reason_codes as "reasonCodes", d.agent_findings as "agentFindings"
      from review_reports rr
      join reviews r on r.id = rr.review_id
      join courses c on c.id = r.course_id
      join lecturers l on l.id = r.lecturer_id
      left join moderation_jobs j on j.kind = 'report' and j.target_id = rr.id
      left join lateral (
        select action, reason_codes, agent_findings from moderation_decisions
        where report_id = rr.id order by created_at desc limit 1
      ) d on true
      where rr.state in ('resolved', 'closed')
    `,
    tx`
      select 'appeal' as kind, a.id::text as "targetId", r.id::text as "reviewId",
        c.code::text as "courseCode", c.name::text as "courseName", l.name::text as "lecturerName",
        r.body, a.details, null::bytea as contact, a.state::text as state,
        false as urgent, coalesce(a.resolved_at, a.created_at) as "createdAt", j.state::text as "jobState",
        j.attempts, j.last_error as "lastError", d.action::text as "lastAction",
        d.reason_codes as "reasonCodes", d.agent_findings as "agentFindings"
      from review_appeals a
      join reviews r on r.id = a.review_id
      join courses c on c.id = r.course_id
      join lecturers l on l.id = r.lecturer_id
      left join moderation_jobs j on j.kind = 'appeal' and j.target_id = a.id
      left join lateral (
        select action, reason_codes, agent_findings from moderation_decisions
        where appeal_id = a.id order by created_at desc limit 1
      ) d on true
      where a.state in ('resolved', 'closed')
    `,
    tx`
      select 'reply' as kind, lr.id::text as "targetId", r.id::text as "reviewId",
        c.code::text as "courseCode", c.name::text as "courseName", l.name::text as "lecturerName",
        lr.body, 'Lecturer right of reply'::text as details, null::bytea as contact,
        lr.moderation::text as state, false as urgent, lr.created_at as "createdAt",
        j.state::text as "jobState", j.attempts, j.last_error as "lastError", d.action::text as "lastAction",
        d.reason_codes as "reasonCodes", d.agent_findings as "agentFindings"
      from lecturer_replies lr
      join reviews r on r.id = lr.review_id
      join courses c on c.id = r.course_id
      join lecturers l on l.id = lr.lecturer_id
      left join moderation_jobs j on j.kind = 'reply' and j.target_id = lr.id
      left join lateral (
        select action, reason_codes, agent_findings from moderation_decisions
        where reply_id = lr.id order by created_at desc limit 1
      ) d on true
      where lr.moderation = 'rejected'
    `,
  ], { isolationLevel: "RepeatableRead", readOnly: true });

  return [...reviews, ...reports, ...appeals, ...replies]
    .map((item) => normaliseItem({ ...item, contact: item.contact ? decryptPrivateText(item.contact) : null }))
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
};

const allowedActions = {
  review: new Set(["publish", "hold", "reject", "remove"]),
  report: new Set(["hold", "remove", "no_action", "dismiss"]),
  appeal: new Set(["restore", "dismiss"]),
  reply: new Set(["publish", "hold", "reject"]),
};

export const applyHumanDecision = async ({ kind, targetId, action, reason }) => {
  if (!allowedActions[kind]?.has(action)) {
    throw new HttpError(400, "invalid_action", "That action is not valid for this case type.");
  }
  const sql = getSql();

  if (kind === "review") {
    const status = { publish: "published", hold: "held", reject: "rejected", remove: "removed" }[action];
    const rows = await sql`
      with previous as (select moderation from reviews where id = ${targetId}), changed as (
        update reviews set moderation = ${status}::moderation_state,
          published_at = case when ${status} = 'published' then coalesce(published_at, now()) else published_at end,
          removed_at = case when ${status} = 'removed' then now() else removed_at end
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
      ), logged as (
        insert into moderation_decisions (
          kind, review_id, action, previous_state, new_state, reason_codes, reason,
          core_version, automated, decided_by
        ) select 'human_override', ${targetId}, ${action}, previous.moderation, changed.moderation,
          array['human_review'], ${reason}, 'human-1', false, 'operator' from previous, changed
      )
      select moderation::text as state from changed
    `;
    if (!rows[0]) throw new HttpError(404, "not_found", "That moderation case no longer exists.");
    return rows[0];
  }

  if (kind === "report") {
    const rows = await sql`
      with target as (
        select rr.review_id, rr.previous_review_state as baseline,
          exists (
            select 1 from review_reports other
            join lateral (
              select action from moderation_decisions
              where report_id = other.id order by created_at desc limit 1
            ) decision on true
            where other.review_id = rr.review_id and other.id <> rr.id
              and other.state in ('pending', 'appealed')
              and decision.action in ('hide', 'hold', 'remove')
          ) as other_blocking
        from review_reports rr where rr.id = ${targetId}
      ),
      previous as (select r.id, r.moderation from reviews r join target on target.review_id = r.id),
      changed as (
        update reviews r set moderation = case
          when ${action} = 'remove' then 'removed'::moderation_state
          when ${action} = 'hold' then 'held'::moderation_state
          when ${action} in ('no_action', 'dismiss') and target.baseline = 'published'
            and not target.other_blocking then 'published'::moderation_state
          else r.moderation end,
          published_at = case
            when ${action} in ('no_action', 'dismiss') and target.baseline = 'published'
              and not target.other_blocking then coalesce(r.published_at, now())
            else r.published_at end,
          removed_at = case
            when ${action} = 'remove' then now()
            when ${action} in ('no_action', 'dismiss') and target.baseline = 'published'
              and not target.other_blocking then null
            else r.removed_at end
        from target where r.id = target.review_id
        returning r.moderation, r.course_id, r.lecturer_id,
          r.submitted_course_name, r.submitted_faculty_name
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
      ), closed as (
        update review_reports set state = 'resolved', resolved_at = now() where id = ${targetId}
      ), logged as (
        insert into moderation_decisions (
          kind, report_id, action, previous_state, new_state, reason_codes, reason,
          core_version, automated, decided_by
        ) select 'human_override', ${targetId}, ${action}, previous.moderation, changed.moderation,
          array['human_review'], ${reason}, 'human-1', false, 'operator' from previous, changed
      )
      select moderation::text as state from changed
    `;
    if (!rows[0]) throw new HttpError(404, "not_found", "That report no longer exists.");
    return rows[0];
  }

  if (kind === "appeal") {
    const rows = await sql`
      with target as (select review_id from review_appeals where id = ${targetId}),
      previous as (select r.id, r.moderation from reviews r join target on target.review_id = r.id),
      changed as (
        update reviews r set moderation = case when ${action} = 'restore' then 'published'::moderation_state else r.moderation end,
          published_at = case when ${action} = 'restore' then coalesce(r.published_at, now()) else r.published_at end,
          removed_at = case when ${action} = 'restore' then null else r.removed_at end
        from target where r.id = target.review_id
        returning r.moderation, r.course_id, r.lecturer_id,
          r.submitted_course_name, r.submitted_faculty_name
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
      ), closed as (
        update review_appeals set state = case when ${action} = 'restore' then 'resolved'::case_state else 'closed'::case_state end,
          resolved_at = now(), contact_ciphertext = null where id = ${targetId}
      ), logged as (
        insert into moderation_decisions (
          kind, appeal_id, action, previous_state, new_state, reason_codes, reason,
          core_version, automated, decided_by
        ) select 'human_override', ${targetId}, ${action}, previous.moderation, changed.moderation,
          array['human_review'], ${reason}, 'human-1', false, 'operator' from previous, changed
      )
      select moderation::text as state from changed
    `;
    if (!rows[0]) throw new HttpError(404, "not_found", "That appeal no longer exists.");
    return rows[0];
  }

  const status = { publish: "published", hold: "held", reject: "rejected" }[action];
  const rows = await sql`
    with previous as (select moderation from lecturer_replies where id = ${targetId}), changed as (
      update lecturer_replies set moderation = ${status}::moderation_state,
        published_at = case when ${status} = 'published' then coalesce(published_at, now()) else published_at end,
        verified_at = case when ${status} = 'published' then coalesce(verified_at, now()) else verified_at end,
        verification_email_ciphertext = case when ${status} = 'published' then null else verification_email_ciphertext end
      where id = ${targetId} returning moderation
    ), logged as (
      insert into moderation_decisions (
        kind, reply_id, action, previous_state, new_state, reason_codes, reason,
        core_version, automated, decided_by
      ) select 'human_override', ${targetId}, ${action}, previous.moderation, changed.moderation,
        array['human_review'], ${reason}, 'human-1', false, 'operator' from previous, changed
    )
    select moderation::text as state from changed
  `;
  if (!rows[0]) throw new HttpError(404, "not_found", "That reply no longer exists.");
  return rows[0];
};

export const retryModerationJob = async (kind, targetId) => {
  const sql = getSql();
  const rows = await sql`
    update moderation_jobs set state = 'queued', attempts = 0, run_after = now(),
      locked_at = null, last_error = null, updated_at = now()
    where kind = ${kind} and target_id = ${targetId} and state in ('retry', 'dead')
    returning id::text
  `;
  if (!rows[0]) throw new HttpError(409, "not_retryable", "That job is already running or complete.");
  return rows[0];
};
