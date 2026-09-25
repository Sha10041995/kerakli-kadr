import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { VacancyModeration } from "@/features/admin/components";
import { VACANCY_STATUS_LABELS } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";
import { cn, timeAgo } from "@/lib/utils";
import type { Enums } from "@/types/database";

const STATUSES: Enums<"vacancy_status">[] = ["pending_review", "active", "rejected", "closed", "expired", "draft"];

export default async function AdminVacancies(props: PageProps<"/admin/vacancies">) {
  const sp = await props.searchParams;
  const status = STATUSES.find((s) => s === sp.status) ?? "pending_review";
  const supabase = await createClient();
  const { data } = await supabase
    .from("vacancies")
    .select(
      "id, title, status, created_at, description, rejection_reason, is_demo, companies(name, verification_status), districts(name_uz)",
    )
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(50);
  return (
    <>
      <PageHeader title="Vakansiyalar moderatsiyasi" />
      <nav className="mb-4 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/vacancies?status=${s}`}
            className={cn(
              "rounded-full px-3 py-1 text-sm",
              s === status ? "bg-brand-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200",
            )}
          >
            {VACANCY_STATUS_LABELS[s]}
          </Link>
        ))}
      </nav>
      {!data?.length ? (
        <EmptyState title="Roʻyxat boʻsh" />
      ) : (
        <div className="space-y-3">
          {data.map((v) => (
            <Card key={v.id} className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/vacancy/${v.id}`} className="hover:text-brand-700 font-semibold text-slate-900">
                  {v.title}
                </Link>
                <Badge>{VACANCY_STATUS_LABELS[v.status]}</Badge>
                {v.is_demo ? <Badge tone="warning">DEMO</Badge> : null}
              </div>
              <p className="text-xs text-slate-500">
                {v.companies?.name} {v.companies?.verification_status === "verified" ? "✓" : ""} · {v.districts?.name_uz ?? "—"} ·{" "}
                {timeAgo(v.created_at)}
              </p>
              <p className="line-clamp-3 text-sm text-slate-700">{v.description}</p>
              {v.rejection_reason ? <p className="text-xs text-red-600">Sabab: {v.rejection_reason}</p> : null}
              <VacancyModeration id={v.id} status={v.status} />
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
