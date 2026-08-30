import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { citext } from "@electric-sql/pglite/contrib/citext";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { setSqlForTests } from "./db.js";
import { applyHumanDecision, readModerationHistory, readModerationQueue } from "./adminRepository.js";
import {
  claimTargetJob,
  createAppeal,
  createReport,
  createReview,
  deleteExpiredData,
  finishJob,
  loadModerationTarget,
  readPublicState,
  saveAutomatedDecision,
} from "./repository.js";

const compile = (strings, values) => ({
  query: strings.reduce((result, part, index) => result + part + (index < values.length ? `$${index + 1}` : ""), ""),
  values,
});

const adapter = (database) => {
  const sql = async (strings, ...values) => {
    const statement = compile(strings, values);
    return (await database.query(statement.query, statement.values)).rows;
  };
  sql.transaction = async (queriesOrFactory) => {
    if (typeof queriesOrFactory !== "function") return Promise.all(queriesOrFactory);
    const statements = [];
    const transactionTag = (strings, ...values) => {
      const statement = compile(strings, values);
      statements.push(statement);
      return statement;
    };
    queriesOrFactory(transactionTag);
    const results = [];
    for (const statement of statements) results.push((await database.query(statement.query, statement.values)).rows);
    return results;
  };
  return sql;
};

test("commits catalogue, pending review, queue and publication on the server", async () => {
  process.env.ABUSE_HASH_SECRET = "test-abuse-secret-with-enough-entropy";
  const database = new PGlite({ extensions: { citext, pgcrypto } });
  await database.exec(await readFile(new URL("../../database/schema.sql", import.meta.url), "utf8"));
  await database.exec(await readFile(new URL("../../database/migrations/002_flexible_study_period.sql", import.meta.url), "utf8"));
  setSqlForTests(adapter(database));

  const request = {
    headers: { "user-agent": "repository-test", "x-forwarded-for": "192.0.2.10" },
    socket: {},
  };
  const input = {
    course: { code: "COMP2013", name: "Algorithms", university: "Example University", faculty: "Engineering" },
    lecturer: { name: "Dr Aisha Rahman" },
    semester: "Trimester 2",
    year: 2026,
    courseRating: 4,
    lecturerRating: 5,
    workload: "Balanced",
    body: "Worked examples made difficult topics easier to apply, while earlier rubric feedback would improve preparation.",
  };

  const created = await createReview(request, input);
  const pending = await readPublicState();
  assert.equal(pending.courses.length, 0);
  assert.equal(pending.lecturers.length, 0);
  assert.equal(pending.assignments.length, 0);
  assert.equal(pending.reviews.length, 0);
  assert.equal((await readModerationQueue()).some((item) => item.targetId === created.review.id), true);
  assert.equal((await readModerationHistory()).some((item) => item.targetId === created.review.id), false);
  const moderationTarget = await loadModerationTarget("review", created.review.id);
  assert.match(moderationTarget.text, /Course: COMP2013: Algorithms/);
  assert.match(moderationTarget.text, /Lecturer: Dr Aisha Rahman/);

  const job = await claimTargetJob("review", created.review.id);
  const result = {
    decision: {
      action: "publish",
      status: "published",
      reasonCodes: ["screened_low_risk"],
      version: "core-0.1",
    },
    model: "thinkingmachines/inkling-small",
    agents: [],
  };
  await saveAutomatedDecision("review", created.review.id, result);
  await finishJob(job, true);
  const published = await readPublicState();
  assert.equal(published.courses.length, 1);
  assert.equal(published.lecturers.length, 1);
  assert.equal(published.assignments.length, 1);
  assert.equal(published.reviews.length, 1);
  assert.equal(published.reviews[0].status, "published");
  assert.equal((await readModerationQueue()).some((item) => item.targetId === created.review.id), false);

  const report = await createReport(request, {
    reviewId: created.review.id,
    reason: "Personal information or doxxing",
    details: "The published text appears to include private contact information that should be checked immediately.",
  });
  assert.equal(report.urgent, true);
  assert.equal((await readPublicState()).reviews.length, 0);
  const queued = await database.query("select priority, state::text from moderation_jobs where kind = 'report'");
  assert.deepEqual(queued.rows, [{ priority: 100, state: "queued" }]);

  const reportJob = await claimTargetJob("report", report.id);
  await saveAutomatedDecision("report", report.id, {
    decision: {
      action: "hide",
      status: "held",
      reasonCodes: ["personal_information"],
      version: "core-0.1",
    },
    model: "thinkingmachines/inkling-small",
    agents: [],
  });
  await finishJob(reportJob, true);
  assert.equal((await readPublicState()).reviews.length, 0);
  assert.equal((await readModerationQueue()).some((item) => item.targetId === report.id && item.urgent), true);

  await applyHumanDecision({
    kind: "report",
    targetId: report.id,
    action: "no_action",
    reason: "The staging report was intentionally synthetic and contains no real personal data.",
  });
  assert.equal((await readPublicState()).reviews.length, 1);
  assert.equal((await readModerationQueue()).some((item) => item.targetId === report.id), false);
  assert.equal((await readModerationHistory()).some((item) => item.targetId === report.id), true);

  await applyHumanDecision({
    kind: "review",
    targetId: created.review.id,
    action: "remove",
    reason: "Exercise the private receipt appeal and restoration path in the integration test.",
  });
  assert.equal((await readModerationHistory()).some((item) => item.targetId === created.review.id), true);
  const appeal = await createAppeal(request, {
    receipt: created.receipt,
    details: "This synthetic integration case asks a separate human reviewer to restore the test review after checking the recorded decision.",
    contact: "",
  });
  assert.equal(appeal.reviewId, created.review.id);
  await database.query("update courses set state = 'pending'");
  await database.query("update lecturers set state = 'pending'");
  await applyHumanDecision({
    kind: "appeal",
    targetId: appeal.id,
    action: "restore",
    reason: "The synthetic removal was created only to verify the complete appeal path.",
  });
  const restored = await readPublicState();
  assert.equal(restored.courses.length, 1);
  assert.equal(restored.lecturers.length, 1);
  assert.equal(restored.reviews.length, 1);

  await database.query("update courses set created_at = now() - interval '31 days'");
  await database.query("update lecturers set created_at = now() - interval '31 days'");
  await database.query("update reviews set created_at = now() - interval '31 days'");
  await database.query("update review_reports set created_at = now() - interval '31 days'");
  await database.query("update review_appeals set created_at = now() - interval '31 days'");
  await deleteExpiredData();
  const retained = await database.query(`
    select c.created_by_hash as course_hash, l.created_by_hash as lecturer_hash,
      r.submission_key_hash as review_hash, rr.reporter_key_hash as report_hash,
      a.appeal_key_hash as appeal_hash
    from courses c, lecturers l, reviews r, review_reports rr, review_appeals a
    limit 1
  `);
  assert.deepEqual(retained.rows[0], {
    course_hash: null,
    lecturer_hash: null,
    review_hash: null,
    report_hash: null,
    appeal_hash: null,
  });
  await database.close();
});
