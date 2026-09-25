import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { createPublicClient } from "@/lib/supabase/public";

export const revalidate = 3600;

// Static pages + SEO location/profession pages + active vacancies.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = ["/", "/jobs", "/candidates", "/pricing", "/about"].map((p) => ({
    url: absoluteUrl(p),
    lastModified: now,
    changeFrequency: "daily",
    priority: p === "/" ? 1 : 0.8,
  }));

  const db = createPublicClient(3600);
  if (!db) return entries;
  const [{ data: regions }, { data: districts }, { data: professions }, { data: vacancies }] = await Promise.all([
    db.from("regions").select("id, slug").eq("is_active", true),
    db.from("districts").select("slug, region_id").eq("is_active", true),
    db.from("professions").select("slug").eq("is_active", true),
    db.from("vacancies").select("id, updated_at").eq("status", "active").order("published_at", { ascending: false }).limit(5000),
  ]);
  const regionSlug = new Map((regions ?? []).map((r) => [r.id, r.slug]));

  for (const r of regions ?? []) {
    entries.push({ url: absoluteUrl(`/jobs/${r.slug}`), changeFrequency: "daily", priority: 0.7 });
    entries.push({ url: absoluteUrl(`/candidates/${r.slug}`), changeFrequency: "daily", priority: 0.6 });
  }
  for (const d of districts ?? []) {
    const rs = regionSlug.get(d.region_id);
    if (rs) entries.push({ url: absoluteUrl(`/jobs/${rs}/${d.slug}`), changeFrequency: "daily", priority: 0.6 });
  }
  for (const p of professions ?? []) {
    entries.push({ url: absoluteUrl(`/jobs/${p.slug}`), changeFrequency: "daily", priority: 0.6 });
    entries.push({ url: absoluteUrl(`/candidates/${p.slug}`), changeFrequency: "daily", priority: 0.5 });
  }
  for (const v of vacancies ?? []) {
    entries.push({ url: absoluteUrl(`/vacancy/${v.id}`), lastModified: new Date(v.updated_at), changeFrequency: "weekly", priority: 0.7 });
  }
  return entries;
}
