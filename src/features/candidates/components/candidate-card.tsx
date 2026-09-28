import Link from "next/link";
import { Avatar, Badge, Card } from "@/components/ui/misc";
import { buttonClass } from "@/components/ui/button";
import { PinIcon, ShieldIcon, StarIcon } from "@/components/ui/icons";
import { getI18n } from "@/lib/i18n/server";
import type { CandidateSearchRow } from "@/features/candidates/queries";

export async function CandidateCard({ c }: { c: CandidateSearchRow }) {
  const { t, d, f } = await getI18n();
  const distance = f.distance(c.distance_km);
  const place = [c.settlement_name, c.district_name].filter(Boolean).join(", ") || c.region_name;
  return (
    <Card className={c.is_premium ? "border-amber-300 ring-1 ring-amber-200" : undefined}>
      <div className="flex gap-3">
        <Avatar src={c.avatar_url} first={c.first_name} last={c.last_initial} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-base font-semibold text-slate-900">
              <Link href={`/candidate/${c.id}`} className="hover:text-brand-700 hover:underline">
                {f.name(c.first_name, c.last_initial, true)}
              </Link>
            </h3>
            {c.is_premium ? <Badge tone="premium">Premium</Badge> : null}
            {c.phone_verified || c.identity_verified ? (
              <span
                title={c.identity_verified ? t("cards.identityVerified") : t("cards.phoneVerified")}
                className="text-brand-600"
              >
                <ShieldIcon size={16} />
              </span>
            ) : null}
          </div>
          <p className="text-brand-700 text-sm font-medium">{c.profession_name ?? t("cards.noProfession")}</p>
          {c.headline ? <p className="truncate text-sm text-slate-600">{c.headline}</p> : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
        {place ? (
          <span className="inline-flex items-center gap-1">
            <PinIcon size={16} />
            {place}
          </span>
        ) : null}
        {distance ? <span className="text-brand-700 font-medium">~{distance}</span> : null}
        <span>{t("cards.experience", { n: Number(c.experience_years ?? 0) })}</span>
        {c.rating_count ? (
          <span className="inline-flex items-center gap-1 text-amber-600">
            <StarIcon size={14} /> {Number(c.rating_avg).toFixed(1)} ({c.rating_count})
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {c.availability ? (
          <Badge tone={c.availability === "immediately" ? "success" : "neutral"}>{d.enums.availability[c.availability]}</Badge>
        ) : null}
        {(c.skills ?? []).slice(0, 4).map((s) => (
          <Badge key={s}>{s}</Badge>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-900">
          {f.salary(c.expected_salary_min, c.expected_salary_max, c.salary_type)}
        </span>
        <div className="flex gap-2">
          <Link href={`/candidate/${c.id}`} className={buttonClass("outline", "sm")}>
            {t("cards.viewProfile")}
          </Link>
          <Link href={`/candidate/${c.id}#contact`} className={buttonClass("primary", "sm")}>
            {t("cards.contact")}
          </Link>
        </div>
      </div>
    </Card>
  );
}
