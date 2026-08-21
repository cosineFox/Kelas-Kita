import { requireAdmin } from "../_lib/adminAuth.js";
import { getSql } from "../_lib/db.js";
import { endpoint, sendJson } from "../_lib/http.js";
import { classifyContent, moderationModel } from "../_lib/moderation.js";
import { assertSameOrigin } from "../_lib/origin.js";

const present = (name) => Boolean(process.env[name]?.trim());

export default endpoint(["GET", "POST"], async (request, response) => {
  requireAdmin(request);
  const sql = getSql();
  if (request.method === "POST") {
    assertSameOrigin(request);
    await sql`alter table reviews drop constraint if exists reviews_semester_check`;
    await sql`alter table reviews add constraint reviews_semester_check check (char_length(btrim(semester)) between 2 and 40)`;
    return sendJson(response, 200, { ok: true, migration: "002_flexible_study_period" });
  }
  const [database] = await sql`select now() as checked_at`;
  const live = request.query?.live === "1";
  const ai = live
    ? await classifyContent({
      kind: "review",
      text: "The weekly examples clarified difficult topics, and earlier rubric feedback would improve preparation for the final project.",
    })
    : null;

  return sendJson(response, 200, {
    database: { ok: true, checkedAt: database.checked_at },
    aiGateway: { tested: live, ok: ai?.aiAvailable ?? null, model: moderationModel },
    configuration: {
      abuseHash: present("ABUSE_HASH_SECRET"),
      contactEncryption: present("CONTACT_ENCRYPTION_KEY"),
      cron: present("CRON_SECRET"),
      edgeProxy: present("EDGE_PROXY_SECRET"),
      operatorContact: present("OPERATOR_CONTACT_EMAIL"),
      publicOrigin: present("PUBLIC_ORIGIN"),
      submissionsOpen: process.env.SUBMISSIONS_OPEN === "true",
      turnstile: present("TURNSTILE_SECRET_KEY") && present("TURNSTILE_HOSTNAMES"),
    },
  });
});
