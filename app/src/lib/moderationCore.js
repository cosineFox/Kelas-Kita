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
    return result(kind, "escalate", "pending", reasons.length ? reasons : ["appeal_requested"], "We queued a separate appeal review and kept the original decision in place.");
  }

  if (kind === "reply") {
    return result(kind, "escalate", "pending", ["identity_verification"], "We will verify the reply's author and run a separate moderation check.");
  }

  if (urgent) {
    return kind === "report"
      ? result(kind, "hide", "held", reasons, "The Core hid the content after detecting an urgent safety or privacy signal.")
      : result(kind, "reject", "rejected", reasons, "The Core withheld the submission after detecting an urgent safety or privacy signal.");
  }

  if (grave) {
    return result(kind, "hold", "held", reasons, "The Core held the serious unverified allegation for specialist review.");
  }

  if (categories.has("harassment") || categories.has("spam")) {
    return result(kind, kind === "report" ? "escalate" : "hold", "held", reasons, "The Core held the content for a review of manipulation or harassment signals.");
  }

  if (!aiAvailable) {
    return kind === "report"
      ? result(kind, "escalate", "pending", ["agent_unavailable"], "The agent failed, so we queued the report without removing the content.")
      : result(kind, "queue", "pending", ["agent_unavailable"], "The agent failed, so we kept the submission pending.");
  }

  return kind === "report"
    ? result(kind, "no_action", "published", ["no_policy_breach_detected"], "The checks found no immediate policy breach. We recorded the report and accept an appeal.")
    : result(kind, "publish", "published", ["screened_low_risk"], "The checks found no policy reason to withhold the submission.");
};
