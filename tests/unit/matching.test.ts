import { describe, expect, it } from "vitest";
import { computeMatch, DEFAULT_WEIGHTS, normalizeWeights, rankByMatch, type MatchFeatures } from "@/features/matching/score";

const base: MatchFeatures = {
  sameProfession: true, sameCategory: true, locationTier: 3, distanceKm: 3, experienceYears: 5,
  requiredExperience: 2, availability: "immediately", expectedSalaryMin: 5_000_000, expectedSalaryMax: 7_000_000,
  vacancySalaryMin: 5_000_000, vacancySalaryMax: 8_000_000, ratingAvg: 4.8, ratingCount: 3, completeness: 90,
  skillsMatched: 3, skillsRequired: 3,
};

describe("computeMatch", () => {
  it("gives a near-perfect score to an ideal local candidate", () => {
    const r = computeMatch(base);
    expect(r.score).toBeGreaterThanOrEqual(95);
    expect(r.reasons).toContain("Aynan shu hududdan");
    expect(r.reasons).toContain("Kasbi mos");
  });

  it("ranks the nearer candidate higher, all else equal", () => {
    const near = computeMatch({ ...base, locationTier: 3, distanceKm: 2 });
    const far = computeMatch({ ...base, locationTier: 6, distanceKm: 80 });
    expect(near.score).toBeGreaterThan(far.score);
  });

  it("penalises profession mismatch and missing skills", () => {
    const r = computeMatch({ ...base, sameProfession: false, sameCategory: true, skillsMatched: 0 });
    expect(r.score).toBeLessThan(computeMatch(base).score - 20);
  });

  it("penalises salary expectations far above the offer", () => {
    const r = computeMatch({ ...base, expectedSalaryMin: 20_000_000 });
    const salary = r.breakdown.find((b) => b.factor === "salary");
    expect(salary?.value).toBe(0);
  });

  it("treats remote-compatible pairs as location-compatible", () => {
    const r = computeMatch({ ...base, locationTier: 7, distanceKm: 500, remoteAllowed: true, remoteOk: true });
    expect(r.breakdown.find((b) => b.factor === "location")?.value).toBe(0.8);
  });

  it("breakdown points sum to the score", () => {
    const r = computeMatch({ ...base, locationTier: 5, distanceKm: 40, completeness: 50 });
    const sum = r.breakdown.reduce((s, b) => s + b.points, 0);
    expect(Math.round(sum)).toBe(r.score);
  });

  it("respects custom weights", () => {
    const onlyDistance = normalizeWeights({ ...Object.fromEntries(Object.keys(DEFAULT_WEIGHTS).map((k) => [k, 0])), distance: 100 });
    expect(computeMatch({ ...base, distanceKm: 5 }, onlyDistance).score).toBe(100);
    expect(computeMatch({ ...base, distanceKm: 100 }, onlyDistance).score).toBe(0);
  });

  it("stays within 0..100 for empty features", () => {
    const r = computeMatch({
      sameProfession: null, sameCategory: null, locationTier: null, distanceKm: null, experienceYears: null,
      requiredExperience: null, availability: null, expectedSalaryMin: null, expectedSalaryMax: null,
      vacancySalaryMin: null, vacancySalaryMax: null, ratingAvg: null, ratingCount: null, completeness: null,
      skillsMatched: null, skillsRequired: null,
    });
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});

describe("normalizeWeights", () => {
  it("falls back to defaults for invalid input", () => {
    expect(normalizeWeights(null)).toEqual(DEFAULT_WEIGHTS);
    expect(normalizeWeights({ location: -5, skills: "x", rating: 1000 })).toEqual(DEFAULT_WEIGHTS);
  });
  it("rejects all-zero weights", () => {
    const zeros = Object.fromEntries(Object.keys(DEFAULT_WEIGHTS).map((k) => [k, 0]));
    expect(normalizeWeights(zeros)).toEqual(DEFAULT_WEIGHTS);
  });
});

describe("rankByMatch", () => {
  it("sorts by descending score", () => {
    const ranked = rankByMatch(
      [
        { id: "far", features: { ...base, locationTier: 7, distanceKm: 300 } },
        { id: "near", features: base },
      ],
      DEFAULT_WEIGHTS,
    );
    expect(ranked.map((r) => r.id)).toEqual(["near", "far"]);
  });
});
