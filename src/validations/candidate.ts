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
    firstName: z.string().trim().min(2, { error: "validation.firstName" }).max(80),
    lastName: z.string().trim().min(2, { error: "validation.lastName" }).max(80),
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
    employmentTypes: z.array(employmentType).min(1, { error: "validation.employmentTypes" }).max(9),
    availability: z.enum(["immediately", "within_week", "within_month", "open_to_offers", "not_available"]),
    hasTransport: z.boolean(),
    remoteOk: z.boolean(),
    relocateOk: z.boolean(),
    workRadiusKm: z.number().int().min(1).max(500),
    isPublic: z.boolean(),
    skillIds: z.array(z.number().int().positive()).max(30, { error: "validation.maxSkills?max=30" }),
    ...locationFields,
  })
  .refine((v) => v.regionId != null, { path: ["regionId"], error: "validation.region" })
  .refine((v) => v.expectedSalaryMin == null || v.expectedSalaryMax == null || v.expectedSalaryMax >= v.expectedSalaryMin, {
    path: ["expectedSalaryMax"],
    error: "validation.salaryRange",
  });
export type CandidateProfileInput = z.input<typeof candidateProfileSchema>;
export type CandidateProfileData = z.output<typeof candidateProfileSchema>;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "validation.date" });

export const experienceSchema = z
  .object({
    companyName: z.string().trim().min(2, { error: "validation.organization" }).max(160),
    position: z.string().trim().min(2, { error: "validation.position" }).max(160),
    locationText: text(160).optional(),
    startDate: isoDate,
    endDate: isoDate.nullable().optional(),
    isCurrent: z.boolean(),
    description: text(2000).optional(),
  })
  .refine((v) => v.isCurrent || !v.endDate || v.endDate >= v.startDate, {
    path: ["endDate"],
    error: "validation.endDate",
  });
export type ExperienceInput = z.input<typeof experienceSchema>;

export const educationSchema = z.object({
  institution: z.string().trim().min(2, { error: "validation.institution" }).max(200),
  level: educationLevel,
  field: text(160).optional(),
  startYear: z.number().int().min(1950).max(2100).nullable().optional(),
  endYear: z.number().int().min(1950).max(2100).nullable().optional(),
});
export type EducationInput = z.input<typeof educationSchema>;

export const certificateSchema = z.object({
  name: z.string().trim().min(2, { error: "validation.certificateName" }).max(200),
  issuer: text(200).optional(),
  issuedAt: isoDate.nullable().optional(),
});

export const portfolioSchema = z.object({
  title: z.string().trim().min(2, { error: "validation.title" }).max(160),
  description: text(2000).optional(),
  url: safeUrl.optional().or(z.literal("")),
});
