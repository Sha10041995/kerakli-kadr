import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Avatar, Badge, Card, Container, DemoBadge } from "@/components/ui/misc";
import { BoltIcon, CheckIcon, PinIcon, StarIcon } from "@/components/ui/icons";
import { LocationMap } from "@/components/map/location-map";
import { getCurrentUser } from "@/features/auth/session";
import { ApplyForm } from "@/features/applications/components/apply-form";
import { FavoriteButton } from "@/features/favorites/components/favorite-button";
import { ReportButton } from "@/features/reports/components/report-button";
import { ViewTracker } from "@/features/vacancies/components/view-tracker";
import { getVacancy } from "@/features/vacancies/queries";
import { companyResponseRate } from "@/features/reputation";
import { EDUCATION_LABELS, EMPLOYMENT_TYPE_LABELS, WORK_SCHEDULE_LABELS } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";
import { jobPostingJsonLd, jsonLdScript } from "@/lib/seo";
import { formatDate, formatSalary, timeAgo } from "@/lib/utils";

export async function generateMetadata(props: PageProps<"/vacancy/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const v = await getVacancy(id);
  if (!v) return { title: "Vakansiya topilmadi", robots: { index: false } };
  const place = v.districts?.name_uz ?? v.regions?.name_uz ?? "";
  return {
    title: `${v.title}${place ? ` — ${place}` : ""}`,
    description: `${v.companies?.name ?? ""}: ${v.description.slice(0, 150)}`,
    alternates: { canonical: `/vacancy/${v.id}` },
    robots: v.status === "active" ? undefined : { index: false },
    openGraph: { title: v.title, description: v.description.slice(0, 200), type: "article" },
  };
}

export default async function VacancyPage(props: PageProps<"/vacancy/[id]">) {
  const { id } = await props.params;
  const [v, user, requestHeaders] = await Promise.all([getVacancy(id), getCurrentUser(), headers()]);
  if (!v) notFound();
  const responseRate = await companyResponseRate(v.company_id);
  const nonce = requestHeaders.get("x-nonce") ?? undefined;

  let applyState: "guest" | "no_role" | "no_profile" | "can_apply" | "applied" | "own" | "closed" = "guest";
  let isFavorite = false;
  if (v.status !== "active") applyState = "closed";
  else if (user) {
    if (user.companyId === v.company_id) applyState = "own";
    else if (!user.isJobSeeker) applyState = "no_role";
    else if (!user.hasCandidateProfile) applyState = "no_profile";
    else applyState = "can_apply";
  }
  if (user) {
    const supabase = await createClient();
    const [{ data: app }, { data: fav }] = await Promise.all([
      supabase.from("applications").select("id").eq("vacancy_id", id).eq("candidate_id", user.id).maybeSingle(),
      supabase.from("favorites").select("id").eq("user_id", user.id).eq("vacancy_id", id).maybeSingle(),
    ]);
    if (app && applyState === "can_apply") applyState = "applied";
    isFavorite = Boolean(fav);
  }

  const place = [v.mahallas?.name_uz, v.settlements?.name_uz, v.districts?.name_uz, v.regions?.name_uz]
    .filter(Boolean)
    .join(", ");
  const company = v.companies;
  const jsonLd = jobPostingJsonLd({
    id: v.id,
    title: v.title,
    description: v.description,
    publishedAt: v.published_at,
    expiresAt: v.expires_at,
    employmentType: v.employment_type,
    companyName: company?.name ?? "",
    companyLogo: company?.logo_url,
    regionName: v.regions?.name_uz,
    districtName: v.districts?.name_uz,
    salaryMin: v.salary_min,
    salaryMax: v.salary_max,
    salaryType: v.salary_type,
    currency: v.salary_currency,
    remote: v.remote_allowed,
  });

  return (
    <Container className="py-6 sm:py-10">
      {v.status === "active" ? (
        <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      ) : null}
      {v.status === "active" ? <ViewTracker vacancyId={v.id} /> : null}
      <nav aria-label="Yoʻl" className="mb-4 text-sm text-slate-500">
        <Link href="/jobs" className="hover:underline">
          Ishlar
        </Link>
        {v.regions ? (
          <>
            {" "}
            /{" "}
            <Link href={`/jobs/${v.regions.slug}`} className="hover:underline">
              {v.regions.name_uz}
            </Link>
          </>
        ) : null}
        {v.regions && v.districts ? (
          <>
            {" "}
            /{" "}
            <Link href={`/jobs/${v.regions.slug}/${v.districts.slug}`} className="hover:underline">
              {v.districts.name_uz}
            </Link>
          </>
        ) : null}
      </nav>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <article className="space-y-6">
          <Card className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {v.is_demo ? <DemoBadge /> : null}
              {v.vacancy_tier === "premium" || (v.promoted_until && new Date(v.promoted_until) > new Date()) ? (
                <Badge tone="premium">TOP</Badge>
              ) : null}
              {v.urgent ? (
                <Badge tone="danger">
                  <BoltIcon size={12} /> Shoshilinch
                </Badge>
              ) : null}
              {v.status !== "active" ? <Badge tone="neutral">Faol emas</Badge> : null}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{v.title}</h1>
            <p className="text-brand-700 text-xl font-semibold">
              {formatSalary(v.salary_min, v.salary_max, v.salary_type, v.salary_currency)}
            </p>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="flex gap-2">
                <PinIcon size={18} className="text-slate-400" />
                <span>
                  <dt className="sr-only">Manzil</dt>
                  <dd>{place || "Masofaviy ish"}</dd>
                </span>
              </div>
              <div>
                <dt className="inline text-slate-500">Ish turi: </dt>
                <dd className="inline">{EMPLOYMENT_TYPE_LABELS[v.employment_type]}</dd>
              </div>
              <div>
                <dt className="inline text-slate-500">Jadval: </dt>
                <dd className="inline">{WORK_SCHEDULE_LABELS[v.work_schedule]}</dd>
              </div>
              <div>
                <dt className="inline text-slate-500">Tajriba: </dt>
                <dd className="inline">
                  {Number(v.experience_min_years) > 0 ? `${v.experience_min_years}+ yil` : "Talab qilinmaydi"}
                </dd>
              </div>
              {v.education_level ? (
                <div>
                  <dt className="inline text-slate-500">Maʼlumot: </dt>
                  <dd className="inline">{EDUCATION_LABELS[v.education_level]}</dd>
                </div>
              ) : null}
              <div>
                <dt className="inline text-slate-500">Oʻrinlar: </dt>
                <dd className="inline">{v.positions_count} ta</dd>
              </div>
              {v.application_deadline ? (
                <div>
                  <dt className="inline text-slate-500">Muddat: </dt>
                  <dd className="inline">{formatDate(v.application_deadline)} gacha</dd>
                </div>
              ) : null}
              {v.professions ? (
                <div>
                  <dt className="inline text-slate-500">Kasb: </dt>
                  <dd className="inline">
                    <Link className="text-brand-700 hover:underline" href={`/jobs/${v.professions.slug}`}>
                      {v.professions.name_uz}
                    </Link>
                  </dd>
                </div>
              ) : null}
            </dl>
            <div className="flex flex-wrap gap-1.5">
              {v.remote_allowed ? <Badge tone="info">Masofadan ishlash mumkin</Badge> : null}
              {v.transport_provided ? <Badge>Transport beriladi</Badge> : null}
              {v.accommodation_provided ? <Badge>Turar joy beriladi</Badge> : null}
              {v.meal_provided ? <Badge>Ovqat beriladi</Badge> : null}
            </div>
          </Card>
          <Card>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Tavsif</h2>
            <div className="text-sm leading-relaxed whitespace-pre-line text-slate-700">{v.description}</div>
            {v.vacancy_skills?.length ? (
              <>
                <h3 className="mt-6 mb-2 font-semibold text-slate-900">Koʻnikmalar</h3>
                <div className="flex flex-wrap gap-1.5">
                  {v.vacancy_skills.map((s) =>
                    s.skills ? (
                      <Badge key={s.skills.id} tone="brand">
                        {s.skills.name_uz}
                      </Badge>
                    ) : null,
                  )}
                </div>
              </>
            ) : null}
            <p className="mt-6 text-xs text-slate-500">
              Eʼlon qilindi: {timeAgo(v.published_at ?? v.created_at)} · {v.views_count} marta koʻrildi
            </p>
          </Card>
          {v.lat != null && v.lng != null ? (
            <LocationMap lat={v.lat} lng={v.lng} radiusKm={2} label={`Ish joyi: ${place}`} marker />
          ) : null}
        </article>
        <aside className="space-y-4">
          <Card id="apply" className="scroll-mt-24">
            <h2 className="mb-3 font-semibold text-slate-900">Ariza yuborish</h2>
            <ApplyForm vacancyId={v.id} state={applyState} />
          </Card>
          {company ? (
            <Card>
              <div className="flex items-center gap-3">
                <Avatar src={company.logo_url} first={company.name} size={48} className="rounded-xl" />
                <div>
                  <Link
                    href={`/company/${company.slug}`}
                    className="hover:text-brand-700 flex items-center gap-1 font-semibold text-slate-900"
                  >
                    {company.name}
                    {company.verification_status === "verified" ? <CheckIcon size={16} className="text-brand-600" /> : null}
                  </Link>
                  {company.rating_count ? (
                    <p className="flex items-center gap-1 text-sm text-amber-600">
                      <StarIcon size={14} />
                      {Number(company.rating_avg).toFixed(1)} ({company.rating_count} sharh)
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">{company.hires_count} ta xodim yollagan</p>
                  )}
                </div>
              </div>
              {company.verification_status === "verified" ? (
                <p className="mt-3 text-xs text-emerald-700">✓ Tasdiqlangan ish beruvchi</p>
              ) : null}
              {responseRate != null ? (
                <p className="mt-1 text-xs text-slate-600">
                  Arizalarga javob beradi: <strong>{responseRate}%</strong>
                </p>
              ) : null}
            </Card>
          ) : null}
          <div className="flex items-center justify-between">
            {user ? <FavoriteButton kind="vacancy" targetId={v.id} initial={isFavorite} /> : <span />}
            {user ? <ReportButton targetType="vacancy" targetId={v.id} /> : null}
          </div>
          <Card className="bg-amber-50 text-xs text-amber-900">
            Xavfsizlik: ishga olish uchun hech qachon oldindan toʻlov qilmang va karta maʼlumotlaringizni bermang.
          </Card>
        </aside>
      </div>
    </Container>
  );
}
