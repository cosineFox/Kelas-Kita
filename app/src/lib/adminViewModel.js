const text = (value, fallback = "") => typeof value === "string" ? value : fallback;
const kinds = new Set(["appeal", "reply", "report", "review"]);

const normaliseFinding = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return {
    agent: text(value.agent, "unknown"),
    severity: text(value.severity, "unknown"),
    rationale: text(value.rationale, "No rationale supplied."),
  };
};

const normaliseCase = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (!kinds.has(value.kind) || typeof value.targetId !== "string") return null;

  const attempts = Number(value.attempts);
  return {
    ...value,
    agentFindings: Array.isArray(value.agentFindings)
      ? value.agentFindings.map(normaliseFinding).filter(Boolean)
      : [],
    attempts: Number.isFinite(attempts) ? attempts : 0,
    body: text(value.body, "No review text supplied."),
    contact: text(value.contact) || null,
    courseCode: text(value.courseCode, "Unknown class"),
    courseName: text(value.courseName, "Unknown class"),
    createdAt: text(value.createdAt, new Date(0).toISOString()),
    details: text(value.details) || null,
    jobState: text(value.jobState) || null,
    lastAction: text(value.lastAction) || null,
    lastError: text(value.lastError) || null,
    lecturerName: text(value.lecturerName, "Unknown lecturer"),
    reasonCodes: Array.isArray(value.reasonCodes) ? value.reasonCodes.filter((item) => typeof item === "string") : [],
    state: text(value.state, "unknown"),
    urgent: Boolean(value.urgent),
  };
};

export const normaliseAdminQueue = (value) => Array.isArray(value?.cases)
  ? value.cases.map(normaliseCase).filter(Boolean)
  : [];

export const normaliseAdminHealth = (value) => ({
  aiGateway: {
    model: text(value?.aiGateway?.model) || null,
    ok: Boolean(value?.aiGateway?.ok),
    tested: Boolean(value?.aiGateway?.tested),
  },
  configuration: value?.configuration && typeof value.configuration === "object" && !Array.isArray(value.configuration)
    ? Object.fromEntries(Object.entries(value.configuration).map(([key, ready]) => [key, Boolean(ready)]))
    : {},
  database: { ok: Boolean(value?.database?.ok) },
});
