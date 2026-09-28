"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/lib/i18n/config";
import { setLocaleAction } from "@/lib/i18n/actions";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({ className }: { className?: string }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <select
      aria-label={t("common.language")}
      value={locale}
      disabled={pending}
      onChange={(e) =>
        start(async () => {
          await setLocaleAction(e.target.value as Locale);
          router.refresh();
        })
      }
      className={cn("h-8 rounded-md border border-slate-200 bg-white px-1 text-xs text-slate-700", className)}
    >
      {LOCALES.map((l) => (
        <option key={l} value={l}>
          {l === "uz" ? "UZ" : l === "ru" ? "RU" : "EN"} · {LOCALE_NAMES[l]}
        </option>
      ))}
    </select>
  );
}
