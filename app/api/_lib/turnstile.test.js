import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { verifyTurnstile } from "./turnstile.js";

test("verifies Turnstile through the canonical server endpoint", async () => {
  const previousFetch = global.fetch;
  const previousSecret = process.env.TURNSTILE_SECRET_KEY;
  const previousEnvironment = process.env.VERCEL_ENV;
  const secret = randomUUID();
  let request;

  process.env.TURNSTILE_SECRET_KEY = secret;
  process.env.VERCEL_ENV = "preview";
  global.fetch = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      json: async () => ({ success: true, action: "turnstile-spin-v2" }),
    };
  };

  try {
    await verifyTurnstile({
      headers: { "x-vercel-forwarded-for": "203.0.113.8" },
    }, "single-use-token");

    assert.equal(request.url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
    assert.equal(request.options.method, "POST");
    assert.equal(request.options.headers["content-type"], "application/x-www-form-urlencoded");
    assert.equal(request.options.body.get("secret"), secret);
    assert.equal(request.options.body.get("response"), "single-use-token");
    assert.equal(request.options.body.get("remoteip"), "203.0.113.8");

    global.fetch = async () => ({ ok: true, json: async () => ({ success: false }) });
    await assert.rejects(
      verifyTurnstile({ headers: {} }, "rejected-token"),
      /could not be verified/i,
    );
  } finally {
    global.fetch = previousFetch;
    if (previousSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
    else process.env.TURNSTILE_SECRET_KEY = previousSecret;
    if (previousEnvironment === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previousEnvironment;
  }
});
