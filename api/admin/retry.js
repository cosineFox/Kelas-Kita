import { z } from "zod";
import { requireAdmin } from "../_lib/adminAuth.js";
import { retryModerationJob } from "../_lib/adminRepository.js";
import { endpoint, readJson, sendJson } from "../_lib/http.js";
import { assertSameOrigin } from "../_lib/origin.js";

const inputSchema = z.object({
  kind: z.enum(["review", "report", "appeal", "reply"]),
  targetId: z.string().uuid(),
});

export default endpoint(["POST"], async (request, response) => {
  requireAdmin(request);
  assertSameOrigin(request);
  const input = inputSchema.parse(readJson(request));
  const job = await retryModerationJob(input.kind, input.targetId);
  return sendJson(response, 200, { ok: true, job });
});
