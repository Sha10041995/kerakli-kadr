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
import { APPLICATION_STATUS_LABELS } from "@/lib/i18n/uz";
import { cn, formatSalary, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Arizalarim", robots: { index: false } };

export default async function MyApplicationsPage() {
  const user = await requireJobSeeker("/dashboard/applications");
  const applications = await listCandidateApplications(user.id);
  return (
    <>
      <PageHeader title="Arizalarim" description="Har bir ariza holati: yuborildi → koʻrildi → saralandi → suhbat → taklif → ishga olindi." />
      {applications.length === 0 ? (
        <EmptyState title="Hali ariza yubormagansiz" description="Hududingizdagi mos vakansiyalarni toping." action={<ButtonLink href="/jobs">Ish qidirish</ButtonLink>} />
      ) : (
        <div className="space-y-3">
          {applications.map((a) => {
            const step = PIPELINE.indexOf(a.status);
            return (
              <Card key={a.id} className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Link href={`/vacancy/${a.vacancy_id}`} className="font-semibold text-slate-900 hover:text-brand-700">{a.vacancies?.title}</Link>
                    <p className="text-sm text-slate-600">
                      {a.vacancies?.companies?.name} · {a.vacancies?.districts?.name_uz ?? "Masofaviy"} · {formatSalary(a.vacancies?.salary_min, a.vacancies?.salary_max, a.vacancies?.salary_type)}
                    </p>
                    <p className="text-xs text-slate-500">Yuborildi: {timeAgo(a.created_at)} · Yangilandi: {timeAgo(a.updated_at)}</p>
                  </div>
                  <Badge tone={STATUS_TONE[a.status]}>{APPLICATION_STATUS_LABELS[a.status]}</Badge>
                </div>
                {step >= 0 ? (
                  <ol className="flex gap-1" aria-label="Ariza bosqichlari">
                    {PIPELINE.map((s, i) => (
                      <li key={s} title={APPLICATION_STATUS_LABELS[s]} className={cn("h-1.5 flex-1 rounded", i <= step ? "bg-brand-500" : "bg-slate-200")} />
                    ))}
                  </ol>
                ) : null}
                <div className="flex flex-wrap items-center gap-3">
                  {candidateCanWithdraw(a.status) ? (
                    <ConfirmButton confirmText="Arizani qaytarib olasizmi?" onConfirm={withdrawApplicationAction.bind(null, a.id)}>Arizani qaytarib olish</ConfirmButton>
                  ) : null}
                </div>
                {a.status === "hired" && !(a.reviews ?? []).some((r) => r.reviewer_id === user.id) ? (
                  <ReviewForm applicationId={a.id} label="Ish beruvchi haqida sharh qoldiring" />
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
