import { describe, expect, it } from "vitest";
import { z } from "zod";
import "@/validations/common";
import { LOCALES } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { createFormatters } from "@/lib/i18n/format";
import { messages } from "@/lib/i18n/messages";
import { createTranslator, type Leaf } from "@/lib/i18n/translate";
import { seoTitle } from "@/features/search/seo-routes";
import { computeMatch } from "@/features/matching/score";

function leaves(tree: unknown, path = ""): [string, Leaf][] {
  if (typeof tree !== "object" || tree === null) throw new Error(`Bad node at ${path}`);
  if ("uz" in tree) return [[path, tree as Leaf]];
  return Object.entries(tree).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
}

const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("dictionary", () => {
  const all = leaves(messages);

  it("has uz/ru/en for every string with matching placeholders", () => {
    expect(all.length).toBeGreaterThan(500);
    for (const [path, leaf] of all) {
      for (const l of LOCALES) {
        expect(typeof leaf[l], `${path}.${l}`).toBe("string");
        expect(leaf[l].length, `${path}.${l} is empty`).toBeGreaterThan(0);
      }
      expect(vars(leaf.ru), `${path}.ru placeholders`).toEqual(vars(leaf.uz));
      expect(vars(leaf.en), `${path}.en placeholders`).toEqual(vars(leaf.uz));
    }
  });

  it("uses official Uzbek apostrophes (ʻ ʼ) instead of ASCII quotes", () => {
    for (const [path, leaf] of all) expect(leaf.uz, path).not.toMatch(/[a-zA-Z]['‘’`][a-zA-Z]/);
  });

  it("localizes and translates server message keys", () => {
    const ru = createTranslator(getDictionary("ru"));
    const en = createTranslator(getDictionary("en"));
    expect(ru.t("nav.jobs")).toBe("Работа");
    expect(en.tr("errors.RATE_LIMITED")).toMatch(/Too many requests/);
    expect(en.tr("validation.maxChars?max=120")).toContain("120");
    expect(en.tr("cards.reason.skills?matched=2&required=3")).toBe("2/3 skills match");
    // unknown keys and free text pass through unchanged
    expect(en.tr("errors.doesNotExist")).toBe("errors.doesNotExist");
    expect(en.tr("Admin yozgan matn")).toBe("Admin yozgan matn");
    expect(en.tr(undefined)).toBe("");
  });

  it("keeps long static pages out of the client dictionary", async () => {
    const { getClientDictionary } = await import("@/lib/i18n/dictionary");
    expect("pages" in getClientDictionary("ru")).toBe(false);
    expect(getClientDictionary("ru").nav.jobs).toBe("Работа");
  });
});

describe("zod messages are keys", () => {
  it("maps length and required errors to validation keys", () => {
    const schema = z.object({ name: z.string().min(2).max(5), age: z.number() });
    const r = schema.safeParse({ name: "abcdefg" });
    expect(r.success).toBe(false);
    const issues = r.error!.issues.map((i) => i.message);
    expect(issues).toContain("validation.maxChars?max=5");
    expect(issues.some((m) => m.startsWith("validation."))).toBe(true);
  });
});

describe("locale formatters", () => {
  const now = new Date("2026-09-25T12:00:00Z");
  it("formats salary, distance and dates per locale", () => {
    const ru = createFormatters("ru");
    const en = createFormatters("en");
    expect(ru.salary(5_000_000, 7_000_000, "monthly")).toBe("5 млн – 7 млн сум/мес");
    expect(ru.salary(250_000, null, "daily")).toBe("от 250 тыс. сум/день");
    expect(en.salary(null, null, "monthly")).toBe("Negotiable");
    expect(en.salary(5_500_000, null, "monthly")).toBe("from 5.5M UZS/mo");
    expect(ru.distance(2.84)).toBe("2,8 км");
    expect(en.distance(2.84)).toBe("2.8 km");
    expect(ru.date("2026-03-08T10:00:00Z")).toBe("8 марта 2026");
    expect(en.date("2026-03-08T10:00:00Z")).toBe("8 March 2026");
  });

  it("uses Russian plural forms in relative time", () => {
    const ru = createFormatters("ru");
    expect(ru.timeAgo("2026-09-24T12:00:00Z", now)).toBe("1 день назад");
    expect(ru.timeAgo("2026-09-22T12:00:00Z", now)).toBe("3 дня назад");
    expect(ru.timeAgo("2026-09-15T12:00:00Z", now)).toBe("10 дней назад");
    expect(createFormatters("en").timeAgo("2026-09-25T11:55:00Z", now)).toBe("5 min ago");
  });
});

describe("localized SEO titles and match reasons", () => {
  const r = {
    district: { id: 1, name: "Urganch shahri", slug: "urganch-shahri" },
    profession: { id: 2, name: "Payvandchi", slug: "payvandchi" },
  };
  it("builds titles per locale", () => {
    expect(seoTitle("jobs", r)).toBe("Urganch shahrida Payvandchi vakansiyalari");
    expect(seoTitle("jobs", r, "en")).toBe("Payvandchi jobs in Urganch shahri");
    expect(seoTitle("candidates", {}, "ru")).toBe("Кадры — база специалистов");
  });

  it("returns translatable reason keys alongside Uzbek reasons", () => {
    const m = computeMatch({
      sameProfession: true,
      sameCategory: true,
      locationTier: 1,
      distanceKm: 1,
      skillsRequired: 3,
      skillsMatched: 2,
      experienceYears: 5,
      requiredExperience: 2,
      availability: "immediately",
      expectedSalaryMin: null,
      expectedSalaryMax: null,
      vacancySalaryMin: null,
      vacancySalaryMax: null,
      ratingAvg: null,
      ratingCount: 0,
      completeness: 80,
    });
    expect(m.reasonKeys).toContain("cards.reason.sameArea");
    expect(m.reasons).toContain("2/3 koʻnikma mos");
    const en = createTranslator(getDictionary("en"));
    expect(m.reasonKeys.map((k) => en.tr(k))).toContain("Matching profession");
  });
});
