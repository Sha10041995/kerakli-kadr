"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fail, toUserMessage, type ActionResult } from "@/lib/errors";
import { fieldErrors, text } from "@/validations/common";

const complaintSchema = z.object({
  subject: z.string().trim().min(3, { error: "Mavzuni kiriting" }).max(200),
  body: text(5000).pipe(z.string().min(10, { error: "Kamida 10 ta belgi yozing" })),
});

export async function submitComplaintAction(formData: FormData): Promise<ActionResult> {
  const parsed = complaintSchema.safeParse({ subject: formData.get("subject"), body: formData.get("body") });
  if (!parsed.success) return fail("Maʼlumotlarni tekshiring", fieldErrors(parsed.error));
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return fail("Iltimos, avval tizimga kiring.");
  const { error } = await supabase.from("complaints").insert({ user_id: userId, ...parsed.data });
  if (error) return fail(toUserMessage(error));
  revalidatePath("/support");
  return { ok: true, message: "Murojaatingiz qabul qilindi. Javobni bildirishnomalarda olasiz." };
}
