const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const token = required("CLOUDFLARE_API_TOKEN");
const zoneId = required("CLOUDFLARE_ZONE_ID");
const hostname = required("PUBLIC_HOSTNAME").toLowerCase();
const target = required("VERCEL_CNAME_TARGET").toLowerCase().replace(/\.$/, "");
const validHost = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
if (!validHost.test(hostname) || !validHost.test(target)) throw new Error("Host and CNAME target must be valid hostnames");

const base = "https://api.cloudflare.com/client/v4";
const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };
const call = async (path, options = {}) => {
  const response = await fetch(`${base}${path}`, { ...options, headers });
  const payload = await response.json();
  if (!response.ok || !payload.success) throw new Error(payload.errors?.map((error) => error.message).join("; ") || `Cloudflare returned ${response.status}`);
  return payload.result;
};

const existing = await call(`/zones/${zoneId}/dns_records?type=CNAME&name=${encodeURIComponent(hostname)}`);
const body = JSON.stringify({
  type: "CNAME",
  name: hostname,
  content: target,
  proxied: true,
  ttl: 1,
  comment: "KelasKita production on Vercel",
});
const path = existing[0] ? `/zones/${zoneId}/dns_records/${existing[0].id}` : `/zones/${zoneId}/dns_records`;
await call(path, { method: existing[0] ? "PUT" : "POST", body });
console.log(`Pointed ${hostname} to the exact Vercel CNAME target and enabled the Cloudflare proxy.`);
