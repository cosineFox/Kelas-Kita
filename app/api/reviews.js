import { endpoint, readJson, sendJson } from "./_lib/http.js";
import { assertSameOrigin } from "./_lib/origin.js";
import { assertSubmissionsOpen } from "./_lib/launchGate.js";
import { processTarget } from "./_lib/queue.js";
import { enforceRateLimit } from "./_lib/rateLimit.js";
import { createReview } from "./_lib/repository.js";
import { reviewInput } from "./_lib/schemas.js";
import { verifyTurnstile } from "./_lib/turnstile.js";

const pendingDecision = {
  action: "queue",
  appealable: true,
  status: "pending",
  summary: "Qwen is taking a nap. The review stays private until the next check.",
  version: "core-0.1",
  model: null,
};

export default endpoint(["POST"], async (request, response) => {
  assertSubmissionsOpen();
  assertSameOrigin(request);
  const input = reviewInput.parse(readJson(request));
  await verifyTurnstile(request, input.turnstileToken);
  await enforceRateLimit(request, "review", 3, 10 * 60 * 1_000);
  const created = await createReview(request, input);
  const processed = await processTarget("review", created.review.id);
  const decision = processed?.decision ?? pendingDecision;
  return sendJson(response, 202, {
    ok: true,
    review: { ...created.review, status: decision.status },
    receipt: created.receipt,
    decision,
  });
});
