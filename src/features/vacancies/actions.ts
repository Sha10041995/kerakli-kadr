"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fail, toUserMessage, type ActionResult } from "@/lib/errors";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { checkRateLimit } from "@/lib/request";
import { fieldErrors, uuidSchema } from "@/validations/common";
import { vacancySchema } from "@/validations/vacancy";

async function context() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub ?? null;
  let companyId: string | null = null;
  if (userId) {
    const { data: m } = await supabase.from("company_members").select("company_id").eq("user_id", userId).order("created_at").limit(1).maybeSingle();
    companyId = m?.company_id ?? null;
  }
  return { supabase, userId, companyId };
}

export async function saveVacancyAction(input: unknown, id?: string): Promise<ActionResult<{ id: string; status: string }>> {
  const parsed = vacancySchema.safeParse(input);
  if (!parsed.success) return fail("Maʼlumotlarni tekshiring", fieldErrors(parsed.error));
  if (id && !uuidSchema.safeParse(id).success) return fail("Notoʻgʻri soʻrov");
  const { supabase, userId, companyId } = await context();
  if (!userId) return fail("Iltimos, avval tizimga kiring.");
  if (!companyId) return fail("Avval ish beruvchi profilini yarating.");
  const limit = await checkRateLimit("vacancy-write", RATE_LIMITS.write, userId);
  if (!limit.ok) return fail(toUserMessage({ message: "RATE_LIMITED" }));

  const d = parsed.data;
  const values = {
    title: d.title,
    description: d.description,
    profession_id: d.professionId,
    category_id: d.categoryId ?? null,
    experience_min_years: d.experienceMinYears,
    education_level: d.educationLevel ?? null,
    salary_min: d.salaryType === "negotiable" ? null : (d.salaryMin ?? null),
    salary_max: d.salaryType === "negotiable" ? null : (d.salaryMax ?? null),
    salary_currency: d.salaryCurrency,
    salary_type: d.salaryType,
    employment_type: d.employmentType,
    work_schedule: d.workSchedule,
    positions_count: d.positionsCount,
    address_text: d.addressText || null,
    remote_allowed: d.remoteAllowed,
    transport_provided: d.transportProvided,
    accommodation_provided: d.accommodationProvided,
    meal_provided: d.mealProvided,
    urgent: d.urgent,
    application_deadline: d.applicationDeadline || null,
    region_id: d.regionId ?? null,
    district_id: d.districtId ?? null,
    settlement_id: d.settlementId ?? null,
    mahalla_id: d.mahallaId ?? null,
    lat: d.lat ?? null,
    lng: d.lng ?? null,
  };

  let vacancyId = id;
  let status: string;
  if (id) {
    const { data: current } = await supabase.from("vacancies").select("status").eq("id", id).maybeSingle();
    if (!current) return fail("Vakansiya topilmadi");
    const nextStatus =
      d.publish && ["draft", "closed", "expired"].includes(current.status) ? "pending_review" : current.status;
    const { data, error } = await supabase
      .from("vacancies")
      .update({ ...values, status: nextStatus })
      .eq("id", id)
      .select("id, status")
      .single();
    if (error) return fail(toUserMessage(error));
    status = data.status;
  } else {
    const { data, error } = await supabase
      .from("vacancies")
      .insert({ ...values, company_id: companyId, created_by: userId, status: d.publish ? "pending_review" : "draft" })
      .select("id, status")
      .single();
    if (error) return fail(toUserMessage(error));
    vacancyId = data.id;
    status = data.status;
  }

  // Sync skills
  await supabase.from("vacancy_skills").delete().eq("vacancy_id", vacancyId!);
  if (d.skillIds.length) {
    const { error } = await supabase
      .from("vacancy_skills")
      .insert(d.skillIds.map((skill_id) => ({ vacancy_id: vacancyId!, skill_id, is_required: true })));
    if (error) return fail(toUserMessage(error));
  }

  revalidatePath("/dashboard/vacancies");
  revalidatePath(`/vacancy/${vacancyId}`);
  const message =
    status === "active" ? "Vakansiya eʼlon qilindi" : status === "pending_review" ? "Vakansiya moderatsiyaga yuborildi" : "Qoralama saqlandi";
  return { ok: true, data: { id: vacancyId!, status }, message };
}

export async function setVacancyStatusAction(id: string, status: "closed" | "pending_review" | "draft"): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success || !["closed", "pending_review", "draft"].includes(status)) return fail("Notoʻgʻri soʻrov");
  const { supabase } = await context();
  const { error, count } = await supabase.from("vacancies").update({ status }, { count: "exact" }).eq("id", id);
  if (error) return fail(toUserMessage(error));
  if (!count) return fail("Ruxsat yoʻq");
  revalidatePath("/dashboard/vacancies");
  revalidatePath(`/vacancy/${id}`);
  return { ok: true };
}

export async function deleteVacancyAction(id: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success) return fail("Notoʻgʻri soʻrov");
  const { supabase } = await context();
  const { error, count } = await supabase.from("vacancies").delete({ count: "exact" }).eq("id", id).eq("status", "draft");
  if (error) return fail(toUserMessage(error));
  if (!count) return fail("Faqat qoralamani oʻchirish mumkin");
  revalidatePath("/dashboard/vacancies");
  return { ok: true };
}

export async function recordVacancyViewAction(id: string) {
  if (!uuidSchema.safeParse(id).success) return;
  const limit = await checkRateLimit(`view:${id}`, { limit: 1, windowMs: 30 * 60_000 });
  if (!limit.ok) return;
  const supabase = await createClient();
  await supabase.rpc("increment_vacancy_views", { p_vacancy_id: id });
}
