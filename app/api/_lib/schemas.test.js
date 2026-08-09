import test from "node:test";
import assert from "node:assert/strict";
import { appealInput, reportInput, reviewInput } from "./schemas.js";

const review = {
  course: { code: "COMP2013", name: "Algorithms", university: "Example University", faculty: "Engineering" },
  lecturer: { name: "Dr Aisha Rahman" },
  semester: "Semester 2",
  year: "2026",
  courseRating: 4,
  lecturerRating: 5,
  workload: "Balanced",
  body: "Worked examples made difficult topics easier to apply, while earlier rubric feedback would improve preparation.",
  turnstileToken: "token",
};

test("accepts a bounded review and coerces its academic year", () => {
  assert.equal(reviewInput.parse(review).year, 2026);
});

test("rejects invented report reasons", () => {
  assert.throws(() => reportInput.parse({
    reviewId: "9dd14600-4225-4337-b68e-f1e9433ec172",
    reason: "Please delete criticism",
    details: "This is a sufficiently detailed report for the validation boundary.",
    turnstileToken: "token",
  }));
});

test("requires a private capability for an appeal", () => {
  const base = {
    details: "A separate reviewer should reconsider this decision using the recorded moderation history and published community rules.",
    contact: "",
    turnstileToken: "token",
  };
  assert.throws(() => appealInput.parse(base));
  assert.equal(appealInput.parse({ ...base, receipt: "private-receipt-with-enough-length" }).receipt, "private-receipt-with-enough-length");
  assert.doesNotThrow(() => appealInput.parse({
    ...base,
    reviewId: "9dd14600-4225-4337-b68e-f1e9433ec172",
    reportId: "a4acfbf4-9c08-4a80-9c9d-e68fd424a196",
  }));
});
