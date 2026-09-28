import type { Metadata } from "next";
import { Alert, Badge, Card, PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/features/auth/session";
import { getPlans } from "@/features/catalog/queries";
import { CheckoutButton } from "@/features/payments/components/checkout-button";
import { getDefaultPaymentProvider } from "@/features/payments/providers";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("billing.title"), robots: { index: false } };
}

export default async function BillingPage(props: PageProps<"/dashboard/billing">) {
  const user = await requireUser("/dashboard/billing");
  const sp = await props.searchParams;
  const vacancyId = typeof sp.vacancy === "string" && /^[0-9a-f-]{36}$/i.test(sp.vacancy) ? sp.vacancy : undefined;
  const supabase = await createClient();
  const { t, d, f } = await getI18n();
  const formatNumber = f.number;
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
      <PageHeader title={t("billing.title")} description={t("billing.intro")} />
      {sp.result === "paid" ? (
        <Alert tone="success" className="mb-4">
          {t("billing.paid")}
        </Alert>
      ) : null}
      {sp.result === "cancelled" ? (
        <Alert tone="warning" className="mb-4">
          {t("billing.cancelled")}
        </Alert>
      ) : null}
      {!paymentsEnabled ? (
        <Alert tone="info" className="mb-4">
          {t("billing.comingSoon")}
        </Alert>
      ) : null}

      {user.isEmployer ? (
        <section className="mb-10">
          <h2 className="mb-1 text-lg font-semibold text-slate-900">{t("billing.employerPlan")}</h2>
          <p className="mb-4 text-sm text-slate-600">
            {t("billing.currentPlan")} <strong>{current?.subscription_plans?.name_uz ?? t("billing.free")}</strong>
            {current ? ` · ${t("common.until", { date: f.date(current.current_period_end) })}` : ""}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {plans.map((p) => {
              const isCurrent = (current?.subscription_plans?.code ?? "FREE") === p.code;
              const features = Array.isArray(p.features) ? (p.features as string[]) : [];
              return (
                <Card key={p.id} className={isCurrent ? "border-brand-500 ring-brand-500 ring-2" : undefined}>
                  <p className="font-semibold text-slate-900">
                    {p.name_uz} {isCurrent ? <Badge tone="brand">{t("billing.current")}</Badge> : null}
                  </p>
                  <p className="mt-1 text-2xl font-extrabold">
                    {t("billing.som", { n: p.price_uzs ? formatNumber(p.price_uzs) : "0" })}
                  </p>
                  <p className="text-xs text-slate-500">
                    {p.price_uzs ? t("billing.forMonths", { n: p.interval_months }) : t("billing.permanent")}
                  </p>
                  <ul className="my-4 space-y-1 text-sm text-slate-700">
                    {features.map((feature) => (
                      <li key={feature}>✓ {feature}</li>
                    ))}
                  </ul>
                  {p.price_uzs && user.companyId && paymentsEnabled ? (
                    <CheckoutButton
                      purpose="subscription"
                      code={p.code}
                      label={isCurrent ? t("billing.extend") : t("billing.choose")}
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
                {t("billing.services")}
                {vacancy ? `: “${vacancy.title}”` : ""}
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
                          {t("billing.som", { n: formatNumber(s.price_uzs) })}{" "}
                          <span className="text-xs font-normal text-slate-500">
                            {t("billing.perDays", { n: s.duration_days })}
                          </span>
                        </p>
                      </div>
                      {paymentsEnabled && (!needsVacancy || vacancy) && s.code !== "recruitment_package" ? (
                        <CheckoutButton
                          purpose="service"
                          code={s.code}
                          vacancyId={needsVacancy ? vacancy?.id : undefined}
                          label={t("billing.buy")}
                          variant="outline"
                        />
                      ) : needsVacancy ? (
                        <p className="text-xs text-slate-500">{t("billing.viaPromote")}</p>
                      ) : s.code === "recruitment_package" ? (
                        <p className="text-xs text-slate-500">{t("billing.managerContact")}</p>
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
          <h2 className="mb-3 text-lg font-semibold text-slate-900">{t("billing.forSeekers")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {candidateServices.map((s) => (
              <Card key={s.id} className="space-y-2">
                <p className="font-semibold text-slate-900">{s.name_uz}</p>
                <p className="text-sm text-slate-600">{s.description_uz}</p>
                <p className="font-bold">
                  {t("billing.som", { n: formatNumber(s.price_uzs) })}{" "}
                  <span className="text-xs font-normal text-slate-500">{t("billing.perDays", { n: s.duration_days })}</span>
                </p>
                {paymentsEnabled && user.hasCandidateProfile ? (
                  <CheckoutButton purpose="service" code={s.code} label={t("billing.activate")} />
                ) : null}
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">{t("billing.history")}</h2>
        {!payments?.length ? (
          <p className="text-sm text-slate-600">{t("billing.noPayments")}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-2">{t("billing.date")}</th>
                  <th className="px-4 py-2">{t("billing.service")}</th>
                  <th className="px-4 py-2">{t("billing.amount")}</th>
                  <th className="px-4 py-2">{t("billing.status")}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">{f.date(p.created_at)}</td>
                    <td className="px-4 py-2">{p.subscription_plans?.name_uz ?? p.paid_services?.name_uz ?? p.purpose}</td>
                    <td className="px-4 py-2">{t("billing.som", { n: formatNumber(p.amount_uzs) })}</td>
                    <td className="px-4 py-2">
                      <Badge tone={p.status === "paid" ? "success" : p.status === "pending" ? "warning" : "neutral"}>
                        {d.enums.paymentStatus[p.status]}
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
