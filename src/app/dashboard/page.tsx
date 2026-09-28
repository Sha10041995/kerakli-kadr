import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Alert, Badge, Card, EmptyState, PageHeader, Stat } from "@/components/ui/misc";
import { requireUser } from "@/features/auth/session";
import { listCandidateApplications } from "@/features/applications/queries";
import { STATUS_TONE } from "@/features/applications/status";
import { MatchBadge } from "@/features/matching/match-badge";
import { matchVacanciesForMe } from "@/features/matching/queries";
import { listCompanyVacancies } from "@/features/vacancies/queries";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("dashboard.title"), robots: { index: false } };
}

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const supabase = await createClient();
  const { t, d, f } = await getI18n();

  const [candidate, applications, recommendations, vacancies, views] = await Promise.all([
    user.isJobSeeker
      ? supabase
          .from("candidate_profiles")
          .select("completeness, is_public, profession_id, district_id")
          .eq("id", user.id)
          .maybeSingle()
          .then((r) => r.data)
      : null,
    user.isJobSeeker ? listCandidateApplications(user.id) : [],
    user.isJobSeeker && user.hasCandidateProfile ? matchVacanciesForMe(6) : [],
    user.isEmployer && user.companyId ? listCompanyVacancies(user.companyId) : [],
    user.isJobSeeker
      ? supabase
          .from("candidate_profile_stats")
          .select("views_count")
          .eq("candidate_id", user.id)
          .maybeSingle()
          .then((r) => r.data?.views_count ?? 0)
      : 0,
  ]);

  const active = vacancies.filter((v) => v.status === "active").length;
  const totalApps = vacancies.reduce((s, v) => s + v.applications_count, 0);

  return (
    <>
      <PageHeader title={t("dashboard.hello", { name: user.firstName || t("auth.friend") })} description={t("dashboard.lead")} />
      {user.isBlocked ? (
        <Alert tone="danger" className="mb-4">
          {t("dashboard.blocked")}
        </Alert>
      ) : null}

      {user.isJobSeeker ? (
        <section className="mb-10 space-y-4">
          {!candidate ? (
            <Alert tone="info">
              {t("dashboard.noProfile")}{" "}
              <Link href="/dashboard/profile" className="font-medium underline">
                {t("dashboard.fillProfile")}
              </Link>{" "}
              {t("dashboard.noProfileAfter")}
            </Alert>
          ) : candidate.completeness < 70 ? (
            <Alert tone="warning">
              {t("dashboard.lowCompleteness", { n: candidate.completeness })}{" "}
              <Link href="/dashboard/profile" className="font-medium underline">
                {t("dashboard.complete")}
              </Link>
            </Alert>
          ) : null}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              label={t("dashboard.statProfile")}
              value={`${candidate?.completeness ?? 0}%`}
              hint={candidate?.is_public ? t("dashboard.public") : t("dashboard.hidden")}
            />
            <Stat label={t("dashboard.statApplications")} value={applications.length} />
            <Stat label={t("dashboard.statViews")} value={views} hint={t("dashboard.byEmployers")} />
            <Stat
              label={t("dashboard.statInterviews")}
              value={applications.filter((a) => a.status === "interview" || a.status === "offered").length}
            />
          </div>
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">{t("dashboard.matchingJobs")}</h2>
              <Link href="/jobs" className="text-brand-700 text-sm font-medium hover:underline">
                {t("dashboard.allJobs")}
              </Link>
            </div>
            {recommendations.length === 0 ? (
              <p className="text-sm text-slate-600">{t("dashboard.noMatches")}</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recommendations.map(({ row, match }) => (
                  <li key={row.vacancy_id} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link href={`/vacancy/${row.vacancy_id}`} className="hover:text-brand-700 font-medium text-slate-900">
                        {row.title}
                      </Link>
                      <p className="text-sm text-slate-600">
                        {row.company_name} · {row.district_name ?? t("common.remote")}
                        {row.distance_km != null ? ` · ${f.distance(row.distance_km)}` : ""}
                      </p>
                      <p className="text-sm text-slate-800">
                        {f.salary(row.vacancy_salary_min, row.vacancy_salary_max, row.salary_type)}
                      </p>
                    </div>
                    <MatchBadge match={match} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {applications.length > 0 ? (
            <Card>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">{t("dashboard.recentApplications")}</h2>
              <ul className="divide-y divide-slate-100">
                {applications.slice(0, 5).map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <Link href={`/vacancy/${a.vacancy_id}`} className="hover:text-brand-700 truncate text-slate-800">
                      {a.vacancies?.title}
                    </Link>
                    <Badge tone={STATUS_TONE[a.status]}>{d.enums.applicationStatus[a.status]}</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </section>
      ) : null}

      {user.isEmployer ? (
        <section className="space-y-4">
          {!user.companyId ? (
            <EmptyState
              title={t("dashboard.createEmployer")}
              description={t("dashboard.createEmployerText")}
              action={<ButtonLink href="/dashboard/company">{t("dashboard.start")}</ButtonLink>}
            />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label={t("dashboard.statActive")} value={active} />
                <Stat label={t("dashboard.statTotalApps")} value={totalApps} />
                <Stat label={t("dashboard.statVacancyViews")} value={vacancies.reduce((s, v) => s + v.views_count, 0)} />
              </div>
              <Card>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">{t("dashboard.myVacancies")}</h2>
                  <ButtonLink href="/dashboard/vacancies/new" size="sm">
                    {t("dashboard.newShort")}
                  </ButtonLink>
                </div>
                {vacancies.length === 0 ? (
                  <p className="text-sm text-slate-600">{t("dashboard.noVacancies")}</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {vacancies.slice(0, 6).map((v) => (
                      <li key={v.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <Link href={`/dashboard/vacancies/${v.id}`} className="hover:text-brand-700 truncate text-slate-800">
                          {v.title}
                        </Link>
                        <span className="shrink-0 text-slate-500">
                          {t("dashboard.appsAgo", { n: v.applications_count, ago: f.timeAgo(v.created_at) })}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </>
          )}
        </section>
      ) : null}

      {!user.isJobSeeker && !user.isEmployer && !user.isStaff ? (
        <EmptyState
          title={t("dashboard.chooseRole")}
          action={<ButtonLink href="/onboarding">{t("dashboard.continue")}</ButtonLink>}
        />
      ) : null}
    </>
  );
}
