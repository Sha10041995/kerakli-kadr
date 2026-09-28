"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "./config";
import type { ClientDictionary } from "./dictionary";
import { createFormatters } from "./format";
import { createTranslator } from "./translate";

type Ctx = { locale: Locale; d: ClientDictionary };
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({
  locale,
  dictionary,
  children,
}: {
  locale: Locale;
  dictionary: ClientDictionary;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ locale, d: dictionary }), [locale, dictionary]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** { locale, d, f, t, tr } for Client Components. */
export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return useMemo(() => ({ locale: ctx.locale, d: ctx.d, f: createFormatters(ctx.locale), ...createTranslator(ctx.d) }), [ctx]);
}
