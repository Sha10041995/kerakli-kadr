import type { Metadata } from "next";
import Link from "next/link";
import { Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { ConfirmButton } from "@/components/ui/action-form";
import { requireUser } from "@/features/auth/session";
import { deleteSavedSearchAction } from "@/features/search/actions";
import { toQueryString } from "@/features/search/params";
import { createClient } from "@/lib/supabase/server";
import { displayName, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Saqlanganlar", robots: { index: false } };

export default async function SavedPage() {
  const user = await requireUser("/dashboard/saved");
  const supabase = await createClient();
  const [{ data: searches }, { data: favorites }] = await Promise.all([
    supabase.from("saved_searches").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase
      .from("favorites")
      .select("id, created_at, vacancy_id, candidate_id, vacancies(id, title, status), candidate_profiles(id, headline, professions(name_uz))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);
  const candidateIds = (favorites ?? []).map((f) => f.candidate_id).filter((x): x is string => Boolean(x));
  const { data: people } = candidateIds.length
    ? await supabase.from("public_profiles").select("id, first_name, last_name").in("id", candidateIds)
    : { data: [] };
  const names = new Map((people ?? []).map((p) => [p.id, displayName(p.first_name, p.last_name, true)]));

  return (
    <>
      <PageHeader title="Saqlanganlar" description="Saqlangan qidiruvlar boʻyicha yangi mos eʼlon chiqsa, bildirishnoma olasiz." />
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Saqlangan qidiruvlar</h2>
        {!searches?.length ? (
          <EmptyState title="Saqlangan qidiruv yoʻq" description="Qidiruv sahifasida “Qidiruvni saqlash” tugmasini bosing." />
        ) : (
          <div className="space-y-2">
            {searches.map((s) => {
              const href = `/${s.kind === "vacancies" ? "jobs" : "candidates"}${toQueryString({ q: s.query ?? undefined, profession: s.profession_id ?? undefined, category: s.category_id ?? undefined, region: s.region_id ?? undefined, district: s.district_id ?? undefined, settlement: s.settlement_id ?? undefined, radius: s.radius_km ?? undefined })}`;
              return (
                <Card key={s.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <Link href={href} className="font-medium text-slate-900 hover:text-brand-700">{s.name}</Link>
                    <p className="text-xs text-slate-500">{s.kind === "vacancies" ? "Vakansiyalar" : "Nomzodlar"} · {s.last_notified_at ? `oxirgi xabar ${timeAgo(s.last_notified_at)}` : "hali mos eʼlon chiqmadi"}</p>
                  </div>
                  <ConfirmButton onConfirm={() => deleteSavedSearchAction(s.id)}>Oʻchirish</ConfirmButton>
                </Card>
              );
            })}
          </div>
        )}
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Sevimlilar</h2>
        {!favorites?.length ? (
          <EmptyState title="Sevimlilar roʻyxati boʻsh" />
        ) : (
          <div className="space-y-2">
            {favorites.map((f) => (
              <Card key={f.id} className="py-3">
                {f.vacancies ? (
                  <Link href={`/vacancy/${f.vacancies.id}`} className="font-medium text-slate-900 hover:text-brand-700">Vakansiya: {f.vacancies.title}</Link>
                ) : f.candidate_profiles ? (
                  <Link href={`/candidate/${f.candidate_profiles.id}`} className="font-medium text-slate-900 hover:text-brand-700">
                    Nomzod: {names.get(f.candidate_profiles.id) ?? "—"} · {f.candidate_profiles.professions?.name_uz}
                  </Link>
                ) : <span className="text-sm text-slate-500">Eʼlon mavjud emas</span>}
              </Card>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
