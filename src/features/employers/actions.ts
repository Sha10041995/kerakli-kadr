"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fail, toUserMessage, type ActionResult } from "@/lib/errors";
import { slugify } from "@/lib/utils";
import { uploadFile } from "@/features/uploads";
import { fieldErrors } from "@/validations/common";
import { companySchema } from "@/validations/company";

export async function saveCompanyAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = companySchema.safeParse(input);
  if (!parsed.success) return fail("Maʼlumotlarni tekshiring", fieldErrors(parsed.error));
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return fail("Iltimos, avval tizimga kiring.");
  const d = parsed.data;

  const values = {
    name: d.name,
    company_type: d.companyType,
    stir: d.stir || null,
    description: d.description || null,
    website: d.website || null,
    address: d.address || null,
    region_id: d.regionId ?? null,
    district_id: d.districtId ?? null,
    settlement_id: d.settlementId ?? null,
    mahalla_id: d.mahallaId ?? null,
    lat: d.lat ?? null,
    lng: d.lng ?? null,
  };

  const { data: existing } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", userId)
    .eq("member_role", "owner")
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("companies").update(values).eq("id", existing.company_id);
    if (error) return fail(toUserMessage(error));
    revalidatePath("/dashboard", "layout");
    return { ok: true, data: { id: existing.company_id }, message: "Maʼlumotlar saqlandi" };
  }

  const slug = `${slugify(d.name) || "kompaniya"}-${globalThis.crypto.randomUUID().slice(0, 6)}`;
  const { data, error } = await supabase
    .from("companies")
    .insert({ ...values, owner_id: userId, slug })
    .select("id")
    .single();
  if (error) return fail(toUserMessage(error));
  revalidatePath("/dashboard", "layout");
  return { ok: true, data: { id: data.id }, message: "Kompaniya yaratildi" };
}

export async function uploadCompanyLogoAction(formData: FormData): Promise<ActionResult> {
  const file = formData.get("file");
  const companyId = String(formData.get("companyId") ?? "");
  if (!(file instanceof File) || file.size === 0) return fail("Rasm tanlang");
  const supabase = await createClient();
  const up = await uploadFile("company-logos", file);
  if (!up.ok) return fail(up.error);
  // RLS: only the company owner can update the row.
  const { error, count } = await supabase
    .from("companies")
    .update({ logo_url: up.publicUrl }, { count: "exact" })
    .eq("id", companyId);
  if (error) return fail(toUserMessage(error));
  if (!count) return fail("Ruxsat yoʻq");
  revalidatePath("/dashboard/company");
  return { ok: true, message: "Logo yangilandi" };
}
