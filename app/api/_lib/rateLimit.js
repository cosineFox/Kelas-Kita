import { getSql } from "./db.js";
import { HttpError } from "./http.js";
import { requestHash } from "./identity.js";

export const enforceRateLimit = async (request, scope, limit, windowMs, now = Date.now()) => {
  const sql = getSql();
  const keyHash = requestHash(request, `rate:${scope}`, new Date(now));
  const bucketStart = new Date(Math.floor(now / windowMs) * windowMs);
  const expiresAt = new Date(bucketStart.getTime() + windowMs * 2);
  const rows = await sql`
    insert into rate_limit_buckets (key_hash, scope, bucket_start, count, expires_at)
    values (${keyHash}, ${scope}, ${bucketStart}, 1, ${expiresAt})
    on conflict (key_hash, scope, bucket_start) do update
      set count = rate_limit_buckets.count + 1
      where rate_limit_buckets.count < ${limit}
    returning count
  `;

  if (!rows.length) {
    const retryAfter = Math.max(1, Math.ceil((bucketStart.getTime() + windowMs - now) / 1_000));
    const error = new HttpError(429, "rate_limited", "Too many attempts. Please wait before trying again.");
    error.retryAfter = retryAfter;
    throw error;
  }
};
