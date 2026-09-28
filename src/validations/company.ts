import { z } from "zod";
import { locationFields, safeUrl, text } from "./common";

export const companySchema = z
  .object({
    name: z.string().trim().min(2, { error: "validation.name" }).max(160),
    companyType: z.enum(["individual", "sole_proprietor", "llc", "farm", "state", "ngo", "other"]),
    stir: z
      .string()
      .trim()
      .regex(/^\d{9}$/, { error: "validation.stir" })
      .optional()
      .or(z.literal("")),
    description: text(5000).optional(),
    website: safeUrl.optional().or(z.literal("")),
    address: text(300).optional(),
    ...locationFields,
  })
  .refine((v) => v.companyType === "individual" || !!v.stir, {
    path: ["stir"],
    error: "validation.stirRequired",
  })
  .refine((v) => v.regionId != null, { path: ["regionId"], error: "validation.region" });
export type CompanyInput = z.input<typeof companySchema>;
