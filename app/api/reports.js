import { endpoint, readJson, sendJson } from "./_lib/http.js";
import { assertSameOrigin } from "./_lib/origin.js";
import { assertCaseRoutesOpen } from "./_lib/launchGate.js";
import { processTarget } from "./_lib/queue.js";
import { enforceRateLimit } from "./_lib/rateLimit.js";
import { createReport } from "./_lib/repository.js";
import { reportInput } from "./_lib/schemas.js";
import { verifyTurnstile } from "./_lib/turnstile.js";

export default endpoint(["POST"], async (request, response) => {
  assertCaseRoutesOpen();
  assertSameOrigin(request);
  const input = reportInput.parse(readJson(request));
  await verifyTurnstile(request, input.turnstileToken);
  await enforceRateLimit(request, "report", 3, 10 * 60 * 1_000);
  const report = await createReport(request, input);
  const processed = await processTarget("report", report.id);
  const decision = processed?.decision ?? {
    action: "escalate",
    appealable: true,
    status: "pending",
    summary: "We queued your report.",
    version: "core-0.1",
    model: null,
  };
  return sendJson(response, 202, { ok: true, report, decision });
});
