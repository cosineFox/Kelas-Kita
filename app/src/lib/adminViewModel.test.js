import assert from "node:assert/strict";
import test from "node:test";
import { normaliseAdminHealth, normaliseAdminQueue } from "./adminViewModel.js";

test("drops invalid queue rows and makes legacy fields safe to render", () => {
  const cases = normaliseAdminQueue({ cases: [
    null,
    { kind: "review", targetId: "review-1", body: { legacy: true }, agentFindings: "[]", reasonCodes: null },
  ] });

  assert.equal(cases.length, 1);
  assert.equal(cases[0].body, "No review text supplied.");
  assert.deepEqual(cases[0].agentFindings, []);
  assert.deepEqual(cases[0].reasonCodes, []);
  assert.equal(cases[0].attempts, 0);
});

test("normalises partial health responses", () => {
  assert.deepEqual(normaliseAdminHealth({ database: null, configuration: "old" }), {
    aiGateway: { model: null, ok: false, tested: false },
    configuration: {},
    database: { ok: false },
  });
});
