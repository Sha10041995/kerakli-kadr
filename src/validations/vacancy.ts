import { z } from "zod";
import { locationFields, moneySchema, optionalId, text } from "./common";

export const vacancySchema = z
  .object({
    title: z.string().trim().min(3, { error: "validation.titleMin" }).max(160),
    description: z.string().trim().min(20, { error: "validation.descriptionMin" }).max(10000),
    professionId: z.number({ error: "validation.profession" }).int().positive(),
    categoryId: optionalId,
    experienceMinYears: z.number().min(0).max(50),
    educationLevel: z.enum(["none", "secondary", "vocational", "bachelor", "master", "doctorate"]).nullable().optional(),
    salaryMin: moneySchema,
    salaryMax: moneySchema,
    salaryCurrency: z.enum(["UZS", "USD"]),
    salaryType: z.enum(["monthly", "daily", "hourly", "per_task", "negotiable"]),
    employmentType: z.enum([
      "full_time",
      "part_time",
      "temporary",
      "freelance",
      "daily",
      "hourly",
      "seasonal",
      "internship",
      "remote",
    ]),
    workSchedule: z.enum(["full_day", "shift", "flexible", "night", "weekends"]),
    positionsCount: z.number().int().min(1).max(1000),
    addressText: text(300).optional(),
    remoteAllowed: z.boolean(),
    transportProvided: z.boolean(),
    accommodationProvided: z.boolean(),
    mealProvided: z.boolean(),
    urgent: z.boolean(),
    applicationDeadline: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional()
      .or(z.literal("")),
    skillIds: z.array(z.number().int().positive()).max(20),
    publish: z.boolean(),
    ...locationFields,
  })
  .refine((v) => v.regionId != null || v.remoteAllowed, {
    path: ["regionId"],
    error: "validation.workplace",
  })
  .refine((v) => v.salaryMin == null || v.salaryMax == null || v.salaryMax >= v.salaryMin, {
    path: ["salaryMax"],
    error: "validation.salaryRange",
  })
  .refine((v) => !v.applicationDeadline || v.applicationDeadline >= new Date().toISOString().slice(0, 10), {
    path: ["applicationDeadline"],
    error: "validation.deadline",
  });
export type VacancyInput = z.input<typeof vacancySchema>;
export type VacancyData = z.output<typeof vacancySchema>;
