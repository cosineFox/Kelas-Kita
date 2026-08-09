import { createAdminCookie, clearAdminCookie, requireAdmin, verifyAdminSecret } from "../_lib/adminAuth.js";
import { endpoint, readJson, sendJson } from "../_lib/http.js";
import { assertSameOrigin } from "../_lib/origin.js";
import { enforceRateLimit } from "../_lib/rateLimit.js";

export default endpoint(["GET", "POST", "DELETE"], async (request, response) => {
  if (request.method === "GET") {
    requireAdmin(request);
    return sendJson(response, 200, { authenticated: true });
  }

  assertSameOrigin(request);
  if (request.method === "DELETE") {
    response.setHeader("Set-Cookie", clearAdminCookie());
    return sendJson(response, 200, { authenticated: false });
  }

  await enforceRateLimit(request, "admin_login", 5, 15 * 60 * 1_000);
  verifyAdminSecret(readJson(request).secret);
  response.setHeader("Set-Cookie", createAdminCookie());
  return sendJson(response, 200, { authenticated: true });
});
