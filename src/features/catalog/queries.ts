import "server-only";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";

export type ProfessionOption = { id: number; slug: string; name: string; categoryId: number };
export type CategoryWithProfessions = { id: number; slug: string; name: string; icon: string | null; professions: ProfessionOption[] };

export const getCatalog = cache(async (): Promise<CategoryWithProfessions[]> => {
  const db = createPublicClient();
  if (!db) return [];
  const [cats, profs] = await Promise.all([
    db.from("categories").select("id, slug, name_uz, icon, sort_order").eq("is_active", true).is("parent_id", null).order("sort_order"),
    db.from("professions").select("id, slug, name_uz, category_id, sort_order").eq("is_active", true).order("sort_order"),
  ]);
  return (cats.data ?? []).map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name_uz,
    icon: c.icon,
    professions: (profs.data ?? [])
      .filter((p) => p.category_id === c.id)
      .map((p) => ({ id: p.id, slug: p.slug, name: p.name_uz, categoryId: p.category_id })),
  }));
});

export const getSkills = cache(async () => {
  const db = createPublicClient();
  if (!db) return [];
  const { data } = await db.from("skills").select("id, slug, name_uz").eq("is_active", true).order("name_uz");
  return (data ?? []).map((s) => ({ id: s.id, slug: s.slug, name: s.name_uz }));
});

export async function getProfessionSkills(professionId: number): Promise<number[]> {
  const db = createPublicClient();
  if (!db) return [];
  const { data } = await db.from("profession_skills").select("skill_id").eq("profession_id", professionId);
  return (data ?? []).map((r) => r.skill_id);
}

export async function getCategoryStats() {
  const db = createPublicClient(600);
  if (!db) return [];
  const { data } = await db.rpc("category_stats");
  return data ?? [];
}

export async function getRegionStats() {
  const db = createPublicClient(600);
  if (!db) return [];
  const { data } = await db.rpc("region_stats");
  return data ?? [];
}

export async function getTalentSummary(regionId?: number | null, districtId?: number | null, limit = 8) {
  const db = createPublicClient(600);
  if (!db) return [];
  const { data } = await db.rpc("talent_summary", { p_region_id: regionId ?? null, p_district_id: districtId ?? null, p_limit: limit });
  return data ?? [];
}

export type TalentCount = { in_area: number; nearby: number; in_region: number; vacancies_in_area: number };

export async function getTalentCount(
  professionId: number,
  loc: { regionId?: number | null; districtId?: number | null; settlementId?: number | null },
  radiusKm = 25,
): Promise<TalentCount | null> {
  const db = createPublicClient(300);
  if (!db) return null;
  const { data } = await db.rpc("talent_count", {
    p_profession_id: professionId,
    p_region_id: loc.regionId ?? null,
    p_district_id: loc.districtId ?? null,
    p_settlement_id: loc.settlementId ?? null,
    p_radius_km: radiusKm,
  });
  return (data as TalentCount | null) ?? null;
}

export async function getPlans() {
  const db = createPublicClient(600);
  if (!db) return { plans: [], services: [] };
  const [plans, services] = await Promise.all([
    db.from("subscription_plans").select("*").eq("is_active", true).order("sort_order"),
    db.from("paid_services").select("*").eq("is_active", true).order("price_uzs"),
  ]);
  return { plans: plans.data ?? [], services: services.data ?? [] };
}

export const getProfessionSkillsMap = cache(async (): Promise<Record<number, number[]>> => {
  const db = createPublicClient();
  if (!db) return {};
  const { data } = await db.from("profession_skills").select("profession_id, skill_id");
  const map: Record<number, number[]> = {};
  for (const r of data ?? []) (map[r.profession_id] ??= []).push(r.skill_id);
  return map;
});
