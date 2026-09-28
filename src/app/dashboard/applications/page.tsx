import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/action-form";
import { requireJobSeeker } from "@/features/auth/session";
import { withdrawApplicationAction } from "@/features/applications/actions";
import { listCandidateApplications } from "@/features/applications/queries";
import { PIPELINE, STATUS_TONE, candidateCanWithdraw } from "@/features/applications/status";
import { ReviewForm } from "@/features/reviews/components/review-form";
import { getI18n } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("applications.myTitle"), robots: { index: false } };
}

export default async function MyApplicationsPage() {
  const user = await requireJobSeeker("/dashboard/applications");
  const [applications, { t, d, f }] = await Promise.all([listCandidateApplications(user.id), getI18n()]);
  return (
    <>
      <PageHeader title={t("applications.myTitle")} description={t("applications.myIntro")} />
      {applications.length === 0 ? (
        <EmptyState
          title={t("applications.none")}
          description={t("applications.noneText")}
          action={<ButtonLink href="/jobs">{t("applications.findJobs")}</ButtonLink>}
        />
      ) : (
        <div className="space-y-3">
          {applications.map((a) => {
            const step = PIPELINE.indexOf(a.status);
            return (
              <Card key={a.id} className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Link href={`/vacancy/${a.vacancy_id}`} className="hover:text-brand-700 font-semibold text-slate-900">
                      {a.vacancies?.title}
                    </Link>
                    <p className="text-sm text-slate-600">
                      {a.vacancies?.companies?.name} · {a.vacancies?.districts?.name_uz ?? t("common.remote")} ·{" "}
                      {f.salary(a.vacancies?.salary_min, a.vacancies?.salary_max, a.vacancies?.salary_type)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {t("applications.sentUpdated", { sent: f.timeAgo(a.created_at), updated: f.timeAgo(a.updated_at) })}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[a.status]}>{d.enums.applicationStatus[a.status]}</Badge>
                </div>
                {step >= 0 ? (
                  <ol className="flex gap-1" aria-label={t("applications.stages")}>
                    {PIPELINE.map((s, i) => (
                      <li
                        key={s}
                        title={d.enums.applicationStatus[s]}
                        className={cn("h-1.5 flex-1 rounded", i <= step ? "bg-brand-500" : "bg-slate-200")}
                      />
                    ))}
                  </ol>
                ) : null}
                <div className="flex flex-wrap items-center gap-3">
                  {candidateCanWithdraw(a.status) ? (
                    <ConfirmButton
                      confirmText={t("applications.withdrawConfirm")}
                      onConfirm={withdrawApplicationAction.bind(null, a.id)}
                    >
                      {t("applications.withdraw")}
                    </ConfirmButton>
                  ) : null}
                </div>
                {a.status === "hired" && !(a.reviews ?? []).some((r) => r.reviewer_id === user.id) ? (
                  <ReviewForm applicationId={a.id} label={t("applications.reviewEmployer")} />
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
