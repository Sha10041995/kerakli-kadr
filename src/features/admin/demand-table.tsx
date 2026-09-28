import { demandColor } from "@/features/admin/demand-color";

export function DemandTable({
  rows,
}: {
  rows: {
    district_name: string | null;
    profession_name: string | null;
    vacancy_count: number | null;
    candidate_count: number | null;
    demand_ratio: number | null;
  }[];
}) {
  if (!rows.length) return <p className="text-sm text-slate-500">Maʼlumot yetarli emas.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-slate-500">
          <tr>
            <th className="py-2">Tuman</th>
            <th>Kasb</th>
            <th>Vakansiya</th>
            <th>Nomzod</th>
            <th>Talab/taklif</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-slate-100">
              <td className="py-2">{r.district_name}</td>
              <td>{r.profession_name}</td>
              <td>{r.vacancy_count}</td>
              <td>{r.candidate_count}</td>
              <td className="font-semibold" style={{ color: demandColor(Number(r.demand_ratio)) }}>
                {Number(r.demand_ratio).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
