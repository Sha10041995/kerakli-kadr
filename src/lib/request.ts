import "server-only";
import { headers } from "next/headers";
import { rateLimit, type RateLimitRule } from "@/lib/rate-limit";

/** Best-effort client IP (behind a trusted proxy / platform). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Rate-limits the current request by user id (if any) and IP. */
export async function checkRateLimit(scope: string, rule: RateLimitRule, userId?: string | null) {
  const ip = await clientIp();
  const key = `${scope}:${userId ?? "anon"}:${ip}`;
  return rateLimit(key, rule);
}
