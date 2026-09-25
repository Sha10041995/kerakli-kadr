import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env, isSupabaseConfigured } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Cookie-less anon client for PUBLIC reference data (regions, professions,
 * plans, public stats). Responses are cached by Next.js for `revalidate` seconds.
 */
export function createPublicClient(revalidate = 3600) {
  if (!isSupabaseConfigured()) return null;
  return createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, next: { revalidate } }),
    },
  });
}
