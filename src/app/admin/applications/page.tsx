import Link from "next/link";
import { Badge, PageHeader, Stat } from "@/components/ui/misc";
import { STATUS_TONE } from "@/features/applications/status";
import { APPLICATION_STATUS_LABELS } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/utils";

export default async function AdminApplications() {
  const supabase = await createClient();
  const [{ data }, { count: total }, { count: hired }] = await Promise.all([
    supabase
      .from("applications")
      .select("id, status, created_at, candidate_id, vacancy_id, vacancies(title, companies(name))")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("applications").select("id", { count: "exact", head: true }),
    supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", "hired"),
  ]);
  return (
    <>
      <PageHeader title="Arizalar" />
      <div className="mb-4 grid grid-cols-3 gap-3">
        <Stat label="Jami" value={total ?? 0} />
        <Stat label="Ishga olingan" value={hired ?? 0} />
        <Stat label="Konversiya" value={`${total ? Math.round(((hired ?? 0) / total) * 100) : 0}%`} />
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-3 py-2">Vakansiya</th>
              <th>Kompaniya</th>
              <th>Nomzod</th>
              <th>Holat</th>
              <th>Vaqt</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((a) => (
              <tr key={a.id} className="border-t border-slate-100">
                <td className="px-3 py-2">
                  <Link href={`/vacancy/${a.vacancy_id}`} className="hover:text-brand-700">
                    {a.vacancies?.title}
                  </Link>
                </td>
                <td>{a.vacancies?.companies?.name}</td>
                <td>
                  <Link href={`/candidate/${a.candidate_id}`} className="text-brand-700 hover:underline">
                    profil
                  </Link>
                </td>
                <td>
                  <Badge tone={STATUS_TONE[a.status]}>{APPLICATION_STATUS_LABELS[a.status]}</Badge>
                </td>
                <td className="text-slate-500">{timeAgo(a.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
