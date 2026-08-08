import test from "node:test";
import assert from "node:assert/strict";
import { summariseCourse } from "./reviews.js";

test("excludes pending and held reviews from ratings", () => {
  const course = { id: "course-1", name: "Algorithms" };
  const reviews = [
    { courseId: "course-1", status: "published", courseRating: 4, lecturerRating: 5, workload: "Heavy", body: "Published", createdAt: "2026-01-01" },
    { courseId: "course-1", status: "pending", courseRating: 1, lecturerRating: 1, workload: "Extreme", body: "Pending", createdAt: "2026-01-02" },
    { courseId: "course-1", status: "held", courseRating: 1, lecturerRating: 1, workload: "Extreme", body: "Held", createdAt: "2026-01-03" },
  ];
  const summary = summariseCourse(course, reviews);
  assert.equal(summary.ratings.course, 4);
  assert.equal(summary.ratings.lecturer, 5);
  assert.equal(summary.ratings.count, 1);
  assert.deepEqual(summary.ratings.courseDistribution, [0, 100, 0, 0, 0]);
  assert.equal(summary.excerpt, "Published");
});
