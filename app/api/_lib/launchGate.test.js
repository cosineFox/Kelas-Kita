import test from "node:test";
import assert from "node:assert/strict";
import { isLaunchApproved, isSubmissionsOpen } from "./launchGate.js";

const previous = Object.fromEntries(
  ["VERCEL_ENV", "EDGE_PROXY_SECRET", "OPERATOR_CONTACT_EMAIL", "SUBMISSIONS_OPEN"].map((name) => [name, process.env[name]]),
);

test.after(() => {
  for (const [name, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

test("supports a one-person production launch gate", () => {
  process.env.VERCEL_ENV = "production";
  process.env.EDGE_PROXY_SECRET = "configured-edge-secret";
  process.env.OPERATOR_CONTACT_EMAIL = "moderation@example.com";
  process.env.SUBMISSIONS_OPEN = "true";

  assert.equal(isLaunchApproved(), true);
  assert.equal(isSubmissionsOpen(), true);
});

test("keeps submissions closed without an operator contact or explicit switch", () => {
  process.env.VERCEL_ENV = "production";
  process.env.EDGE_PROXY_SECRET = "configured-edge-secret";
  delete process.env.OPERATOR_CONTACT_EMAIL;
  process.env.SUBMISSIONS_OPEN = "true";
  assert.equal(isSubmissionsOpen(), false);

  process.env.OPERATOR_CONTACT_EMAIL = "moderation@example.com";
  process.env.SUBMISSIONS_OPEN = "false";
  assert.equal(isSubmissionsOpen(), false);
});
