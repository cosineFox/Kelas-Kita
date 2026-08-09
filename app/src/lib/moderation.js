import { similarity } from "./catalog.js";

const capsRatio = (text) => {
  const letters = [...text].filter((character) => /[a-z]/i.test(character));
  if (letters.length <= 24) return 0;
  return letters.filter((character) => /[A-Z]/.test(character)).length / letters.length;
};

const checks = [
  {
    id: "threat",
    label: "Threats",
    severity: "block",
    test: (text) => /\b(?:i(?:'ll| will| am going to) (?:kill|hurt|attack)|you (?:should|deserve to) die|bomb (?:the|this)|shoot (?:him|her|them|you))\b/i.test(text),
    message: "Threats cannot be submitted through KelasKita.",
  },
  {
    id: "attack",
    label: "Personal attacks",
    severity: "block",
    test: (text) => /\b(idiot|moron|stupid|useless|pathetic|bitch|asshole|hate (him|her|them)|worst human)\b/i.test(text),
    message: "Describe the teaching behaviour and its effect, without insulting the person.",
  },
  {
    id: "pii",
    label: "Personal information",
    severity: "block",
    test: (text) => /(?:[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?\d[\s().-]*){8,}|@[a-z0-9_]{3,}|\b\d{6}-?\d{2}-?\d{4}\b)/i.test(text),
    message: "Remove email addresses, phone numbers, identity numbers, or social handles.",
  },
  {
    id: "links",
    label: "Promotional links",
    severity: "block",
    test: (text) => /(?:https?:\/\/|www\.)/i.test(text),
    message: "Links are not allowed in public reviews.",
  },
  {
    id: "grave",
    label: "Serious allegation",
    severity: "hold",
    test: (text) => /\b(?:brib(?:e|ed|ery)|corrupt(?:ion)?|sexual(?:ly)? harass(?:ed|ment)?|assault(?:ed)?|rape(?:d)?|molest(?:ed|ation)?|blackmail(?:ed)?|falsif(?:y|ied) marks?|committed fraud|stole money)\b/i.test(text),
    message: "This describes serious misconduct. It will be held for specialist review and should also be reported through the university's official channel.",
  },
  {
    id: "flooding",
    label: "Repeated or shouted text",
    severity: "warn",
    test: (text) => /(.)\1{5,}|\b(\w+)(?:\s+\1){3,}\b/i.test(text) || capsRatio(text) > 0.58,
    message: "Use normal sentence case and remove repeated words or characters.",
  },
];

const duplicateReview = (text, previous) =>
  previous.some((review) => text.length > 45 && similarity(text, review.body) >= 0.84);

export const analyseFeedback = (text, previous = []) => {
  const issues = checks.filter(({ test }) => test(text)).map(({ test, ...issue }) => issue);

  if (duplicateReview(text, previous)) {
    issues.push({
      id: "duplicate",
      label: "Duplicate feedback",
      severity: "block",
      message: "This is very similar to an existing review. Share your own experience.",
    });
  }

  if (text.trim().length > 0 && text.trim().length < 70) {
    issues.push({
      id: "specificity",
      label: "Needs more context",
      severity: "warn",
      message: "Mention what happened, when it mattered, and how it affected learning.",
    });
  }

  return {
    issues,
    blockers: issues.filter((issue) => issue.severity === "block"),
    requiresHold: issues.some((issue) => issue.severity === "hold"),
    ready: text.trim().length >= 70 && !issues.some((issue) => issue.severity === "block"),
  };
};
