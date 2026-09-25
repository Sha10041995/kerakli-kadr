import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { requireEmployer } from "@/features/auth/session";
import { listCompanyVacancies } from "@/features/vacancies/queries";
import { VacancyStatusActions } from "@/features/vacancies/components/vacancy-status-actions";
import { VACANCY_STATUS_LABELS } from "@/lib/i18n/uz";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Vakansiyalarim", robots: { index: false } };

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
  if (!user.companyId) {
    return (
      <EmptyState
        title="Avval ish beruvchi profilini yarating"
        action={<ButtonLink href="/dashboard/company">Profil yaratish</ButtonLink>}
      />
    );
  }
  const vacancies = await listCompanyVacancies(user.companyId);
  return (
    <>
      <PageHeader title="Vakansiyalarim" actions={<ButtonLink href="/dashboard/vacancies/new">+ Yangi vakansiya</ButtonLink>} />
      {vacancies.length === 0 ? (
        <EmptyState
          title="Hali vakansiya yoʻq"
          description="Birinchi vakansiyangizni joylang — hududingizdagi mos nomzodlarni darhol koʻrsatamiz."
          action={<ButtonLink href="/dashboard/vacancies/new">Vakansiya joylash</ButtonLink>}
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
                  <Badge tone={TONE[v.status]}>{VACANCY_STATUS_LABELS[v.status]}</Badge>
                  {v.promoted_until && new Date(v.promoted_until) > new Date() ? <Badge tone="premium">TOP</Badge> : null}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {v.districts?.name_uz ?? "Masofaviy"} · {formatDate(v.created_at)} · {v.applications_count} ariza ·{" "}
                  {v.views_count} koʻrish
                  {v.expires_at && v.status === "active" ? ` · ${formatDate(v.expires_at)} gacha` : ""}
                </p>
                {v.status === "rejected" && v.rejection_reason ? (
                  <p className="mt-1 text-xs text-red-600">Sabab: {v.rejection_reason}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link href={`/dashboard/vacancies/${v.id}`} className="text-brand-700 text-sm font-medium hover:underline">
                  Arizalar va mos nomzodlar
                </Link>
                <Link href={`/dashboard/vacancies/${v.id}/edit`} className="text-sm text-slate-700 hover:underline">
                  Tahrirlash
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
