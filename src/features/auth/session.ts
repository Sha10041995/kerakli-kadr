import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

export type AppRole = Enums<"app_role">;

export type CurrentUser = {
  id: string;
  email: string | null;
  roles: AppRole[];
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  isBlocked: boolean;
  hasCandidateProfile: boolean;
  companyId: string | null;
  companySlug: string | null;
  isEmployer: boolean;
  isJobSeeker: boolean;
  isStaff: boolean;
  isAdmin: boolean;
};

/** The signed-in user with roles (request-scoped cache). Null when signed out. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return null;

  const [profileRes, rolesRes, candidateRes, companyRes] = await Promise.all([
    supabase.from("profiles").select("first_name, last_name, avatar_url, email, is_blocked").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase.from("candidate_profiles").select("id").eq("id", userId).maybeSingle(),
    supabase
      .from("company_members")
      .select("company_id, companies(slug)")
      .eq("user_id", userId)
      .order("created_at")
      .limit(1)
      .maybeSingle(),
  ]);

  const roles = (rolesRes.data ?? []).map((r) => r.role);
  const company = companyRes.data;
  return {
    id: userId,
    email: profileRes.data?.email ?? (claims?.claims?.email as string | undefined) ?? null,
    roles,
    firstName: profileRes.data?.first_name ?? "",
    lastName: profileRes.data?.last_name ?? "",
    avatarUrl: profileRes.data?.avatar_url ?? null,
    isBlocked: profileRes.data?.is_blocked ?? false,
    hasCandidateProfile: Boolean(candidateRes.data),
    companyId: company?.company_id ?? null,
    companySlug: company?.companies?.slug ?? null,
    isEmployer: roles.includes("employer") || roles.includes("company") || roles.includes("recruiter"),
    isJobSeeker: roles.includes("job_seeker"),
    isStaff: roles.some((r) => r === "admin" || r === "super_admin" || r === "moderator"),
    isAdmin: roles.some((r) => r === "admin" || r === "super_admin"),
  };
});

/** Redirects to login when signed out. */
export async function requireUser(next = "/dashboard"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireStaff(): Promise<CurrentUser> {
  const user = await requireUser("/admin");
  if (!user.isStaff) redirect("/dashboard");
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser("/admin");
  if (!user.isAdmin) redirect("/admin");
  return user;
}

export async function requireEmployer(next = "/dashboard"): Promise<CurrentUser> {
  const user = await requireUser(next);
  if (!user.isEmployer) redirect("/onboarding");
  return user;
}

export async function requireJobSeeker(next = "/dashboard"): Promise<CurrentUser> {
  const user = await requireUser(next);
  if (!user.isJobSeeker) redirect("/onboarding");
  return user;
}
