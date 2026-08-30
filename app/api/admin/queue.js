import { requireAdmin } from "../_lib/adminAuth.js";
import { readModerationHistory, readModerationQueue } from "../_lib/adminRepository.js";
import { endpoint, sendJson } from "../_lib/http.js";

export default endpoint(["GET"], async (request, response) => {
  requireAdmin(request);
  const cases = request.query?.view === "history"
    ? await readModerationHistory()
    : await readModerationQueue();
  return sendJson(response, 200, { cases, generatedAt: new Date().toISOString() });
});
