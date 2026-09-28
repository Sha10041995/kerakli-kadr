// MATCH SCORE — transparent, explainable candidate ↔ vacancy matching.
// This is NOT a rating of the person: it only says how well a profile fits a
// specific vacancy. Hiring decisions are always made by humans.
// Factor weights are admin-configurable (app_settings: matching.weights).
import { cards } from "@/lib/i18n/messages/public";
import { createTranslator, localize } from "@/lib/i18n/translate";

const uzTranslator = createTranslator({ cards: localize(cards, "uz") });

export const MATCH_FACTORS = [
  "location",
  "distance",
  "profession",
  "skills",
  "experience",
  "availability",
  "salary",
  "rating",
  "completeness",
] as const;
export type MatchFactor = (typeof MATCH_FACTORS)[number];
export type MatchWeights = Record<MatchFactor, number>;

export const DEFAULT_WEIGHTS: MatchWeights = {
  location: 25,
  distance: 10,
  profession: 20,
  skills: 15,
  experience: 10,
  availability: 5,
  salary: 5,
  rating: 5,
  completeness: 5,
};

export const FACTOR_LABELS: Record<MatchFactor, string> = {
  location: "Hudud mosligi",
  distance: "Masofa",
  profession: "Kasb mosligi",
  skills: "Koʻnikmalar",
  experience: "Tajriba",
  availability: "Ishga tayyorlik",
  salary: "Maosh kutilmasi",
  rating: "Reyting",
  completeness: "Profil toʻliqligi",
};

export type MatchFeatures = {
  sameProfession: boolean | null;
  sameCategory: boolean | null;
  locationTier: number | null;
  distanceKm: number | null;
  experienceYears: number | null;
  requiredExperience: number | null;
  availability: string | null;
  expectedSalaryMin: number | null;
  expectedSalaryMax: number | null;
  vacancySalaryMin: number | null;
  vacancySalaryMax: number | null;
  ratingAvg: number | null;
  ratingCount: number | null;
  completeness: number | null;
  skillsMatched: number | null;
  skillsRequired: number | null;
  remoteAllowed?: boolean | null;
  remoteOk?: boolean | null;
};

export type MatchBreakdownItem = {
  factor: MatchFactor;
  label: string;
  weight: number;
  value: number; // 0..1
  points: number; // contribution to the 0..100 score
};

/** `reasons` are Uzbek (admin/tests); `reasonKeys` are translatable message keys ("cards.reason.*"). */
export type MatchResult = { score: number; breakdown: MatchBreakdownItem[]; reasons: string[]; reasonKeys: string[] };

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const TIER_VALUE: Record<number, number> = { 0: 0.5, 1: 1, 2: 0.95, 3: 0.85, 4: 0.6, 5: 0.45, 6: 0.25, 7: 0 };

const AVAILABILITY_VALUE: Record<string, number> = {
  immediately: 1,
  within_week: 0.85,
  within_month: 0.6,
  open_to_offers: 0.5,
  not_available: 0,
};

export function factorValues(f: MatchFeatures): Record<MatchFactor, number> {
  const remote = Boolean(f.remoteAllowed && f.remoteOk);

  let location = TIER_VALUE[f.locationTier ?? 0] ?? 0;
  if (remote) location = Math.max(location, 0.8);

  let distance = 0.5;
  if (f.distanceKm != null) distance = f.distanceKm <= 5 ? 1 : clamp01(1 - (f.distanceKm - 5) / 95);
  if (remote) distance = Math.max(distance, 0.8);

  const profession = f.sameProfession ? 1 : f.sameCategory ? 0.5 : 0;

  const skills = !f.skillsRequired ? 1 : clamp01((f.skillsMatched ?? 0) / f.skillsRequired);

  const experience = !f.requiredExperience ? 1 : clamp01((f.experienceYears ?? 0) / f.requiredExperience);

  const availability = AVAILABILITY_VALUE[f.availability ?? ""] ?? 0.5;

  let salary = 0.7;
  const vacancyTop = f.vacancySalaryMax ?? f.vacancySalaryMin;
  if (f.expectedSalaryMin == null) salary = 0.8;
  else if (vacancyTop != null && vacancyTop > 0) {
    salary = f.expectedSalaryMin <= vacancyTop ? 1 : clamp01(1 - ((f.expectedSalaryMin - vacancyTop) / vacancyTop) * 2);
  }

  const rating = !f.ratingCount ? 0.6 : clamp01((f.ratingAvg ?? 0) / 5);
  const completeness = clamp01((f.completeness ?? 0) / 100);

  return { location, distance, profession, skills, experience, availability, salary, rating, completeness };
}

export function computeMatch(features: MatchFeatures, weights: MatchWeights = DEFAULT_WEIGHTS): MatchResult {
  const values = factorValues(features);
  const total = MATCH_FACTORS.reduce((s, k) => s + Math.max(0, weights[k] ?? 0), 0) || 1;
  const breakdown = MATCH_FACTORS.map((factor) => {
    const weight = Math.max(0, weights[factor] ?? 0);
    const value = values[factor];
    return { factor, label: FACTOR_LABELS[factor], weight, value, points: (weight / total) * value * 100 };
  });
  const score = Math.round(breakdown.reduce((s, b) => s + b.points, 0));

  const reasonKeys: string[] = [];
  if (features.locationTier != null && features.locationTier >= 1 && features.locationTier <= 3)
    reasonKeys.push("cards.reason.sameArea");
  else if (features.distanceKm != null && features.distanceKm <= 10) reasonKeys.push("cards.reason.within10");
  if (features.sameProfession) reasonKeys.push("cards.reason.sameProfession");
  if (features.skillsRequired && features.skillsMatched)
    reasonKeys.push(`cards.reason.skills?matched=${features.skillsMatched}&required=${features.skillsRequired}`);
  if (features.requiredExperience && (features.experienceYears ?? 0) >= features.requiredExperience)
    reasonKeys.push("cards.reason.experience");
  if (features.availability === "immediately") reasonKeys.push("cards.reason.immediately");
  const reasons = reasonKeys.map((k) => uzTranslator.tr(k));

  return { score: Math.min(100, Math.max(0, score)), breakdown, reasons, reasonKeys };
}

/** Validates admin-provided weights (unknown JSON) and falls back to defaults. */
export function normalizeWeights(raw: unknown): MatchWeights {
  const out = { ...DEFAULT_WEIGHTS };
  if (raw && typeof raw === "object") {
    for (const k of MATCH_FACTORS) {
      const v = (raw as Record<string, unknown>)[k];
      if (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100) out[k] = v;
    }
  }
  return MATCH_FACTORS.some((k) => out[k] > 0) ? out : { ...DEFAULT_WEIGHTS };
}

export function rankByMatch<T extends { features: MatchFeatures }>(items: T[], weights: MatchWeights) {
  return items
    .map((item) => ({ ...item, match: computeMatch(item.features, weights) }))
    .sort((a, b) => b.match.score - a.match.score);
}
