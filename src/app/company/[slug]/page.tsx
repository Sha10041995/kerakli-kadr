import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Avatar, Badge, Card, Container, DemoBadge, EmptyState } from "@/components/ui/misc";
import { CheckIcon, PinIcon, StarIcon } from "@/components/ui/icons";
import { VacancyCard } from "@/features/vacancies/components/vacancy-card";
import { ReportButton } from "@/features/reports/components/report-button";
import { getCurrentUser } from "@/features/auth/session";
import { COMPANY_TYPE_LABELS } from "@/lib/i18n/uz";
import { createPublicClient } from "@/lib/supabase/public";
import { timeAgo } from "@/lib/utils";

async function getCompany(slug: string) {
  const db = createPublicClient(120);
  if (!db || !/^[a-z0-9-]{1,120}$/.test(slug)) return null;
  const { data } = await db
    .from("companies")
    .select("id, name, slug, company_type, logo_url, description, website, verification_status, rating_avg, rating_count, hires_count, is_demo, created_at, regions(name_uz), districts(name_uz)")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

export async function generateMetadata(props: PageProps<"/company/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const c = await getCompany(slug);
  if (!c) return { title: "Kompaniya topilmadi", robots: { index: false } };
  return { title: `${c.name} — vakansiyalar`, description: c.description?.slice(0, 160) ?? `${c.name} vakansiyalari`, alternates: { canonical: `/company/${slug}` } };
}

export default async function CompanyPage(props: PageProps<"/company/[slug]">) {
  const { slug } = await props.params;
  const company = await getCompany(slug);
  if (!company) notFound();
  const db = createPublicClient(120)!;
  const [{ data: vacancies }, { data: reviews }, user] = await Promise.all([
    db.rpc("search_vacancies", { p_company_id: company.id, p_sort: "newest", p_limit: 30 }),
    db.from("reviews").select("id, rating, comment, created_at").eq("reviewee_company_id", company.id).eq("status", "published").order("created_at", { ascending: false }).limit(10),
    getCurrentUser(),
  ]);

  return (
    <Container className="py-6 sm:py-10">
      <Card className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar src={company.logo_url} first={company.name} size={80} className="rounded-2xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{company.name}</h1>
            {company.verification_status === "verified" ? <Badge tone="success"><CheckIcon size={12} /> Tasdiqlangan</Badge> : null}
            {company.is_demo ? <DemoBadge /> : null}
          </div>
          <p className="text-sm text-slate-600">{COMPANY_TYPE_LABELS[company.company_type]}</p>
          <p className="mt-1 flex flex-wrap gap-x-4 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1"><PinIcon size={16} />{[company.districts?.name_uz, company.regions?.name_uz].filter(Boolean).join(", ") || "—"}</span>
            {company.rating_count ? <span className="inline-flex items-center gap-1 text-amber-600"><StarIcon size={14} />{Number(company.rating_avg).toFixed(1)} ({company.rating_count})</span> : null}
            <span>{company.hires_count} ta yollangan xodim</span>
          </p>
        </div>
        {user ? <ReportButton targetType="company" targetId={company.id} /> : null}
      </Card>
      {company.description ? <Card className="mb-6 text-sm whitespace-pre-line text-slate-700">{company.description}</Card> : null}
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Ochiq vakansiyalar ({vacancies?.length ?? 0})</h2>
      <div className="space-y-4">
        {vacancies?.length ? vacancies.map((v) => <VacancyCard key={v.id} v={v} />) : <EmptyState title="Hozircha ochiq vakansiya yoʻq" />}
      </div>
      {reviews?.length ? (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Xodimlar sharhlari</h2>
          <div className="space-y-3">
            {reviews.map((r) => (
              <Card key={r.id}>
                <p className="flex gap-0.5 text-amber-500">{Array.from({ length: r.rating }, (_, i) => <StarIcon key={i} size={14} />)}</p>
                {r.comment ? <p className="text-sm text-slate-700">{r.comment}</p> : null}
                <p className="text-xs text-slate-500">{timeAgo(r.created_at)}</p>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </Container>
  );
}
