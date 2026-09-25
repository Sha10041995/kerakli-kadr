import type { Metadata } from "next";
import { Alert, Badge, Card, PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/features/auth/session";
import { getPlans } from "@/features/catalog/queries";
import { CheckoutButton } from "@/features/payments/components/checkout-button";
import { getDefaultPaymentProvider } from "@/features/payments/providers";
import { PAYMENT_STATUS_LABELS } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Tarif va toʻlovlar", robots: { index: false } };

export default async function BillingPage(props: PageProps<"/dashboard/billing">) {
  const user = await requireUser("/dashboard/billing");
  const sp = await props.searchParams;
  const vacancyId = typeof sp.vacancy === "string" && /^[0-9a-f-]{36}$/i.test(sp.vacancy) ? sp.vacancy : undefined;
  const supabase = await createClient();
  const [{ plans, services }, { data: payments }, { data: subs }, { data: vacancy }] = await Promise.all([
    getPlans(),
    supabase
      .from("payments")
      .select("id, amount_uzs, status, purpose, created_at, paid_at, subscription_plans(name_uz), paid_services(name_uz)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    user.companyId
      ? supabase
          .from("subscriptions")
          .select("id, status, current_period_end, subscription_plans(code, name_uz)")
          .eq("company_id", user.companyId)
          .eq("status", "active")
          .gt("current_period_end", new Date().toISOString())
          .order("current_period_end", { ascending: false })
      : Promise.resolve({ data: [] }),
    vacancyId
      ? supabase.from("vacancies").select("id, title").eq("id", vacancyId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const current = subs?.[0];
  const paymentsEnabled = Boolean(getDefaultPaymentProvider());
  const employerServices = services.filter((s) => s.audience === "employer");
  const candidateServices = services.filter((s) => s.audience === "candidate");

  return (
    <>
      <PageHeader title="Tarif va toʻlovlar" description="Asosiy imkoniyatlar bepul. Qoʻshimcha xizmatlar ixtiyoriy." />
      {sp.result === "paid" ? (
        <Alert tone="success" className="mb-4">
          Toʻlov muvaffaqiyatli! Xizmat faollashtirildi.
        </Alert>
      ) : null}
      {sp.result === "cancelled" ? (
        <Alert tone="warning" className="mb-4">
          Toʻlov bekor qilindi.
        </Alert>
      ) : null}
      {!paymentsEnabled ? (
        <Alert tone="info" className="mb-4">
          Onlayn toʻlov tizimi tez orada ulanadi. Hozircha barcha asosiy imkoniyatlardan bepul foydalaning.
        </Alert>
      ) : null}

      {user.isEmployer ? (
        <section className="mb-10">
          <h2 className="mb-1 text-lg font-semibold text-slate-900">Ish beruvchi tarifi</h2>
          <p className="mb-4 text-sm text-slate-600">
            Joriy tarif: <strong>{current?.subscription_plans?.name_uz ?? "Bepul"}</strong>
            {current ? ` · ${formatDate(current.current_period_end)} gacha` : ""}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {plans.map((p) => {
              const isCurrent = (current?.subscription_plans?.code ?? "FREE") === p.code;
              const features = Array.isArray(p.features) ? (p.features as string[]) : [];
              return (
                <Card key={p.id} className={isCurrent ? "border-brand-500 ring-brand-500 ring-2" : undefined}>
                  <p className="font-semibold text-slate-900">
                    {p.name_uz} {isCurrent ? <Badge tone="brand">Joriy</Badge> : null}
                  </p>
                  <p className="mt-1 text-2xl font-extrabold">{p.price_uzs ? `${formatNumber(p.price_uzs)} soʻm` : "0 soʻm"}</p>
                  <p className="text-xs text-slate-500">{p.price_uzs ? `${p.interval_months} oyga` : "doimiy"}</p>
                  <ul className="my-4 space-y-1 text-sm text-slate-700">
                    {features.map((f) => (
                      <li key={f}>✓ {f}</li>
                    ))}
                  </ul>
                  {p.price_uzs && user.companyId && paymentsEnabled ? (
                    <CheckoutButton
                      purpose="subscription"
                      code={p.code}
                      label={isCurrent ? "Uzaytirish" : "Tanlash"}
                      variant={isCurrent ? "outline" : "primary"}
                    />
                  ) : null}
                </Card>
              );
            })}
          </div>
          {employerServices.length ? (
            <>
              <h3 className="mt-8 mb-3 font-semibold text-slate-900">
                Qoʻshimcha xizmatlar{vacancy ? `: “${vacancy.title}”` : ""}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {employerServices.map((s) => {
                  const needsVacancy = s.code.startsWith("vacancy_");
                  return (
                    <Card key={s.id} className="flex flex-col justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{s.name_uz}</p>
                        <p className="text-sm text-slate-600">{s.description_uz}</p>
                        <p className="mt-2 font-bold">
                          {formatNumber(s.price_uzs)} soʻm{" "}
                          <span className="text-xs font-normal text-slate-500">/ {s.duration_days} kun</span>
                        </p>
                      </div>
                      {paymentsEnabled && (!needsVacancy || vacancy) && s.code !== "recruitment_package" ? (
                        <CheckoutButton
                          purpose="service"
                          code={s.code}
                          vacancyId={needsVacancy ? vacancy?.id : undefined}
                          label="Sotib olish"
                          variant="outline"
                        />
                      ) : needsVacancy ? (
                        <p className="text-xs text-slate-500">Vakansiya sahifasidagi “Koʻtarish (TOP)” tugmasi orqali.</p>
                      ) : s.code === "recruitment_package" ? (
                        <p className="text-xs text-slate-500">Menejerimiz siz bilan bogʻlanadi — support@kadrtop.uz</p>
                      ) : null}
                    </Card>
                  );
                })}
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      {user.isJobSeeker && candidateServices.length ? (
        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Ish izlovchilar uchun</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {candidateServices.map((s) => (
              <Card key={s.id} className="space-y-2">
                <p className="font-semibold text-slate-900">{s.name_uz}</p>
                <p className="text-sm text-slate-600">{s.description_uz}</p>
                <p className="font-bold">
                  {formatNumber(s.price_uzs)} soʻm{" "}
                  <span className="text-xs font-normal text-slate-500">/ {s.duration_days} kun</span>
                </p>
                {paymentsEnabled && user.hasCandidateProfile ? (
                  <CheckoutButton purpose="service" code={s.code} label="Faollashtirish" />
                ) : null}
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Toʻlovlar tarixi</h2>
        {!payments?.length ? (
          <p className="text-sm text-slate-600">Hali toʻlov yoʻq.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-2">Sana</th>
                  <th className="px-4 py-2">Xizmat</th>
                  <th className="px-4 py-2">Summa</th>
                  <th className="px-4 py-2">Holat</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">{formatDate(p.created_at)}</td>
                    <td className="px-4 py-2">{p.subscription_plans?.name_uz ?? p.paid_services?.name_uz ?? p.purpose}</td>
                    <td className="px-4 py-2">{formatNumber(p.amount_uzs)} soʻm</td>
                    <td className="px-4 py-2">
                      <Badge tone={p.status === "paid" ? "success" : p.status === "pending" ? "warning" : "neutral"}>
                        {PAYMENT_STATUS_LABELS[p.status]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
