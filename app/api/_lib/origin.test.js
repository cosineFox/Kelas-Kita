import test from "node:test";
import assert from "node:assert/strict";
import { assertSameOrigin } from "./origin.js";

test("requires the Cloudflare origin gate on production writes", (context) => {
  const previous = {
    edge: process.env.EDGE_PROXY_SECRET,
    origin: process.env.PUBLIC_ORIGIN,
    vercel: process.env.VERCEL_ENV,
  };
  context.after(() => {
    for (const [name, value] of Object.entries({
      EDGE_PROXY_SECRET: previous.edge,
      PUBLIC_ORIGIN: previous.origin,
      VERCEL_ENV: previous.vercel,
    })) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });
  process.env.VERCEL_ENV = "production";
  process.env.PUBLIC_ORIGIN = "https://reviews.example.com";
  process.env.EDGE_PROXY_SECRET = "edge_secret_with_more_than_forty_characters_123456";

  const request = { headers: { origin: process.env.PUBLIC_ORIGIN, host: "reviews.example.com" } };
  assert.throws(() => assertSameOrigin(request), /at the edge/i);
  request.headers["x-kelaskita-edge-key"] = process.env.EDGE_PROXY_SECRET;
  assert.doesNotThrow(() => assertSameOrigin(request));
});
