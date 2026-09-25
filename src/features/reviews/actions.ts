"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fail, toUserMessage, type ActionResult } from "@/lib/errors";
import { fieldErrors } from "@/validations/common";
import { reviewSchema } from "@/validations/misc";

export async function submitReviewAction(input: unknown): Promise<ActionResult> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return fail("Maʼlumotlarni tekshiring", fieldErrors(parsed.error));
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return fail("Iltimos, avval tizimga kiring.");
  // direction / reviewee are derived by the database from the hired application.
  const { error } = await supabase.from("reviews").insert({
    application_id: parsed.data.applicationId,
    reviewer_id: userId,
    direction: "candidate_to_company",
    reviewee_user_id: userId,
    rating: parsed.data.rating,
    comment: parsed.data.comment || null,
  });
  if (error) {
    if (error.code === "23505") return fail("Siz allaqachon sharh qoldirgansiz.");
    return fail(toUserMessage(error));
  }
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Rahmat! Sharhingiz saqlandi." };
}
