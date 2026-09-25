import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Custom theme colours (brand/accent) must be known to tailwind-merge so that
// overrides like className="bg-slate-900" replace a component's default bg.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      color: [
        "brand-50",
        "brand-100",
        "brand-200",
        "brand-500",
        "brand-600",
        "brand-700",
        "brand-800",
        "brand-900",
        "accent-400",
        "accent-500",
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const numberFormat = new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 0 });

/** 5000000 -> "5 000 000" (non-breaking spaces normalised to regular spaces). */
export function formatNumber(value: number): string {
  return numberFormat.format(value).replace(/[  ]/g, " ");
}

/** Compact money: 5 500 000 -> "5,5 mln", 750 000 -> "750 ming". */
export function formatMoneyShort(value: number): string {
  if (value >= 1_000_000) {
    const m = Math.round((value / 1_000_000) * 10) / 10;
    return `${String(m).replace(".", ",")} mln`;
  }
  if (value >= 1_000) return `${Math.round(value / 1_000)} ming`;
  return String(value);
}

const SALARY_SUFFIX: Record<string, string> = {
  monthly: "/oy",
  daily: "/kun",
  hourly: "/soat",
  per_task: "/ish",
  negotiable: "",
};

export function formatSalary(
  min: number | null | undefined,
  max: number | null | undefined,
  type: string | null | undefined = "monthly",
  currency = "UZS",
): string {
  if (type === "negotiable" || (min == null && max == null)) return "Kelishiladi";
  const unit = currency === "USD" ? "$" : "soʻm";
  const suffix = SALARY_SUFFIX[type ?? "monthly"] ?? "";
  const fmt = (v: number) => (currency === "USD" ? formatNumber(v) : formatMoneyShort(v));
  if (min != null && max != null && min !== max) return `${fmt(min)} – ${fmt(max)} ${unit}${suffix}`;
  if (min != null && (max == null || max === min)) return `${fmt(min)} ${unit}dan${suffix}`;
  return `${fmt(max as number)} ${unit}gacha${suffix}`;
}

export function formatDistance(km: number | null | undefined): string | null {
  if (km == null || Number.isNaN(km)) return null;
  if (km < 1) return `${Math.max(100, Math.round((km * 1000) / 100) * 100)} m`;
  if (km < 10) return `${String(Math.round(km * 10) / 10).replace(".", ",")} km`;
  return `${Math.round(km)} km`;
}

const MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  return `${d.getDate()}-${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Relative time in Uzbek: "5 daqiqa oldin", "2 kun oldin". */
export function timeAgo(value: string | Date | null | undefined, now: Date = new Date()): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  const sec = Math.max(0, Math.floor((now.getTime() - d.getTime()) / 1000));
  if (sec < 60) return "hozirgina";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} daqiqa oldin`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} soat oldin`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days} kun oldin`;
  return formatDate(d);
}

/** Latin slug for Uzbek text: "Qoʻngʻirot tumani" -> "qongirot-tumani". */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[ʻʼ'‘’`]/g, "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function displayName(first?: string | null, last?: string | null, lastInitialOnly = false): string {
  const f = (first ?? "").trim();
  const l = (last ?? "").trim();
  if (!f && !l) return "Foydalanuvchi";
  if (lastInitialOnly && l) return `${f} ${l[0]}.`.trim();
  return `${f} ${l}`.trim();
}

export function initials(first?: string | null, last?: string | null): string {
  return `${(first ?? "").charAt(0)}${(last ?? "").charAt(0)}`.toUpperCase() || "?";
}

/** Parses a positive integer from untrusted input, returning undefined when invalid. */
export function toPositiveInt(value: unknown): number | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

/** Prevents open redirects: only same-site relative paths are allowed. */
export function safeRedirectPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\") || /[\r\n]/.test(next)) return fallback;
  return next;
}

/** ISO timestamp for N days before now (server-side helpers). */
export function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}
