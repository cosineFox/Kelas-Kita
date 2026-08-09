import { createHash, timingSafeEqual } from "node:crypto";
import { requireEnv } from "../_lib/config.js";
import { endpoint, HttpError, sendJson } from "../_lib/http.js";
import { processQueue } from "../_lib/queue.js";
import { deleteExpiredData } from "../_lib/repository.js";

const digest = (value) => createHash("sha256").update(value).digest();

export default endpoint(["GET", "POST"], async (request, response) => {
  const supplied = request.headers.authorization ?? "";
  const expected = `Bearer ${requireEnv("CRON_SECRET")}`;
  if (!timingSafeEqual(digest(supplied), digest(expected))) {
    throw new HttpError(401, "invalid_cron_secret", "Cron authentication failed.");
  }

  const results = await processQueue(3);
  const deleted = await deleteExpiredData();
  return sendJson(response, 200, {
    processed: results.length,
    completed: results.filter((result) => result.complete).length,
    retentionDeletes: deleted.reduce((total, count) => total + count, 0),
  });
});
