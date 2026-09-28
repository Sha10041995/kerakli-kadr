import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { GetForm } from "@/components/ui/get-form";
import { CompanyControls } from "@/features/admin/components";
import { requireAdmin } from "@/features/auth/session";
import { COMPANY_TYPE_LABELS } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

const TONE = { verified: "success", pending: "warning", rejected: "danger", unverified: "neutral" } as const;

export default async function AdminCompanies(props: PageProps<"/admin/companies">) {
  await requireAdmin();
  const sp = await props.searchParams;
  const q =
    typeof sp.q === "string"
      ? sp.q
          .replace(/[%,()]/g, "")
          .trim()
          .slice(0, 80)
      : "";
  const supabase = await createClient();
  let query = supabase
    .from("companies")
    .select(
      "id, name, slug, company_type, stir, verification_status, is_featured, featured_until, hires_count, rating_avg, rating_count, is_demo, created_at, districts(name_uz)",
    )
    .order("created_at", { ascending: false })
    .limit(50);
  if (q) query = query.or(`name.ilike.%${q}%,stir.ilike.%${q}%`);
  const { data } = await query;
  return (
    <>
      <PageHeader title="Ish beruvchilar va kompaniyalar" />
      <GetForm action="/admin/companies" className="mb-4 flex gap-2">
        <Input name="q" defaultValue={q} placeholder="Nomi yoki STIR" aria-label="Qidirish" className="max-w-sm" />
        <Button type="submit" variant="outline">
          Qidirish
        </Button>
      </GetForm>
      {!data?.length ? (
        <EmptyState title="Topilmadi" />
      ) : (
        <div className="space-y-2">
          {data.map((c) => (
            <Card key={c.id} className="flex flex-col gap-2 py-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-medium text-slate-900">
                  <Link href={`/company/${c.slug}`} className="hover:text-brand-700">
                    {c.name}
                  </Link>{" "}
                  <Badge tone={TONE[c.verification_status]}>{c.verification_status}</Badge>{" "}
                  {c.is_featured ? <Badge tone="premium">Tavsiya etilgan</Badge> : null}{" "}
                  {c.is_demo ? <Badge tone="warning">DEMO</Badge> : null}
                </p>
                <p className="text-xs text-slate-500">
                  {COMPANY_TYPE_LABELS[c.company_type]} · STIR {c.stir ?? "—"} · {c.districts?.name_uz ?? "—"} · {c.hires_count}{" "}
                  ta yollash · {formatDate(c.created_at)}
                  {c.featured_until ? ` · tavsiya ${formatDate(c.featured_until)} gacha` : ""}
                </p>
              </div>
              <CompanyControls id={c.id} verification={c.verification_status} featured={c.is_featured} />
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
