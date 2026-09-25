import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, Badge, Card, Container, DemoBadge } from "@/components/ui/misc";
import { PinIcon, ShieldIcon, StarIcon } from "@/components/ui/icons";
import { LocationMap } from "@/components/map/location-map";
import { getCurrentUser } from "@/features/auth/session";
import { getCandidate } from "@/features/candidates/queries";
import { FavoriteButton } from "@/features/favorites/components/favorite-button";
import { StartChatButton } from "@/features/messaging/components/start-chat-button";
import { ReportButton } from "@/features/reports/components/report-button";
import { verificationBadges } from "@/features/verification/levels";
import { AVAILABILITY_LABELS, EDUCATION_LABELS, EMPLOYMENT_TYPE_LABELS } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";
import { displayName, formatDate, formatSalary, timeAgo } from "@/lib/utils";

export async function generateMetadata(props: PageProps<"/candidate/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const c = await getCandidate(id);
  if (!c) return { title: "Profil topilmadi", robots: { index: false } };
  const name = displayName(c.person?.first_name, c.person?.last_name, true);
  const prof = c.profile.professions?.name_uz ?? "Mutaxassis";
  const place = c.profile.districts?.name_uz ?? c.profile.regions?.name_uz ?? "";
  return {
    title: `${name} — ${prof}${place ? `, ${place}` : ""}`,
    description: c.profile.headline || `${prof} ${place}`,
    alternates: { canonical: `/candidate/${id}` },
    robots: c.profile.is_public ? undefined : { index: false },
  };
}

export default async function CandidatePage(props: PageProps<"/candidate/[id]">) {
  const { id } = await props.params;
  const [c, user] = await Promise.all([getCandidate(id), getCurrentUser()]);
  if (!c) notFound();
  const { profile: p, person, reviews } = c;

  let isFavorite = false;
  if (user) {
    const supabase = await createClient();
    const { data } = await supabase.from("favorites").select("id").eq("user_id", user.id).eq("candidate_id", id).maybeSingle();
    isFavorite = Boolean(data);
  }
  const badges = verificationBadges({ phoneVerified: person?.phone_verified, identityVerified: person?.identity_verified, certificateVerified: person?.certificate_verified });
  const place = [p.mahallas?.name_uz, p.settlements?.name_uz, p.districts?.name_uz, p.regions?.name_uz].filter(Boolean).join(", ");
  const isOwner = user?.id === id;

  return (
    <Container className="py-6 sm:py-10">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Avatar src={person?.avatar_url} first={person?.first_name} last={person?.last_name} size={88} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">{displayName(person?.first_name, person?.last_name, true)}</h1>
                {p.is_demo ? <DemoBadge /> : null}
                {p.premium_until && new Date(p.premium_until) > new Date() ? <Badge tone="premium">Premium</Badge> : null}
                {!p.is_public ? <Badge>Yashirin profil</Badge> : null}
              </div>
              <p className="text-lg font-medium text-brand-700">{p.professions?.name_uz ?? "Kasb koʻrsatilmagan"}</p>
              {p.headline ? <p className="text-slate-600">{p.headline}</p> : null}
              <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1"><PinIcon size={16} />{place || "Hudud koʻrsatilmagan"}</span>
                <span>Tajriba: {Number(p.experience_years)} yil</span>
                {p.rating_count ? <span className="inline-flex items-center gap-1 text-amber-600"><StarIcon size={14} />{Number(p.rating_avg).toFixed(1)} ({p.rating_count})</span> : null}
                {p.completed_jobs ? <span>{p.completed_jobs} ta bajarilgan ish</span> : null}
              </p>
              {badges.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {badges.map((b) => <Badge key={b} tone="success"><ShieldIcon size={12} /> {b}</Badge>)}
                </div>
              ) : null}
            </div>
          </Card>

          {p.about ? (
            <Card>
              <h2 className="mb-2 text-lg font-semibold text-slate-900">Oʻzi haqida</h2>
              <p className="text-sm whitespace-pre-line text-slate-700">{p.about}</p>
            </Card>
          ) : null}

          {p.candidate_skills?.length ? (
            <Card>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Koʻnikmalar</h2>
              <div className="flex flex-wrap gap-2">
                {p.candidate_skills.map((s) => s.skills ? (
                  <Badge key={s.skills.id} tone={s.is_verified ? "success" : "brand"}>{s.skills.name_uz}{s.is_verified ? " ✓" : ""}</Badge>
                ) : null)}
              </div>
            </Card>
          ) : null}

          {p.candidate_experience?.length ? (
            <Card>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Ish tajribasi</h2>
              <ol className="space-y-4 border-l-2 border-brand-100 pl-4">
                {[...p.candidate_experience].sort((a, b) => b.start_date.localeCompare(a.start_date)).map((e) => (
                  <li key={e.id}>
                    <p className="font-medium text-slate-900">{e.position}</p>
                    <p className="text-sm text-slate-600">{e.company_name}{e.location_text ? `, ${e.location_text}` : ""}</p>
                    <p className="text-xs text-slate-500">{formatDate(e.start_date)} – {e.is_current ? "hozirgacha" : formatDate(e.end_date)}</p>
                    {e.description ? <p className="mt-1 text-sm text-slate-700">{e.description}</p> : null}
                  </li>
                ))}
              </ol>
            </Card>
          ) : null}

          {p.candidate_education?.length || p.candidate_certificates?.length ? (
            <Card className="grid gap-6 sm:grid-cols-2">
              {p.candidate_education?.length ? (
                <div>
                  <h2 className="mb-3 text-lg font-semibold text-slate-900">Taʼlim</h2>
                  <ul className="space-y-2 text-sm">
                    {p.candidate_education.map((e) => (
                      <li key={e.id}>
                        <p className="font-medium text-slate-900">{e.institution}</p>
                        <p className="text-slate-600">{EDUCATION_LABELS[e.level]}{e.field ? ` · ${e.field}` : ""}{e.end_year ? ` · ${e.end_year}` : ""}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {p.candidate_certificates?.length ? (
                <div>
                  <h2 className="mb-3 text-lg font-semibold text-slate-900">Sertifikatlar</h2>
                  <ul className="space-y-2 text-sm">
                    {p.candidate_certificates.map((cert) => (
                      <li key={cert.id}>
                        <p className="font-medium text-slate-900">{cert.name} {cert.is_verified ? <span className="text-emerald-700">✓</span> : null}</p>
                        <p className="text-slate-600">{[cert.issuer, cert.issued_at ? formatDate(cert.issued_at) : null].filter(Boolean).join(" · ")}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </Card>
          ) : null}

          {p.candidate_portfolio?.length ? (
            <Card>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Portfolio</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {p.candidate_portfolio.map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-100 p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element -- public storage image */}
                    {item.image_path ? <img src={item.image_path} alt={item.title} className="mb-2 aspect-video w-full rounded object-cover" loading="lazy" /> : null}
                    <p className="font-medium text-slate-900">{item.title}</p>
                    {item.description ? <p className="text-sm text-slate-600">{item.description}</p> : null}
                    {item.url ? <a href={item.url} target="_blank" rel="noopener noreferrer nofollow ugc" className="text-xs text-brand-700 hover:underline">Havola ↗</a> : null}
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {reviews.length ? (
            <Card>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Ish beruvchilar sharhlari</h2>
              <ul className="space-y-3">
                {reviews.map((r) => (
                  <li key={r.id} className="border-b border-slate-100 pb-3 last:border-0">
                    <p className="flex items-center gap-1 text-amber-500">{Array.from({ length: r.rating }, (_, i) => <StarIcon key={i} size={14} />)}</p>
                    {r.comment ? <p className="text-sm text-slate-700">{r.comment}</p> : null}
                    <p className="text-xs text-slate-500">{timeAgo(r.created_at)} · tasdiqlangan ish jarayonidan keyin</p>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        <aside className="space-y-4">
          <Card id="contact" className="scroll-mt-24 space-y-3">
            <p className="text-sm text-slate-500">Kutilayotgan maosh</p>
            <p className="text-lg font-semibold text-slate-900">{formatSalary(p.expected_salary_min, p.expected_salary_max, p.salary_type)}</p>
            <Badge tone={p.availability === "immediately" ? "success" : "neutral"}>{AVAILABILITY_LABELS[p.availability]}</Badge>
            <p className="text-sm text-slate-600">{p.employment_types.map((t) => EMPLOYMENT_TYPE_LABELS[t]).join(", ")}</p>
            <ul className="text-sm text-slate-600">
              {p.has_transport ? <li>✓ Shaxsiy transporti bor</li> : null}
              {p.remote_ok ? <li>✓ Masofadan ishlay oladi</li> : null}
              <li>✓ {p.work_radius_km} km gacha masofada ishlashga tayyor</li>
            </ul>
            {isOwner ? (
              <Link href="/dashboard/profile" className="block text-sm font-medium text-brand-700 hover:underline">Profilni tahrirlash →</Link>
            ) : user?.isEmployer ? (
              <StartChatButton otherUserId={id} label="Xabar yozish" />
            ) : !user ? (
              <p className="text-sm text-slate-600">
                Bogʻlanish uchun <Link href={`/login?next=/candidate/${id}`} className="font-medium text-brand-700 hover:underline">ish beruvchi sifatida kiring</Link>.
              </p>
            ) : null}
            <p className="text-xs text-slate-500">Telefon raqam ommaga koʻrsatilmaydi — nomzod ariza yuborganda ish beruvchiga ochiladi.</p>
          </Card>
          {p.lat != null && p.lng != null ? <LocationMap lat={p.lat} lng={p.lng} radiusKm={6} label="Taxminiy hudud" /> : null}
          {user && !isOwner ? (
            <div className="flex items-center justify-between">
              <FavoriteButton kind="candidate" targetId={id} initial={isFavorite} />
              <ReportButton targetType="user" targetId={id} />
            </div>
          ) : null}
        </aside>
      </div>
    </Container>
  );
}
