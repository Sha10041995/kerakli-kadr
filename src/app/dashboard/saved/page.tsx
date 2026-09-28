import type { Metadata } from "next";
import Link from "next/link";
import { Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { ConfirmButton } from "@/components/ui/action-form";
import { requireUser } from "@/features/auth/session";
import { deleteSavedSearchAction } from "@/features/search/actions";
import { toQueryString } from "@/features/search/params";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("saved.title"), robots: { index: false } };
}

export default async function SavedPage() {
  const user = await requireUser("/dashboard/saved");
  const supabase = await createClient();
  const { t, f } = await getI18n();
  const [{ data: searches }, { data: favorites }] = await Promise.all([
    supabase.from("saved_searches").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase
      .from("favorites")
      .select(
        "id, created_at, vacancy_id, candidate_id, vacancies(id, title, status), candidate_profiles(id, headline, professions(name_uz))",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);
  const candidateIds = (favorites ?? []).map((f) => f.candidate_id).filter((x): x is string => Boolean(x));
  const { data: people } = candidateIds.length
    ? await supabase.from("public_profiles").select("id, first_name, last_name").in("id", candidateIds)
    : { data: [] };
  const names = new Map((people ?? []).map((p) => [p.id, f.name(p.first_name, p.last_name, true)]));

  return (
    <>
      <PageHeader title={t("saved.title")} description={t("saved.intro")} />
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">{t("saved.searches")}</h2>
        {!searches?.length ? (
          <EmptyState title={t("saved.noSearches")} description={t("saved.noSearchesText")} />
        ) : (
          <div className="space-y-2">
            {searches.map((s) => {
              const href = `/${s.kind === "vacancies" ? "jobs" : "candidates"}${toQueryString({ q: s.query ?? undefined, profession: s.profession_id ?? undefined, category: s.category_id ?? undefined, region: s.region_id ?? undefined, district: s.district_id ?? undefined, settlement: s.settlement_id ?? undefined, radius: s.radius_km ?? undefined })}`;
              return (
                <Card key={s.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <Link href={href} className="hover:text-brand-700 font-medium text-slate-900">
                      {s.name}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {s.kind === "vacancies" ? t("saved.vacancies") : t("saved.candidates")} ·{" "}
                      {s.last_notified_at ? t("saved.lastNotified", { ago: f.timeAgo(s.last_notified_at) }) : t("saved.notYet")}
                    </p>
                  </div>
                  <ConfirmButton onConfirm={deleteSavedSearchAction.bind(null, s.id)}>{t("common.delete")}</ConfirmButton>
                </Card>
              );
            })}
          </div>
        )}
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">{t("saved.favorites")}</h2>
        {!favorites?.length ? (
          <EmptyState title={t("saved.noFavorites")} />
        ) : (
          <div className="space-y-2">
            {favorites.map((f) => (
              <Card key={f.id} className="py-3">
                {f.vacancies ? (
                  <Link href={`/vacancy/${f.vacancies.id}`} className="hover:text-brand-700 font-medium text-slate-900">
                    {t("saved.vacancy", { title: f.vacancies.title })}
                  </Link>
                ) : f.candidate_profiles ? (
                  <Link
                    href={`/candidate/${f.candidate_profiles.id}`}
                    className="hover:text-brand-700 font-medium text-slate-900"
                  >
                    {t("saved.candidate", { name: names.get(f.candidate_profiles.id) ?? "—" })} ·{" "}
                    {f.candidate_profiles.professions?.name_uz}
                  </Link>
                ) : (
                  <span className="text-sm text-slate-500">{t("saved.unavailable")}</span>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
