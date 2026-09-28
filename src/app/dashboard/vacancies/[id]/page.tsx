import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Avatar, Badge, Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { requireEmployer } from "@/features/auth/session";
import { listVacancyApplications } from "@/features/applications/queries";
import { ContactButtons, StatusSelect } from "@/features/applications/components/employer-controls";
import { STATUS_TONE } from "@/features/applications/status";
import { MatchBadge } from "@/features/matching/match-badge";
import { matchCandidatesForVacancy } from "@/features/matching/queries";
import { ReviewForm } from "@/features/reviews/components/review-form";
import { getVacancy } from "@/features/vacancies/queries";
import { VacancyStatusActions } from "@/features/vacancies/components/vacancy-status-actions";
import { StartChatButton } from "@/features/messaging/components/start-chat-button";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("employer.manageTitle"), robots: { index: false } };
}

export default async function ManageVacancyPage(props: PageProps<"/dashboard/vacancies/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const user = await requireEmployer(`/dashboard/vacancies/${id}`);
  const vacancy = await getVacancy(id);
  if (!vacancy || vacancy.company_id !== user.companyId) notFound();

  const supabase = await createClient();
  const { t, d, f } = await getI18n();
  const [applications, matches, { data: limits }] = await Promise.all([
    listVacancyApplications(id),
    matchCandidatesForVacancy(id, 50),
    supabase.rpc("company_plan_limits", { p_company_id: vacancy.company_id }),
  ]);
  const matchLimit = Number((limits as Record<string, unknown> | null)?.match_view_limit ?? 5);
  const appliedIds = new Set(applications.map((a) => a.candidate_id));
  const visibleMatches = matches.filter((m) => !appliedIds.has(m.row.candidate_id ?? "")).slice(0, matchLimit);

  return (
    <>
      <PageHeader
        title={vacancy.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={vacancy.status === "active" ? "success" : "neutral"}>{d.enums.vacancyStatus[vacancy.status]}</Badge>
            {vacancy.districts?.name_uz ?? vacancy.regions?.name_uz ?? t("common.remote")} ·{" "}
            {t("employer.stats", { n: vacancy.applications_count, v: vacancy.views_count })}
          </span>
        }
        actions={
          <>
            <ButtonLink href={`/vacancy/${id}`} variant="outline" size="sm">
              {t("common.view")}
            </ButtonLink>
            <ButtonLink href={`/dashboard/vacancies/${id}/edit`} variant="outline" size="sm">
              {t("common.edit")}
            </ButtonLink>
            <ButtonLink href={`/dashboard/billing?vacancy=${id}`} variant="accent" size="sm">
              {t("employer.promote")}
            </ButtonLink>
          </>
        }
      />
      {sp.saved === "active" ? (
        <Alert tone="success" className="mb-4">
          {t("employer.published")}
        </Alert>
      ) : null}
      {sp.saved === "pending_review" ? (
        <Alert tone="info" className="mb-4">
          {t("employer.sentToReview")}
        </Alert>
      ) : null}
      {vacancy.status === "rejected" && vacancy.rejection_reason ? (
        <Alert tone="danger" className="mb-4">
          {t("employer.rejected", { r: vacancy.rejection_reason })}
        </Alert>
      ) : null}
      <div className="mb-6">
        <VacancyStatusActions id={id} status={vacancy.status} />
      </div>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          {t("employer.applicationsCount", { n: applications.length })}
        </h2>
        {applications.length === 0 ? (
          <EmptyState title={t("employer.noApplications")} description={t("employer.noApplicationsText")} />
        ) : (
          <div className="space-y-3">
            {applications.map((a) => (
              <Card key={a.id} className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-3">
                    <Avatar src={a.person?.avatar_url} first={a.person?.first_name} last={a.person?.last_name} size={44} />
                    <div>
                      <Link href={`/candidate/${a.candidate_id}`} className="hover:text-brand-700 font-semibold text-slate-900">
                        {f.name(a.person?.first_name, a.person?.last_name)}
                      </Link>
                      <p className="text-sm text-slate-600">
                        {a.candidate_profiles?.professions?.name_uz ?? "—"} · {a.candidate_profiles?.districts?.name_uz ?? "—"} ·{" "}
                        {t("employer.yearsExperience", { n: Number(a.candidate_profiles?.experience_years ?? 0) })}
                      </p>
                      <p className="text-xs text-slate-500">
                        {f.timeAgo(a.created_at)} ·{" "}
                        <Badge tone={STATUS_TONE[a.status]}>{d.enums.applicationStatus[a.status]}</Badge>
                      </p>
                    </div>
                  </div>
                  <StatusSelect applicationId={a.id} status={a.status} />
                </div>
                {a.cover_letter ? <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{a.cover_letter}</p> : null}
                {a.status !== "withdrawn" ? <ContactButtons applicationId={a.id} candidateId={a.candidate_id} /> : null}
                {a.status === "hired" && !(a.reviews ?? []).some((r) => r.reviewer_id === user.id) ? (
                  <ReviewForm applicationId={a.id} label={t("applications.reviewEmployee")} />
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900">{t("employer.matches")}</h2>
        <p className="mb-3 text-sm text-slate-600">{t("employer.matchesNote")}</p>
        {visibleMatches.length === 0 ? (
          <EmptyState title={t("employer.noMatches")} description={t("employer.noMatchesText")} />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {visibleMatches.map(({ row, match }) => (
              <Card key={row.candidate_id} className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <Avatar src={row.avatar_url} first={row.first_name} last={row.last_initial} size={40} />
                    <div>
                      <Link href={`/candidate/${row.candidate_id}`} className="hover:text-brand-700 font-semibold text-slate-900">
                        {f.name(row.first_name, row.last_initial, true)}
                      </Link>
                      <p className="text-sm text-slate-600">
                        {row.profession_name} · {row.district_name ?? "—"}
                        {row.distance_km != null ? ` · ~${f.distance(row.distance_km)}` : ""}
                      </p>
                      <p className="text-xs text-slate-500">{row.availability ? d.enums.availability[row.availability] : ""}</p>
                    </div>
                  </div>
                  <MatchBadge match={match} />
                </div>
                {row.candidate_id ? <StartChatButton otherUserId={row.candidate_id} vacancyId={id} /> : null}
              </Card>
            ))}
          </div>
        )}
        {matches.length > matchLimit ? (
          <Alert tone="info" className="mt-4">
            {t("employer.matchLimit", { n: matchLimit })}{" "}
            <Link href="/pricing" className="font-medium underline">
              {t("employer.upgrade")}
            </Link>
            .
          </Alert>
        ) : null}
      </section>
    </>
  );
}
