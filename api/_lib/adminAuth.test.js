import test from "node:test";
import assert from "node:assert/strict";
import { createAdminCookie, requireAdmin, verifyAdminSecret } from "./adminAuth.js";

test("creates a signed, http-only operator session", () => {
  process.env.ADMIN_SECRET = "operator-secret-with-at-least-twenty-characters";
  process.env.ADMIN_SESSION_SECRET = "independent-session-signing-secret";
  process.env.VERCEL_ENV = "preview";

  verifyAdminSecret(process.env.ADMIN_SECRET);
  const header = createAdminCookie();
  assert.match(header, /HttpOnly/);
  assert.match(header, /SameSite=Strict/);
  assert.doesNotThrow(() => requireAdmin({ headers: { cookie: header.split(";")[0] } }));
  assert.throws(() => requireAdmin({ headers: { cookie: "kk_admin_session=forged" } }), /authentication/i);
});
