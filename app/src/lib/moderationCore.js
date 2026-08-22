const issueCategories = {
  attack: "harassment",
  duplicate: "spam",
  flooding: "spam",
  grave: "serious_allegation",
  links: "spam",
  pii: "personal_information",
  threat: "threat",
};

const urgentCategories = new Set(["personal_information", "threat"]);
const graveCategories = new Set(["criminal_allegation", "corruption", "serious_allegation", "sexual_misconduct"]);

const result = (kind, action, status, reasonCodes, summary) => ({
  version: "core-0.1",
  kind,
  action,
  status,
  reasonCodes: [...new Set(reasonCodes)],
  summary,
  automated: true,
  appealable: action !== "publish",
});

export const decideModeration = ({ kind = "review", analysis, agents = [], aiAvailable = false }) => {
  const categories = new Set(
    analysis.issues.map((issue) => issueCategories[issue.id]).filter(Boolean),
  );

  for (const finding of agents) {
    if (["high", "critical"].includes(finding.severity)) {
      finding.categories.filter((category) => category !== "none").forEach((category) => categories.add(category));
    }
  }

  const reasons = [...categories];
  const urgent = [...categories].some((category) => urgentCategories.has(category));
  const grave = [...categories].some((category) => graveCategories.has(category));

  if (kind === "appeal") {
    return result(kind, "escalate", "pending", reasons.length ? reasons : ["appeal_requested"], "We queued your appeal and left the current decision in place.");
  }

  if (kind === "reply") {
    return result(kind, "escalate", "pending", ["identity_verification"], "We queued your reply for identity and content checks.");
  }

  if (urgent) {
    return kind === "report"
      ? result(kind, "hide", "held", reasons, "The Core hid the review because the text contains an urgent safety or privacy risk.")
      : result(kind, "reject", "rejected", reasons, "The Core rejected the submission because the text contains an urgent safety or privacy risk.");
  }

  if (grave) {
    return result(kind, "hold", "held", reasons, "KelasKita could not verify the serious allegation, so the Core held the submission.");
  }

  if (categories.has("harassment") || categories.has("spam")) {
    return result(kind, kind === "report" ? "escalate" : "hold", "held", reasons, "The Core held the text because it contains harassment or spam signals.");
  }

  if (!aiAvailable) {
    return kind === "report"
      ? result(kind, "escalate", "pending", ["agent_unavailable"], "Qwen did not respond. We queued the report and kept the review visible.")
      : result(kind, "queue", "pending", ["agent_unavailable"], "Qwen did not respond. We kept the submission pending.");
  }

  return kind === "report"
    ? result(kind, "no_action", "published", ["no_policy_breach_detected"], "Qwen found no listed policy breach. We kept the review visible and recorded the report.")
    : result(kind, "publish", "published", ["screened_low_risk"], "Qwen found no listed policy breach. We published the submission.");
};
