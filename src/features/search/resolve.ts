import "server-only";
import { createSeoLookup } from "@/features/locations/queries";
import { resolveSeoSegments, type SeoResolution } from "@/features/search/seo-routes";

/** Resolves SEO path segments and merges them into parsed search filters. */
export async function resolveSearchPath<T extends { region?: number; district?: number; profession?: number }>(
  segments: string[] | undefined,
  search: T,
): Promise<{ search: T; seo: SeoResolution } | null> {
  const seo = await resolveSeoSegments(segments ?? [], createSeoLookup());
  if (!seo) return null;
  return {
    seo,
    search: {
      ...search,
      region: search.region ?? seo.region?.id,
      district: search.district ?? seo.district?.id,
      profession: search.profession ?? seo.profession?.id,
    },
  };
}
