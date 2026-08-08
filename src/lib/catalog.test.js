import test from "node:test";
import assert from "node:assert/strict";
import { courseDuplicates, lecturerDuplicates } from "./catalog.js";

test("finds a course by canonical university and code", () => {
  const course = { code: "COMP2013", name: "Algorithms & Data Structures", university: "University of Malaya" };
  assert.equal(courseDuplicates({ ...course, code: "comp 2013" }, [course])[0].course, course);
});

test("keeps lecturers separate from course records", () => {
  const lecturers = [{ id: "1", name: "Dr. Aisha Rahman", university: "University of Malaya" }];
  assert.equal(lecturerDuplicates("Aisha Rahman", "University of Malaya", lecturers)[0].id, "1");
});
