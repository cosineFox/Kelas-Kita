import { HttpError } from "./http.js";
import { isProduction, requireEnv } from "./config.js";
import { requestIp } from "./identity.js";

const endpoint = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const action = "turnstile-spin-v2";

export const verifyTurnstile = async (request, token) => {
  if (!token || token.length > 2_048) {
    throw new HttpError(400, "turnstile_required", "Complete the anti-bot check before submitting.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  let result;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: requireEnv("TURNSTILE_SECRET_KEY"),
        response: token,
        remoteip: requestIp(request),
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`siteverify ${response.status}`);
    result = await response.json();
  } catch {
    throw new HttpError(403, "turnstile_failed", "The anti-bot check could not be verified.");
  } finally {
    clearTimeout(timeout);
  }

  if (result.success !== true || result.action !== action) {
    throw new HttpError(403, "turnstile_failed", "The anti-bot check could not be verified.");
  }

  const allowedHosts = (process.env.TURNSTILE_HOSTNAMES ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  if (isProduction() && (!result.hostname || !allowedHosts.includes(result.hostname.toLowerCase()))) {
    throw new HttpError(403, "turnstile_hostname", "The anti-bot check came from an unexpected host.");
  }

  return { challengeTimestamp: result.challenge_ts, hostname: result.hostname };
};
