"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fail, toUserMessage, type ActionResult } from "@/lib/errors";
import { uploadFile } from "@/features/uploads";
import { fieldErrors, uuidSchema } from "@/validations/common";
import {
  candidateProfileSchema, certificateSchema, educationSchema, experienceSchema, portfolioSchema,
} from "@/validations/candidate";

async function authed() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims?.sub ?? null };
}

export async function saveCandidateProfileAction(input: unknown): Promise<ActionResult> {
  const parsed = candidateProfileSchema.safeParse(input);
  if (!parsed.success) return fail("Maʼlumotlarni tekshiring", fieldErrors(parsed.error));
  const { supabase, userId } = await authed();
  if (!userId) return fail("Iltimos, avval tizimga kiring.");
  const d = parsed.data;

  const { error: pErr } = await supabase
    .from("profiles")
    .update({ first_name: d.firstName, last_name: d.lastName, phone: d.phone ?? null, birth_year: d.birthYear ?? null })
    .eq("id", userId);
  if (pErr) return fail(toUserMessage(pErr));

  const row = {
    id: userId,
    headline: d.headline,
    about: d.about || null,
    profession_id: d.professionId ?? null,
    experience_years: d.experienceYears,
    education_level: d.educationLevel ?? null,
    expected_salary_min: d.expectedSalaryMin ?? null,
    expected_salary_max: d.expectedSalaryMax ?? null,
    salary_type: d.salaryType,
    employment_types: d.employmentTypes,
    availability: d.availability,
    has_transport: d.hasTransport,
    remote_ok: d.remoteOk,
    relocate_ok: d.relocateOk,
    work_radius_km: d.workRadiusKm,
    is_public: d.isPublic,
    region_id: d.regionId ?? null,
    district_id: d.districtId ?? null,
    settlement_id: d.settlementId ?? null,
    mahalla_id: d.mahallaId ?? null,
    lat: d.lat ?? null,
    lng: d.lng ?? null,
  };
  const { error } = await supabase.from("candidate_profiles").upsert(row, { onConflict: "id" });
  if (error) return fail(toUserMessage(error));

  // Replace skills set
  const { data: existing } = await supabase.from("candidate_skills").select("skill_id").eq("candidate_id", userId);
  const current = new Set((existing ?? []).map((s) => s.skill_id));
  const wanted = new Set(d.skillIds);
  const toDelete = [...current].filter((id) => !wanted.has(id));
  const toInsert = [...wanted].filter((id) => !current.has(id));
  if (toDelete.length) await supabase.from("candidate_skills").delete().eq("candidate_id", userId).in("skill_id", toDelete);
  if (toInsert.length) {
    const { error: sErr } = await supabase.from("candidate_skills").insert(toInsert.map((skill_id) => ({ candidate_id: userId, skill_id })));
    if (sErr) return fail(toUserMessage(sErr));
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath(`/candidate/${userId}`);
  return { ok: true, message: "Profil saqlandi" };
}

export async function addExperienceAction(input: unknown): Promise<ActionResult> {
  const parsed = experienceSchema.safeParse(input);
  if (!parsed.success) return fail("Maʼlumotlarni tekshiring", fieldErrors(parsed.error));
  const { supabase, userId } = await authed();
  if (!userId) return fail("Iltimos, avval tizimga kiring.");
  const d = parsed.data;
  const { error } = await supabase.from("candidate_experience").insert({
    candidate_id: userId,
    company_name: d.companyName,
    position: d.position,
    location_text: d.locationText || null,
    start_date: d.startDate,
    end_date: d.isCurrent ? null : d.endDate || null,
    is_current: d.isCurrent,
    description: d.description || null,
  });
  if (error) return fail(toUserMessage(error));
  revalidatePath("/dashboard/profile");
  return { ok: true };
}

export async function addEducationAction(input: unknown): Promise<ActionResult> {
  const parsed = educationSchema.safeParse(input);
  if (!parsed.success) return fail("Maʼlumotlarni tekshiring", fieldErrors(parsed.error));
  const { supabase, userId } = await authed();
  if (!userId) return fail("Iltimos, avval tizimga kiring.");
  const d = parsed.data;
  const { error } = await supabase.from("candidate_education").insert({
    candidate_id: userId, institution: d.institution, level: d.level, field: d.field || null,
    start_year: d.startYear ?? null, end_year: d.endYear ?? null,
  });
  if (error) return fail(toUserMessage(error));
  revalidatePath("/dashboard/profile");
  return { ok: true };
}

export async function addCertificateAction(formData: FormData): Promise<ActionResult> {
  const parsed = certificateSchema.safeParse({
    name: formData.get("name"),
    issuer: formData.get("issuer") || undefined,
    issuedAt: formData.get("issuedAt") || null,
  });
  if (!parsed.success) return fail("Maʼlumotlarni tekshiring", fieldErrors(parsed.error));
  const { supabase, userId } = await authed();
  if (!userId) return fail("Iltimos, avval tizimga kiring.");
  let filePath: string | null = null;
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    const up = await uploadFile("documents", file);
    if (!up.ok) return fail(up.error);
    filePath = up.path;
  }
  const { error } = await supabase.from("candidate_certificates").insert({
    candidate_id: userId, name: parsed.data.name, issuer: parsed.data.issuer || null,
    issued_at: parsed.data.issuedAt || null, file_path: filePath,
  });
  if (error) return fail(toUserMessage(error));
  revalidatePath("/dashboard/profile");
  return { ok: true };
}

export async function addPortfolioAction(formData: FormData): Promise<ActionResult> {
  const parsed = portfolioSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    url: formData.get("url") || "",
  });
  if (!parsed.success) return fail("Maʼlumotlarni tekshiring", fieldErrors(parsed.error));
  const { supabase, userId } = await authed();
  if (!userId) return fail("Iltimos, avval tizimga kiring.");
  let imagePath: string | null = null;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    const up = await uploadFile("portfolio", file);
    if (!up.ok) return fail(up.error);
    imagePath = up.publicUrl;
  }
  const { error } = await supabase.from("candidate_portfolio").insert({
    candidate_id: userId, title: parsed.data.title, description: parsed.data.description || null,
    url: parsed.data.url || null, image_path: imagePath,
  });
  if (error) return fail(toUserMessage(error));
  revalidatePath("/dashboard/profile");
  return { ok: true };
}

const CHILD_TABLES = ["candidate_experience", "candidate_education", "candidate_certificates", "candidate_portfolio"] as const;
type ChildTable = (typeof CHILD_TABLES)[number];

export async function deleteCandidateItemAction(table: ChildTable, id: string): Promise<ActionResult> {
  if (!CHILD_TABLES.includes(table) || !uuidSchema.safeParse(id).success) return fail("Notoʻgʻri soʻrov");
  const { supabase, userId } = await authed();
  if (!userId) return fail("Iltimos, avval tizimga kiring.");
  const { error } = await supabase.from(table).delete().eq("id", id).eq("candidate_id", userId);
  if (error) return fail(toUserMessage(error));
  revalidatePath("/dashboard/profile");
  return { ok: true };
}

export async function uploadAvatarAction(formData: FormData): Promise<ActionResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Rasm tanlang");
  const { supabase, userId } = await authed();
  if (!userId) return fail("Iltimos, avval tizimga kiring.");
  const up = await uploadFile("avatars", file);
  if (!up.ok) return fail(up.error);
  const { error } = await supabase.from("profiles").update({ avatar_url: up.publicUrl }).eq("id", userId);
  if (error) return fail(toUserMessage(error));
  revalidatePath("/", "layout");
  return { ok: true, message: "Rasm yangilandi" };
}
