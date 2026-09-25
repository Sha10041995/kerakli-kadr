"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fail, toUserMessage, type ActionResult } from "@/lib/errors";
import { uuidSchema } from "@/validations/common";

export async function toggleFavoriteAction(
  kind: "vacancy" | "candidate",
  targetId: string,
): Promise<ActionResult<{ saved: boolean }>> {
  if ((kind !== "vacancy" && kind !== "candidate") || !uuidSchema.safeParse(targetId).success) return fail("Notoʻgʻri soʻrov");
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return fail("Saqlash uchun tizimga kiring.");
  const column = kind === "vacancy" ? "vacancy_id" : "candidate_id";
  const { data: existing } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", userId)
    .eq(column, targetId)
    .maybeSingle();
  if (existing) {
    const { error } = await supabase.from("favorites").delete().eq("id", existing.id);
    if (error) return fail(toUserMessage(error));
    revalidatePath("/dashboard/saved");
    return { ok: true, data: { saved: false } };
  }
  const { error } = await supabase.from("favorites").insert({
    user_id: userId,
    vacancy_id: kind === "vacancy" ? targetId : null,
    candidate_id: kind === "candidate" ? targetId : null,
  });
  if (error) return fail(toUserMessage(error));
  revalidatePath("/dashboard/saved");
  return { ok: true, data: { saved: true } };
}
