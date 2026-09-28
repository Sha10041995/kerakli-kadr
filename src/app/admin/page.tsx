import Link from "next/link";
import { Card, PageHeader, Stat } from "@/components/ui/misc";
import { createClient } from "@/lib/supabase/server";
import { formatNumber } from "@/lib/utils";
import { DemandTable } from "@/features/admin/demand-table";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const [{ data: stats }, { data: demand }, { data: engagement }] = await Promise.all([
    supabase.rpc("admin_dashboard_stats"),
    supabase.rpc("demand_supply", { p_limit: 10 }),
    supabase.rpc("engagement_stats"),
  ]);
  const s = (stats ?? {}) as Record<string, number>;
  const e = (engagement ?? {}) as Record<string, number | null>;
  const n = (k: string) => formatNumber(Number(s[k] ?? 0));
  return (
    <>
      <PageHeader title="Dashboard" description="Platformaning umumiy holati" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Foydalanuvchilar" value={n("total_users")} />
        <Stat label="Ish izlovchilar" value={n("job_seekers")} />
        <Stat label="Ish beruvchilar" value={n("employers")} />
        <Stat label="Kompaniyalar" value={n("companies")} />
        <Stat label="Faol vakansiyalar" value={n("vacancies_active")} hint={`jami ${n("vacancies_total")}`} />
        <Stat label="Arizalar" value={n("applications")} />
        <Stat label="Ishga olinganlar" value={n("hires")} />
        <Stat label="Faol (30 kun)" value={n("active_users_30d")} />
        <Stat label="Daromad" value={`${n("revenue_uzs")} soʻm`} hint={`30 kun: ${n("revenue_30d_uzs")}`} />
        <Stat label="Obunalar" value={n("active_subscriptions")} />
        <Stat label="Qidiruvlar (30 kun)" value={n("searches_30d")} />
        <Stat
          label="Vakansiya koʻrishlari"
          value={formatNumber(Number(e.vacancy_views ?? 0))}
          hint={`koʻrish → ariza: ${e.view_to_apply_rate ?? 0}%`}
        />
        <Stat label="Profil koʻrishlari" value={formatNumber(Number(e.profile_views ?? 0))} />
        <Stat
          label="Hire rate"
          value={`${e.hire_rate ?? 0}%`}
          hint={`vakansiyaga oʻrtacha ${e.applications_per_vacancy ?? 0} ariza`}
        />
        <Stat
          label="Konversiya"
          value={`${Number(s.applications ?? 0) ? Math.round((Number(s.hires ?? 0) / Number(s.applications)) * 100) : 0}%`}
          hint="ariza → ishga olish"
        />
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <Link href="/admin/vacancies">
          <Card className="hover:border-brand-300">
            <p className="text-sm text-slate-500">Tekshiruvni kutayotgan vakansiyalar</p>
            <p className="text-2xl font-bold">{n("vacancies_pending")}</p>
          </Card>
        </Link>
        <Link href="/admin/reports">
          <Card className="hover:border-brand-300">
            <p className="text-sm text-slate-500">Ochiq shikoyatlar</p>
            <p className="text-2xl font-bold">{n("open_reports")}</p>
          </Card>
        </Link>
        <Link href="/admin/verification">
          <Card className="hover:border-brand-300">
            <p className="text-sm text-slate-500">Tasdiqlash soʻrovlari</p>
            <p className="text-2xl font-bold">{n("pending_verifications")}</p>
          </Card>
        </Link>
      </div>
      <Card className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Talab yuqori: tuman × kasb</h2>
          <Link href="/admin/analytics" className="text-brand-700 text-sm hover:underline">
            Batafsil →
          </Link>
        </div>
        <DemandTable rows={demand ?? []} />
      </Card>
    </>
  );
}
