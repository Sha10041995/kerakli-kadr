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
import { MapView } from "@/components/map/map-view";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(props: PageProps<"/candidates/[[...slug]]">): Promise<Metadata> {
  const { slug } = await props.params;
  const resolved = await resolveSearchPath(slug, parseCandidateSearch({}));
  const { locale, t } = await getI18n();
  if (!resolved) return { title: t("common.notFoundTitle") };
  const title = seoTitle("candidates", resolved.seo, locale);
  return {
    title,
    description: t("search.candidatesDescription", { title }),
    alternates: { canonical: seoPath("candidates", resolved.seo) },
  };
}

export default async function CandidatesPage(props: PageProps<"/candidates/[[...slug]]">) {
  const [{ slug }, raw] = await Promise.all([props.params, props.searchParams]);
  const resolved = await resolveSearchPath(slug, parseCandidateSearch(raw));
  if (!resolved) notFound();
  const { search, seo } = resolved;

  const [{ rows, total, error }, regions, catalog, user, locationLabel, { locale, t, f }] = await Promise.all([
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
    getI18n(),
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
  const isMap = raw.view === "map";
  // SEO path segments already carry region/district/profession
  const hrefWith = (over: Record<string, string | number | undefined>) =>
    `${basePath}${searchToQuery(search, {
      region: seo.region ? undefined : search.region,
      district: seo.district ? undefined : search.district,
      profession: seo.profession ? undefined : search.profession,
      ...over,
    })}`;
  const profession = catalog.flatMap((c) => c.professions).find((p) => p.id === search.profession);
  const hasLocation = Boolean(search.region || search.lat !== undefined);

  return (
    <Container className="py-6 sm:py-8">
      <PageHeader
        title={seoTitle("candidates", seo, locale)}
        description={t("search.candidatesIntro")}
        actions={
          user ? (
            <SaveSearchButton
              kind="candidates"
              search={search}
              label={[profession?.name, locationLabel].filter(Boolean).join(" · ") || t("search.candidatesLabel")}
            />
          ) : null
        }
      />
      {!isSupabaseConfigured() ? (
        <Alert tone="warning" className="mb-4">
          {t("search.dbNotConfigured")}
        </Alert>
      ) : null}
      {error ? (
        <Alert tone="danger" className="mb-4">
          {t("search.searchError")}
        </Alert>
      ) : null}

      {profession && hasLocation ? (
        <Card className="border-brand-200 bg-brand-50 mb-6 flex items-center gap-4">
          <span className="bg-brand-600 inline-flex size-12 shrink-0 items-center justify-center rounded-full text-white">
            <UsersIcon size={24} />
          </span>
          <p className="text-brand-900 text-base sm:text-lg">
            <strong>{locationLabel ?? t("search.nearby")}</strong>
            {search.radius ? ` (${t("search.km", { n: search.radius })})` : ""} —{" "}
            {t("search.talentAvailable", { n: f.number(total), profession: profession.name.toLowerCase() })}
          </p>
        </Card>
      ) : (
        <p className="mb-4 text-sm text-slate-600">
          {locationLabel ?? t("search.wholeCountry")} — <strong>{t("search.candidatesFound", { n: f.number(total) })}</strong>
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside>
          <CandidateFilters search={search} regions={regions} catalog={catalog} />
        </aside>
        <section aria-label={t("search.candidateList")} className="grid gap-4 xl:grid-cols-2 xl:content-start">
          <div className="flex items-center justify-end gap-2 text-sm xl:col-span-2">
            <Link
              href={hrefWith({ view: undefined, page: search.page })}
              aria-current={!isMap ? "page" : undefined}
              className={isMap ? "text-slate-600 hover:underline" : "text-brand-700 font-semibold"}
            >
              {t("search.listView")}
            </Link>
            <span className="text-slate-300">|</span>
            <Link
              href={hrefWith({ view: "map", page: search.page })}
              aria-current={isMap ? "page" : undefined}
              className={isMap ? "text-brand-700 font-semibold" : "text-slate-600 hover:underline"}
            >
              {t("search.mapView")}
            </Link>
          </div>
          {isMap ? (
            <div className="xl:col-span-2">
              <MapView
                label={t("search.candidateMap")}
                items={rows
                  .filter((c) => c.lat != null && c.lng != null)
                  .map((c) => ({
                    id: c.id!,
                    lat: c.lat!,
                    lng: c.lng!,
                    label: f.name(c.first_name, c.last_initial, true),
                    sublabel: [c.profession_name, c.district_name].filter(Boolean).join(" · "),
                    href: `/candidate/${c.id}`,
                    kind: "area" as const,
                    radiusM: 1000,
                  }))}
              />
              <p className="mt-1 text-xs text-slate-500">{t("search.candidateMapNote")}</p>
            </div>
          ) : null}
          {rows.length === 0 ? (
            <div className="xl:col-span-2">
              <EmptyState
                title={t("search.noCandidates")}
                description={t("search.noCandidatesText")}
                action={
                  <Link href="/dashboard/vacancies/new" className="text-brand-700 text-sm font-medium hover:underline">
                    {t("search.postVacancy")}
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
              hrefFor={(p) => hrefWith({ page: p, view: isMap ? "map" : undefined })}
            />
          </div>
        </section>
      </div>
    </Container>
  );
}
