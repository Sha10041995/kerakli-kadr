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
import { APPLICATION_STATUS_LABELS } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";
import { formatDistance, formatSalary, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Kabinet", robots: { index: false } };

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const supabase = await createClient();

  const [candidate, applications, recommendations, vacancies] = await Promise.all([
    user.isJobSeeker ? supabase.from("candidate_profiles").select("completeness, is_public, profession_id, district_id").eq("id", user.id).maybeSingle().then((r) => r.data) : null,
    user.isJobSeeker ? listCandidateApplications(user.id) : [],
    user.isJobSeeker && user.hasCandidateProfile ? matchVacanciesForMe(6) : [],
    user.isEmployer && user.companyId ? listCompanyVacancies(user.companyId) : [],
  ]);

  const active = vacancies.filter((v) => v.status === "active").length;
  const totalApps = vacancies.reduce((s, v) => s + v.applications_count, 0);

  return (
    <>
      <PageHeader title={`Salom, ${user.firstName || "doʻst"}!`} description="Oʻz hududingizdagi imkoniyatlar shu yerda." />
      {user.isBlocked ? <Alert tone="danger" className="mb-4">Hisobingiz vaqtincha cheklangan. Qoʻllab-quvvatlash xizmatiga murojaat qiling.</Alert> : null}

      {user.isJobSeeker ? (
        <section className="mb-10 space-y-4">
          {!candidate ? (
            <Alert tone="info">Profilingiz hali yaratilmagan. <Link href="/dashboard/profile" className="font-medium underline">Profilni toʻldiring</Link> — ish beruvchilar sizni hududingiz boʻyicha topadi.</Alert>
          ) : candidate.completeness < 70 ? (
            <Alert tone="warning">Profilingiz {candidate.completeness}% toʻldirilgan. Toʻliq profillar ish beruvchilarga koʻproq koʻrsatiladi. <Link href="/dashboard/profile" className="font-medium underline">Toʻldirish</Link></Alert>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Profil" value={`${candidate?.completeness ?? 0}%`} hint={candidate?.is_public ? "Ommaviy" : "Yashirin"} />
            <Stat label="Arizalar" value={applications.length} />
            <Stat label="Suhbatga taklif" value={applications.filter((a) => a.status === "interview" || a.status === "offered").length} />
          </div>
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Sizga mos ishlar</h2>
              <Link href="/jobs" className="text-sm font-medium text-brand-700 hover:underline">Barcha ishlar →</Link>
            </div>
            {recommendations.length === 0 ? (
              <p className="text-sm text-slate-600">Kasb va hududingizni koʻrsating — mos vakansiyalarni shu yerda koʻrasiz.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recommendations.map(({ row, match }) => (
                  <li key={row.vacancy_id} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link href={`/vacancy/${row.vacancy_id}`} className="font-medium text-slate-900 hover:text-brand-700">{row.title}</Link>
                      <p className="text-sm text-slate-600">
                        {row.company_name} · {row.district_name ?? "Masofaviy"}{row.distance_km != null ? ` · ${formatDistance(row.distance_km)}` : ""}
                      </p>
                      <p className="text-sm text-slate-800">{formatSalary(row.vacancy_salary_min, row.vacancy_salary_max, row.salary_type)}</p>
                    </div>
                    <MatchBadge match={match} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {applications.length > 0 ? (
            <Card>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Soʻnggi arizalar</h2>
              <ul className="divide-y divide-slate-100">
                {applications.slice(0, 5).map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <Link href={`/vacancy/${a.vacancy_id}`} className="truncate text-slate-800 hover:text-brand-700">{a.vacancies?.title}</Link>
                    <Badge tone={STATUS_TONE[a.status]}>{APPLICATION_STATUS_LABELS[a.status]}</Badge>
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
            <EmptyState title="Ish beruvchi profilini yarating" description="Jismoniy shaxs sifatida ham vakansiya joylashingiz mumkin." action={<ButtonLink href="/dashboard/company">Boshlash</ButtonLink>} />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="Faol vakansiyalar" value={active} />
                <Stat label="Jami arizalar" value={totalApps} />
                <Stat label="Koʻrishlar" value={vacancies.reduce((s, v) => s + v.views_count, 0)} />
              </div>
              <Card>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Vakansiyalarim</h2>
                  <ButtonLink href="/dashboard/vacancies/new" size="sm">+ Yangi</ButtonLink>
                </div>
                {vacancies.length === 0 ? (
                  <p className="text-sm text-slate-600">Hali vakansiya yoʻq.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {vacancies.slice(0, 6).map((v) => (
                      <li key={v.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <Link href={`/dashboard/vacancies/${v.id}`} className="truncate text-slate-800 hover:text-brand-700">{v.title}</Link>
                        <span className="shrink-0 text-slate-500">{v.applications_count} ariza · {timeAgo(v.created_at)}</span>
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
        <EmptyState title="Rolni tanlang" action={<ButtonLink href="/onboarding">Davom etish</ButtonLink>} />
      ) : null}
    </>
  );
}
