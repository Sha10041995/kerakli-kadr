import { z } from "zod";
import { optionalPhone } from "./common";

export const loginSchema = z.object({
  email: z.email({ error: "Email notoʻgʻri" }).trim().toLowerCase(),
  password: z.string().min(1, { error: "Parolni kiriting" }).max(128),
  next: z.string().optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const passwordSchema = z
  .string()
  .min(8, { error: "Parol kamida 8 ta belgidan iborat boʻlsin" })
  .max(128)
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), { error: "Parolda harf va raqam boʻlsin" });

export const registerSchema = z.object({
  role: z.enum(["job_seeker", "employer"], { error: "Rolni tanlang" }),
  firstName: z.string().trim().min(2, { error: "Ismingizni kiriting" }).max(80),
  lastName: z.string().trim().min(2, { error: "Familiyangizni kiriting" }).max(80),
  email: z.email({ error: "Email notoʻgʻri" }).trim().toLowerCase(),
  phone: optionalPhone,
  password: passwordSchema,
  acceptTerms: z.literal(true, { error: "Foydalanish shartlariga rozilik bildiring" }),
});
export type RegisterInput = z.input<typeof registerSchema>;
