import Link from "next/link";
import { Badge, Card } from "@/components/ui/misc";
import { buttonClass } from "@/components/ui/button";
import { BoltIcon, CheckIcon, PinIcon } from "@/components/ui/icons";
import { getI18n } from "@/lib/i18n/server";
import type { VacancySearchRow } from "@/features/vacancies/queries";

export async function VacancyCard({ v }: { v: VacancySearchRow }) {
  const { t, d, f } = await getI18n();
  const distance = f.distance(v.distance_km);
  const tier = v.location_tier && v.location_tier <= 5 ? t(`cards.tier.t${v.location_tier as 1 | 2 | 3 | 4 | 5}`) : null;
  const location = [v.settlement_name, v.district_name, v.region_name].filter(Boolean).join(", ");
  return (
    <Card className={v.is_promoted || v.is_featured ? "border-amber-300 ring-1 ring-amber-200" : undefined}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            {v.is_featured || v.is_promoted ? <Badge tone="premium">TOP</Badge> : null}
            {v.urgent ? (
              <Badge tone="danger">
                <BoltIcon size={12} /> {t("common.urgent")}
              </Badge>
            ) : null}
            {tier ? <Badge tone="brand">{tier}</Badge> : null}
          </div>
          <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
            <Link href={`/vacancy/${v.id}`} className="hover:text-brand-700 hover:underline">
              {v.title}
            </Link>
          </h3>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-600">
            {v.company_name}
            {v.company_verified ? (
              <span title={t("cards.verifiedEmployer")} className="text-brand-600">
                <CheckIcon size={16} />
              </span>
            ) : null}
          </p>
        </div>
        <p className="shrink-0 text-base font-semibold text-slate-900 sm:text-right">
          {f.salary(v.salary_min, v.salary_max, v.salary_type, v.salary_currency ?? "UZS")}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
        <span className="inline-flex items-center gap-1">
          <PinIcon size={16} />
          {location || t("common.remote")}
        </span>
        {distance ? <span className="text-brand-700 font-medium">{t("cards.away", { d: distance })}</span> : null}
        {v.employment_type ? <span>{d.enums.employmentType[v.employment_type]}</span> : null}
        <span>
          {Number(v.experience_min_years) > 0
            ? t("cards.experienceYears", { n: Number(v.experience_min_years) })
            : t("cards.noExperience")}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {v.remote_allowed ? <Badge tone="info">{t("common.remote")}</Badge> : null}
        {v.transport_provided ? <Badge>{t("cards.transport")}</Badge> : null}
        {v.accommodation_provided ? <Badge>{t("cards.housing")}</Badge> : null}
        {v.meal_provided ? <Badge>{t("cards.meal")}</Badge> : null}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-slate-500">{f.timeAgo(v.published_at)}</span>
        <div className="flex gap-2">
          <Link href={`/vacancy/${v.id}`} className={buttonClass("outline", "sm")}>
            {t("cards.details")}
          </Link>
          <Link href={`/vacancy/${v.id}#apply`} className={buttonClass("primary", "sm")}>
            {t("cards.apply")}
          </Link>
        </div>
      </div>
    </Card>
  );
}
