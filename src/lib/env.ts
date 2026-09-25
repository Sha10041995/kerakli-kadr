// Centralised, validated access to environment variables.
// Public values are inlined at build time by Next.js (NEXT_PUBLIC_*).

export const env = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

/** True when Supabase credentials are present. Pages degrade gracefully otherwise. */
export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

/** Server-only secrets. Never import this from client components. */
export function serverEnv() {
  return {
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    paymentProvider: process.env.PAYMENT_PROVIDER ?? "mock",
    paymentsMockEnabled:
      process.env.PAYMENTS_MOCK_ENABLED === "true" && process.env.NODE_ENV !== "production",
  };
}
