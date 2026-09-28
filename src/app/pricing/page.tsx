import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Card, Container, PageHeader } from "@/components/ui/misc";
import { getPlans } from "@/features/catalog/queries";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("pricing.title"), description: t("pricing.metaDescription"), alternates: { canonical: "/pricing" } };
}

export default async function PricingPage() {
  const [{ plans, services }, { t, f }] = await Promise.all([getPlans(), getI18n()]);
  const formatNumber = f.number;
  return (
    <Container className="py-8 sm:py-12">
      <PageHeader title={t("pricing.title")} description={t("pricing.intro")} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => {
          const features = Array.isArray(p.features) ? (p.features as string[]) : [];
          return (
            <Card key={p.id} className={p.code === "PRO" ? "border-brand-500 ring-brand-500 relative ring-2" : undefined}>
              {p.code === "PRO" ? (
                <span className="bg-brand-600 absolute -top-3 left-4 rounded-full px-2 py-0.5 text-xs font-semibold text-white">
                  {t("pricing.popular")}
                </span>
              ) : null}
              <h2 className="text-lg font-semibold text-slate-900">{p.name_uz}</h2>
              <p className="text-sm text-slate-500">{p.description_uz}</p>
              <p className="mt-3 text-3xl font-extrabold text-slate-900">
                {p.price_uzs ? formatNumber(p.price_uzs) : "0"} <span className="text-base font-medium">{t("pricing.som")}</span>
              </p>
              <p className="text-xs text-slate-500">{p.price_uzs ? t("pricing.perMonth") : t("pricing.foreverFree")}</p>
              <ul className="my-5 space-y-2 text-sm text-slate-700">
                {features.map((feature) => (
                  <li key={feature}>✓ {feature}</li>
                ))}
              </ul>
              <ButtonLink
                href={p.price_uzs ? "/dashboard/billing" : "/register?role=employer"}
                variant={p.code === "PRO" ? "primary" : "outline"}
                className="w-full"
              >
                {p.price_uzs ? t("pricing.choose") : t("pricing.startFree")}
              </ButtonLink>
            </Card>
          );
        })}
      </div>
      {services.length ? (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold text-slate-900">{t("pricing.services")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <Card key={s.id}>
                <p className="font-semibold text-slate-900">{s.name_uz}</p>
                <p className="text-sm text-slate-600">{s.description_uz}</p>
                <p className="mt-2 font-bold">
                  {formatNumber(s.price_uzs)} {t("pricing.som")}{" "}
                  <span className="text-xs font-normal text-slate-500">{t("pricing.perDays", { n: s.duration_days })}</span>
                </p>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
      <Card className="bg-brand-50 mt-12 text-center">
        <h2 className="text-lg font-semibold text-slate-900">{t("pricing.seekerTitle")}</h2>
        <p className="text-sm text-slate-600">{t("pricing.seekerText")}</p>
        <ButtonLink href="/register?role=job_seeker" className="mt-4">
          {t("pricing.seekerCta")}
        </ButtonLink>
      </Card>
    </Container>
  );
}
