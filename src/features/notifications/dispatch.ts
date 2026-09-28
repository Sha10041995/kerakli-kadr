import type { NotificationChannel, OutgoingNotification } from "./channels";

export type PendingDelivery = {
  id: string | null;
  user_id: string | null;
  title: string | null;
  body: string | null;
  link: string | null;
  email: string | null;
  notify_email: boolean | null;
  telegram_chat_id: number | null;
  notify_telegram: boolean | null;
};

export type DispatchClient = {
  rpc(
    fn: "pending_notification_deliveries",
    args: { p_limit: number },
  ): PromiseLike<{ data: PendingDelivery[] | null; error: unknown }>;
  rpc(fn: "mark_notifications_delivered", args: { p_ids: string[] }): PromiseLike<{ data: number | null; error: unknown }>;
};

export type DispatchReport = { considered: number; sent: Record<string, number>; failed: number; skipped: boolean };

/**
 * Delivers pending notifications through enabled channels, respecting user
 * preferences. Rows are marked as delivered only after all attempts, so an
 * outage retries on the next run (queue is bounded to the last 2 days).
 */
export async function dispatchPending(
  client: DispatchClient,
  channels: NotificationChannel[],
  limit = 200,
): Promise<DispatchReport> {
  const enabled = channels.filter((c) => c.isEnabled());
  const report: DispatchReport = { considered: 0, sent: {}, failed: 0, skipped: enabled.length === 0 };
  if (enabled.length === 0) return report;

  const { data, error } = await client.rpc("pending_notification_deliveries", { p_limit: limit });
  if (error || !data) return report;
  report.considered = data.length;

  const done: string[] = [];
  for (const row of data) {
    if (!row.id) continue;
    const n: OutgoingNotification = {
      id: row.id,
      title: row.title ?? "",
      body: row.body,
      link: row.link,
      email: row.notify_email ? row.email : null,
      telegramChatId: row.notify_telegram ? row.telegram_chat_id : null,
    };
    let transientFailure = false;
    for (const ch of enabled) {
      if (ch.id === "email" && !n.email) continue;
      if (ch.id === "telegram" && !n.telegramChatId) continue;
      if (ch.id === "sms") continue;
      try {
        const res = await ch.send(n);
        if (res.ok) report.sent[ch.id] = (report.sent[ch.id] ?? 0) + 1;
        else {
          report.failed++;
          transientFailure = true;
        }
      } catch {
        report.failed++;
        transientFailure = true;
      }
    }
    if (!transientFailure) done.push(row.id);
  }
  if (done.length) await client.rpc("mark_notifications_delivered", { p_ids: done });
  return report;
}
