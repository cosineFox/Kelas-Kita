import { z } from "zod";

const text = (min, max) => z.string().trim().min(min).max(max);
const token = z.string().min(1).max(2_048);

const course = z.object({
  code: text(2, 24),
  name: text(3, 160),
  university: text(3, 160),
  faculty: text(2, 160),
});

const lecturer = z.object({ name: text(2, 160) });

export const reviewInput = z.object({
  course,
  lecturer,
  semester: text(2, 40),
  year: z.coerce.number().int().min(2000).max(2100),
  courseRating: z.number().int().min(1).max(5),
  lecturerRating: z.number().int().min(1).max(5),
  workload: z.enum(["Light", "Balanced", "Heavy", "Extreme"]),
  body: text(70, 4_000),
  turnstileToken: token,
});

export const reportInput = z.object({
  reviewId: z.string().uuid(),
  reason: z.enum([
    "Threat or immediate safety",
    "Personal information or doxxing",
    "Serious unverified allegation",
    "Harassment or personal attack",
    "Spam or manipulation",
    "Other policy breach",
  ]),
  details: text(20, 1_500),
  turnstileToken: token,
});

export const appealInput = z.object({
  reviewId: z.string().uuid().nullable().optional(),
  reportId: z.string().uuid().nullable().optional(),
  receipt: z.string().trim().min(20).max(128).optional(),
  details: text(70, 1_500),
  contact: z.union([z.literal(""), z.string().trim().email().max(254)]).default(""),
  turnstileToken: token,
}).superRefine((value, context) => {
  if (value.reportId && value.reviewId) return;
  if (value.receipt) return;
  context.addIssue({ code: "custom", message: "Provide a moderation receipt or linked report." });
});

export const replyInput = z.object({
  reviewId: z.string().uuid(),
  email: z.string().trim().email().max(254),
  body: text(70, 2_000),
  turnstileToken: token,
});

export const adminDecisionInput = z.object({
  kind: z.enum(["review", "report", "appeal", "reply"]),
  targetId: z.string().uuid(),
  action: z.enum(["publish", "hold", "reject", "remove", "restore", "no_action", "dismiss"]),
  reason: text(10, 500),
});
