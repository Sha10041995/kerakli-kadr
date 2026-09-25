import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Avatar, PageHeader } from "@/components/ui/misc";
import { PrintButton } from "@/components/ui/print-button";
import { requireJobSeeker } from "@/features/auth/session";
import { getCandidate } from "@/features/candidates/queries";
import { createClient } from "@/lib/supabase/server";
import { AVAILABILITY_LABELS, EDUCATION_LABELS, EMPLOYMENT_TYPE_LABELS } from "@/lib/i18n/uz";
import { formatDate, formatSalary } from "@/lib/utils";

export const metadata: Metadata = { title: "CV", robots: { index: false } };

/** Auto-generated CV from the profile (HTML preview; browser "Print → Save as PDF"). */
export default async function CvPage() {
  const user = await requireJobSeeker("/dashboard/cv");
  const [c, { data: contact }] = await Promise.all([
    getCandidate(user.id),
    (await createClient()).from("profiles").select("phone, email, birth_year").eq("id", user.id).maybeSingle(),
  ]);
  if (!c) {
    return (
      <Alert tone="info">
        CV yaratish uchun avval{" "}
        <Link href="/dashboard/profile" className="underline">
          profilingizni
        </Link>{" "}
        toʻldiring.
      </Alert>
    );
  }
  const { profile: p, person } = c;
  const place = [p.settlements?.name_uz, p.districts?.name_uz, p.regions?.name_uz].filter(Boolean).join(", ");

  return (
    <>
      <div className="no-print">
        <PageHeader
          title="Mening CV"
          description="Profilingizdan avtomatik yaratildi. PDF uchun “Chop etish → PDF sifatida saqlash”ni tanlang."
          actions={<PrintButton />}
        />
      </div>
      <article className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm print:border-0 print:p-0 print:shadow-none">
        <header className="flex items-center gap-5 border-b border-slate-200 pb-6">
          <Avatar src={person?.avatar_url} first={person?.first_name} last={person?.last_name} size={88} />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {person?.first_name} {person?.last_name}
            </h1>
            <p className="text-brand-700 text-lg">{p.professions?.name_uz}</p>
            {p.headline ? <p className="text-slate-600">{p.headline}</p> : null}
            <p className="mt-2 text-sm text-slate-600">
              {[contact?.phone, contact?.email, place, contact?.birth_year ? `${contact.birth_year}-yil` : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </header>
        {p.about ? (
          <section className="mt-6">
            <h2 className="text-sm font-bold tracking-wide text-slate-500 uppercase">Men haqimda</h2>
            <p className="mt-2 text-sm whitespace-pre-line text-slate-800">{p.about}</p>
          </section>
        ) : null}
        <section className="mt-6 grid gap-2 text-sm sm:grid-cols-2">
          <p>
            <span className="text-slate-500">Tajriba:</span> {Number(p.experience_years)} yil
          </p>
          <p>
            <span className="text-slate-500">Mavjudlik:</span> {AVAILABILITY_LABELS[p.availability]}
          </p>
          <p>
            <span className="text-slate-500">Ish turi:</span>{" "}
            {p.employment_types.map((t) => EMPLOYMENT_TYPE_LABELS[t]).join(", ")}
          </p>
          <p>
            <span className="text-slate-500">Kutilayotgan maosh:</span>{" "}
            {formatSalary(p.expected_salary_min, p.expected_salary_max, p.salary_type)}
          </p>
        </section>
        {p.candidate_experience?.length ? (
          <section className="mt-6">
            <h2 className="text-sm font-bold tracking-wide text-slate-500 uppercase">Ish tajribasi</h2>
            <ul className="mt-2 space-y-3">
              {[...p.candidate_experience]
                .sort((a, b) => b.start_date.localeCompare(a.start_date))
                .map((e) => (
                  <li key={e.id}>
                    <p className="font-semibold text-slate-900">
                      {e.position} — {e.company_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDate(e.start_date)} – {e.is_current ? "hozirgacha" : formatDate(e.end_date)}
                    </p>
                    {e.description ? <p className="text-sm text-slate-700">{e.description}</p> : null}
                  </li>
                ))}
            </ul>
          </section>
        ) : null}
        {p.candidate_education?.length ? (
          <section className="mt-6">
            <h2 className="text-sm font-bold tracking-wide text-slate-500 uppercase">Taʼlim</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {p.candidate_education.map((e) => (
                <li key={e.id}>
                  <span className="font-semibold text-slate-900">{e.institution}</span> — {EDUCATION_LABELS[e.level]}
                  {e.field ? `, ${e.field}` : ""}
                  {e.end_year ? ` (${e.end_year})` : ""}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {p.candidate_skills?.length ? (
          <section className="mt-6">
            <h2 className="text-sm font-bold tracking-wide text-slate-500 uppercase">Koʻnikmalar</h2>
            <p className="mt-2 text-sm text-slate-800">
              {p.candidate_skills
                .map((s) => s.skills?.name_uz)
                .filter(Boolean)
                .join(" · ")}
            </p>
          </section>
        ) : null}
        {p.candidate_certificates?.length ? (
          <section className="mt-6">
            <h2 className="text-sm font-bold tracking-wide text-slate-500 uppercase">Sertifikatlar</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {p.candidate_certificates.map((cert) => (
                <li key={cert.id}>
                  {cert.name}
                  {cert.issuer ? ` — ${cert.issuer}` : ""}
                  {cert.issued_at ? ` (${formatDate(cert.issued_at)})` : ""}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {p.candidate_portfolio?.length ? (
          <section className="mt-6">
            <h2 className="text-sm font-bold tracking-wide text-slate-500 uppercase">Portfolio</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {p.candidate_portfolio.map((item) => (
                <li key={item.id}>
                  {item.title}
                  {item.url ? ` — ${item.url}` : ""}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <footer className="mt-8 border-t border-slate-100 pt-3 text-xs text-slate-400">KADR TOP UZ orqali yaratildi</footer>
      </article>
    </>
  );
}
