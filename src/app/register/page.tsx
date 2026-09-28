import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, Container } from "@/components/ui/misc";
import { getCurrentUser } from "@/features/auth/session";
import { RegisterForm } from "@/features/auth/components/register-form";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("auth.registerTitle"), robots: { index: false } };
}

export default async function RegisterPage(props: PageProps<"/register">) {
  const sp = await props.searchParams;
  if (await getCurrentUser()) redirect("/dashboard");
  const { t } = await getI18n();
  const role = sp.role === "employer" || sp.role === "job_seeker" ? sp.role : undefined;
  return (
    <Container className="flex justify-center py-10 sm:py-16">
      <Card className="w-full max-w-lg p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-slate-900">{t("auth.registerTitle")}</h1>
        <p className="mb-6 text-sm text-slate-600">{t("auth.registerLead")}</p>
        <RegisterForm defaultRole={role} />
      </Card>
    </Container>
  );
}
