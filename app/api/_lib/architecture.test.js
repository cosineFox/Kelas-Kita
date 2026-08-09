import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("keeps product records and moderation calls off browser storage", async () => {
  const app = await readFile(new URL("../../src/App.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(app, /localStorage|sessionStorage/);
  assert.doesNotMatch(app, /\/api\/moderate/);
});

test("protects every public write with Turnstile and a durable rate limit", async () => {
  for (const route of ["reviews", "reports", "appeals", "replies"]) {
    const source = await readFile(new URL(`../${route}.js`, import.meta.url), "utf8");
    assert.match(source, /verifyTurnstile/);
    assert.match(source, /enforceRateLimit/);
  }
});

test("uses a bounded unprepared Postgres connection for the Supabase pooler", async () => {
  const database = await readFile(new URL("./db.js", import.meta.url), "utf8");
  assert.match(database, /postgres\(requireEnv\("POSTGRES_URL"\)/);
  assert.match(database, /max: 1/);
  assert.match(database, /prepare: false/);
  assert.doesNotMatch(database, /@neondatabase/);
});
