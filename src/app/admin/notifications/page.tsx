import { Card, PageHeader } from "@/components/ui/misc";
import { BroadcastForm } from "@/features/admin/components";
import { requireAdmin } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export default async function AdminNotifications() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: history } = await supabase
    .from("audit_logs")
    .select("id, data, created_at")
    .eq("action", "broadcast")
    .order("created_at", { ascending: false })
    .limit(20);
  return (
    <>
      <PageHeader
        title="Tizim bildirishnomalari"
        description="Barcha foydalanuvchilarga yoki bitta auditoriyaga eʼlon yuborish"
      />
      <Card className="mb-6">
        <BroadcastForm />
      </Card>
      <h2 className="mb-2 font-semibold text-slate-900">Tarix</h2>
      <ul className="space-y-2 text-sm">
        {(history ?? []).map((h) => {
          const d = h.data as { title?: string; audience?: string; recipients?: number };
          return (
            <li key={h.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <span className="font-medium">{d.title}</span> · {d.audience} · {d.recipients} ta · {formatDate(h.created_at)}
            </li>
          );
        })}
      </ul>
    </>
  );
}
