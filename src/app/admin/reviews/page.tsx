import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { ReviewToggle } from "@/features/admin/components";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/utils";

export default async function AdminReviews() {
  const supabase = await createClient();
  const { data } = await supabase.from("reviews").select("id, rating, comment, direction, status, created_at").order("created_at", { ascending: false }).limit(100);
  return (
    <>
      <PageHeader title="Sharhlar" description="Sharhlar faqat haqiqiy ishga qabul qilingan arizalardan keyin yoziladi." />
      {!data?.length ? <EmptyState title="Sharhlar yoʻq" /> : (
        <div className="space-y-2">
          {data.map((r) => (
            <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm"><span className="font-semibold text-amber-600">{"★".repeat(r.rating)}</span> {r.comment}</p>
                <p className="text-xs text-slate-500">{r.direction === "candidate_to_company" ? "Nomzod → ish beruvchi" : "Ish beruvchi → nomzod"} · {timeAgo(r.created_at)} {r.status === "hidden" ? <Badge>yashirin</Badge> : null}</p>
              </div>
              <ReviewToggle id={r.id} status={r.status} />
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
