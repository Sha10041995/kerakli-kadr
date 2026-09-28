import { describe, expect, it } from "vitest";
import { analyzeMessage } from "@/features/messaging/moderation";
import { toUserMessage } from "@/lib/errors";
import { sniffMime, validateUpload, objectPath } from "@/lib/files";
import { approximatePoint, haversineKm, isInUzbekistan } from "@/lib/geo";
import { MemoryRateLimitStore, rateLimit } from "@/lib/rate-limit";
import { jsonLdScript } from "@/lib/seo";
import { formatDistance, formatSalary, slugify, timeAgo, displayName } from "@/lib/utils";

describe("files: magic-byte validation", () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const pdf = new TextEncoder().encode("%PDF-1.7 ...");
  const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]);
  const html = new TextEncoder().encode("<html><script>alert(1)</script>");
  const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]);

  it("detects real types", () => {
    expect(sniffMime(jpeg)).toBe("image/jpeg");
    expect(sniffMime(png)).toBe("image/png");
    expect(sniffMime(pdf)).toBe("application/pdf");
    expect(sniffMime(webp)).toBe("image/webp");
    expect(sniffMime(html)).toBeNull();
    expect(sniffMime(exe)).toBeNull();
  });

  it("enforces bucket type and size rules", () => {
    expect(validateUpload("avatars", jpeg, 1000)).toMatchObject({ ok: true, ext: "jpg" });
    expect(validateUpload("avatars", pdf, 1000).ok).toBe(false); // pdf not allowed as avatar
    expect(validateUpload("documents", pdf, 1000)).toMatchObject({ ok: true, ext: "pdf" });
    expect(validateUpload("documents", html, 1000).ok).toBe(false);
    expect(validateUpload("avatars", jpeg, 3 * 1024 * 1024).ok).toBe(false);
    expect(validateUpload("avatars", jpeg, 0).ok).toBe(false);
  });

  it("builds owner-scoped random paths", () => {
    const p = objectPath("user-1", "pdf");
    expect(p).toMatch(/^user-1\/[0-9a-f-]{36}\.pdf$/);
  });
});

describe("chat moderation", () => {
  it("flags links and fraud patterns", () => {
    expect(analyzeMessage("Salom, ertaga uchrashamizmi?").flagged).toBe(false);
    expect(analyzeMessage("Batafsil: https://t.me/xyz").flags).toContain("link");
    const fraud = analyzeMessage("Ishga olish uchun karta raqamingiz va SMS kod kerak");
    expect(fraud.flags).toContain("fraud");
    expect(fraud.warning).toMatch(/karta/);
  });
  it("warns about phone numbers without blocking", () => {
    const r = analyzeMessage("Menga +998 90 123 45 67 ga qoʻngʻiroq qiling");
    expect(r.flags).toContain("phone");
    expect(r.flagged).toBe(false);
  });
});

describe("geo", () => {
  it("computes distances (Tashkent → Samarkand ≈ 270 km)", () => {
    expect(haversineKm(41.3111, 69.2797, 39.6542, 66.9597)).toBeGreaterThan(260);
    expect(haversineKm(41.3111, 69.2797, 39.6542, 66.9597)).toBeLessThan(290);
    expect(haversineKm(41, 69, 41, 69)).toBe(0);
  });
  it("approximates points for privacy", () => {
    expect(approximatePoint(41.311123, 69.279788)).toEqual({ lat: 41.31, lng: 69.28 });
  });
  it("validates Uzbekistan bounds", () => {
    expect(isInUzbekistan(41.3, 69.2)).toBe(true);
    expect(isInUzbekistan(55.7, 37.6)).toBe(false);
  });
});

describe("rate limiter", () => {
  it("blocks after the limit and resets after the window", async () => {
    let now = 0;
    const store = new MemoryRateLimitStore(() => now);
    const rule = { limit: 2, windowMs: 1000 };
    expect((await rateLimit("k", rule, store)).ok).toBe(true);
    expect((await rateLimit("k", rule, store)).ok).toBe(true);
    expect((await rateLimit("k", rule, store)).ok).toBe(false);
    expect((await rateLimit("other", rule, store)).ok).toBe(true);
    now = 1001;
    expect((await rateLimit("k", rule, store)).ok).toBe(true);
  });
});

describe("error mapping", () => {
  it("maps database errors to Uzbek messages and hides internals", () => {
    expect(toUserMessage({ message: "VACANCY_LIMIT_REACHED" })).toMatch(/limit/);
    expect(toUserMessage({ message: "new row violates row-level security policy for table x" })).toMatch(/ruxsat/);
    expect(toUserMessage({ message: 'relation "secret_table" does not exist' })).not.toMatch(/secret/);
    expect(toUserMessage(null)).toMatch(/Xatolik/);
  });
});

describe("formatting", () => {
  it("formats salaries", () => {
    expect(formatSalary(5_000_000, 7_000_000, "monthly")).toBe("5 mln – 7 mln soʻm/oy");
    expect(formatSalary(250_000, null, "daily")).toBe("250 ming soʻmdan/kun");
    expect(formatSalary(null, null, "monthly")).toBe("Kelishiladi");
    expect(formatSalary(1_500, 2_000, "monthly", "USD")).toBe("1 500 – 2 000 $/oy");
  });
  it("formats distances", () => {
    expect(formatDistance(0.34)).toBe("300 m");
    expect(formatDistance(2.84)).toBe("2,8 km");
    expect(formatDistance(37.4)).toBe("37 km");
    expect(formatDistance(null)).toBeNull();
  });
  it("slugifies Uzbek text", () => {
    expect(slugify("Qoʻngʻirot tumani")).toBe("qongirot-tumani");
    expect(slugify("  Toshkent IT Solutions MChJ! ")).toBe("toshkent-it-solutions-mchj");
  });
  it("relative time", () => {
    const now = new Date("2026-09-25T12:00:00Z");
    expect(timeAgo("2026-09-25T11:55:00Z", now)).toBe("5 daqiqa oldin");
    expect(timeAgo("2026-09-23T12:00:00Z", now)).toBe("2 kun oldin");
  });
  it("public display name hides full surname", () => {
    expect(displayName("Ali", "Valiyev", true)).toBe("Ali V.");
  });
  it("escapes JSON-LD", () => {
    expect(jsonLdScript({ t: "</script><script>alert(1)</script>" })).not.toContain("</script>");
  });
});

describe("cn (class merging)", () => {
  it("lets overrides replace component defaults", async () => {
    const { cn } = await import("@/lib/utils");
    expect(cn("bg-white p-4", "bg-slate-900")).toBe("p-4 bg-slate-900");
    expect(cn("bg-brand-600 text-white", "bg-white text-brand-800")).toBe("bg-white text-brand-800");
  });
});

describe("CSP", () => {
  it("uses a nonce instead of unsafe-inline for scripts", async () => {
    const { buildCsp, generateNonce } = await import("@/lib/security/csp");
    const nonce = generateNonce();
    const prod = buildCsp(nonce, { dev: false, supabaseUrl: "https://abc.supabase.co" });
    expect(prod).toContain(`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`);
    expect(prod).not.toMatch(/script-src[^;]*unsafe/);
    expect(prod).toContain("connect-src 'self' https://abc.supabase.co wss://abc.supabase.co");
    expect(prod).toContain("upgrade-insecure-requests");
    expect(buildCsp(nonce, { dev: true })).toContain("'unsafe-eval'");
    expect(generateNonce()).not.toBe(nonce);
  });
});

describe("DatabaseRateLimitStore", () => {
  it("hashes keys and uses database counters", async () => {
    const { DatabaseRateLimitStore, hashKey } = await import("@/lib/rate-limit-store");
    const calls: { p_key: string }[] = [];
    const client = {
      rpc: async (_fn: "rate_limit_hit", args: { p_key: string; p_window_ms: number }) => {
        calls.push(args);
        return { data: [{ hits: 7, reset_at: "2030-01-01T00:00:00Z" }], error: null };
      },
    };
    const store = new DatabaseRateLimitStore(client);
    const r = await store.increment("auth:user@mail.uz:1.2.3.4", 1000);
    expect(r.count).toBe(7);
    expect(calls[0].p_key).toBe(hashKey("auth:user@mail.uz:1.2.3.4"));
    expect(calls[0].p_key).not.toContain("user@mail.uz");
  });

  it("falls back to memory when the database fails", async () => {
    const { DatabaseRateLimitStore } = await import("@/lib/rate-limit-store");
    const client = { rpc: async () => ({ data: null, error: new Error("down") }) };
    const store = new DatabaseRateLimitStore(client);
    expect((await store.increment("k", 1000)).count).toBe(1);
    expect((await store.increment("k", 1000)).count).toBe(2);
  });
});
