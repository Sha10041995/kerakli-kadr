import { Card, PageHeader } from "@/components/ui/misc";
import { PriceForm } from "@/features/admin/components";
import { requireAdmin } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPlans() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: plans }, { data: services }] = await Promise.all([
    supabase.from("subscription_plans").select("*").order("sort_order"),
    supabase.from("paid_services").select("*").order("price_uzs"),
  ]);
  return (
    <>
      <PageHeader
        title="Tariflar va narxlar"
        description="Narxlar maʼlumotlar bazasida saqlanadi — kodni oʻzgartirmasdan yangilang."
      />
      <h2 className="mb-2 font-semibold">Obuna tariflari</h2>
      <div className="mb-8 space-y-2">
        {(plans ?? []).map((p) => (
          <Card key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="font-medium">
                {p.name_uz} <code className="text-xs text-slate-400">{p.code}</code>
              </p>
              <p className="text-xs text-slate-500">{JSON.stringify(p.limits)}</p>
            </div>
            <PriceForm kind="plan" id={p.id} price={p.price_uzs} active={p.is_active} />
          </Card>
        ))}
      </div>
      <h2 className="mb-2 font-semibold">Pullik xizmatlar</h2>
      <div className="space-y-2">
        {(services ?? []).map((s) => (
          <Card key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="font-medium">
                {s.name_uz} <code className="text-xs text-slate-400">{s.code}</code>
              </p>
              <p className="text-xs text-slate-500">
                {s.duration_days} kun · {s.audience}
              </p>
            </div>
            <PriceForm kind="service" id={s.id} price={s.price_uzs} active={s.is_active} />
          </Card>
        ))}
      </div>
    </>
  );
}
