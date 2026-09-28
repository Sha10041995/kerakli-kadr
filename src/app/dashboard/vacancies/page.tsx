import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { requireEmployer } from "@/features/auth/session";
import { listCompanyVacancies } from "@/features/vacancies/queries";
import { VacancyStatusActions } from "@/features/vacancies/components/vacancy-status-actions";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("employer.myVacancies"), robots: { index: false } };
}

const TONE = {
  active: "success",
  pending_review: "warning",
  draft: "neutral",
  rejected: "danger",
  expired: "neutral",
  closed: "neutral",
} as const;

export default async function MyVacanciesPage() {
  const user = await requireEmployer("/dashboard/vacancies");
  const { t, d, f } = await getI18n();
  if (!user.companyId) {
    return (
      <EmptyState
        title={t("employer.createEmployerFirst")}
        action={<ButtonLink href="/dashboard/company">{t("employer.createProfile")}</ButtonLink>}
      />
    );
  }
  const vacancies = await listCompanyVacancies(user.companyId);
  return (
    <>
      <PageHeader
        title={t("employer.myVacancies")}
        actions={<ButtonLink href="/dashboard/vacancies/new">{t("employer.newVacancy")}</ButtonLink>}
      />
      {vacancies.length === 0 ? (
        <EmptyState
          title={t("employer.noVacancies")}
          description={t("employer.noVacanciesText")}
          action={<ButtonLink href="/dashboard/vacancies/new">{t("employer.postVacancy")}</ButtonLink>}
        />
      ) : (
        <div className="space-y-3">
          {vacancies.map((v) => (
            <Card key={v.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/dashboard/vacancies/${v.id}`} className="hover:text-brand-700 font-semibold text-slate-900">
                    {v.title}
                  </Link>
                  <Badge tone={TONE[v.status]}>{d.enums.vacancyStatus[v.status]}</Badge>
                  {v.promoted_until && new Date(v.promoted_until) > new Date() ? <Badge tone="premium">TOP</Badge> : null}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {v.districts?.name_uz ?? t("common.remote")} · {f.date(v.created_at)} ·{" "}
                  {t("employer.stats", { n: v.applications_count, v: v.views_count })}
                  {v.expires_at && v.status === "active" ? ` · ${t("common.until", { date: f.date(v.expires_at) })}` : ""}
                </p>
                {v.status === "rejected" && v.rejection_reason ? (
                  <p className="mt-1 text-xs text-red-600">{t("employer.reason", { r: v.rejection_reason })}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link href={`/dashboard/vacancies/${v.id}`} className="text-brand-700 text-sm font-medium hover:underline">
                  {t("employer.appsAndMatches")}
                </Link>
                <Link href={`/dashboard/vacancies/${v.id}/edit`} className="text-sm text-slate-700 hover:underline">
                  {t("common.edit")}
                </Link>
                <VacancyStatusActions id={v.id} status={v.status} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
