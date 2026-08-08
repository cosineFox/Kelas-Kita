const origin = new URL(process.env.PUBLIC_ORIGIN ?? "").origin;
const adminSecret = process.env.ADMIN_SECRET;
if (!origin || !adminSecret) throw new Error("PUBLIC_ORIGIN and ADMIN_SECRET are required");

const publicState = await fetch(`${origin}/api/state`);
if (!publicState.ok) throw new Error(`Public state failed with ${publicState.status}`);
const state = await publicState.json();
for (const privateField of ["agentFindings", "contact", "receiptHash", "submissionKeyHash"]) {
  if (JSON.stringify(state).includes(privateField)) throw new Error(`Public state exposed ${privateField}`);
}

const login = await fetch(`${origin}/api/admin/session`, {
  method: "POST",
  headers: { "content-type": "application/json", origin },
  body: JSON.stringify({ secret: adminSecret }),
});
if (!login.ok) throw new Error(`Operator login failed with ${login.status}`);
const cookie = login.headers.getSetCookie?.()[0] ?? login.headers.get("set-cookie");
if (!cookie) throw new Error("Operator login did not set a session cookie");

const health = await fetch(`${origin}/api/admin/health?live=1`, { headers: { cookie: cookie.split(";")[0] } });
if (!health.ok) throw new Error(`Production health check failed with ${health.status}`);
const result = await health.json();
if (!result.database.ok) throw new Error("Production database check failed");
if (!result.aiGateway.ok) throw new Error(`AI Gateway check failed for ${result.aiGateway.model}`);
const missing = Object.entries(result.configuration).filter(([, ready]) => !ready).map(([name]) => name);
if (missing.length) throw new Error(`Production configuration is incomplete: ${missing.join(", ")}`);

console.log(JSON.stringify({ publicState: "ok", database: "ok", aiGateway: "ok", model: result.aiGateway.model }, null, 2));
