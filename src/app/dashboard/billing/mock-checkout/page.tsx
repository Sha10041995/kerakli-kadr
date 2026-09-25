import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Alert, Card, PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/features/auth/session";
import { MockCheckout } from "@/features/payments/components/mock-checkout";
import { getPaymentProvider } from "@/features/payments/providers";
import { createClient } from "@/lib/supabase/server";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Test toʻlov", robots: { index: false } };

export default async function MockCheckoutPage(props: PageProps<"/dashboard/billing/mock-checkout">) {
  if (!getPaymentProvider("mock")) notFound();
  await requireUser("/dashboard/billing");
  const sp = await props.searchParams;
  const id = typeof sp.payment === "string" ? sp.payment : "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: payment } = await supabase.from("payments").select("id, amount_uzs, status, purpose").eq("id", id).maybeSingle();
  if (!payment) notFound();
  return (
    <>
      <PageHeader title="Test toʻlov sahifasi" />
      <Alert tone="warning" className="mb-4">Bu faqat development muhiti uchun. Haqiqiy pul yechilmaydi. Productionda mahalliy toʻlov provayderi sahifasi ochiladi.</Alert>
      <Card className="max-w-md space-y-3">
        <p className="text-sm text-slate-600">Summa</p>
        <p className="text-2xl font-bold">{formatNumber(payment.amount_uzs)} soʻm</p>
        {payment.status === "pending" ? <MockCheckout paymentId={payment.id} /> : <p className="text-sm">Holat: {payment.status}</p>}
      </Card>
    </>
  );
}
