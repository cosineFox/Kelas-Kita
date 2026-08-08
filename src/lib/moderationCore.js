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
    return result(kind, "escalate", "pending", reasons.length ? reasons : ["appeal_requested"], "The appeal is queued for a separate review. The original decision remains in place meanwhile.");
  }

  if (kind === "reply") {
    return result(kind, "escalate", "pending", ["identity_verification"], "The reply is pending verification and an independent moderation pass.");
  }

  if (urgent) {
    return kind === "report"
      ? result(kind, "hide", "held", reasons, "The content is temporarily hidden because an urgent safety or privacy signal was detected.")
      : result(kind, "reject", "rejected", reasons, "The submission cannot be published because it contains an urgent safety or privacy signal.");
  }

  if (grave) {
    return result(kind, "hold", "held", reasons, "The content is held because it contains a serious unverified allegation requiring specialist review.");
  }

  if (categories.has("harassment") || categories.has("spam")) {
    return result(kind, kind === "report" ? "escalate" : "hold", "held", reasons, "The content is held while manipulation or harassment signals are reviewed.");
  }

  if (!aiAvailable) {
    return kind === "report"
      ? result(kind, "escalate", "pending", ["agent_unavailable"], "No automatic takedown was made. The report is queued because the moderation agent was unavailable.")
      : result(kind, "queue", "pending", ["agent_unavailable"], "The submission remains pending because the moderation agent was unavailable.");
  }

  return kind === "report"
    ? result(kind, "no_action", "published", ["no_policy_breach_detected"], "The report did not identify an immediate policy breach. It remains recorded and can be appealed.")
    : result(kind, "publish", "published", ["screened_low_risk"], "The automated checks found no policy reason to withhold the submission.");
};
