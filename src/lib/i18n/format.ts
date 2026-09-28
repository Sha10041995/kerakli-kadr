// Locale-aware formatting of numbers, money, dates and relative time.
import { INTL_LOCALE, type Locale } from "./config";

type Units = {
  mln: string;
  thousand: string;
  som: string;
  negotiable: string;
  from: (v: string) => string;
  upTo: (v: string) => string;
  per: Record<string, string>;
  justNow: string;
  minutesAgo: (n: number) => string;
  hoursAgo: (n: number) => string;
  daysAgo: (n: number) => string;
  months: string[];
  date: (day: number, month: string, year: number) => string;
  user: string;
};

function ruPlural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

const UNITS: Record<Locale, Units> = {
  uz: {
    mln: "mln",
    thousand: "ming",
    som: "soʻm",
    negotiable: "Kelishiladi",
    from: (v) => `${v}dan`,
    upTo: (v) => `${v}gacha`,
    per: { monthly: "/oy", daily: "/kun", hourly: "/soat", per_task: "/ish", negotiable: "" },
    justNow: "hozirgina",
    minutesAgo: (n) => `${n} daqiqa oldin`,
    hoursAgo: (n) => `${n} soat oldin`,
    daysAgo: (n) => `${n} kun oldin`,
    months: ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"],
    date: (d, m, y) => `${d}-${m} ${y}`,
    user: "Foydalanuvchi",
  },
  ru: {
    mln: "млн",
    thousand: "тыс.",
    som: "сум",
    negotiable: "По договорённости",
    from: (v) => `от ${v}`,
    upTo: (v) => `до ${v}`,
    per: { monthly: "/мес", daily: "/день", hourly: "/час", per_task: "/работа", negotiable: "" },
    justNow: "только что",
    minutesAgo: (n) => `${n} ${ruPlural(n, "минуту", "минуты", "минут")} назад`,
    hoursAgo: (n) => `${n} ${ruPlural(n, "час", "часа", "часов")} назад`,
    daysAgo: (n) => `${n} ${ruPlural(n, "день", "дня", "дней")} назад`,
    months: [
      "января",
      "февраля",
      "марта",
      "апреля",
      "мая",
      "июня",
      "июля",
      "августа",
      "сентября",
      "октября",
      "ноября",
      "декабря",
    ],
    date: (d, m, y) => `${d} ${m} ${y}`,
    user: "Пользователь",
  },
  en: {
    mln: "M",
    thousand: "K",
    som: "UZS",
    negotiable: "Negotiable",
    from: (v) => `from ${v}`,
    upTo: (v) => `up to ${v}`,
    per: { monthly: "/mo", daily: "/day", hourly: "/hr", per_task: "/task", negotiable: "" },
    justNow: "just now",
    minutesAgo: (n) => `${n} min ago`,
    hoursAgo: (n) => `${n} ${n === 1 ? "hour" : "hours"} ago`,
    daysAgo: (n) => `${n} ${n === 1 ? "day" : "days"} ago`,
    months: [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
    date: (d, m, y) => `${d} ${m} ${y}`,
    user: "User",
  },
};

export type Formatters = ReturnType<typeof createFormatters>;

export function createFormatters(locale: Locale) {
  const u = UNITS[locale];
  const numberFormat = new Intl.NumberFormat(locale === "en" ? "en-US" : INTL_LOCALE[locale], { maximumFractionDigits: 0 });
  const decimal = locale === "en" ? "." : ",";

  /** 5000000 -> "5 000 000" (non-breaking spaces normalised to regular spaces). */
  const number = (value: number): string =>
    locale === "en" ? numberFormat.format(value) : numberFormat.format(value).replace(/[  ]/g, " ");

  /** Compact money: 5 500 000 -> "5,5 mln", 750 000 -> "750 ming". */
  const moneyShort = (value: number): string => {
    if (value >= 1_000_000) {
      const m = Math.round((value / 1_000_000) * 10) / 10;
      return `${String(m).replace(".", decimal)}${locale === "en" ? "" : " "}${u.mln}`;
    }
    if (value >= 1_000) return `${Math.round(value / 1_000)}${locale === "en" ? "" : " "}${u.thousand}`;
    return String(value);
  };

  const salary = (
    min: number | null | undefined,
    max: number | null | undefined,
    type: string | null | undefined = "monthly",
    currency = "UZS",
  ): string => {
    if (type === "negotiable" || (min == null && max == null)) return u.negotiable;
    const unit = currency === "USD" ? "$" : u.som;
    const suffix = u.per[type ?? "monthly"] ?? "";
    const fmt = (v: number) => (currency === "USD" ? number(v) : moneyShort(v));
    if (min != null && max != null && min !== max) return `${fmt(min)} – ${fmt(max)} ${unit}${suffix}`;
    if (min != null) return `${u.from(`${fmt(min)} ${unit}`)}${suffix}`;
    return `${u.upTo(`${fmt(max as number)} ${unit}`)}${suffix}`;
  };

  const distance = (km: number | null | undefined): string | null => {
    if (km == null || Number.isNaN(km)) return null;
    const m = locale === "ru" ? "м" : "m";
    const k = locale === "ru" ? "км" : "km";
    if (km < 1) return `${Math.max(100, Math.round((km * 1000) / 100) * 100)} ${m}`;
    if (km < 10) return `${String(Math.round(km * 10) / 10).replace(".", decimal)} ${k}`;
    return `${Math.round(km)} ${k}`;
  };

  const date = (value: string | Date | null | undefined): string => {
    if (!value) return "";
    const d = typeof value === "string" ? new Date(value) : value;
    return u.date(d.getDate(), u.months[d.getMonth()], d.getFullYear());
  };

  const timeAgo = (value: string | Date | null | undefined, now: Date = new Date()): string => {
    if (!value) return "";
    const d = typeof value === "string" ? new Date(value) : value;
    const sec = Math.max(0, Math.floor((now.getTime() - d.getTime()) / 1000));
    if (sec < 60) return u.justNow;
    const min = Math.floor(sec / 60);
    if (min < 60) return u.minutesAgo(min);
    const h = Math.floor(min / 60);
    if (h < 24) return u.hoursAgo(h);
    const days = Math.floor(h / 24);
    if (days < 30) return u.daysAgo(days);
    return date(d);
  };

  const name = (first?: string | null, last?: string | null, lastInitialOnly = false): string => {
    const f = (first ?? "").trim();
    const l = (last ?? "").trim();
    if (!f && !l) return u.user;
    if (lastInitialOnly && l) return `${f} ${l[0]}.`.trim();
    return `${f} ${l}`.trim();
  };

  return { number, moneyShort, salary, distance, date, timeAgo, name };
}
