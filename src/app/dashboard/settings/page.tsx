import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/form";
import { ActionForm } from "@/components/ui/action-form";
import { requireUser } from "@/features/auth/session";
import { saveNotificationPrefsAction } from "@/features/notifications/settings-actions";
import { TelegramConnect } from "@/features/notifications/telegram-connect";
import { emailChannel, telegramChannel } from "@/features/notifications/channels";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("settings.title"), robots: { index: false } };
}

export default async function SettingsPage() {
  const user = await requireUser("/dashboard/settings");
  const supabase = await createClient();
  const { t } = await getI18n();
  const { data: p } = await supabase
    .from("profiles")
    .select("email, notify_email, notify_telegram, telegram_chat_id")
    .eq("id", user.id)
    .single();
  const emailOn = emailChannel.isEnabled();
  const telegramOn = telegramChannel.isEnabled() && Boolean(process.env.TELEGRAM_BOT_USERNAME);
  return (
    <>
      <PageHeader title={t("settings.title")} description={t("settings.intro")} />
      <Card className="mb-6">
        <h2 className="mb-3 font-semibold text-slate-900">{t("settings.channels")}</h2>
        <ActionForm action={saveNotificationPrefsAction} className="space-y-3" resetOnSuccess={false}>
          <Checkbox
            name="notifyEmail"
            defaultChecked={p?.notify_email ?? true}
            label={`${t("settings.viaEmail", { email: p?.email ?? "—" })}${emailOn ? "" : t("settings.soon")}`}
          />
          <Checkbox
            name="notifyTelegram"
            defaultChecked={p?.notify_telegram ?? true}
            label={`${t("settings.viaTelegram")}${telegramOn ? "" : t("settings.soon")}`}
          />
          <Button type="submit" size="sm">
            {t("common.save")}
          </Button>
        </ActionForm>
      </Card>
      <Card>
        <h2 className="mb-1 font-semibold text-slate-900">Telegram</h2>
        <p className="mb-3 text-sm text-slate-600">{t("settings.telegramText")}</p>
        {telegramOn ? (
          <TelegramConnect connected={Boolean(p?.telegram_chat_id)} />
        ) : (
          <p className="text-sm text-slate-500">{t("settings.telegramSoon")}</p>
        )}
      </Card>
    </>
  );
}
