import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Alert, Card, PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/features/auth/session";
import { MockCheckout } from "@/features/payments/components/mock-checkout";
import { getPaymentProvider } from "@/features/payments/providers";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("billing.mockTitle"), robots: { index: false } };
}

export default async function MockCheckoutPage(props: PageProps<"/dashboard/billing/mock-checkout">) {
  if (!getPaymentProvider("mock")) notFound();
  await requireUser("/dashboard/billing");
  const sp = await props.searchParams;
  const id = typeof sp.payment === "string" ? sp.payment : "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: payment } = await supabase.from("payments").select("id, amount_uzs, status, purpose").eq("id", id).maybeSingle();
  if (!payment) notFound();
  const { t, d, f } = await getI18n();
  return (
    <>
      <PageHeader title={t("billing.mockPageTitle")} />
      <Alert tone="warning" className="mb-4">
        {t("billing.mockWarning")}
      </Alert>
      <Card className="max-w-md space-y-3">
        <p className="text-sm text-slate-600">{t("billing.amount")}</p>
        <p className="text-2xl font-bold">{t("billing.som", { n: f.number(payment.amount_uzs) })}</p>
        {payment.status === "pending" ? (
          <MockCheckout paymentId={payment.id} />
        ) : (
          <p className="text-sm">{t("billing.statusLine", { s: d.enums.paymentStatus[payment.status] })}</p>
        )}
      </Card>
    </>
  );
}
