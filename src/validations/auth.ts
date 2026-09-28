import { z } from "zod";
import { optionalPhone } from "./common";

export const loginSchema = z.object({
  email: z.email({ error: "validation.email" }).trim().toLowerCase(),
  password: z.string().min(1, { error: "validation.passwordRequired" }).max(128),
  next: z.string().optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const passwordSchema = z
  .string()
  .min(8, { error: "validation.passwordMin" })
  .max(128)
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), { error: "validation.passwordMix" });

export const registerSchema = z.object({
  role: z.enum(["job_seeker", "employer"], { error: "validation.role" }),
  firstName: z.string().trim().min(2, { error: "validation.firstName" }).max(80),
  lastName: z.string().trim().min(2, { error: "validation.lastName" }).max(80),
  email: z.email({ error: "validation.email" }).trim().toLowerCase(),
  phone: optionalPhone,
  password: passwordSchema,
  acceptTerms: z.literal(true, { error: "validation.terms" }),
});
export type RegisterInput = z.input<typeof registerSchema>;
