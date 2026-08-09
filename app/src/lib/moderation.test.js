import test from "node:test";
import assert from "node:assert/strict";
import { analyseFeedback } from "./moderation.js";
import { decideModeration } from "./moderationCore.js";

test("blocks attacks and personal information", () => {
  const result = analyseFeedback("This useless idiot can be reached at person@example.com for proof of everything.");
  assert.deepEqual(result.blockers.map(({ id }) => id), ["attack", "pii"]);
});

test("accepts specific constructive feedback", () => {
  const result = analyseFeedback(
    "Weekly worked examples made the algorithms easier to apply, but publishing the rubric before project two would improve preparation.",
  );
  assert.equal(result.ready, true);
});

test("holds serious allegations without judging whether they are true", () => {
  const analysis = analyseFeedback(
    "The lecturer asked me for a bribe before agreeing to reconsider the assessment result, and I want this investigated properly.",
  );
  const decision = decideModeration({ kind: "review", analysis, aiAvailable: true });
  assert.equal(decision.action, "hold");
  assert.equal(decision.status, "held");
  assert.match(decision.summary, /unverified allegation/i);
});

test("publishes only after a clean agent pass", () => {
  const analysis = analyseFeedback(
    "Worked examples made the material easier to follow, while earlier feedback on the second assignment would improve the course.",
  );
  assert.equal(decideModeration({ kind: "review", analysis, aiAvailable: false }).status, "pending");
  assert.equal(decideModeration({ kind: "review", analysis, aiAvailable: true }).status, "published");
});

test("temporarily hides reported personal information", () => {
  const analysis = analyseFeedback(
    "The lecturer can be contacted on lecturer@example.com and this sentence contains enough surrounding context for a review.",
  );
  const decision = decideModeration({ kind: "report", analysis, aiAvailable: true });
  assert.equal(decision.action, "hide");
  assert.equal(decision.status, "held");
});
