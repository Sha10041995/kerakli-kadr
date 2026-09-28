import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import { createFormatters } from "@/lib/i18n/format";

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

const uz = createFormatters("uz");

// Uzbek (default-locale) formatters; locale-aware versions: createFormatters() / getI18n().f / useI18n().f
export const formatNumber = uz.number;
export const formatMoneyShort = uz.moneyShort;
export const formatSalary = uz.salary;
export const formatDistance = uz.distance;
export const formatDate = uz.date;
export const timeAgo = uz.timeAgo;

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

export const displayName = uz.name;

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
