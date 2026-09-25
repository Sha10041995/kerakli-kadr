import { Badge, PageHeader } from "@/components/ui/misc";
import { requireAdmin } from "@/features/auth/session";
import { PAYMENT_STATUS_LABELS } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatNumber } from "@/lib/utils";

export default async function AdminPayments() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("payments").select("id, amount_uzs, status, provider, provider_ref, purpose, created_at, paid_at").order("created_at", { ascending: false }).limit(100);
  return (
    <>
      <PageHeader title="Toʻlovlar" description="Karta maʼlumotlari saqlanmaydi — faqat provayder havolasi (reference)." />
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500"><tr><th className="px-3 py-2">Sana</th><th>Maqsad</th><th>Summa</th><th>Provayder</th><th>Holat</th></tr></thead>
          <tbody>
            {(data ?? []).map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-3 py-2">{formatDate(p.created_at)}</td><td>{p.purpose}</td><td>{formatNumber(p.amount_uzs)} soʻm</td>
                <td>{p.provider} <code className="text-xs text-slate-400">{p.provider_ref ?? ""}</code></td>
                <td><Badge tone={p.status === "paid" ? "success" : "neutral"}>{PAYMENT_STATUS_LABELS[p.status]}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
