import "server-only";
import { headers } from "next/headers";
import { rateLimit, type RateLimitRule, type RateLimitStore } from "@/lib/rate-limit";
import { DatabaseRateLimitStore } from "@/lib/rate-limit-store";
import { createAdminClient } from "@/lib/supabase/admin";

let sharedStore: RateLimitStore | null | undefined;

/** Database-backed store when the service role key is configured, else in-memory. */
function store(): RateLimitStore | undefined {
  if (sharedStore === undefined) {
    const admin = createAdminClient();
    sharedStore = admin ? new DatabaseRateLimitStore(admin) : null;
  }
  return sharedStore ?? undefined;
}

/** Best-effort client IP (behind a trusted proxy / platform). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Rate-limits the current request by user id (if any) and IP. */
export async function checkRateLimit(scope: string, rule: RateLimitRule, userId?: string | null) {
  const ip = await clientIp();
  const key = `${scope}:${userId ?? "anon"}:${ip}`;
  return rateLimit(key, rule, store());
}
