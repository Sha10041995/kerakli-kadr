import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { VerificationControls } from "@/features/admin/components";
import { VERIFICATION_TYPE_LABELS } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";
import { displayName, timeAgo } from "@/lib/utils";

export default async function AdminVerification() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("verification_requests")
    .select("id, user_id, type, note, document_path, created_at, companies(name, stir)")
    .eq("status", "pending")
    .order("created_at")
    .limit(100);
  const ids = [...new Set((data ?? []).map((r) => r.user_id))];
  const { data: people } = ids.length ? await supabase.from("profiles").select("id, first_name, last_name, phone, email").in("id", ids) : { data: [] };
  const byId = new Map((people ?? []).map((p) => [p.id, p]));
  return (
    <>
      <PageHeader title="Tasdiqlash soʻrovlari" />
      {!data?.length ? <EmptyState title="Kutilayotgan soʻrov yoʻq" /> : (
        <div className="space-y-3">
          {data.map((r) => {
            const p = byId.get(r.user_id);
            return (
              <Card key={r.id} className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="info">{VERIFICATION_TYPE_LABELS[r.type]}</Badge>
                  <span className="font-medium text-slate-900">{displayName(p?.first_name, p?.last_name)}</span>
                  <span className="text-xs text-slate-500">{p?.email} · {p?.phone ?? "tel yoʻq"} · {timeAgo(r.created_at)}</span>
                </div>
                {r.companies ? <p className="text-sm text-slate-700">Kompaniya: {r.companies.name} · STIR {r.companies.stir ?? "—"}</p> : null}
                {r.note ? <p className="text-sm text-slate-600">{r.note}</p> : null}
                <VerificationControls id={r.id} documentPath={r.document_path} />
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
