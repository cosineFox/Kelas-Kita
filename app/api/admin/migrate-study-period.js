import { requireAdmin } from "../_lib/adminAuth.js";
import { getSql } from "../_lib/db.js";
import { endpoint, sendJson } from "../_lib/http.js";
import { assertSameOrigin } from "../_lib/origin.js";

export default endpoint(["POST"], async (request, response) => {
  requireAdmin(request);
  assertSameOrigin(request);
  const sql = getSql();
  await sql`alter table reviews drop constraint if exists reviews_semester_check`;
  await sql`alter table reviews add constraint reviews_semester_check check (char_length(btrim(semester)) between 2 and 40)`;
  return sendJson(response, 200, { ok: true, migration: "002_flexible_study_period" });
});
