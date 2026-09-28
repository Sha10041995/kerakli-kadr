import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, Container } from "@/components/ui/misc";
import { requireUser } from "@/features/auth/session";
import { RoleChooser } from "@/features/auth/components/role-chooser";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("auth.onboardingTitle"), robots: { index: false } };
}

export default async function OnboardingPage() {
  const user = await requireUser("/onboarding");
  if (user.isJobSeeker && !user.hasCandidateProfile) redirect("/dashboard/profile?welcome=1");
  if (user.isEmployer && !user.companyId) redirect("/dashboard/company?welcome=1");
  if (user.isJobSeeker || user.isEmployer || user.isStaff) redirect("/dashboard");
  const { t } = await getI18n();

  return (
    <Container className="flex justify-center py-12">
      <Card className="w-full max-w-xl p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-slate-900">{t("auth.welcome", { name: user.firstName || t("auth.friend") })}</h1>
        <p className="mt-1 mb-6 text-sm text-slate-600">{t("auth.howUse")}</p>
        <RoleChooser />
      </Card>
    </Container>
  );
}
