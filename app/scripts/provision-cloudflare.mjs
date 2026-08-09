import { writeFile } from "node:fs/promises";

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const token = required("CLOUDFLARE_API_TOKEN");
const accountId = required("CLOUDFLARE_ACCOUNT_ID");
const zoneId = required("CLOUDFLARE_ZONE_ID");
const hostname = required("PUBLIC_HOSTNAME").toLowerCase();
const edgeSecret = required("EDGE_PROXY_SECRET");
if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(hostname)) {
  throw new Error("PUBLIC_HOSTNAME must be a valid hostname");
}
if (!/^[A-Za-z0-9_-]{40,128}$/.test(edgeSecret)) throw new Error("EDGE_PROXY_SECRET must be 40–128 URL-safe characters");
const base = "https://api.cloudflare.com/client/v4";
const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };

const cloudflare = async (path, options = {}, allowNotFound = false) => {
  const response = await fetch(`${base}${path}`, { ...options, headers: { ...headers, ...options.headers } });
  const payload = await response.json();
  if (allowNotFound && response.status === 404) return null;
  if (!response.ok || !payload.success) {
    const message = payload.errors?.map((error) => error.message).join("; ") || `Cloudflare returned ${response.status}`;
    throw new Error(message);
  }
  return payload.result;
};

const widgetName = "KelasKita production";
const listed = await cloudflare(`/accounts/${accountId}/challenges/widgets?filter=${encodeURIComponent(`name:${widgetName}`)}`);
let widget = listed.find((item) => item.name === widgetName);
let createdWidget = false;
if (!widget) {
  widget = await cloudflare(`/accounts/${accountId}/challenges/widgets`, {
    method: "POST",
    body: JSON.stringify({ domains: [hostname], mode: "managed", name: widgetName }),
  });
  createdWidget = true;
}

if (createdWidget) {
  await writeFile(".cloudflare-provisioning.json", `${JSON.stringify({
    hostname,
    turnstileSiteKey: widget.sitekey,
    turnstileSecretKey: widget.secret,
  }, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  console.log("Created the Turnstile widget. Credentials are in .cloudflare-provisioning.json (mode 0600; git-ignored).");
} else {
  console.log(`Reused Turnstile widget ${widget.sitekey}. Retrieve its existing secret in the Cloudflare dashboard.`);
}

const description = "KelasKita write surge guard";
const rule = {
  description,
  expression: `(http.host eq "${hostname}" and http.request.method eq "POST" and starts_with(http.request.uri.path, "/api/"))`,
  action: "managed_challenge",
  ratelimit: {
    characteristics: ["cf.colo.id", "ip.src"],
    period: 10,
    requests_per_period: 20,
    mitigation_timeout: 0,
  },
};

let ruleset = await cloudflare(`/zones/${zoneId}/rulesets/phases/http_ratelimit/entrypoint`, {}, true);
if (!ruleset) {
  ruleset = await cloudflare(`/zones/${zoneId}/rulesets`, {
    method: "POST",
    body: JSON.stringify({ name: "Zone rate limiting", description: "KelasKita edge limits", kind: "zone", phase: "http_ratelimit", rules: [rule] }),
  });
} else {
  const existing = ruleset.rules?.find((item) => item.description === description);
  const path = existing
    ? `/zones/${zoneId}/rulesets/${ruleset.id}/rules/${existing.id}`
    : `/zones/${zoneId}/rulesets/${ruleset.id}/rules`;
  await cloudflare(path, { method: existing ? "PATCH" : "POST", body: JSON.stringify(rule) });
}

console.log("Applied the KelasKita edge surge rule.");

const transformDescription = "KelasKita trusted edge origin gate";
const transformRule = {
  ref: "kelaskita_trusted_edge_origin_gate",
  description: transformDescription,
  expression: `(http.host eq "${hostname}" and starts_with(http.request.uri.path, "/api/"))`,
  action: "rewrite",
  action_parameters: {
    headers: {
      "x-kelaskita-edge-key": { operation: "set", value: edgeSecret },
    },
  },
};

let transformRuleset = await cloudflare(`/zones/${zoneId}/rulesets/phases/http_request_late_transform/entrypoint`, {}, true);
if (!transformRuleset) {
  transformRuleset = await cloudflare(`/zones/${zoneId}/rulesets`, {
    method: "POST",
    body: JSON.stringify({
      name: "Zone request header transforms",
      description: "KelasKita origin authentication",
      kind: "zone",
      phase: "http_request_late_transform",
      rules: [transformRule],
    }),
  });
} else {
  const existing = transformRuleset.rules?.find((item) => item.description === transformDescription);
  const path = existing
    ? `/zones/${zoneId}/rulesets/${transformRuleset.id}/rules/${existing.id}`
    : `/zones/${zoneId}/rulesets/${transformRuleset.id}/rules`;
  await cloudflare(path, { method: existing ? "PATCH" : "POST", body: JSON.stringify(transformRule) });
}

console.log("Applied the trusted-edge origin gate without printing its secret.");
