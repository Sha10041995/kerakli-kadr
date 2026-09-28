import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, Container } from "@/components/ui/misc";
import { getCurrentUser } from "@/features/auth/session";
import { LoginForm } from "@/features/auth/components/login-form";
import { getI18n } from "@/lib/i18n/server";
import { safeRedirectPath } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("auth.loginTitle"), robots: { index: false } };
}

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const next = safeRedirectPath(typeof sp.next === "string" ? sp.next : undefined);
  if (await getCurrentUser()) redirect(next);
  const { t } = await getI18n();
  return (
    <Container className="flex justify-center py-10 sm:py-16">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-slate-900">{t("auth.loginTitle")}</h1>
        <p className="mb-6 text-sm text-slate-600">{t("auth.loginLead")}</p>
        <LoginForm next={next} />
      </Card>
    </Container>
  );
}
