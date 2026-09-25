// Notification delivery channels. In-app notifications are written by
// database triggers (public.create_notification). External channels are
// delivered by a background worker that reads undelivered rows
// (notifications.emailed_at IS NULL) and dispatches through these adapters.

export type OutgoingNotification = {
  userId: string;
  title: string;
  body: string | null;
  link: string | null;
  email?: string | null;
  phone?: string | null;
  telegramChatId?: string | null;
};

export interface NotificationChannel {
  id: "email" | "telegram" | "sms";
  isEnabled(): boolean;
  send(n: OutgoingNotification): Promise<{ ok: boolean; error?: string }>;
}

/** Email: plug an SMTP/transactional provider here (Resend, SES, local SMTP…). */
export const emailChannel: NotificationChannel = {
  id: "email",
  isEnabled: () => Boolean(process.env.EMAIL_PROVIDER_API_KEY),
  async send() {
    return { ok: false, error: "email provider not configured" };
  },
};

/** Telegram bot — next phase. */
export const telegramChannel: NotificationChannel = {
  id: "telegram",
  isEnabled: () => false,
  async send() {
    return { ok: false, error: "not implemented" };
  },
};

/** SMS (local provider, e.g. Eskiz/Playmobile) — next phase. */
export const smsChannel: NotificationChannel = {
  id: "sms",
  isEnabled: () => false,
  async send() {
    return { ok: false, error: "not implemented" };
  },
};

export const CHANNELS: NotificationChannel[] = [emailChannel, telegramChannel, smsChannel];
