import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { ReportControls } from "@/features/admin/components";
import { REPORT_REASON_LABELS } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/utils";

const TARGET_LINK: Record<string, (id: string) => string> = {
  vacancy: (id) => `/vacancy/${id}`,
  user: (id) => `/candidate/${id}`,
};

export default async function AdminReports() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("id, target_type, target_id, reason, details, status, created_at")
    .in("status", ["open", "reviewing"])
    .order("created_at", { ascending: true })
    .limit(100);
  return (
    <>
      <PageHeader title="Shikoyatlar" description="Firibgarlik, spam, soxta vakansiya va nomaqbul kontent haqidagi xabarlar" />
      {!data?.length ? (
        <EmptyState title="Ochiq shikoyat yoʻq" />
      ) : (
        <div className="space-y-3">
          {data.map((r) => (
            <Card key={r.id} className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="danger">{REPORT_REASON_LABELS[r.reason]}</Badge>
                <span className="text-sm text-slate-600">{r.target_type}</span>
                {TARGET_LINK[r.target_type] ? (
                  <Link href={TARGET_LINK[r.target_type](r.target_id)} className="text-brand-700 text-sm hover:underline">
                    Koʻrish →
                  </Link>
                ) : (
                  <code className="text-xs text-slate-500">{r.target_id}</code>
                )}
                <span className="text-xs text-slate-400">{timeAgo(r.created_at)}</span>
              </div>
              {r.details ? <p className="text-sm text-slate-700">{r.details}</p> : null}
              <ReportControls id={r.id} isVacancy={r.target_type === "vacancy"} />
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
