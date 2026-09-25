import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Card, Container, PageHeader } from "@/components/ui/misc";
import { getPlans } from "@/features/catalog/queries";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Tariflar",
  description: "Ish izlovchilar uchun bepul. Ish beruvchilar uchun bepul va pullik tariflar: Basic, Pro, Business.",
  alternates: { canonical: "/pricing" },
};

export default async function PricingPage() {
  const { plans, services } = await getPlans();
  return (
    <Container className="py-8 sm:py-12">
      <PageHeader title="Tariflar" description="Ish izlovchilar uchun hammasi bepul. Ish beruvchilar bepul boshlab, kerak boʻlganda tarifni oshiradi." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => {
          const features = Array.isArray(p.features) ? (p.features as string[]) : [];
          return (
            <Card key={p.id} className={p.code === "PRO" ? "relative border-brand-500 ring-2 ring-brand-500" : undefined}>
              {p.code === "PRO" ? <span className="absolute -top-3 left-4 rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">Mashhur</span> : null}
              <h2 className="text-lg font-semibold text-slate-900">{p.name_uz}</h2>
              <p className="text-sm text-slate-500">{p.description_uz}</p>
              <p className="mt-3 text-3xl font-extrabold text-slate-900">{p.price_uzs ? formatNumber(p.price_uzs) : "0"} <span className="text-base font-medium">soʻm</span></p>
              <p className="text-xs text-slate-500">{p.price_uzs ? "oyiga" : "doimiy bepul"}</p>
              <ul className="my-5 space-y-2 text-sm text-slate-700">{features.map((f) => <li key={f}>✓ {f}</li>)}</ul>
              <ButtonLink href={p.price_uzs ? "/dashboard/billing" : "/register?role=employer"} variant={p.code === "PRO" ? "primary" : "outline"} className="w-full">
                {p.price_uzs ? "Tanlash" : "Bepul boshlash"}
              </ButtonLink>
            </Card>
          );
        })}
      </div>
      {services.length ? (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold text-slate-900">Qoʻshimcha xizmatlar</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <Card key={s.id}>
                <p className="font-semibold text-slate-900">{s.name_uz}</p>
                <p className="text-sm text-slate-600">{s.description_uz}</p>
                <p className="mt-2 font-bold">{formatNumber(s.price_uzs)} soʻm <span className="text-xs font-normal text-slate-500">/ {s.duration_days} kun</span></p>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
      <Card className="mt-12 bg-brand-50 text-center">
        <h2 className="text-lg font-semibold text-slate-900">Ish izlovchimisiz?</h2>
        <p className="text-sm text-slate-600">Profil, CV, qidiruv va ariza yuborish — butunlay bepul.</p>
        <ButtonLink href="/register?role=job_seeker" className="mt-4">Bepul profil yaratish</ButtonLink>
      </Card>
    </Container>
  );
}
