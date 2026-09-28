import { createHash } from "node:crypto";
import { MemoryRateLimitStore, type RateLimitStore } from "@/lib/rate-limit";

type RpcClient = {
  rpc(
    fn: "rate_limit_hit",
    args: { p_key: string; p_window_ms: number },
  ): PromiseLike<{ data: { hits: number | null; reset_at: string | null }[] | null; error: unknown }>;
};

export function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Shared (multi-instance) store backed by public.rate_limit_hit().
 * Keys are hashed before leaving the process. On database errors it degrades
 * to the in-memory store so a DB hiccup never locks users out.
 */
export class DatabaseRateLimitStore implements RateLimitStore {
  constructor(
    private client: RpcClient,
    private fallback: RateLimitStore = new MemoryRateLimitStore(),
  ) {}

  async increment(key: string, windowMs: number) {
    try {
      const { data, error } = await this.client.rpc("rate_limit_hit", { p_key: hashKey(key), p_window_ms: windowMs });
      const row = data?.[0];
      if (error || !row || row.hits == null || !row.reset_at) throw error ?? new Error("empty");
      return { count: row.hits, resetAt: new Date(row.reset_at).getTime() };
    } catch {
      return this.fallback.increment(key, windowMs);
    }
  }
}
