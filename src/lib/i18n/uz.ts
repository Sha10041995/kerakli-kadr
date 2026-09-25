// Uzbek (primary) labels for enums and shared UI strings.
// Russian/English dictionaries can be added with the same keys later.
import type { Enums } from "@/types/database";

export const EMPLOYMENT_TYPE_LABELS: Record<Enums<"employment_type">, string> = {
  full_time: "Toʻliq stavka",
  part_time: "Yarim stavka",
  temporary: "Vaqtinchalik",
  freelance: "Frilans",
  daily: "Kunlik ish",
  hourly: "Soatbay",
  seasonal: "Mavsumiy",
  internship: "Amaliyot",
  remote: "Masofaviy",
};

export const SALARY_TYPE_LABELS: Record<Enums<"salary_type">, string> = {
  monthly: "Oylik",
  daily: "Kunlik",
  hourly: "Soatbay",
  per_task: "Ish hajmiga qarab",
  negotiable: "Kelishiladi",
};

export const WORK_SCHEDULE_LABELS: Record<Enums<"work_schedule">, string> = {
  full_day: "Toʻliq kun",
  shift: "Smenali",
  flexible: "Erkin jadval",
  night: "Tungi",
  weekends: "Dam olish kunlari",
};

export const AVAILABILITY_LABELS: Record<Enums<"availability_status">, string> = {
  immediately: "Darhol ishga tayyor",
  within_week: "1 hafta ichida",
  within_month: "1 oy ichida",
  open_to_offers: "Takliflarni koʻrib chiqadi",
  not_available: "Hozircha band",
};

export const EDUCATION_LABELS: Record<Enums<"education_level">, string> = {
  none: "Maʼlumotsiz",
  secondary: "Oʻrta",
  vocational: "Oʻrta maxsus",
  bachelor: "Oliy (bakalavr)",
  master: "Magistr",
  doctorate: "Fan doktori",
};

export const VACANCY_STATUS_LABELS: Record<Enums<"vacancy_status">, string> = {
  draft: "Qoralama",
  pending_review: "Tekshiruvda",
  active: "Faol",
  rejected: "Rad etilgan",
  expired: "Muddati tugagan",
  closed: "Yopilgan",
};

export const APPLICATION_STATUS_LABELS: Record<Enums<"application_status">, string> = {
  applied: "Yuborildi",
  viewed: "Koʻrildi",
  shortlisted: "Saralandi",
  interview: "Suhbat",
  offered: "Taklif qilindi",
  hired: "Ishga olindi",
  rejected: "Rad etildi",
  withdrawn: "Qaytarib olindi",
};

export const COMPANY_TYPE_LABELS: Record<Enums<"company_type">, string> = {
  individual: "Jismoniy shaxs",
  sole_proprietor: "Yakka tartibdagi tadbirkor (YaTT/XK)",
  llc: "MChJ",
  farm: "Fermer xoʻjaligi",
  state: "Davlat tashkiloti",
  ngo: "Nodavlat tashkilot",
  other: "Boshqa",
};

export const REPORT_REASON_LABELS: Record<Enums<"report_reason">, string> = {
  scam: "Firibgarlik",
  spam: "Spam",
  fake_job: "Soxta vakansiya",
  illegal_job: "Noqonuniy ish",
  misleading_salary: "Chalgʻituvchi maosh",
  inappropriate: "Nomaqbul kontent",
  other: "Boshqa",
};

export const PAYMENT_STATUS_LABELS: Record<Enums<"payment_status">, string> = {
  pending: "Kutilmoqda",
  paid: "Toʻlangan",
  failed: "Muvaffaqiyatsiz",
  refunded: "Qaytarilgan",
  cancelled: "Bekor qilingan",
};

export const VERIFICATION_TYPE_LABELS: Record<Enums<"verification_type">, string> = {
  phone: "Telefon raqam",
  identity: "Shaxsni tasdiqlash",
  certificate: "Sertifikat",
  company: "Kompaniya",
};

export const RADIUS_OPTIONS = [5, 10, 25, 50, 100] as const;

export function options<T extends string>(labels: Record<T, string>): { value: T; label: string }[] {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}
