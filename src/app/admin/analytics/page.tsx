import { Card, PageHeader } from "@/components/ui/misc";
import { Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { GetForm } from "@/components/ui/get-form";
import { DemandTable } from "@/features/admin/demand-table";
import { getRegions } from "@/features/locations/queries";
import { createClient } from "@/lib/supabase/server";
import { daysAgoIso, toPositiveInt } from "@/lib/utils";

export default async function AdminAnalytics(props: PageProps<"/admin/analytics">) {
  const sp = await props.searchParams;
  const regionId = toPositiveInt(sp.region) ?? null;
  const supabase = await createClient();
  const since = daysAgoIso(30);
  const [regions, { data: demand }, { data: searches }] = await Promise.all([
    getRegions(),
    supabase.rpc("demand_supply", { p_region_id: regionId, p_limit: 50 }),
    supabase
      .from("search_logs")
      .select("kind, query, profession_id, district_id, results_count, professions(name_uz), districts(name_uz)")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);
  const agg = new Map<string, { label: string; count: number; zero: number }>();
  for (const s of searches ?? []) {
    const label = [s.professions?.name_uz ?? s.query ?? "—", s.districts?.name_uz].filter(Boolean).join(" · ");
    const key = `${s.kind}:${label}`;
    const e = agg.get(key) ?? { label: `${s.kind === "vacancies" ? "Ish" : "Kadr"}: ${label}`, count: 0, zero: 0 };
    e.count++;
    if (!s.results_count) e.zero++;
    agg.set(key, e);
  }
  const top = [...agg.values()].sort((a, b) => b.count - a.count).slice(0, 20);
  return (
    <>
      <PageHeader
        title="Analitika"
        description="Qaysi tumanda qaysi kasbga talab yuqori? (talab/taklif = vakansiyalar / mavjud nomzodlar)"
      />
      <GetForm action="/admin/analytics" className="mb-4 flex gap-2">
        <Select name="region" defaultValue={regionId ?? ""} aria-label="Viloyat" className="max-w-xs">
          <option value="">Butun Oʻzbekiston</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="outline">
          Koʻrsatish
        </Button>
      </GetForm>
      <Card className="mb-6">
        <h2 className="mb-3 font-semibold">Talab xaritasi</h2>
        <DemandTable rows={demand ?? []} />
      </Card>
      <Card>
        <h2 className="mb-3 font-semibold">Mashhur qidiruvlar (30 kun)</h2>
        {top.length === 0 ? (
          <p className="text-sm text-slate-500">Maʼlumot yoʻq</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-2">Qidiruv</th>
                <th>Soni</th>
                <th>Natijasiz</th>
              </tr>
            </thead>
            <tbody>
              {top.map((t) => (
                <tr key={t.label} className="border-t border-slate-100">
                  <td className="py-2">{t.label}</td>
                  <td>{t.count}</td>
                  <td className={t.zero ? "text-red-600" : ""}>{t.zero}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
