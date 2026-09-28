import { z } from "zod";

// Default messages are dictionary keys (translated by FieldError / tr()).
z.config({
  customError: (issue) => {
    if (issue.code === "too_small" && issue.origin === "string") return `validation.minChars?min=${issue.minimum}`;
    if (issue.code === "too_big" && issue.origin === "string") return `validation.maxChars?max=${issue.maximum}`;
    if (issue.code === "invalid_type" && issue.input === undefined) return "validation.required";
    return "validation.invalid";
  },
});

export const idSchema = z.number().int().positive();
export const optionalId = z.number().int().positive().nullable().optional();
// z.guid(): any 8-4-4-4-12 hex id (Postgres uuid accepts non-RFC variants too).
export const uuidSchema = z.guid({ error: "validation.invalidId" });

/** +998 90 123 45 67 → +998901234567 */
export function normalizePhone(value: string): string {
  const digits = value.replace(/[^\d+]/g, "");
  if (/^\d{9}$/.test(digits)) return `+998${digits}`;
  if (/^998\d{9}$/.test(digits)) return `+${digits}`;
  return digits;
}

export const phoneSchema = z
  .string()
  .trim()
  .transform(normalizePhone)
  .pipe(z.string().regex(/^\+998\d{9}$/, { error: "validation.phone" }));

export const optionalPhone = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? normalizePhone(v) : undefined))
  .pipe(
    z
      .string()
      .regex(/^\+998\d{9}$/, { error: "validation.phone" })
      .optional(),
  );

export const moneySchema = z.number().int().min(0).max(10_000_000_000).nullable().optional();

export const locationFields = {
  regionId: optionalId,
  districtId: optionalId,
  settlementId: optionalId,
  mahallaId: optionalId,
  lat: z.number().min(37).max(45.7).nullable().optional(),
  lng: z.number().min(55.9).max(73.2).nullable().optional(),
};

export const safeUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => /^https?:\/\/[^\s]+$/i.test(v), { error: "validation.url" });

/** Plain text field: trims and strips control characters (React escapes HTML on render). */
export const text = (max: number) =>
  z
    .string()
    .transform((v) => v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim())
    .pipe(z.string().max(max, { error: `validation.maxChars?max=${max}` }));

export function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
