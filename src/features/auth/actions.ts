"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { fail, toUserMessage, type ActionResult } from "@/lib/errors";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { checkRateLimit } from "@/lib/request";
import { safeRedirectPath } from "@/lib/utils";
import { fieldErrors } from "@/validations/common";
import { loginSchema, registerSchema } from "@/validations/auth";

export async function signInAction(input: unknown): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return fail("Maʼlumotlarni tekshiring", fieldErrors(parsed.error));
  const limit = await checkRateLimit("auth", RATE_LIMITS.auth, parsed.data.email);
  if (!limit.ok) return fail(toUserMessage({ message: "RATE_LIMITED" }));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error) return fail(toUserMessage({ message: error.message, code: error.code }));
  return { ok: true, data: { redirectTo: safeRedirectPath(parsed.data.next) } };
}

export async function signUpAction(input: unknown): Promise<ActionResult<{ redirectTo?: string; needsConfirmation?: boolean }>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return fail("Maʼlumotlarni tekshiring", fieldErrors(parsed.error));
  const limit = await checkRateLimit("auth", RATE_LIMITS.auth, parsed.data.email);
  if (!limit.ok) return fail(toUserMessage({ message: "RATE_LIMITED" }));

  const { email, password, firstName, lastName, role, phone } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // "role" is restricted to job_seeker/employer by the database trigger.
      data: { first_name: firstName, last_name: lastName, role },
      emailRedirectTo: `${env.siteUrl}/auth/callback?next=/onboarding`,
    },
  });
  if (error) return fail(toUserMessage({ message: error.message, code: error.code }));

  if (data.session && data.user) {
    if (phone) await supabase.from("profiles").update({ phone }).eq("id", data.user.id);
    return { ok: true, data: { redirectTo: "/onboarding" } };
  }
  return { ok: true, data: { needsConfirmation: true }, message: "Emailingizga tasdiqlash havolasi yuborildi." };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function chooseRoleAction(role: "job_seeker" | "employer"): Promise<ActionResult> {
  if (role !== "job_seeker" && role !== "employer") return fail("Notoʻgʻri rol");
  const supabase = await createClient();
  const { error } = await supabase.rpc("choose_role", { p_role: role });
  if (error) return fail(toUserMessage(error));
  redirect(role === "job_seeker" ? "/dashboard/profile" : "/dashboard/company");
}
