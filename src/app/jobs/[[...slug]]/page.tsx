import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Container, EmptyState, PageHeader } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";
import { getCurrentUser } from "@/features/auth/session";
import { getCatalog } from "@/features/catalog/queries";
import { getLocationLabel, getRegions } from "@/features/locations/queries";
import { VacancyFilters } from "@/features/search/components/filters";
import { SaveSearchButton } from "@/features/search/components/save-search-button";
import { logSearch } from "@/features/search/log";
import { parseVacancySearch, searchToQuery, totalPages } from "@/features/search/params";
import { resolveSearchPath } from "@/features/search/resolve";
import { seoPath, seoTitle } from "@/features/search/seo-routes";
import { VacancyCard } from "@/features/vacancies/components/vacancy-card";
import { searchVacancies } from "@/features/vacancies/queries";
import { isSupabaseConfigured } from "@/lib/env";
import { formatNumber } from "@/lib/utils";

export async function generateMetadata(props: PageProps<"/jobs/[[...slug]]">): Promise<Metadata> {
  const { slug } = await props.params;
  const resolved = await resolveSearchPath(slug, parseVacancySearch({}));
  if (!resolved) return { title: "Sahifa topilmadi" };
  const title = seoTitle("jobs", resolved.seo);
  return {
    title,
    description: `${title}. Oʻz hududingizdagi eng yangi ish oʻrinlari — masofa, maosh va ish turi boʻyicha filtrlang.`,
    alternates: { canonical: seoPath("jobs", resolved.seo) },
  };
}

export default async function JobsPage(props: PageProps<"/jobs/[[...slug]]">) {
  const [{ slug }, raw] = await Promise.all([props.params, props.searchParams]);
  const resolved = await resolveSearchPath(slug, parseVacancySearch(raw));
  if (!resolved) notFound();
  const { search, seo } = resolved;

  const [{ rows, total, error }, regions, catalog, user, locationLabel] = await Promise.all([
    searchVacancies(search),
    getRegions(),
    getCatalog(),
    getCurrentUser(),
    getLocationLabel({ regionId: search.region, districtId: search.district, settlementId: search.settlement, mahallaId: search.mahalla }),
  ]);
  logSearch({ kind: "vacancies", userId: user?.id, query: search.q, professionId: search.profession, regionId: search.region, districtId: search.district, results: total });

  const basePath = seoPath("jobs", seo);
  const profession = catalog.flatMap((c) => c.professions).find((p) => p.id === search.profession);

  return (
    <Container className="py-6 sm:py-8">
      <PageHeader
        title={seoTitle("jobs", seo)}
        description={
          <>
            {locationLabel ? <span className="font-medium text-slate-800">{locationLabel}</span> : "Butun Oʻzbekiston"}
            {search.radius ? ` · ${search.radius} km radius` : ""} — <strong>{formatNumber(total)}</strong> ta vakansiya topildi
          </>
        }
        actions={user ? <SaveSearchButton kind="vacancies" search={search} label={[profession?.name, locationLabel].filter(Boolean).join(" · ") || "Vakansiyalar"} /> : null}
      />
      {!isSupabaseConfigured() ? (
        <Alert tone="warning" className="mb-4">Maʼlumotlar bazasi ulanmagan. <code>.env.local</code> faylida Supabase sozlamalarini kiriting.</Alert>
      ) : null}
      {error ? <Alert tone="danger" className="mb-4">Qidiruvda xatolik yuz berdi. Iltimos, qayta urinib koʻring.</Alert> : null}
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside>
          <VacancyFilters search={search} regions={regions} catalog={catalog} />
        </aside>
        <section aria-label="Vakansiyalar roʻyxati" className="space-y-4">
          {rows.length === 0 ? (
            <EmptyState
              title="Mos vakansiya topilmadi"
              description="Radiusni kengaytiring yoki boshqa tuman/kasbni tanlang. Qidiruvni saqlasangiz, yangi vakansiya chiqqanda xabar beramiz."
              action={<Link href="/jobs" className="text-sm font-medium text-brand-700 hover:underline">Barcha vakansiyalar</Link>}
            />
          ) : (
            rows.map((v) => <VacancyCard key={v.id} v={v} />)
          )}
          <Pagination page={search.page} pages={totalPages(total)} hrefFor={(p) => `${basePath}${searchToQuery(search, { page: p, region: seo.region ? undefined : search.region, district: seo.district ? undefined : search.district, profession: seo.profession ? undefined : search.profession })}`} />
        </section>
      </div>
    </Container>
  );
}
