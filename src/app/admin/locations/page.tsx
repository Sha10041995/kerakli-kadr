import Link from "next/link";
import { Card, PageHeader } from "@/components/ui/misc";
import { ActiveToggle, AddLocationForm } from "@/features/admin/components";
import { requireAdmin } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";
import { toPositiveInt } from "@/lib/utils";

export default async function AdminLocations(props: PageProps<"/admin/locations">) {
  await requireAdmin();
  const sp = await props.searchParams;
  const regionId = toPositiveInt(sp.region);
  const districtId = toPositiveInt(sp.district);
  const supabase = await createClient();
  const [{ data: regions }, { data: districts }, { data: settlements }, { data: mahallas }] = await Promise.all([
    supabase.from("regions").select("id, name_uz, is_active").order("sort_order"),
    regionId ? supabase.from("districts").select("id, name_uz, kind, is_active, lat").eq("region_id", regionId).order("name_uz") : Promise.resolve({ data: [] }),
    districtId ? supabase.from("settlements").select("id, name_uz, kind, is_active").eq("district_id", districtId).order("name_uz") : Promise.resolve({ data: [] }),
    districtId ? supabase.from("mahallas").select("id, name_uz, is_active, settlement_id").eq("district_id", districtId).order("name_uz") : Promise.resolve({ data: [] }),
  ]);
  return (
    <>
      <PageHeader title="Hududlar" description="Viloyat → tuman/shahar → shahar/qishloq → mahalla. Rasmiy datasetni scripts/import-locations.mjs orqali import qiling." />
      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <h2 className="mb-2 font-semibold">Viloyatlar</h2>
          <ul className="space-y-1 text-sm">
            {(regions ?? []).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2">
                <Link href={`/admin/locations?region=${r.id}`} className={r.id === regionId ? "font-semibold text-brand-700" : "hover:underline"}>{r.name_uz}</Link>
                <ActiveToggle kind="location" table="regions" id={r.id} active={r.is_active} />
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="mb-2 font-semibold">Tumanlar / shaharlar</h2>
          {regionId ? (
            <>
              <ul className="mb-3 max-h-96 space-y-1 overflow-y-auto text-sm">
                {(districts ?? []).map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2">
                    <Link href={`/admin/locations?region=${regionId}&district=${d.id}`} className={d.id === districtId ? "font-semibold text-brand-700" : "hover:underline"}>
                      {d.name_uz} {d.lat == null ? <span className="text-xs text-amber-600">(koordinatasiz)</span> : null}
                    </Link>
                    <ActiveToggle kind="location" table="districts" id={d.id} active={d.is_active} />
                  </li>
                ))}
              </ul>
              <AddLocationForm level="district" parentId={regionId} />
            </>
          ) : <p className="text-sm text-slate-500">Viloyatni tanlang</p>}
        </Card>
        <Card>
          <h2 className="mb-2 font-semibold">Aholi punktlari va mahallalar</h2>
          {districtId ? (
            <>
              <p className="text-xs font-semibold text-slate-500 uppercase">Shahar / qishloq</p>
              <ul className="mb-3 space-y-1 text-sm">
                {(settlements ?? []).map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2"><span>{s.name_uz} <span className="text-xs text-slate-400">{s.kind}</span></span><ActiveToggle kind="location" table="settlements" id={s.id} active={s.is_active} /></li>
                ))}
              </ul>
              <AddLocationForm level="settlement" parentId={districtId} />
              <p className="mt-4 text-xs font-semibold text-slate-500 uppercase">Mahallalar</p>
              <ul className="mb-3 space-y-1 text-sm">
                {(mahallas ?? []).map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2"><span>{m.name_uz}</span><ActiveToggle kind="location" table="mahallas" id={m.id} active={m.is_active} /></li>
                ))}
              </ul>
              <AddLocationForm level="mahalla" parentId={districtId} settlements={(settlements ?? []).map((s) => ({ id: s.id, name: s.name_uz }))} />
            </>
          ) : <p className="text-sm text-slate-500">Tumanni tanlang</p>}
        </Card>
      </div>
    </>
  );
}
