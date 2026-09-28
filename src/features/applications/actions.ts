"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fail, toUserMessage, type ActionResult } from "@/lib/errors";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { checkRateLimit } from "@/lib/request";
import { fieldErrors, uuidSchema } from "@/validations/common";
import { applicationStatusSchema, applySchema } from "@/validations/misc";

export async function applyAction(input: unknown): Promise<ActionResult> {
  const parsed = applySchema.safeParse(input);
  if (!parsed.success) return fail("errors.checkInput", fieldErrors(parsed.error));
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return fail("errors.applyLogin");
  const limit = await checkRateLimit("apply", RATE_LIMITS.write, userId);
  if (!limit.ok) return fail(toUserMessage({ message: "RATE_LIMITED" }));

  const { data: profile } = await supabase.from("candidate_profiles").select("id").eq("id", userId).maybeSingle();
  if (!profile) return fail("errors.candidateProfileRequired");

  const { error } = await supabase.from("applications").insert({
    vacancy_id: parsed.data.vacancyId,
    candidate_id: userId,
    cover_letter: parsed.data.coverLetter || null,
  });
  if (error) {
    if (error.code === "23505") return fail("errors.alreadyApplied");
    return fail(toUserMessage(error));
  }
  revalidatePath(`/vacancy/${parsed.data.vacancyId}`);
  revalidatePath("/dashboard/applications");
  return { ok: true, message: "success.applied" };
}

export async function changeApplicationStatusAction(input: unknown): Promise<ActionResult> {
  const parsed = applicationStatusSchema.safeParse(input);
  if (!parsed.success) return fail("errors.badRequest");
  const supabase = await createClient();
  // RLS + trigger enforce: only members of the vacancy's company, only allowed transitions.
  const { data, error } = await supabase
    .from("applications")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.applicationId)
    .select("vacancy_id")
    .maybeSingle();
  if (error) return fail(toUserMessage(error));
  if (!data) return fail("errors.forbidden");
  revalidatePath(`/dashboard/vacancies/${data.vacancy_id}`);
  return { ok: true };
}

export async function withdrawApplicationAction(id: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success) return fail("errors.badRequest");
  const supabase = await createClient();
  const { error, count } = await supabase.from("applications").update({ status: "withdrawn" }, { count: "exact" }).eq("id", id);
  if (error) return fail(toUserMessage(error));
  if (!count) return fail("errors.forbidden");
  revalidatePath("/dashboard/applications");
  return { ok: true };
}

export async function revealContactAction(
  applicationId: string,
): Promise<ActionResult<{ phone: string | null; email: string | null }>> {
  if (!uuidSchema.safeParse(applicationId).success) return fail("errors.badRequest");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_applicant_contact", { p_application_id: applicationId });
  if (error) return fail(toUserMessage(error));
  const row = data?.[0];
  if (!row) return fail("errors.contactUnavailable");
  // Marking as viewed is a natural side effect of opening contacts.
  await supabase.from("applications").update({ status: "viewed" }).eq("id", applicationId).eq("status", "applied");
  return { ok: true, data: { phone: row.phone, email: row.email } };
}
