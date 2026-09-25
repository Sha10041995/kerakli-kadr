import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Fire-and-forget analytics for demand dashboards (no PII beyond user id). */
export function logSearch(entry: {
  kind: "vacancies" | "candidates";
  userId?: string | null;
  query?: string;
  professionId?: number;
  regionId?: number;
  districtId?: number;
  results: number;
}) {
  const admin = createAdminClient();
  if (!admin) return;
  void admin
    .from("search_logs")
    .insert({
      kind: entry.kind,
      user_id: entry.userId ?? null,
      query: entry.query?.slice(0, 120) ?? null,
      profession_id: entry.professionId ?? null,
      region_id: entry.regionId ?? null,
      district_id: entry.districtId ?? null,
      results_count: entry.results,
    })
    .then(
      () => undefined,
      () => undefined,
    );
}
