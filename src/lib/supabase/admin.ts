import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env, serverEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Service-role client that BYPASSES RLS. Use only in trusted server code
 * (payment webhooks, background jobs, analytics logging) — never with
 * user-controlled filters, and never in client components.
 */
export function createAdminClient() {
  const { serviceRoleKey } = serverEnv();
  if (!env.supabaseUrl || !serviceRoleKey) return null;
  return createClient<Database>(env.supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
