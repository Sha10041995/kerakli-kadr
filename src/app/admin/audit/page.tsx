import { PageHeader } from "@/components/ui/misc";
import { requireAdmin } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export default async function AdminAudit() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("id, actor_id, action, entity_type, entity_id, data, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  return (
    <>
      <PageHeader title="Audit log" description="Rollar, moderatsiya, toʻlovlar, tasdiqlash va bloklash amallari" />
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-3 py-2">Vaqt</th>
              <th>Amal</th>
              <th>Obyekt</th>
              <th>Kim</th>
              <th>Maʼlumot</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((l) => (
              <tr key={l.id} className="border-t border-slate-100 align-top">
                <td className="px-3 py-2 whitespace-nowrap">
                  {formatDate(l.created_at)} {new Date(l.created_at).toLocaleTimeString("uz-UZ")}
                </td>
                <td>{l.action}</td>
                <td>
                  {l.entity_type} <code className="text-slate-400">{l.entity_id?.slice(0, 8)}</code>
                </td>
                <td>
                  <code className="text-slate-400">{l.actor_id?.slice(0, 8) ?? "system"}</code>
                </td>
                <td>
                  <code className="break-all text-slate-600">{JSON.stringify(l.data)}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
