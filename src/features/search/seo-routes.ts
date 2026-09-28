// SEO-friendly location/profession URLs:
//   /jobs/toshkent, /jobs/toshkent/yunusobod, /jobs/xorazm/urganch-shahri/payvandchi,
//   /candidates/toshkent/elektrik, /candidates/elektrik
// Segments are resolved against the database; unknown combinations -> 404.
import type { Locale } from "@/lib/i18n/config";
import { search } from "@/lib/i18n/messages/public";
import { format } from "@/lib/i18n/translate";

export type SeoLookup = {
  region(slug: string): Promise<{ id: number; name: string } | null>;
  district(regionId: number, slug: string): Promise<{ id: number; name: string } | null>;
  profession(slug: string): Promise<{ id: number; name: string } | null>;
};

export type SeoResolution = {
  region?: { id: number; name: string; slug: string };
  district?: { id: number; name: string; slug: string };
  profession?: { id: number; name: string; slug: string };
};

const SLUG = /^[a-z0-9-]{1,80}$/;

/** Returns null when the path does not map to known locations/professions. */
export async function resolveSeoSegments(segments: string[], lookup: SeoLookup): Promise<SeoResolution | null> {
  if (segments.length === 0) return {};
  if (segments.length > 3 || !segments.every((s) => SLUG.test(s))) return null;
  const [a, b, c] = segments;

  const region = await lookup.region(a);
  if (!region) {
    if (segments.length !== 1) return null;
    const profession = await lookup.profession(a);
    return profession ? { profession: { ...profession, slug: a } } : null;
  }
  const out: SeoResolution = { region: { ...region, slug: a } };
  if (!b) return out;

  const district = await lookup.district(region.id, b);
  if (district) {
    out.district = { ...district, slug: b };
    if (!c) return out;
    const profession = await lookup.profession(c);
    if (!profession) return null;
    out.profession = { ...profession, slug: c };
    return out;
  }
  if (c) return null;
  const profession = await lookup.profession(b);
  if (!profession) return null;
  out.profession = { ...profession, slug: b };
  return out;
}

export function seoTitle(kind: "jobs" | "candidates", r: SeoResolution, locale: Locale = "uz"): string {
  const place = r.district?.name ?? r.region?.name;
  const profession = r.profession?.name;
  const prefix = kind === "jobs" ? "jobs" : "talent";
  const key = `${prefix}${profession ? "Profession" : ""}${place ? "Place" : ""}` as keyof typeof search.seo;
  return format(search.seo[key][locale], { place: place ?? "", profession: profession ?? "" });
}

export function seoPath(kind: "jobs" | "candidates", r: SeoResolution): string {
  const parts = [r.region?.slug, r.district?.slug, r.profession?.slug].filter(Boolean);
  return `/${kind}${parts.length ? `/${parts.join("/")}` : ""}`;
}
