// Uzbek enum labels for the admin panel (which stays Uzbek-only). Derived from the
// shared dictionary so there is a single source of truth; user-facing pages use
// getI18n().d.enums / useI18n().d.enums instead.
import type { Enums } from "@/types/database";
import { getDictionary } from "./dictionary";

const e = getDictionary("uz").enums;

export const EMPLOYMENT_TYPE_LABELS: Record<Enums<"employment_type">, string> = e.employmentType;
export const SALARY_TYPE_LABELS: Record<Enums<"salary_type">, string> = e.salaryType;
export const WORK_SCHEDULE_LABELS: Record<Enums<"work_schedule">, string> = e.workSchedule;
export const AVAILABILITY_LABELS: Record<Enums<"availability_status">, string> = e.availability;
export const EDUCATION_LABELS: Record<Enums<"education_level">, string> = e.education;
export const VACANCY_STATUS_LABELS: Record<Enums<"vacancy_status">, string> = e.vacancyStatus;
export const APPLICATION_STATUS_LABELS: Record<Enums<"application_status">, string> = e.applicationStatus;
export const COMPANY_TYPE_LABELS: Record<Enums<"company_type">, string> = e.companyType;
export const REPORT_REASON_LABELS: Record<Enums<"report_reason">, string> = e.reportReason;
export const PAYMENT_STATUS_LABELS: Record<Enums<"payment_status">, string> = e.paymentStatus;
export const VERIFICATION_TYPE_LABELS: Record<Enums<"verification_type">, string> = e.verificationType;
