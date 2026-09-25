import { z } from "zod";
import { locationFields, moneySchema, optionalId, optionalPhone, safeUrl, text } from "./common";

const employmentType = z.enum([
  "full_time",
  "part_time",
  "temporary",
  "freelance",
  "daily",
  "hourly",
  "seasonal",
  "internship",
  "remote",
]);
const educationLevel = z.enum(["none", "secondary", "vocational", "bachelor", "master", "doctorate"]);

export const candidateProfileSchema = z
  .object({
    firstName: z.string().trim().min(2, { error: "Ismingizni kiriting" }).max(80),
    lastName: z.string().trim().min(2, { error: "Familiyangizni kiriting" }).max(80),
    phone: optionalPhone,
    birthYear: z.number().int().min(1940).max(2015).nullable().optional(),
    headline: text(120),
    about: text(3000).optional(),
    professionId: optionalId,
    experienceYears: z.number().min(0).max(70),
    educationLevel: educationLevel.nullable().optional(),
    expectedSalaryMin: moneySchema,
    expectedSalaryMax: moneySchema,
    salaryType: z.enum(["monthly", "daily", "hourly", "per_task", "negotiable"]),
    employmentTypes: z.array(employmentType).min(1, { error: "Kamida bitta ish turini tanlang" }).max(9),
    availability: z.enum(["immediately", "within_week", "within_month", "open_to_offers", "not_available"]),
    hasTransport: z.boolean(),
    remoteOk: z.boolean(),
    relocateOk: z.boolean(),
    workRadiusKm: z.number().int().min(1).max(500),
    isPublic: z.boolean(),
    skillIds: z.array(z.number().int().positive()).max(30, { error: "Koʻpi bilan 30 ta koʻnikma" }),
    ...locationFields,
  })
  .refine((v) => v.regionId != null, { path: ["regionId"], error: "Viloyatni tanlang" })
  .refine((v) => v.expectedSalaryMin == null || v.expectedSalaryMax == null || v.expectedSalaryMax >= v.expectedSalaryMin, {
    path: ["expectedSalaryMax"],
    error: "Maksimal maosh minimaldan kam boʻlmasin",
  });
export type CandidateProfileInput = z.input<typeof candidateProfileSchema>;
export type CandidateProfileData = z.output<typeof candidateProfileSchema>;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Sana notoʻgʻri" });

export const experienceSchema = z
  .object({
    companyName: z.string().trim().min(2, { error: "Tashkilot nomini kiriting" }).max(160),
    position: z.string().trim().min(2, { error: "Lavozimni kiriting" }).max(160),
    locationText: text(160).optional(),
    startDate: isoDate,
    endDate: isoDate.nullable().optional(),
    isCurrent: z.boolean(),
    description: text(2000).optional(),
  })
  .refine((v) => v.isCurrent || !v.endDate || v.endDate >= v.startDate, {
    path: ["endDate"],
    error: "Tugash sanasi boshlanishdan oldin boʻlmasin",
  });
export type ExperienceInput = z.input<typeof experienceSchema>;

export const educationSchema = z.object({
  institution: z.string().trim().min(2, { error: "Oʻquv yurtini kiriting" }).max(200),
  level: educationLevel,
  field: text(160).optional(),
  startYear: z.number().int().min(1950).max(2100).nullable().optional(),
  endYear: z.number().int().min(1950).max(2100).nullable().optional(),
});
export type EducationInput = z.input<typeof educationSchema>;

export const certificateSchema = z.object({
  name: z.string().trim().min(2, { error: "Sertifikat nomini kiriting" }).max(200),
  issuer: text(200).optional(),
  issuedAt: isoDate.nullable().optional(),
});

export const portfolioSchema = z.object({
  title: z.string().trim().min(2, { error: "Sarlavha kiriting" }).max(160),
  description: text(2000).optional(),
  url: safeUrl.optional().or(z.literal("")),
});
