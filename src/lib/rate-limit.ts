// Fixed-window rate limiter. The in-memory store is fine for a single
// instance / development; plug a shared store (Redis, Upstash, Postgres)
// into RateLimitStore for multi-instance production deployments.
// Critical limits (messages, applications, reports) are also enforced in the
// database, so this layer is defence in depth.

export interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
}

export class MemoryRateLimitStore implements RateLimitStore {
  private hits = new Map<string, { count: number; resetAt: number }>();

  constructor(private now: () => number = Date.now) {}

  async increment(key: string, windowMs: number) {
    const t = this.now();
    const current = this.hits.get(key);
    if (!current || current.resetAt <= t) {
      const entry = { count: 1, resetAt: t + windowMs };
      this.hits.set(key, entry);
      if (this.hits.size > 10_000) this.sweep(t);
      return entry;
    }
    current.count += 1;
    return current;
  }

  private sweep(t: number) {
    for (const [k, v] of this.hits) if (v.resetAt <= t) this.hits.delete(k);
  }
}

export type RateLimitRule = { limit: number; windowMs: number };

export const RATE_LIMITS = {
  auth: { limit: 10, windowMs: 10 * 60_000 },
  search: { limit: 120, windowMs: 60_000 },
  write: { limit: 60, windowMs: 60_000 },
  upload: { limit: 20, windowMs: 10 * 60_000 },
  report: { limit: 10, windowMs: 60 * 60_000 },
} satisfies Record<string, RateLimitRule>;

const defaultStore = new MemoryRateLimitStore();

export async function rateLimit(
  key: string,
  rule: RateLimitRule,
  store: RateLimitStore = defaultStore,
): Promise<{ ok: boolean; remaining: number; retryAfterSec: number }> {
  const { count, resetAt } = await store.increment(key, rule.windowMs);
  const ok = count <= rule.limit;
  return {
    ok,
    remaining: Math.max(0, rule.limit - count),
    retryAfterSec: ok ? 0 : Math.ceil((resetAt - Date.now()) / 1000),
  };
}
