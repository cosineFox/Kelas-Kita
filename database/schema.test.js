import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { citext } from "@electric-sql/pglite/contrib/citext";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

test("applies the production schema and excludes pending ratings", async () => {
  const database = new PGlite({ extensions: { citext, pgcrypto } });
  await database.exec(await readFile(new URL("./schema.sql", import.meta.url), "utf8"));

  const university = await database.query("insert into universities (name) values ('Example University') returning id");
  const universityId = university.rows[0].id;
  const faculty = await database.query("insert into faculties (university_id, name) values ($1, 'Engineering') returning id", [universityId]);
  const course = await database.query("insert into courses (university_id, faculty_id, code, name, created_by_hash) values ($1, $2, 'COMP2013', 'Algorithms', 'hash') returning id", [universityId, faculty.rows[0].id]);
  const lecturer = await database.query("insert into lecturers (university_id, name, created_by_hash) values ($1, 'Dr Aisha Rahman', 'hash') returning id", [universityId]);
  await database.query("insert into course_lecturers (course_id, lecturer_id) values ($1, $2)", [course.rows[0].id, lecturer.rows[0].id]);

  const values = [course.rows[0].id, lecturer.rows[0].id];
  await database.query("insert into reviews (submission_key_hash, receipt_hash, course_id, lecturer_id, semester, academic_year, course_rating, lecturer_rating, workload, submitted_course_name, submitted_faculty_name, body) values ('pending-key', 'pending-receipt', $1, $2, 'Semester 2', 2026, 1, 1, 'Extreme', 'Algorithms', 'Engineering', repeat('pending ', 10))", values);
  await database.query("insert into reviews (submission_key_hash, receipt_hash, course_id, lecturer_id, semester, academic_year, course_rating, lecturer_rating, workload, submitted_course_name, submitted_faculty_name, body, moderation, published_at) values ('published-key', 'published-receipt', $1, $2, 'Semester 1', 2026, 5, 4, 'Balanced', 'Algorithms', 'Engineering', repeat('published ', 10), 'published', now())", values);

  const ratings = await database.query("select review_count::int, course_rating::float from public_course_ratings");
  assert.deepEqual(ratings.rows, [{ review_count: 1, course_rating: 5 }]);
  await assert.rejects(
    database.query("insert into courses (university_id, code, name, created_by_hash) values ($1, 'comp2013', 'Duplicate', 'hash')", [universityId]),
    /unique/i,
  );
  await database.close();
});
