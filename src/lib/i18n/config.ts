export const LOCALES = ["uz", "ru", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "uz";
export const LOCALE_COOKIE = "locale";
export const LOCALE_NAMES: Record<Locale, string> = { uz: "Oʻzbekcha", ru: "Русский", en: "English" };
export const HTML_LANG: Record<Locale, string> = { uz: "uz", ru: "ru", en: "en" };
export const INTL_LOCALE: Record<Locale, string> = { uz: "uz-UZ", ru: "ru-RU", en: "en-GB" };

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}
