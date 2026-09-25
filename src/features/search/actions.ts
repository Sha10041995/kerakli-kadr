"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fail, toUserMessage, type ActionResult } from "@/lib/errors";
import { savedSearchSchema } from "@/validations/misc";
import { fieldErrors, uuidSchema } from "@/validations/common";

export async function saveSearchAction(input: unknown): Promise<ActionResult> {
  const parsed = savedSearchSchema.safeParse(input);
  if (!parsed.success) return fail("Qidiruv parametrlari notoʻgʻri", fieldErrors(parsed.error));
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return fail("Iltimos, avval tizimga kiring.");
  const s = parsed.data;
  const { error } = await supabase.from("saved_searches").insert({
    user_id: userId,
    kind: s.kind,
    name: s.name,
    query: s.query ?? null,
    profession_id: s.professionId ?? null,
    category_id: s.categoryId ?? null,
    region_id: s.regionId ?? null,
    district_id: s.districtId ?? null,
    settlement_id: s.settlementId ?? null,
    radius_km: s.radiusKm ?? null,
  });
  if (error) return fail(toUserMessage(error));
  revalidatePath("/dashboard/saved");
  return { ok: true, message: "Qidiruv saqlandi. Yangi mos eʼlonlar haqida xabar beramiz." };
}

export async function deleteSavedSearchAction(id: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success) return fail("Notoʻgʻri soʻrov");
  const supabase = await createClient();
  const { error } = await supabase.from("saved_searches").delete().eq("id", id);
  if (error) return fail(toUserMessage(error));
  revalidatePath("/dashboard/saved");
  return { ok: true };
}
