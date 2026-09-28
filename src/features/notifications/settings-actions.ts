"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fail, toUserMessage, type ActionResult } from "@/lib/errors";

async function userClient() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims?.sub ?? null };
}

export async function saveNotificationPrefsAction(formData: FormData): Promise<ActionResult> {
  const { supabase, userId } = await userClient();
  if (!userId) return fail("errors.loginRequired");
  const { error } = await supabase
    .from("profiles")
    .update({ notify_email: formData.get("notifyEmail") === "on", notify_telegram: formData.get("notifyTelegram") === "on" })
    .eq("id", userId);
  if (error) return fail(toUserMessage(error));
  revalidatePath("/dashboard/settings");
  return { ok: true, message: "success.settingsSaved" };
}

export async function createTelegramLinkAction(): Promise<ActionResult<{ url: string }>> {
  const bot = process.env.TELEGRAM_BOT_USERNAME;
  if (!process.env.TELEGRAM_BOT_TOKEN || !bot) return fail("errors.telegramUnavailable");
  const { supabase, userId } = await userClient();
  if (!userId) return fail("errors.loginRequired");
  const token = randomBytes(24).toString("base64url");
  const { error } = await supabase.from("telegram_link_tokens").insert({ token, user_id: userId });
  if (error) return fail(toUserMessage(error));
  return { ok: true, data: { url: `https://t.me/${bot}?start=${token}` } };
}

export async function disconnectTelegramAction(): Promise<ActionResult> {
  const { supabase, userId } = await userClient();
  if (!userId) return fail("errors.loginRequired");
  const { error } = await supabase.from("profiles").update({ telegram_chat_id: null }).eq("id", userId);
  if (error) return fail(toUserMessage(error));
  revalidatePath("/dashboard/settings");
  return { ok: true };
}
