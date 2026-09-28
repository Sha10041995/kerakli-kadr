import { Card, PageHeader } from "@/components/ui/misc";
import { Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { GetForm } from "@/components/ui/get-form";
import { DemandTable } from "@/features/admin/demand-table";
import { MapView } from "@/components/map/map-view";
import { demandColor } from "@/features/admin/demand-color";
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
  // aggregate demand per district and place it on district centres
  const byDistrict = new Map<number, { vacancies: number; candidates: number; name: string }>();
  for (const r of demand ?? []) {
    if (r.district_id == null) continue;
    const e = byDistrict.get(r.district_id) ?? { vacancies: 0, candidates: 0, name: r.district_name ?? "" };
    e.vacancies += Number(r.vacancy_count ?? 0);
    e.candidates += Number(r.candidate_count ?? 0);
    byDistrict.set(r.district_id, e);
  }
  const { data: centres } = byDistrict.size
    ? await supabase
        .from("districts")
        .select("id, lat, lng")
        .in("id", [...byDistrict.keys()])
    : { data: [] };
  const demandItems = (centres ?? [])
    .filter((d) => d.lat != null && d.lng != null)
    .map((d) => {
      const e = byDistrict.get(d.id)!;
      const ratio = e.vacancies / Math.max(e.candidates, 1);
      return {
        id: String(d.id),
        lat: d.lat!,
        lng: d.lng!,
        label: e.name,
        sublabel: `${e.vacancies} vakansiya · ${e.candidates} nomzod · nisbat ${ratio.toFixed(2)}`,
        radiusM: 6 + Math.sqrt(e.vacancies) * 4,
        color: demandColor(ratio),
      };
    });
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
      <Card className="mb-6 space-y-4">
        <h2 className="font-semibold">Talab xaritasi</h2>
        <MapView label="Tumanlar boʻyicha talab xaritasi" height={380} items={demandItems} />
        <p className="text-xs text-slate-500">
          Doira hajmi — ochiq vakansiyalar soni; rang — talab/taklif:{" "}
          <span style={{ color: demandColor(2) }}>● yuqori talab</span> ·{" "}
          <span style={{ color: demandColor(1) }}>● muvozanat</span> ·{" "}
          <span style={{ color: demandColor(0.3) }}>● kadr yetarli</span>
        </p>
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
