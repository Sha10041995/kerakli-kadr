import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/env";
import { candidateRpcArgs, type CandidateSearch } from "@/features/search/params";
import type { FunctionReturns } from "@/types/database";

export type CandidateSearchRow = FunctionReturns<"search_candidates">[number];

export async function searchCandidates(search: CandidateSearch): Promise<{ rows: CandidateSearchRow[]; total: number; error?: string }> {
  if (!isSupabaseConfigured()) return { rows: [], total: 0 };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_candidates", candidateRpcArgs(search));
  if (error) return { rows: [], total: 0, error: error.message };
  const rows = data ?? [];
  return { rows, total: Number(rows[0]?.total_count ?? 0) };
}

export async function featuredCandidates(limit = 6): Promise<CandidateSearchRow[]> {
  const db = createPublicClient(300);
  if (!db) return [];
  const { data } = await db.rpc("search_candidates", { p_limit: limit, p_availability: ["immediately", "within_week"] });
  return data ?? [];
}

/** Public candidate profile (respects RLS: public profiles or authorised viewers). */
export async function getCandidate(id: string) {
  if (!isSupabaseConfigured() || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("candidate_profiles")
    .select(
      `*, professions(id, slug, name_uz, category_id), regions(slug, name_uz), districts(slug, name_uz), settlements(name_uz), mahallas(name_uz),
       candidate_skills(level, is_verified, skills(id, name_uz)),
       candidate_experience(*), candidate_education(*), candidate_certificates(id, name, issuer, issued_at, is_verified),
       candidate_portfolio(*)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (!profile) return null;
  const { data: person } = await supabase
    .from("public_profiles")
    .select("first_name, last_name, avatar_url, phone_verified, identity_verified, certificate_verified, created_at")
    .eq("id", id)
    .maybeSingle();
  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at")
    .eq("reviewee_user_id", id)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(10);
  return { profile, person, reviews: reviews ?? [] };
}

export type CandidateDetail = NonNullable<Awaited<ReturnType<typeof getCandidate>>>;

export async function getOwnCandidateProfile(userId: string) {
  const supabase = await createClient();
  const [{ data: profile }, { data: person }] = await Promise.all([
    supabase
      .from("candidate_profiles")
      .select(
        `*, candidate_skills(skill_id), candidate_experience(*), candidate_education(*),
         candidate_certificates(*), candidate_portfolio(*)`,
      )
      .eq("id", userId)
      .maybeSingle(),
    supabase.from("profiles").select("first_name, last_name, phone, birth_year, avatar_url, email").eq("id", userId).maybeSingle(),
  ]);
  return { profile, person };
}
