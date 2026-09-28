import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeEqual } from "@/lib/security/secrets";
import { telegramApi } from "@/features/notifications/channels";

// Telegram bot webhook. Register with:
//   https://api.telegram.org/bot<TOKEN>/setWebhook?url=<SITE>/api/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>
// Handles "/start <token>" deep links created in /dashboard/settings.
export async function POST(request: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!process.env.TELEGRAM_BOT_TOKEN || !secret) return NextResponse.json({ error: "not_configured" }, { status: 404 });
  if (!safeEqual(request.headers.get("x-telegram-bot-api-secret-token"), secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const update = (await request.json().catch(() => null)) as { message?: { chat?: { id?: number }; text?: string } } | null;
  const chatId = update?.message?.chat?.id;
  const text = update?.message?.text ?? "";
  if (!chatId) return NextResponse.json({ ok: true });

  const match = text.match(/^\/start\s+([A-Za-z0-9_-]{16,64})$/);
  if (!match) {
    await telegramApi("sendMessage", {
      chat_id: chatId,
      text: "Salom! Bildirishnomalarni ulash uchun saytdagi “Sozlamalar” boʻlimidan havolani bosing.",
    });
    return NextResponse.json({ ok: true });
  }
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const { data: userId } = await admin.rpc("link_telegram_chat", { p_token: match[1], p_chat_id: chatId });
  await telegramApi("sendMessage", {
    chat_id: chatId,
    text: userId
      ? "✅ Telegram ulandi. Endi yangi arizalar, xabarlar va mos vakansiyalar haqida shu yerda xabar olasiz."
      : "Havola eskirgan. Saytdan qayta urinib koʻring.",
  });
  return NextResponse.json({ ok: true });
}
