import { requireAdmin } from "../_lib/adminAuth.js";
import { applyHumanDecision } from "../_lib/adminRepository.js";
import { endpoint, readJson, sendJson } from "../_lib/http.js";
import { assertSameOrigin } from "../_lib/origin.js";
import { adminDecisionInput } from "../_lib/schemas.js";

export default endpoint(["POST"], async (request, response) => {
  requireAdmin(request);
  assertSameOrigin(request);
  const input = adminDecisionInput.parse(readJson(request));
  const result = await applyHumanDecision(input);
  return sendJson(response, 200, { ok: true, result });
});
