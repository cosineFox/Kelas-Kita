import { endpoint, readJson, sendJson } from "./_lib/http.js";
import { assertSameOrigin } from "./_lib/origin.js";
import { assertCaseRoutesOpen } from "./_lib/launchGate.js";
import { processTarget } from "./_lib/queue.js";
import { enforceRateLimit } from "./_lib/rateLimit.js";
import { createAppeal } from "./_lib/repository.js";
import { appealInput } from "./_lib/schemas.js";
import { verifyTurnstile } from "./_lib/turnstile.js";

export default endpoint(["POST"], async (request, response) => {
  assertCaseRoutesOpen();
  assertSameOrigin(request);
  const input = appealInput.parse(readJson(request));
  await verifyTurnstile(request, input.turnstileToken, "appeal_submit");
  await enforceRateLimit(request, "appeal", 3, 60 * 60 * 1_000);
  const appeal = await createAppeal(request, input);
  const processed = await processTarget("appeal", appeal.id);
  const decision = processed?.decision ?? {
    action: "escalate",
    appealable: true,
    status: "pending",
    summary: "The appeal is recorded for a separate human review.",
    version: "core-0.1",
    model: null,
  };
  return sendJson(response, 202, { ok: true, appeal, decision });
});
