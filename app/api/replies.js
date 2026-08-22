import { endpoint, readJson, sendJson } from "./_lib/http.js";
import { assertSameOrigin } from "./_lib/origin.js";
import { assertCaseRoutesOpen } from "./_lib/launchGate.js";
import { processTarget } from "./_lib/queue.js";
import { enforceRateLimit } from "./_lib/rateLimit.js";
import { createReply } from "./_lib/repository.js";
import { replyInput } from "./_lib/schemas.js";
import { verifyTurnstile } from "./_lib/turnstile.js";

export default endpoint(["POST"], async (request, response) => {
  assertCaseRoutesOpen();
  assertSameOrigin(request);
  const input = replyInput.parse(readJson(request));
  await verifyTurnstile(request, input.turnstileToken);
  await enforceRateLimit(request, "reply", 2, 60 * 60 * 1_000);
  const reply = await createReply(request, input);
  const processed = await processTarget("reply", reply.id);
  const decision = processed?.decision ?? {
    action: "escalate",
    appealable: true,
    status: "pending",
    summary: "We queued your reply for identity and content checks.",
    version: "core-0.1",
    model: null,
  };
  return sendJson(response, 202, { ok: true, reply, decision });
});
