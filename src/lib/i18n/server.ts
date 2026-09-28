import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { getDictionary } from "./dictionary";
import { createFormatters } from "./format";
import { createTranslator } from "./translate";

export const getLocale = cache(async (): Promise<Locale> => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
});

/** Request-scoped i18n for Server Components: { locale, d (dictionary), f (formatters), t, tr }. */
export const getI18n = cache(async () => {
  const locale = await getLocale();
  const d = getDictionary(locale);
  return { locale, d, f: createFormatters(locale), ...createTranslator(d) };
});
