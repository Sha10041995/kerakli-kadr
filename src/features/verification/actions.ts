"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fail, toUserMessage, type ActionResult } from "@/lib/errors";
import { uploadFile } from "@/features/uploads";
import { fieldErrors } from "@/validations/common";
import { verificationRequestSchema } from "@/validations/misc";

export async function requestVerificationAction(formData: FormData): Promise<ActionResult> {
  const parsed = verificationRequestSchema.safeParse({ type: formData.get("type"), note: formData.get("note") || undefined });
  if (!parsed.success) return fail("Maʼlumotlarni tekshiring", fieldErrors(parsed.error));
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return fail("Iltimos, avval tizimga kiring.");

  let companyId: string | null = null;
  if (parsed.data.type === "company") {
    const { data } = await supabase.from("company_members").select("company_id").eq("user_id", userId).eq("member_role", "owner").limit(1).maybeSingle();
    if (!data) return fail("Avval kompaniya profilini yarating.");
    companyId = data.company_id;
  }

  let documentPath: string | null = null;
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    const up = await uploadFile("verification", file);
    if (!up.ok) return fail(up.error);
    documentPath = up.path;
  } else if (parsed.data.type !== "phone") {
    return fail("Hujjat faylini biriktiring.");
  }

  const { error } = await supabase.from("verification_requests").insert({
    user_id: userId,
    type: parsed.data.type,
    company_id: companyId,
    document_path: documentPath,
    note: parsed.data.note || null,
  });
  if (error) {
    if (error.code === "23505") return fail("Bu turdagi soʻrovingiz allaqachon koʻrib chiqilmoqda.");
    return fail(toUserMessage(error));
  }
  revalidatePath("/dashboard/verification");
  return { ok: true, message: "Soʻrov yuborildi. Moderatorlar 1–2 ish kunida koʻrib chiqadi." };
}
