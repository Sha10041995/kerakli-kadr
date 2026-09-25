import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/env";
import { vacancyRpcArgs, type VacancySearch } from "@/features/search/params";
import type { FunctionReturns } from "@/types/database";

export type VacancySearchRow = FunctionReturns<"search_vacancies">[number];

export async function searchVacancies(search: VacancySearch): Promise<{ rows: VacancySearchRow[]; total: number; error?: string }> {
  if (!isSupabaseConfigured()) return { rows: [], total: 0 };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_vacancies", vacancyRpcArgs(search));
  if (error) return { rows: [], total: 0, error: error.message };
  const rows = data ?? [];
  return { rows, total: Number(rows[0]?.total_count ?? 0) };
}

/** Latest active vacancies (optionally near a region) for the home page. */
export async function latestVacancies(limit = 6, regionId?: number | null): Promise<VacancySearchRow[]> {
  const db = createPublicClient(300);
  if (!db) return [];
  const { data } = await db.rpc("search_vacancies", { p_region_id: regionId ?? null, p_sort: "newest", p_limit: limit });
  return data ?? [];
}

export async function getVacancy(id: string) {
  if (!isSupabaseConfigured() || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("vacancies")
    .select(
      `*, companies(id, name, slug, logo_url, verification_status, rating_avg, rating_count, company_type, description, hires_count),
       professions(id, slug, name_uz), categories(id, name_uz),
       regions(id, slug, name_uz), districts(id, slug, name_uz), settlements(id, name_uz), mahallas(id, name_uz),
       vacancy_skills(is_required, skills(id, name_uz))`,
    )
    .eq("id", id)
    .maybeSingle();
  return data;
}

export type VacancyDetail = NonNullable<Awaited<ReturnType<typeof getVacancy>>>;

export async function listCompanyVacancies(companyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vacancies")
    .select("id, title, status, published_at, expires_at, applications_count, views_count, urgent, promoted_until, is_featured, rejection_reason, created_at, districts(name_uz)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  return data ?? [];
}
