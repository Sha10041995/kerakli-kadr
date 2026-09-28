// External notification channels. In-app notifications are written by
// database triggers; the dispatcher (src/features/notifications/dispatch.ts,
// run by /api/cron) delivers them through the channels enabled via env vars.

export type OutgoingNotification = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  email?: string | null;
  telegramChatId?: number | null;
};

export type SendResult = { ok: boolean; error?: string };

export interface NotificationChannel {
  id: "email" | "telegram" | "sms";
  isEnabled(): boolean;
  send(n: OutgoingNotification): Promise<SendResult>;
}

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const absolute = (link: string | null) => (link ? new URL(link, siteUrl()).toString() : siteUrl());

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function renderEmail(n: OutgoingNotification): { subject: string; html: string; text: string } {
  const url = absolute(n.link);
  const text = `${n.title}\n\n${n.body ?? ""}\n\n${url}\n\n— KADR TOP UZ`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:520px">
<h2 style="color:#047857">${escapeHtml(n.title)}</h2>
${n.body ? `<p>${escapeHtml(n.body)}</p>` : ""}
<p><a href="${escapeHtml(url)}" style="background:#059669;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Koʻrish</a></p>
<p style="color:#64748b;font-size:12px">KADR TOP UZ · Bildirishnomalarni kabinetdagi “Sozlamalar” boʻlimida oʻchirishingiz mumkin.</p>
</div>`;
  return { subject: n.title, html, text };
}

export function renderTelegram(n: OutgoingNotification): string {
  return [`<b>${escapeHtml(n.title)}</b>`, n.body ? escapeHtml(n.body) : null, absolute(n.link)].filter(Boolean).join("\n");
}

/** Email through the Resend HTTP API (RESEND_API_KEY + EMAIL_FROM). */
export const emailChannel: NotificationChannel = {
  id: "email",
  isEnabled: () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
  async send(n) {
    if (!n.email) return { ok: false, error: "no email" };
    const { subject, html, text } = renderEmail(n);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [n.email], subject, html, text }),
    });
    return res.ok ? { ok: true } : { ok: false, error: `email ${res.status}` };
  },
};

export async function telegramApi(method: string, payload: Record<string, unknown>): Promise<Response> {
  return fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** Telegram bot (TELEGRAM_BOT_TOKEN). Users link their chat from /dashboard/settings. */
export const telegramChannel: NotificationChannel = {
  id: "telegram",
  isEnabled: () => Boolean(process.env.TELEGRAM_BOT_TOKEN),
  async send(n) {
    if (!n.telegramChatId) return { ok: false, error: "no chat" };
    const res = await telegramApi("sendMessage", {
      chat_id: n.telegramChatId,
      text: renderTelegram(n),
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
    return res.ok ? { ok: true } : { ok: false, error: `telegram ${res.status}` };
  },
};

/** SMS (local provider such as Eskiz / Playmobile) — needs provider credentials. */
export const smsChannel: NotificationChannel = {
  id: "sms",
  isEnabled: () => false,
  async send() {
    return { ok: false, error: "not configured" };
  },
};

export const CHANNELS: NotificationChannel[] = [emailChannel, telegramChannel, smsChannel];
