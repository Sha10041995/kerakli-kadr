import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Card, Container, EmptyState, PageHeader } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";
import { UsersIcon } from "@/components/ui/icons";
import { getCurrentUser } from "@/features/auth/session";
import { CandidateCard } from "@/features/candidates/components/candidate-card";
import { searchCandidates } from "@/features/candidates/queries";
import { getCatalog } from "@/features/catalog/queries";
import { getLocationLabel, getRegions } from "@/features/locations/queries";
import { CandidateFilters } from "@/features/search/components/filters";
import { SaveSearchButton } from "@/features/search/components/save-search-button";
import { logSearch } from "@/features/search/log";
import { parseCandidateSearch, searchToQuery, totalPages } from "@/features/search/params";
import { resolveSearchPath } from "@/features/search/resolve";
import { seoPath, seoTitle } from "@/features/search/seo-routes";
import { isSupabaseConfigured } from "@/lib/env";
import { formatNumber } from "@/lib/utils";

export async function generateMetadata(props: PageProps<"/candidates/[[...slug]]">): Promise<Metadata> {
  const { slug } = await props.params;
  const resolved = await resolveSearchPath(slug, parseCandidateSearch({}));
  if (!resolved) return { title: "Sahifa topilmadi" };
  const title = seoTitle("candidates", resolved.seo);
  return {
    title,
    description: `${title}: tajriba, masofa, reyting va mavjudlik boʻyicha saralangan mahalliy mutaxassislar.`,
    alternates: { canonical: seoPath("candidates", resolved.seo) },
  };
}

export default async function CandidatesPage(props: PageProps<"/candidates/[[...slug]]">) {
  const [{ slug }, raw] = await Promise.all([props.params, props.searchParams]);
  const resolved = await resolveSearchPath(slug, parseCandidateSearch(raw));
  if (!resolved) notFound();
  const { search, seo } = resolved;

  const [{ rows, total, error }, regions, catalog, user, locationLabel] = await Promise.all([
    searchCandidates(search),
    getRegions(),
    getCatalog(),
    getCurrentUser(),
    getLocationLabel({
      regionId: search.region,
      districtId: search.district,
      settlementId: search.settlement,
      mahallaId: search.mahalla,
    }),
  ]);
  logSearch({
    kind: "candidates",
    userId: user?.id,
    query: search.q,
    professionId: search.profession,
    regionId: search.region,
    districtId: search.district,
    results: total,
  });

  const basePath = seoPath("candidates", seo);
  const profession = catalog.flatMap((c) => c.professions).find((p) => p.id === search.profession);
  const hasLocation = Boolean(search.region || search.lat !== undefined);

  return (
    <Container className="py-6 sm:py-8">
      <PageHeader
        title={seoTitle("candidates", seo)}
        description="Natijalar hudud va masofa boʻyicha tartiblangan — eng yaqin mutaxassislar birinchi. Nomzodlarning aniq manzili hech qachon koʻrsatilmaydi."
        actions={
          user ? (
            <SaveSearchButton
              kind="candidates"
              search={search}
              label={[profession?.name, locationLabel].filter(Boolean).join(" · ") || "Kadrlar"}
            />
          ) : null
        }
      />
      {!isSupabaseConfigured() ? (
        <Alert tone="warning" className="mb-4">
          Maʼlumotlar bazasi ulanmagan. <code>.env.local</code> faylida Supabase sozlamalarini kiriting.
        </Alert>
      ) : null}
      {error ? (
        <Alert tone="danger" className="mb-4">
          Qidiruvda xatolik yuz berdi.
        </Alert>
      ) : null}

      {profession && hasLocation ? (
        <Card className="border-brand-200 bg-brand-50 mb-6 flex items-center gap-4">
          <span className="bg-brand-600 inline-flex size-12 shrink-0 items-center justify-center rounded-full text-white">
            <UsersIcon size={24} />
          </span>
          <p className="text-brand-900 text-base sm:text-lg">
            <strong>{locationLabel ?? "Yaqin atrofda"}</strong>
            {search.radius ? ` (${search.radius} km)` : ""} — <strong>{formatNumber(total)}</strong> ta{" "}
            {profession.name.toLowerCase()} mavjud.
          </p>
        </Card>
      ) : (
        <p className="mb-4 text-sm text-slate-600">
          {locationLabel ?? "Butun Oʻzbekiston"} — <strong>{formatNumber(total)}</strong> ta nomzod
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside>
          <CandidateFilters search={search} regions={regions} catalog={catalog} />
        </aside>
        <section aria-label="Nomzodlar roʻyxati" className="grid gap-4 xl:grid-cols-2 xl:content-start">
          {rows.length === 0 ? (
            <div className="xl:col-span-2">
              <EmptyState
                title="Mos nomzod topilmadi"
                description="Radiusni kengaytiring yoki qoʻshni tumanni tanlang. Vakansiya joylasangiz, nomzodlar oʻzlari ariza yuboradi."
                action={
                  <Link href="/dashboard/vacancies/new" className="text-brand-700 text-sm font-medium hover:underline">
                    Vakansiya joylash
                  </Link>
                }
              />
            </div>
          ) : (
            rows.map((c) => <CandidateCard key={c.id} c={c} />)
          )}
          <div className="xl:col-span-2">
            <Pagination
              page={search.page}
              pages={totalPages(total)}
              hrefFor={(p) =>
                `${basePath}${searchToQuery(search, { page: p, region: seo.region ? undefined : search.region, district: seo.district ? undefined : search.district, profession: seo.profession ? undefined : search.profession })}`
              }
            />
          </div>
        </section>
      </div>
    </Container>
  );
}
