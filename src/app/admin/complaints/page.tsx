import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { ComplaintReplyForm } from "@/features/admin/components";
import { createClient } from "@/lib/supabase/server";
import { displayName, timeAgo } from "@/lib/utils";

export default async function AdminComplaints() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("complaints")
    .select("id, user_id, subject, body, status, admin_reply, created_at")
    .in("status", ["open", "reviewing"])
    .order("created_at")
    .limit(100);
  const ids = [...new Set((data ?? []).map((c) => c.user_id))];
  const { data: people } = ids.length
    ? await supabase.from("profiles").select("id, first_name, last_name, email").in("id", ids)
    : { data: [] };
  const byId = new Map((people ?? []).map((p) => [p.id, p]));
  return (
    <>
      <PageHeader title="Murojaatlar" description="Foydalanuvchilarning qoʻllab-quvvatlash soʻrovlari" />
      {!data?.length ? (
        <EmptyState title="Ochiq murojaat yoʻq" />
      ) : (
        <div className="space-y-3">
          {data.map((c) => {
            const p = byId.get(c.user_id);
            return (
              <Card key={c.id} className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-900">{c.subject}</span>
                  <Badge tone={c.status === "open" ? "warning" : "info"}>{c.status}</Badge>
                  <span className="text-xs text-slate-500">
                    {displayName(p?.first_name, p?.last_name)} · {p?.email} · {timeAgo(c.created_at)}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-line text-slate-700">{c.body}</p>
                {c.admin_reply ? (
                  <p className="rounded bg-slate-50 p-2 text-sm text-slate-600">Oldingi javob: {c.admin_reply}</p>
                ) : null}
                <ComplaintReplyForm id={c.id} />
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
