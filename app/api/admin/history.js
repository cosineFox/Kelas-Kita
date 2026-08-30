import { requireAdmin } from "../_lib/adminAuth.js";
import { readModerationHistory } from "../_lib/adminRepository.js";
import { endpoint, sendJson } from "../_lib/http.js";

export default endpoint(["GET"], async (request, response) => {
  requireAdmin(request);
  const cases = await readModerationHistory();
  return sendJson(response, 200, { cases, generatedAt: new Date().toISOString() });
});
