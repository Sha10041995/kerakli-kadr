import { env } from "@/lib/env";

export const SITE_NAME = "KADR TOP UZ";
export const SITE_TAGLINE = "Kadr ham, ish ham — oʻz hududingizdan toping.";
export const SITE_DESCRIPTION =
  "Tumaningiz, shaharingiz, qishlogʻingiz yoki mahallangizdagi ish va mutaxassislarni bir joydan toping. Oʻzbekiston boʻylab hududiy ish va kadrlar platformasi.";

export function absoluteUrl(path = "/"): string {
  return new URL(path, env.siteUrl).toString();
}

type JobPostingInput = {
  id: string;
  title: string;
  description: string;
  publishedAt: string | null;
  expiresAt: string | null;
  employmentType: string;
  companyName: string;
  companyLogo?: string | null;
  regionName?: string | null;
  districtName?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryType?: string | null;
  currency?: string;
  remote?: boolean;
};

const EMPLOYMENT_SCHEMA: Record<string, string> = {
  full_time: "FULL_TIME",
  part_time: "PART_TIME",
  temporary: "TEMPORARY",
  freelance: "CONTRACTOR",
  daily: "PER_DIEM",
  hourly: "PART_TIME",
  seasonal: "TEMPORARY",
  internship: "INTERN",
  remote: "FULL_TIME",
};

const UNIT: Record<string, string> = { monthly: "MONTH", daily: "DAY", hourly: "HOUR" };

/** schema.org JobPosting structured data for vacancy pages. */
export function jobPostingJsonLd(v: JobPostingInput) {
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: v.title,
    description: v.description,
    datePosted: v.publishedAt ?? undefined,
    validThrough: v.expiresAt ?? undefined,
    employmentType: EMPLOYMENT_SCHEMA[v.employmentType] ?? "OTHER",
    hiringOrganization: { "@type": "Organization", name: v.companyName, logo: v.companyLogo ?? undefined },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: v.districtName ?? undefined,
        addressRegion: v.regionName ?? undefined,
        addressCountry: "UZ",
      },
    },
    jobLocationType: v.remote ? "TELECOMMUTE" : undefined,
    baseSalary:
      v.salaryMin || v.salaryMax
        ? {
            "@type": "MonetaryAmount",
            currency: v.currency ?? "UZS",
            value: {
              "@type": "QuantitativeValue",
              minValue: v.salaryMin ?? undefined,
              maxValue: v.salaryMax ?? undefined,
              unitText: UNIT[v.salaryType ?? "monthly"] ?? "MONTH",
            },
          }
        : undefined,
    identifier: { "@type": "PropertyValue", name: SITE_NAME, value: v.id },
    url: absoluteUrl(`/vacancy/${v.id}`),
  };
}

/** Serialises JSON-LD safely for a <script> tag (prevents </script> injection). */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
