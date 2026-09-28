import { Badge, PageHeader } from "@/components/ui/misc";
import { requireAdmin } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export default async function AdminSubscriptions() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("id, status, current_period_start, current_period_end, subscription_plans(name_uz, price_uzs), companies(name, slug)")
    .order("current_period_end", { ascending: false })
    .limit(200);
  return (
    <>
      <PageHeader title="Obunalar" />
      {!data?.length ? (
        <p className="text-sm text-slate-600">Hali obuna yoʻq.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-3 py-2">Kompaniya</th>
                <th>Tarif</th>
                <th>Davr</th>
                <th>Holat</th>
              </tr>
            </thead>
            <tbody>
              {data.map((s) => {
                const active = s.status === "active" && new Date(s.current_period_end) > new Date();
                return (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{s.companies?.name ?? "—"}</td>
                    <td>{s.subscription_plans?.name_uz}</td>
                    <td>
                      {formatDate(s.current_period_start)} – {formatDate(s.current_period_end)}
                    </td>
                    <td>
                      <Badge tone={active ? "success" : "neutral"}>{active ? "faol" : s.status}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
