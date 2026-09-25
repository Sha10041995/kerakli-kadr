import "server-only";
import { createClient } from "@/lib/supabase/server";
import { computeMatch, normalizeWeights, type MatchFeatures } from "@/features/matching/score";

export async function getMatchWeights() {
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("value").eq("key", "matching.weights").maybeSingle();
  return normalizeWeights(data?.value);
}

/** Candidates for a vacancy ranked by MATCH SCORE (features from SQL, score in TS). */
export async function matchCandidatesForVacancy(vacancyId: string, limit = 20) {
  const supabase = await createClient();
  const [weights, { data, error }] = await Promise.all([
    getMatchWeights(),
    supabase.rpc("match_candidates_for_vacancy", { p_vacancy_id: vacancyId, p_limit: 150 }),
  ]);
  if (error || !data) return [];
  return data
    .map((r) => {
      const features: MatchFeatures = {
        sameProfession: r.same_profession,
        sameCategory: r.same_category,
        locationTier: r.location_tier,
        distanceKm: r.distance_km,
        experienceYears: r.experience_years,
        requiredExperience: r.required_experience,
        availability: r.availability,
        expectedSalaryMin: r.expected_salary_min,
        expectedSalaryMax: r.expected_salary_max,
        vacancySalaryMin: r.vacancy_salary_min,
        vacancySalaryMax: r.vacancy_salary_max,
        ratingAvg: r.rating_avg,
        ratingCount: r.rating_count,
        completeness: r.completeness,
        skillsMatched: r.skills_matched,
        skillsRequired: r.skills_required,
        remoteAllowed: r.remote_allowed,
        remoteOk: r.remote_ok,
      };
      return { row: r, match: computeMatch(features, weights) };
    })
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, limit);
}

/** Vacancies recommended for the signed-in candidate. */
export async function matchVacanciesForMe(limit = 6) {
  const supabase = await createClient();
  const [weights, { data, error }] = await Promise.all([
    getMatchWeights(),
    supabase.rpc("match_vacancies_for_candidate", { p_limit: 100 }),
  ]);
  if (error || !data) return [];
  return data
    .map((r) => {
      const features: MatchFeatures = {
        sameProfession: r.same_profession,
        sameCategory: r.same_category,
        locationTier: r.location_tier,
        distanceKm: r.distance_km,
        experienceYears: r.experience_years,
        requiredExperience: r.required_experience,
        availability: r.availability,
        expectedSalaryMin: r.expected_salary_min,
        expectedSalaryMax: r.expected_salary_max,
        vacancySalaryMin: r.vacancy_salary_min,
        vacancySalaryMax: r.vacancy_salary_max,
        ratingAvg: r.company_rating,
        ratingCount: r.company_rating ? 1 : 0,
        completeness: r.completeness,
        skillsMatched: r.skills_matched,
        skillsRequired: r.skills_required,
        remoteAllowed: r.remote_allowed,
        remoteOk: r.remote_ok,
      };
      return { row: r, match: computeMatch(features, weights) };
    })
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, limit);
}
