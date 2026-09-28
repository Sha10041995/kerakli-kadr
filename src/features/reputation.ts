import "server-only";
import { createPublicClient } from "@/lib/supabase/public";

export async function companyResponseRate(companyId: string): Promise<number | null> {
  const db = createPublicClient(600);
  if (!db) return null;
  const { data } = await db.rpc("company_response_stats", { p_company_id: companyId });
  const row = data?.[0];
  return row && (row.total ?? 0) >= 3 ? row.response_rate : null;
}

export async function candidateResponseRate(candidateId: string): Promise<number | null> {
  const db = createPublicClient(600);
  if (!db) return null;
  const { data } = await db.rpc("candidate_response_stats", { p_candidate_id: candidateId });
  const row = data?.[0];
  return row && (row.total ?? 0) >= 2 ? row.response_rate : null;
}
