import { z } from "zod";
import { text, uuidSchema } from "./common";

export const applySchema = z.object({
  vacancyId: uuidSchema,
  coverLetter: text(3000).optional(),
});

export const applicationStatusSchema = z.object({
  applicationId: uuidSchema,
  status: z.enum(["viewed", "shortlisted", "interview", "offered", "hired", "rejected"]),
});

export const messageSchema = z.object({
  conversationId: uuidSchema,
  body: z
    .string()
    .transform((v) => v.trim())
    .pipe(z.string().min(1, { error: "Xabar boʻsh" }).max(4000, { error: "Xabar juda uzun" })),
});

export const reviewSchema = z.object({
  applicationId: uuidSchema,
  rating: z.number().int().min(1).max(5),
  comment: text(2000).optional(),
});

export const reportSchema = z.object({
  targetType: z.enum(["vacancy", "user", "company", "message", "review"]),
  targetId: uuidSchema,
  reason: z.enum(["scam", "spam", "fake_job", "illegal_job", "misleading_salary", "inappropriate", "other"]),
  details: text(2000).optional(),
});

export const savedSearchSchema = z.object({
  kind: z.enum(["vacancies", "candidates"]),
  name: z.string().trim().min(1).max(120),
  query: text(120).optional(),
  professionId: z.number().int().positive().nullable().optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  regionId: z.number().int().positive().nullable().optional(),
  districtId: z.number().int().positive().nullable().optional(),
  settlementId: z.number().int().positive().nullable().optional(),
  radiusKm: z.number().int().min(1).max(500).nullable().optional(),
});

export const verificationRequestSchema = z.object({
  type: z.enum(["phone", "identity", "certificate", "company"]),
  note: text(1000).optional(),
});
