import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, Container } from "@/components/ui/misc";
import { getCurrentUser } from "@/features/auth/session";
import { LoginForm } from "@/features/auth/components/login-form";
import { safeRedirectPath } from "@/lib/utils";

export const metadata: Metadata = { title: "Kirish", robots: { index: false } };

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const next = safeRedirectPath(typeof sp.next === "string" ? sp.next : undefined);
  if (await getCurrentUser()) redirect(next);
  return (
    <Container className="flex justify-center py-10 sm:py-16">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-slate-900">Kirish</h1>
        <p className="mb-6 text-sm text-slate-600">Hisobingizga kiring va oʻz hududingizdagi imkoniyatlarni koʻring.</p>
        <LoginForm next={next} />
      </Card>
    </Container>
  );
}
