// Maps database / auth error codes to user-friendly Uzbek messages.
// Raw database errors are never shown to end users.

const MESSAGES: Record<string, string> = {
  PROTECTED_FIELDS: "Bu maydonni oʻzgartirishga ruxsat yoʻq.",
  VACANCY_LIMIT_REACHED: "Tarifingiz boʻyicha faol vakansiyalar limiti tugadi. Tarifni yangilang yoki eski vakansiyani yoping.",
  INVALID_STATUS_TRANSITION: "Bu holatga oʻtkazib boʻlmaydi.",
  VACANCY_NOT_OPEN: "Bu vakansiya ariza qabul qilmayapti.",
  CANNOT_APPLY_OWN_VACANCY: "Oʻz vakansiyangizga ariza yubora olmaysiz.",
  RATE_LIMITED: "Juda koʻp soʻrov yuborildi. Birozdan soʻng qayta urinib koʻring.",
  CONVERSATION_NOT_ALLOWED: "Bu foydalanuvchiga yozish imkoni yoʻq.",
  CONVERSATION_BLOCKED: "Suhbat bloklangan.",
  INVALID_RECIPIENT: "Qabul qiluvchi notoʻgʻri.",
  ACCOUNT_BLOCKED: "Hisobingiz bloklangan. Qoʻllab-quvvatlash xizmatiga murojaat qiling.",
  REVIEW_NOT_ALLOWED: "Sharh faqat haqiqiy ishga qabul qilingandan keyin yoziladi.",
  LOCATION_MISMATCH: "Hudud maʼlumotlari bir-biriga mos emas.",
  ROLE_NOT_ALLOWED: "Bu rolni tanlab boʻlmaydi.",
  NOT_AUTHENTICATED: "Iltimos, avval tizimga kiring.",
  NOT_ALLOWED: "Bu amal uchun ruxsat yoʻq.",
  SAVED_SEARCH_LIMIT: "Saqlangan qidiruvlar soni cheklangan (20 ta).",
  PLAN_NOT_FOUND: "Tarif topilmadi.",
  SERVICE_NOT_FOUND: "Xizmat topilmadi.",
  COMPANY_REQUIRED: "Avval kompaniya profilini yarating.",
  VACANCY_REQUIRED: "Vakansiyani tanlang.",
  ONLY_SUPER_ADMIN: "Faqat super administrator bu rolni bera oladi.",
  "23505": "Bu maʼlumot allaqachon mavjud.",
  "42501": "Bu amal uchun ruxsat yoʻq.",
  "23514": "Kiritilgan maʼlumot notoʻgʻri.",
  invalid_credentials: "Email yoki parol notoʻgʻri.",
  user_already_exists: "Bu email bilan roʻyxatdan oʻtilgan.",
  email_not_confirmed: "Emailingizni tasdiqlang.",
  weak_password: "Parol juda oddiy.",
  over_request_rate_limit: "Juda koʻp urinish. Birozdan soʻng qayta urinib koʻring.",
};

export const GENERIC_ERROR = "Xatolik yuz berdi. Iltimos, qayta urinib koʻring.";

export type ErrorLike = { message?: string; code?: string } | null | undefined;

export function toUserMessage(error: ErrorLike): string {
  if (!error) return GENERIC_ERROR;
  const message = error.message ?? "";
  for (const key of Object.keys(MESSAGES)) {
    if (/^[A-Z_]+$/.test(key) && message.includes(key)) return MESSAGES[key];
  }
  if (error.code && MESSAGES[error.code]) return MESSAGES[error.code];
  if (message.includes("row-level security")) return MESSAGES.NOT_ALLOWED;
  if (message.includes("duplicate key")) return MESSAGES["23505"];
  return GENERIC_ERROR;
}

/** Standard result shape for server actions consumed by forms. */
export type ActionResult<T = undefined> =
  { ok: true; data?: T; message?: string } | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

export function fail(error: string, fieldErrors?: Record<string, string[] | undefined>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}
