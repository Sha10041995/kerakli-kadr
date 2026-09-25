import "server-only";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import type { SeoLookup } from "@/features/search/seo-routes";

export type LocationOption = { id: number; slug: string; name: string; lat: number | null; lng: number | null; kind?: string };

export const getRegions = cache(async (): Promise<LocationOption[]> => {
  const db = createPublicClient();
  if (!db) return [];
  const { data } = await db.from("regions").select("id, slug, name_uz, lat, lng").eq("is_active", true).order("sort_order");
  return (data ?? []).map((r) => ({ id: r.id, slug: r.slug, name: r.name_uz, lat: r.lat, lng: r.lng }));
});

export async function getDistricts(regionId: number): Promise<LocationOption[]> {
  const db = createPublicClient();
  if (!db) return [];
  const { data } = await db
    .from("districts")
    .select("id, slug, name_uz, lat, lng, kind")
    .eq("region_id", regionId)
    .eq("is_active", true)
    .order("kind", { ascending: false })
    .order("name_uz");
  return (data ?? []).map((r) => ({ id: r.id, slug: r.slug, name: r.name_uz, lat: r.lat, lng: r.lng, kind: r.kind }));
}

export async function getSettlements(districtId: number): Promise<LocationOption[]> {
  const db = createPublicClient();
  if (!db) return [];
  const { data } = await db
    .from("settlements")
    .select("id, slug, name_uz, lat, lng, kind")
    .eq("district_id", districtId)
    .eq("is_active", true)
    .order("name_uz");
  return (data ?? []).map((r) => ({ id: r.id, slug: r.slug, name: r.name_uz, lat: r.lat, lng: r.lng, kind: r.kind }));
}

export async function getMahallas(districtId: number, settlementId?: number | null): Promise<LocationOption[]> {
  const db = createPublicClient();
  if (!db) return [];
  let q = db.from("mahallas").select("id, slug, name_uz, lat, lng").eq("district_id", districtId).eq("is_active", true);
  if (settlementId) q = q.eq("settlement_id", settlementId);
  const { data } = await q.order("name_uz");
  return (data ?? []).map((r) => ({ id: r.id, slug: r.slug, name: r.name_uz, lat: r.lat, lng: r.lng }));
}

export type LocationSelection = {
  regionId?: number | null;
  districtId?: number | null;
  settlementId?: number | null;
  mahallaId?: number | null;
};

/** Human readable names for a selection, most specific last. */
export async function getLocationLabel(sel: LocationSelection): Promise<string | null> {
  const db = createPublicClient();
  if (!db) return null;
  const [r, d, s, m] = await Promise.all([
    sel.regionId ? db.from("regions").select("name_uz").eq("id", sel.regionId).maybeSingle() : null,
    sel.districtId ? db.from("districts").select("name_uz").eq("id", sel.districtId).maybeSingle() : null,
    sel.settlementId ? db.from("settlements").select("name_uz").eq("id", sel.settlementId).maybeSingle() : null,
    sel.mahallaId ? db.from("mahallas").select("name_uz").eq("id", sel.mahallaId).maybeSingle() : null,
  ]);
  const parts = [m?.data?.name_uz, s?.data?.name_uz, d?.data?.name_uz, r?.data?.name_uz].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

export function createSeoLookup(): SeoLookup {
  const db = createPublicClient();
  return {
    async region(slug) {
      if (!db) return null;
      const { data } = await db.from("regions").select("id, name_uz").eq("slug", slug).eq("is_active", true).maybeSingle();
      return data ? { id: data.id, name: data.name_uz } : null;
    },
    async district(regionId, slug) {
      if (!db) return null;
      const { data } = await db
        .from("districts")
        .select("id, name_uz")
        .eq("region_id", regionId)
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      return data ? { id: data.id, name: data.name_uz } : null;
    },
    async profession(slug) {
      if (!db) return null;
      const { data } = await db.from("professions").select("id, name_uz").eq("slug", slug).eq("is_active", true).maybeSingle();
      return data ? { id: data.id, name: data.name_uz } : null;
    },
  };
}
