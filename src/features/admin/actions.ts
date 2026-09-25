"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fail, toUserMessage, type ActionResult } from "@/lib/errors";
import { normalizeWeights } from "@/features/matching/score";
import { slugify } from "@/lib/utils";
import { uuidSchema } from "@/validations/common";

/** Every admin action re-checks the caller's role server-side (RLS is the second line). */
async function staffContext(adminOnly = false) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return { supabase, ok: false as const };
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const set = new Set((roles ?? []).map((r) => r.role));
  const isAdmin = set.has("admin") || set.has("super_admin");
  const isStaff = isAdmin || set.has("moderator");
  return { supabase, userId, ok: (adminOnly ? isAdmin : isStaff) as boolean, isSuper: set.has("super_admin") };
}

const DENIED = "Bu amal uchun ruxsat yoʻq.";

export async function moderateVacancyAction(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ id: uuidSchema, status: z.enum(["active", "rejected", "closed"]), reason: z.string().max(1000).optional() }).safeParse(input);
  if (!parsed.success) return fail("Notoʻgʻri soʻrov");
  const ctx = await staffContext();
  if (!ctx.ok) return fail(DENIED);
  if (parsed.data.status === "rejected" && !parsed.data.reason?.trim()) return fail("Rad etish sababini yozing");
  const { error } = await ctx.supabase
    .from("vacancies")
    .update({ status: parsed.data.status, rejection_reason: parsed.data.status === "rejected" ? parsed.data.reason!.trim() : null })
    .eq("id", parsed.data.id);
  if (error) return fail(toUserMessage(error));
  revalidatePath("/admin/vacancies");
  return { ok: true };
}

export async function resolveReportAction(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ id: uuidSchema, status: z.enum(["resolved", "dismissed", "reviewing"]), note: z.string().max(2000).optional(), hideVacancy: z.boolean().optional() }).safeParse(input);
  if (!parsed.success) return fail("Notoʻgʻri soʻrov");
  const ctx = await staffContext();
  if (!ctx.ok) return fail(DENIED);
  const { data: report, error } = await ctx.supabase
    .from("reports")
    .update({ status: parsed.data.status, resolution_note: parsed.data.note ?? null })
    .eq("id", parsed.data.id)
    .select("target_type, target_id")
    .single();
  if (error) return fail(toUserMessage(error));
  if (parsed.data.hideVacancy && report.target_type === "vacancy") {
    await ctx.supabase.from("vacancies").update({ status: "rejected", rejection_reason: parsed.data.note || "Shikoyat asosida bloklandi" }).eq("id", report.target_id);
  }
  revalidatePath("/admin/reports");
  return { ok: true };
}

export async function decideVerificationAction(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ id: uuidSchema, status: z.enum(["approved", "rejected"]), note: z.string().max(1000).optional() }).safeParse(input);
  if (!parsed.success) return fail("Notoʻgʻri soʻrov");
  const ctx = await staffContext();
  if (!ctx.ok) return fail(DENIED);
  const { error } = await ctx.supabase.from("verification_requests").update({ status: parsed.data.status, admin_note: parsed.data.note || null }).eq("id", parsed.data.id);
  if (error) return fail(toUserMessage(error));
  revalidatePath("/admin/verification");
  return { ok: true };
}

export async function verificationDocumentUrlAction(path: string): Promise<ActionResult<{ url: string }>> {
  const ctx = await staffContext();
  if (!ctx.ok) return fail(DENIED);
  if (typeof path !== "string" || path.includes("..") || path.length > 500) return fail("Notoʻgʻri soʻrov");
  const { data, error } = await ctx.supabase.storage.from("verification").createSignedUrl(path, 120);
  if (error || !data) return fail("Fayl topilmadi");
  return { ok: true, data: { url: data.signedUrl } };
}

export async function setUserBlockedAction(userId: string, blocked: boolean): Promise<ActionResult> {
  if (!uuidSchema.safeParse(userId).success) return fail("Notoʻgʻri soʻrov");
  const ctx = await staffContext(true);
  if (!ctx.ok) return fail(DENIED);
  if (userId === ctx.userId) return fail("Oʻzingizni bloklay olmaysiz");
  const { error } = await ctx.supabase.from("profiles").update({ is_blocked: blocked }).eq("id", userId);
  if (error) return fail(toUserMessage(error));
  revalidatePath("/admin/users");
  return { ok: true };
}

const ROLE = z.enum(["job_seeker", "employer", "company", "moderator", "admin", "super_admin", "recruiter", "partner"]);

export async function setUserRoleAction(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ userId: uuidSchema, role: ROLE, grant: z.boolean() }).safeParse(input);
  if (!parsed.success) return fail("Notoʻgʻri soʻrov");
  const ctx = await staffContext(true);
  if (!ctx.ok) return fail(DENIED);
  if ((parsed.data.role === "admin" || parsed.data.role === "super_admin") && !ctx.isSuper) return fail("Faqat super administrator");
  const { error } = parsed.data.grant
    ? await ctx.supabase.from("user_roles").insert({ user_id: parsed.data.userId, role: parsed.data.role, granted_by: ctx.userId })
    : await ctx.supabase.from("user_roles").delete().eq("user_id", parsed.data.userId).eq("role", parsed.data.role);
  if (error) return fail(toUserMessage(error));
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setReviewStatusAction(id: string, status: "published" | "hidden"): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success || !["published", "hidden"].includes(status)) return fail("Notoʻgʻri soʻrov");
  const ctx = await staffContext();
  if (!ctx.ok) return fail(DENIED);
  const { error } = await ctx.supabase.from("reviews").update({ status }).eq("id", id);
  if (error) return fail(toUserMessage(error));
  revalidatePath("/admin/reviews");
  return { ok: true };
}

// ---- Locations ----------------------------------------------------------------
const LOCATION_TABLES = ["regions", "districts", "settlements", "mahallas"] as const;

export async function toggleLocationAction(table: (typeof LOCATION_TABLES)[number], id: number, active: boolean): Promise<ActionResult> {
  if (!LOCATION_TABLES.includes(table) || !Number.isInteger(id)) return fail("Notoʻgʻri soʻrov");
  const ctx = await staffContext(true);
  if (!ctx.ok) return fail(DENIED);
  const { error } = await ctx.supabase.from(table).update({ is_active: active }).eq("id", id);
  if (error) return fail(toUserMessage(error));
  revalidatePath("/admin/locations");
  return { ok: true };
}

const locationInput = z.object({
  level: z.enum(["district", "settlement", "mahalla"]),
  parentId: z.number().int().positive(),
  settlementId: z.number().int().positive().nullable().optional(),
  name: z.string().trim().min(2).max(120),
  kind: z.string().optional(),
  lat: z.number().min(37).max(45.7).nullable().optional(),
  lng: z.number().min(55.9).max(73.2).nullable().optional(),
});

export async function addLocationAction(input: unknown): Promise<ActionResult> {
  const parsed = locationInput.safeParse(input);
  if (!parsed.success) return fail("Maʼlumotlarni tekshiring");
  const ctx = await staffContext(true);
  if (!ctx.ok) return fail(DENIED);
  const d = parsed.data;
  const slug = slugify(d.name);
  if (!slug) return fail("Nomi notoʻgʻri");
  const coords = { lat: d.lat ?? null, lng: d.lng ?? null };
  const { error } =
    d.level === "district"
      ? await ctx.supabase.from("districts").insert({ region_id: d.parentId, slug, name_uz: d.name, kind: d.kind === "city" ? "city" : "district", ...coords })
      : d.level === "settlement"
        ? await ctx.supabase.from("settlements").insert({ district_id: d.parentId, slug, name_uz: d.name, kind: d.kind === "city" ? "city" : d.kind === "town" ? "town" : "village", ...coords })
        : await ctx.supabase.from("mahallas").insert({ district_id: d.parentId, settlement_id: d.settlementId ?? null, slug, name_uz: d.name, ...coords });
  if (error) return fail(toUserMessage(error));
  revalidatePath("/admin/locations");
  return { ok: true, message: "Qoʻshildi" };
}

// ---- Catalogue ----------------------------------------------------------------
export async function addProfessionAction(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ categoryId: z.number().int().positive(), name: z.string().trim().min(2).max(120), synonyms: z.string().max(500).optional() }).safeParse(input);
  if (!parsed.success) return fail("Maʼlumotlarni tekshiring");
  const ctx = await staffContext(true);
  if (!ctx.ok) return fail(DENIED);
  const synonyms = (parsed.data.synonyms ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean).slice(0, 20);
  const { error } = await ctx.supabase.from("professions").insert({
    category_id: parsed.data.categoryId, name_uz: parsed.data.name, slug: slugify(parsed.data.name), synonyms,
  });
  if (error) return fail(toUserMessage(error));
  revalidatePath("/admin/categories");
  return { ok: true, message: "Kasb qoʻshildi" };
}

export async function addCategoryAction(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ name: z.string().trim().min(2).max(120), icon: z.string().max(8).optional(), parentId: z.number().int().positive().nullable().optional() }).safeParse(input);
  if (!parsed.success) return fail("Maʼlumotlarni tekshiring");
  const ctx = await staffContext(true);
  if (!ctx.ok) return fail(DENIED);
  const { error } = await ctx.supabase.from("categories").insert({ name_uz: parsed.data.name, slug: slugify(parsed.data.name), icon: parsed.data.icon || null, parent_id: parsed.data.parentId ?? null });
  if (error) return fail(toUserMessage(error));
  revalidatePath("/admin/categories");
  return { ok: true, message: "Kategoriya qoʻshildi" };
}

export async function toggleCatalogAction(table: "categories" | "professions" | "skills", id: number, active: boolean): Promise<ActionResult> {
  if (!["categories", "professions", "skills"].includes(table) || !Number.isInteger(id)) return fail("Notoʻgʻri soʻrov");
  const ctx = await staffContext(true);
  if (!ctx.ok) return fail(DENIED);
  const { error } = await ctx.supabase.from(table).update({ is_active: active }).eq("id", id);
  if (error) return fail(toUserMessage(error));
  revalidatePath("/admin/categories");
  return { ok: true };
}

// ---- Monetisation & settings ---------------------------------------------------
export async function updatePriceAction(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ kind: z.enum(["plan", "service"]), id: z.number().int().positive(), priceUzs: z.number().int().min(0).max(1_000_000_000), isActive: z.boolean() }).safeParse(input);
  if (!parsed.success) return fail("Maʼlumotlarni tekshiring");
  const ctx = await staffContext(true);
  if (!ctx.ok) return fail(DENIED);
  const table = parsed.data.kind === "plan" ? "subscription_plans" : "paid_services";
  const { error } = await ctx.supabase.from(table).update({ price_uzs: parsed.data.priceUzs, is_active: parsed.data.isActive }).eq("id", parsed.data.id);
  if (error) return fail(toUserMessage(error));
  revalidatePath("/admin/plans");
  revalidatePath("/pricing");
  return { ok: true, message: "Saqlandi" };
}

export async function updateSettingsAction(input: unknown): Promise<ActionResult> {
  const parsed = z.object({
    weights: z.record(z.string(), z.number().min(0).max(100)),
    autoPublish: z.boolean(),
    durationDays: z.number().int().min(1).max(365),
    autoHideReports: z.number().int().min(1).max(100),
  }).safeParse(input);
  if (!parsed.success) return fail("Maʼlumotlarni tekshiring");
  const ctx = await staffContext(true);
  if (!ctx.ok) return fail(DENIED);
  const rows = [
    { key: "matching.weights", value: normalizeWeights(parsed.data.weights) },
    { key: "moderation.auto_publish", value: parsed.data.autoPublish },
    { key: "vacancy.default_duration_days", value: parsed.data.durationDays },
    { key: "moderation.auto_hide_reports", value: parsed.data.autoHideReports },
  ];
  for (const row of rows) {
    const { error } = await ctx.supabase.from("app_settings").update({ value: row.value, updated_by: ctx.userId, updated_at: new Date().toISOString() }).eq("key", row.key);
    if (error) return fail(toUserMessage(error));
  }
  revalidatePath("/admin/settings");
  return { ok: true, message: "Sozlamalar saqlandi" };
}
