import { describe, expect, it } from "vitest";
import { renderEmail, renderTelegram, type NotificationChannel } from "@/features/notifications/channels";
import { dispatchPending, type DispatchClient, type PendingDelivery } from "@/features/notifications/dispatch";
import { safeEqual } from "@/lib/security/secrets";

const row = (over: Partial<PendingDelivery> = {}): PendingDelivery => ({
  id: "n1",
  user_id: "u1",
  title: "Yangi ariza",
  body: "Nomzod ariza yubordi",
  link: "/dashboard",
  email: "a@b.uz",
  notify_email: true,
  telegram_chat_id: 42,
  notify_telegram: true,
  ...over,
});

function fakeClient(rows: PendingDelivery[]) {
  const marked: string[][] = [];
  const client = {
    rpc: async (fn: string, args: { p_ids?: string[] }) => {
      if (fn === "pending_notification_deliveries") return { data: rows, error: null };
      marked.push(args.p_ids ?? []);
      return { data: args.p_ids?.length ?? 0, error: null };
    },
  } as unknown as DispatchClient;
  return { client, marked };
}

const channel = (id: "email" | "telegram", ok = true, sent: string[] = []): NotificationChannel => ({
  id,
  isEnabled: () => true,
  send: async (n) => {
    sent.push(`${id}:${n.id}`);
    return { ok };
  },
});

describe("notification dispatcher", () => {
  it("skips entirely when no channel is enabled", async () => {
    const { client, marked } = fakeClient([row()]);
    const r = await dispatchPending(client, [{ ...channel("email"), isEnabled: () => false }]);
    expect(r.skipped).toBe(true);
    expect(marked).toEqual([]);
  });

  it("respects preferences and marks delivered", async () => {
    const sent: string[] = [];
    const { client, marked } = fakeClient([row(), row({ id: "n2", notify_email: false, telegram_chat_id: null })]);
    const r = await dispatchPending(client, [channel("email", true, sent), channel("telegram", true, sent)]);
    expect(sent).toEqual(["email:n1", "telegram:n1"]);
    expect(r.sent).toEqual({ email: 1, telegram: 1 });
    expect(marked[0]).toEqual(["n1", "n2"]);
  });

  it("keeps failed deliveries for retry", async () => {
    const { client, marked } = fakeClient([row()]);
    const r = await dispatchPending(client, [channel("email", false)]);
    expect(r.failed).toBe(1);
    expect(marked).toEqual([]);
  });
});

describe("rendering", () => {
  it("escapes user content", () => {
    const n = { id: "x", title: "<script>alert(1)</script>", body: "a & b", link: "/vacancy/1" };
    expect(renderEmail(n).html).not.toContain("<script>");
    expect(renderEmail(n).html).toContain("&amp;");
    expect(renderTelegram(n)).toContain("&lt;script&gt;");
    expect(renderTelegram(n)).toMatch(/\/vacancy\/1$/);
  });
});

describe("safeEqual", () => {
  it("compares secrets", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual(null, "abc")).toBe(false);
    expect(safeEqual("", "")).toBe(false);
  });
});
