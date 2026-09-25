import Link from "next/link";
import { Badge, Card } from "@/components/ui/misc";
import { buttonClass } from "@/components/ui/button";
import { BoltIcon, CheckIcon, PinIcon } from "@/components/ui/icons";
import { EMPLOYMENT_TYPE_LABELS } from "@/lib/i18n/uz";
import { formatDistance, formatSalary, timeAgo } from "@/lib/utils";
import type { VacancySearchRow } from "@/features/vacancies/queries";

const TIER_LABEL: Record<number, string> = {
  1: "Mahallangizda",
  2: "Aholi punktingizda",
  3: "Tumaningizda",
  4: "Yaqin tumanda",
  5: "Qoʻshni hududda",
};

export function VacancyCard({ v }: { v: VacancySearchRow }) {
  const distance = formatDistance(v.distance_km);
  const location = [v.settlement_name, v.district_name, v.region_name].filter(Boolean).join(", ");
  return (
    <Card className={v.is_promoted || v.is_featured ? "border-amber-300 ring-1 ring-amber-200" : undefined}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            {v.is_featured || v.is_promoted ? <Badge tone="premium">TOP</Badge> : null}
            {v.urgent ? (
              <Badge tone="danger">
                <BoltIcon size={12} /> Shoshilinch
              </Badge>
            ) : null}
            {v.location_tier && TIER_LABEL[v.location_tier] ? <Badge tone="brand">{TIER_LABEL[v.location_tier]}</Badge> : null}
          </div>
          <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
            <Link href={`/vacancy/${v.id}`} className="hover:text-brand-700 hover:underline">
              {v.title}
            </Link>
          </h3>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-600">
            {v.company_name}
            {v.company_verified ? (
              <span title="Tasdiqlangan ish beruvchi" className="text-brand-600">
                <CheckIcon size={16} />
              </span>
            ) : null}
          </p>
        </div>
        <p className="shrink-0 text-base font-semibold text-slate-900 sm:text-right">
          {formatSalary(v.salary_min, v.salary_max, v.salary_type, v.salary_currency ?? "UZS")}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
        <span className="inline-flex items-center gap-1">
          <PinIcon size={16} />
          {location || "Masofaviy"}
        </span>
        {distance ? <span className="text-brand-700 font-medium">{distance} uzoqlikda</span> : null}
        {v.employment_type ? <span>{EMPLOYMENT_TYPE_LABELS[v.employment_type]}</span> : null}
        <span>{Number(v.experience_min_years) > 0 ? `Tajriba: ${v.experience_min_years}+ yil` : "Tajribasiz ham mumkin"}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {v.remote_allowed ? <Badge tone="info">Masofaviy</Badge> : null}
        {v.transport_provided ? <Badge>Transport</Badge> : null}
        {v.accommodation_provided ? <Badge>Turar joy</Badge> : null}
        {v.meal_provided ? <Badge>Ovqat</Badge> : null}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-slate-500">{timeAgo(v.published_at)}</span>
        <div className="flex gap-2">
          <Link href={`/vacancy/${v.id}`} className={buttonClass("outline", "sm")}>
            Batafsil
          </Link>
          <Link href={`/vacancy/${v.id}#apply`} className={buttonClass("primary", "sm")}>
            Ariza yuborish
          </Link>
        </div>
      </div>
    </Card>
  );
}
