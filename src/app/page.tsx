import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, Container } from "@/components/ui/misc";
import { BriefcaseIcon, CheckIcon, PinIcon, ShieldIcon, TargetIcon, UsersIcon } from "@/components/ui/icons";
import { CandidateCard } from "@/features/candidates/components/candidate-card";
import { featuredCandidates } from "@/features/candidates/queries";
import { getCatalog, getCategoryStats, getPlans, getRegionStats, getTalentSummary } from "@/features/catalog/queries";
import { getRegions } from "@/features/locations/queries";
import { SearchBar } from "@/features/search/components/search-bar";
import { VacancyCard } from "@/features/vacancies/components/vacancy-card";
import { latestVacancies } from "@/features/vacancies/queries";
import { getI18n } from "@/lib/i18n/server";

const FAQ = [1, 2, 3, 4, 5] as const;

export default async function HomePage() {
  const [regions, catalog, categories, regionStats, talent, jobs, candidates, { plans }] = await Promise.all([
    getRegions(),
    getCatalog(),
    getCategoryStats(),
    getRegionStats(),
    getTalentSummary(null, null, 6),
    latestVacancies(4),
    featuredCandidates(4),
    getPlans(),
  ]);
  const { t, d, f } = await getI18n();
  const formatNumber = f.number;
  const professions = catalog.flatMap((c) => c.professions.map((p) => ({ id: p.id, name: p.name, category: c.name })));
  const professionSlugs = new Map(catalog.flatMap((c) => c.professions.map((p) => [p.id, p.slug] as const)));

  return (
    <>
      <section className="from-brand-800 via-brand-700 to-brand-600 relative overflow-hidden bg-gradient-to-br text-white">
        <div aria-hidden className="absolute -top-24 -right-24 size-96 rounded-full bg-white/10 blur-3xl" />
        <Container className="relative py-12 sm:py-20">
          <div className="max-w-3xl">
            <Badge tone="warning" className="mb-4">
              {t("home.badge")}
            </Badge>
            <h1 className="text-3xl leading-tight font-extrabold tracking-tight sm:text-5xl">{t("common.siteTagline")}</h1>
            <p className="text-brand-50 mt-4 text-base sm:text-lg">{t("home.lead")}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/jobs" variant="accent" size="lg">
                {t("home.findJob")}
              </ButtonLink>
              <ButtonLink href="/candidates" size="lg" className="text-brand-800 hover:bg-brand-50 bg-white">
                {t("home.findTalent")}
              </ButtonLink>
            </div>
          </div>
          <div className="mt-10">
            <SearchBar regions={regions} professions={professions} />
          </div>
        </Container>
      </section>

      {talent.length > 0 ? (
        <section className="border-b border-slate-200 bg-white">
          <Container className="py-10">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{t("home.localTalent")}</h2>
                <p className="text-sm text-slate-600">{t("home.localTalentText")}</p>
              </div>
              <Link href="/candidates" className="text-brand-700 text-sm font-medium hover:underline">
                {t("home.seeAll")}
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {talent.map((row) => (
                <Link
                  key={row.profession_id}
                  href={`/candidates/${row.profession_slug}`}
                  className="group hover:border-brand-300 hover:bg-brand-50 flex items-center gap-3 rounded-xl border border-slate-200 p-4"
                >
                  <span className="bg-brand-100 text-brand-700 inline-flex size-10 items-center justify-center rounded-full">
                    <UsersIcon />
                  </span>
                  <span>
                    <span className="group-hover:text-brand-800 block font-semibold text-slate-900">
                      {t("home.talentCount", {
                        n: formatNumber(Number(row.candidate_count)),
                        profession: row.profession_name?.toLowerCase() ?? "",
                      })}
                    </span>
                    <span className="text-xs text-slate-500">
                      {t("home.openVacancies", { n: formatNumber(Number(row.vacancy_count)) })}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      <Container className="py-12">
        <h2 className="mb-6 text-xl font-bold text-slate-900 sm:text-2xl">{t("home.popularCategories")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {(categories.length
            ? categories
            : catalog.map((c) => ({
                id: c.id,
                slug: c.slug,
                name_uz: c.name,
                icon: c.icon,
                vacancy_count: 0,
                candidate_count: 0,
              }))
          ).map((c) => (
            <Link
              key={c.id}
              href={`/jobs?category=${c.id}`}
              className="hover:border-brand-300 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow"
            >
              <span className="text-2xl" aria-hidden>
                {c.icon}
              </span>
              <p className="mt-2 font-semibold text-slate-900">{c.name_uz}</p>
              <p className="text-xs text-slate-500">
                {t("home.categoryStats", {
                  v: formatNumber(Number(c.vacancy_count ?? 0)),
                  c: formatNumber(Number(c.candidate_count ?? 0)),
                })}
              </p>
            </Link>
          ))}
        </div>
      </Container>

      {jobs.length > 0 || candidates.length > 0 ? (
        <Container className="grid gap-10 pb-12 lg:grid-cols-2">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">{t("home.newVacancies")}</h2>
              <Link href="/jobs" className="text-brand-700 text-sm font-medium hover:underline">
                {t("home.seeAll")}
              </Link>
            </div>
            <div className="space-y-4">
              {jobs.map((v) => (
                <VacancyCard key={v.id} v={v} />
              ))}
            </div>
          </section>
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">{t("home.readyCandidates")}</h2>
              <Link href="/candidates" className="text-brand-700 text-sm font-medium hover:underline">
                {t("home.seeAll")}
              </Link>
            </div>
            <div className="space-y-4">
              {candidates.map((c) => (
                <CandidateCard key={c.id} c={c} />
              ))}
            </div>
          </section>
        </Container>
      ) : null}

      <section className="bg-white py-12">
        <Container>
          <h2 className="mb-6 text-xl font-bold text-slate-900 sm:text-2xl">{t("home.byRegion")}</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {(regionStats.length
              ? regionStats
              : regions.map((r) => ({ id: r.id, slug: r.slug, name_uz: r.name, vacancy_count: 0, candidate_count: 0 }))
            ).map((r) => (
              <Link
                key={r.id}
                href={`/jobs/${r.slug}`}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-slate-50"
              >
                <span className="flex items-center gap-2 text-slate-800">
                  <PinIcon size={16} className="text-brand-600" />
                  {r.name_uz}
                </span>
                <span className="text-xs text-slate-500">{formatNumber(Number(r.vacancy_count ?? 0))}</span>
              </Link>
            ))}
          </div>
          {professionSlugs.size > 0 ? (
            <p className="mt-6 text-xs text-slate-500">
              {t("home.popularSearches")}{" "}
              <Link className="hover:underline" href="/jobs/xorazm/urganch-shahri">
                {t("home.ps1")}
              </Link>{" "}
              ·{" "}
              <Link className="hover:underline" href="/jobs/qashqadaryo/kitob">
                {t("home.ps2")}
              </Link>{" "}
              ·{" "}
              <Link className="hover:underline" href="/candidates/toshkent/elektrik">
                {t("home.ps3")}
              </Link>{" "}
              ·{" "}
              <Link className="hover:underline" href="/candidates/qoraqalpogiston/qongirot/traktorchi">
                {t("home.ps4")}
              </Link>
            </p>
          ) : null}
        </Container>
      </section>

      <Container className="py-12">
        <h2 className="mb-8 text-center text-xl font-bold text-slate-900 sm:text-2xl">{t("home.howItWorks")}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: PinIcon,
              title: t("home.step1"),
              d: t("home.step1Text"),
            },
            {
              icon: BriefcaseIcon,
              title: t("home.step2"),
              d: t("home.step2Text"),
            },
            {
              icon: TargetIcon,
              title: t("home.step3"),
              d: t("home.step3Text"),
            },
          ].map(({ icon: Icon, title, d }) => (
            <Card key={title} className="text-center">
              <span className="bg-brand-50 text-brand-700 mx-auto inline-flex size-12 items-center justify-center rounded-full">
                <Icon size={24} />
              </span>
              <h3 className="mt-3 font-semibold text-slate-900">{title}</h3>
              <p className="mt-1 text-sm text-slate-600">{d}</p>
            </Card>
          ))}
        </div>
      </Container>

      <Container className="grid gap-4 pb-12 md:grid-cols-2">
        <Card className="bg-slate-900 text-white">
          <h2 className="text-xl font-bold">{t("home.forEmployers")}</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-200">
            {Object.values(d.home.employerPoints).map((x) => (
              <li key={x} className="flex gap-2">
                <CheckIcon size={18} className="text-accent-400 shrink-0" />
                {x}
              </li>
            ))}
          </ul>
          <ButtonLink href="/register?role=employer" variant="accent" className="mt-6">
            {t("home.postVacancy")}
          </ButtonLink>
        </Card>
        <Card className="bg-brand-50">
          <h2 className="text-xl font-bold text-slate-900">{t("home.forSeekers")}</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {Object.values(d.home.seekerPoints).map((x) => (
              <li key={x} className="flex gap-2">
                <ShieldIcon size={18} className="text-brand-600 shrink-0" />
                {x}
              </li>
            ))}
          </ul>
          <ButtonLink href="/register?role=job_seeker" className="mt-6">
            {t("home.createProfile")}
          </ButtonLink>
        </Card>
      </Container>

      {plans.length > 0 ? (
        <section className="bg-white py-12">
          <Container>
            <div className="mb-6 flex items-end justify-between">
              <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{t("home.plans")}</h2>
              <Link href="/pricing" className="text-brand-700 text-sm font-medium hover:underline">
                {t("home.moreLink")}
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {plans.map((p) => (
                <Card key={p.id} className={p.code === "PRO" ? "border-brand-500 ring-brand-500 ring-2" : undefined}>
                  <p className="font-semibold text-slate-900">{p.name_uz}</p>
                  <p className="mt-1 text-2xl font-extrabold text-slate-900">
                    {p.price_uzs ? t("home.priceSom", { price: formatNumber(p.price_uzs) }) : t("home.free")}
                  </p>
                  {p.price_uzs ? (
                    <p className="text-xs text-slate-500">{t("home.perMonth")}</p>
                  ) : (
                    <p className="text-xs text-slate-500">{t("home.forever")}</p>
                  )}
                </Card>
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      <Container className="py-12">
        <h2 className="mb-6 text-xl font-bold text-slate-900 sm:text-2xl">{t("home.faqTitle")}</h2>
        <div className="space-y-3">
          {FAQ.map((n) => (
            <details key={n} className="rounded-xl border border-slate-200 bg-white p-4">
              <summary className="cursor-pointer font-medium text-slate-900">{t(`home.faq.q${n}`)}</summary>
              <p className="mt-2 text-sm text-slate-600">{t(`home.faq.a${n}`)}</p>
            </details>
          ))}
        </div>
      </Container>
    </>
  );
}
