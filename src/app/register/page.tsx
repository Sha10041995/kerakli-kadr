import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, Container } from "@/components/ui/misc";
import { getCurrentUser } from "@/features/auth/session";
import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata: Metadata = { title: "Roʻyxatdan oʻtish", robots: { index: false } };

export default async function RegisterPage(props: PageProps<"/register">) {
  const sp = await props.searchParams;
  if (await getCurrentUser()) redirect("/dashboard");
  const role = sp.role === "employer" || sp.role === "job_seeker" ? sp.role : undefined;
  return (
    <Container className="flex justify-center py-10 sm:py-16">
      <Card className="w-full max-w-lg p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-slate-900">Roʻyxatdan oʻtish</h1>
        <p className="mb-6 text-sm text-slate-600">Bepul. 1 daqiqa vaqt oladi.</p>
        <RegisterForm defaultRole={role} />
      </Card>
    </Container>
  );
}
