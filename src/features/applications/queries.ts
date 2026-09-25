import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function listCandidateApplications(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("applications")
    .select(
      "id, status, created_at, updated_at, vacancy_id, vacancies(id, title, company_id, salary_min, salary_max, salary_type, companies(name, slug, owner_id), districts(name_uz)), reviews(id, reviewer_id)",
    )
    .eq("candidate_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function listVacancyApplications(vacancyId: string) {
  const supabase = await createClient();
  const { data: apps } = await supabase
    .from("applications")
    .select(
      "id, status, cover_letter, created_at, candidate_id, candidate_profiles(id, headline, experience_years, professions(name_uz), districts(name_uz)), reviews(id, reviewer_id)",
    )
    .eq("vacancy_id", vacancyId)
    .order("created_at", { ascending: false });
  const ids = (apps ?? []).map((a) => a.candidate_id);
  const { data: people } = ids.length
    ? await supabase.from("public_profiles").select("id, first_name, last_name, avatar_url, phone_verified").in("id", ids)
    : { data: [] };
  const byId = new Map((people ?? []).map((p) => [p.id, p]));
  return (apps ?? []).map((a) => ({ ...a, person: byId.get(a.candidate_id) ?? null }));
}
