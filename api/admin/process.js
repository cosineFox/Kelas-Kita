import { requireAdmin } from "../_lib/adminAuth.js";
import { endpoint, sendJson } from "../_lib/http.js";
import { assertSameOrigin } from "../_lib/origin.js";
import { processQueue } from "../_lib/queue.js";

export default endpoint(["POST"], async (request, response) => {
  requireAdmin(request);
  assertSameOrigin(request);
  const results = await processQueue(3);
  return sendJson(response, 200, {
    ok: true,
    processed: results.length,
    completed: results.filter((result) => result.complete).length,
  });
});
