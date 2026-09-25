"use server";

import { createClient } from "@/lib/supabase/server";
import { fail, toUserMessage, type ActionResult } from "@/lib/errors";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { checkRateLimit } from "@/lib/request";
import { fieldErrors } from "@/validations/common";
import { reportSchema } from "@/validations/misc";

export async function submitReportAction(input: unknown): Promise<ActionResult> {
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return fail("Maʼlumotlarni tekshiring", fieldErrors(parsed.error));
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return fail("Shikoyat yuborish uchun tizimga kiring.");
  const limit = await checkRateLimit("report", RATE_LIMITS.report, userId);
  if (!limit.ok) return fail(toUserMessage({ message: "RATE_LIMITED" }));
  const { error } = await supabase.from("reports").insert({
    reporter_id: userId,
    target_type: parsed.data.targetType,
    target_id: parsed.data.targetId,
    reason: parsed.data.reason,
    details: parsed.data.details || null,
  });
  if (error) {
    if (error.code === "23505") return fail("Siz bu eʼlon haqida allaqachon xabar bergansiz.");
    return fail(toUserMessage(error));
  }
  return { ok: true, message: "Rahmat! Moderatorlar tekshirib chiqadi." };
}
