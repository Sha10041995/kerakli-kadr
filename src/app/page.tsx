import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, Container } from "@/components/ui/misc";
import { BriefcaseIcon, CheckIcon, PinIcon, ShieldIcon, TargetIcon, UsersIcon } from "@/components/ui/icons";
import { CandidateCard } from "@/features/candidates/components/candidate-card";
import { featuredCandidates } from "@/features/candidates/queries";
import { getCatalog, getCategoryStats, getPlans, getRegionStats, getTalentSummary } from "@/features/catalog/queries";
import { getRegions } from "@/features/locations/queries";
import { SearchBar } from "@/features/search/components/search-bar";
import { VacancyCard } from "@/features/vacancies/components/vacancy-card";
import { latestVacancies } from "@/features/vacancies/queries";
import { formatNumber } from "@/lib/utils";

const FAQ = [
  {
    q: "Platformadan foydalanish pullikmi?",
    a: "Yoʻq. Ish izlovchilar uchun profil, qidiruv va ariza yuborish bepul. Ish beruvchilar bepul tarifda ham vakansiya joylay oladi; qoʻshimcha imkoniyatlar pullik tariflarda.",
  },
  {
    q: "Uy manzilim boshqalarga koʻrinadimi?",
    a: "Hech qachon. Profilingizda faqat tuman yoki taxminiy masofa (masalan, “2,8 km uzoqlikda”) koʻrsatiladi. Koordinatalar ~1 km aniqlikkacha yaxlitlanadi.",
  },
  {
    q: "Telefon raqamim kimga koʻrinadi?",
    a: "Telefon raqamingiz ommaga chiqmaydi. Uni faqat siz ariza yuborgan ish beruvchi koʻra oladi. Qolgan muloqot platforma ichidagi chat orqali boʻladi.",
  },
  {
    q: "MATCH SCORE nima?",
    a: "Bu nomzodning aniq vakansiyaga qanchalik mos kelishini koʻrsatadigan foiz: hudud, masofa, kasb, koʻnikma, tajriba va boshqa omillar asosida hisoblanadi. Bu inson reytingi emas va ishga olish qarorini doim inson qabul qiladi.",
  },
  {
    q: "Qanday qilib “tasdiqlangan” belgisi olaman?",
    a: "Kabinetingizdagi “Tasdiqlash” boʻlimidan telefon, shaxs, sertifikat yoki kompaniya hujjatlarini yuboring. Moderatorlar tekshirib, belgini beradi.",
  },
];

export default async function HomePage() {
  const [regions, catalog, categories, regionStats, talent, jobs, candidates, { plans }] = await Promise.all([
    getRegions(),
    getCatalog(),
    getCategoryStats(),
    getRegionStats(),
    getTalentSummary(null, null, 6),
    latestVacancies(4),
    featuredCandidates(4),
    getPlans(),
  ]);
  const professions = catalog.flatMap((c) => c.professions.map((p) => ({ id: p.id, name: p.name, category: c.name })));
  const professionSlugs = new Map(catalog.flatMap((c) => c.professions.map((p) => [p.id, p.slug] as const)));

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 text-white">
        <div aria-hidden className="absolute -top-24 -right-24 size-96 rounded-full bg-white/10 blur-3xl" />
        <Container className="relative py-12 sm:py-20">
          <div className="max-w-3xl">
            <Badge tone="warning" className="mb-4">Oʻzbekistonning hududiy ish va kadrlar platformasi</Badge>
            <h1 className="text-3xl leading-tight font-extrabold tracking-tight sm:text-5xl">
              Kadr ham, ish ham — oʻz hududingizdan toping.
            </h1>
            <p className="mt-4 text-base text-brand-50 sm:text-lg">
              Tumaningiz, shaharingiz, qishlogʻingiz yoki mahallangizdagi imkoniyatlarni bir joydan toping.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/jobs" variant="accent" size="lg">Ish qidiraman</ButtonLink>
              <ButtonLink href="/candidates" size="lg" className="bg-white text-brand-800 hover:bg-brand-50">Kadr qidiraman</ButtonLink>
            </div>
          </div>
          <div className="mt-10">
            <SearchBar regions={regions} professions={professions} />
          </div>
        </Container>
      </section>

      {talent.length > 0 ? (
        <section className="border-b border-slate-200 bg-white">
          <Container className="py-10">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Hududingizdagi kadrlar</h2>
                <p className="text-sm text-slate-600">Mahalliy mutaxassislar xaritasi — kim qayerda ishlashga tayyor.</p>
              </div>
              <Link href="/candidates" className="text-sm font-medium text-brand-700 hover:underline">Barchasi →</Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {talent.map((t) => (
                <Link key={t.profession_id} href={`/candidates/${t.profession_slug}`} className="group flex items-center gap-3 rounded-xl border border-slate-200 p-4 hover:border-brand-300 hover:bg-brand-50">
                  <span className="inline-flex size-10 items-center justify-center rounded-full bg-brand-100 text-brand-700"><UsersIcon /></span>
                  <span>
                    <span className="block font-semibold text-slate-900 group-hover:text-brand-800">{formatNumber(Number(t.candidate_count))} ta {t.profession_name?.toLowerCase()}</span>
                    <span className="text-xs text-slate-500">{formatNumber(Number(t.vacancy_count))} ta ochiq vakansiya</span>
                  </span>
                </Link>
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      <Container className="py-12">
        <h2 className="mb-6 text-xl font-bold text-slate-900 sm:text-2xl">Mashhur yoʻnalishlar</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {(categories.length ? categories : catalog.map((c) => ({ id: c.id, slug: c.slug, name_uz: c.name, icon: c.icon, vacancy_count: 0, candidate_count: 0 }))).map((c) => (
            <Link key={c.id} href={`/jobs?category=${c.id}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow">
              <span className="text-2xl" aria-hidden>{c.icon}</span>
              <p className="mt-2 font-semibold text-slate-900">{c.name_uz}</p>
              <p className="text-xs text-slate-500">{formatNumber(Number(c.vacancy_count ?? 0))} vakansiya · {formatNumber(Number(c.candidate_count ?? 0))} mutaxassis</p>
            </Link>
          ))}
        </div>
      </Container>

      {jobs.length > 0 || candidates.length > 0 ? (
        <Container className="grid gap-10 pb-12 lg:grid-cols-2">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Yangi vakansiyalar</h2>
              <Link href="/jobs" className="text-sm font-medium text-brand-700 hover:underline">Barchasi →</Link>
            </div>
            <div className="space-y-4">{jobs.map((v) => <VacancyCard key={v.id} v={v} />)}</div>
          </section>
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Ishga tayyor mutaxassislar</h2>
              <Link href="/candidates" className="text-sm font-medium text-brand-700 hover:underline">Barchasi →</Link>
            </div>
            <div className="space-y-4">{candidates.map((c) => <CandidateCard key={c.id} c={c} />)}</div>
          </section>
        </Container>
      ) : null}

      <section className="bg-white py-12">
        <Container>
          <h2 className="mb-6 text-xl font-bold text-slate-900 sm:text-2xl">Viloyatlar boʻyicha</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {(regionStats.length ? regionStats : regions.map((r) => ({ id: r.id, slug: r.slug, name_uz: r.name, vacancy_count: 0, candidate_count: 0 }))).map((r) => (
              <Link key={r.id} href={`/jobs/${r.slug}`} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-slate-50">
                <span className="flex items-center gap-2 text-slate-800"><PinIcon size={16} className="text-brand-600" />{r.name_uz}</span>
                <span className="text-xs text-slate-500">{formatNumber(Number(r.vacancy_count ?? 0))}</span>
              </Link>
            ))}
          </div>
          {professionSlugs.size > 0 ? (
            <p className="mt-6 text-xs text-slate-500">
              Mashhur qidiruvlar:{" "}
              <Link className="hover:underline" href="/jobs/xorazm/urganch-shahri">Urganchda ish</Link> ·{" "}
              <Link className="hover:underline" href="/jobs/qashqadaryo/kitob">Kitob tumanida ish</Link> ·{" "}
              <Link className="hover:underline" href="/candidates/toshkent/elektrik">Toshkentda elektriklar</Link> ·{" "}
              <Link className="hover:underline" href="/candidates/qoraqalpogiston/qongirot/traktorchi">Qoʻngʻirotda traktorchilar</Link>
            </p>
          ) : null}
        </Container>
      </section>

      <Container className="py-12">
        <h2 className="mb-8 text-center text-xl font-bold text-slate-900 sm:text-2xl">Qanday ishlaydi?</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: PinIcon, t: "1. Hududingizni tanlang", d: "Viloyat → tuman → qishloq → mahalla. Yoki “Mening joylashuvim” tugmasini bosing." },
            { icon: BriefcaseIcon, t: "2. Kasbni tanlang", d: "Elektrik, haydovchi, oshpaz, dasturchi… 50 dan ortiq kasblar katalogi." },
            { icon: TargetIcon, t: "3. Eng yaqinini toping", d: "Natijalar avval mahallangiz, keyin tuman, keyin qoʻshni hududlar boʻyicha chiqadi." },
          ].map(({ icon: Icon, t, d }) => (
            <Card key={t} className="text-center">
              <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-700"><Icon size={24} /></span>
              <h3 className="mt-3 font-semibold text-slate-900">{t}</h3>
              <p className="mt-1 text-sm text-slate-600">{d}</p>
            </Card>
          ))}
        </div>
      </Container>

      <Container className="grid gap-4 pb-12 md:grid-cols-2">
        <Card className="bg-slate-900 text-white">
          <h2 className="text-xl font-bold">Ish beruvchilar uchun</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-200">
            {["Vakansiyani 3 daqiqada joylang", "Tizim mos nomzodlarni MATCH SCORE bilan tavsiya qiladi", "Arizalarni bosqichma-bosqich boshqaring", "Nomzodlar bilan xavfsiz chat"].map((x) => (
              <li key={x} className="flex gap-2"><CheckIcon size={18} className="shrink-0 text-accent-400" />{x}</li>
            ))}
          </ul>
          <ButtonLink href="/register?role=employer" variant="accent" className="mt-6">Vakansiya joylash</ButtonLink>
        </Card>
        <Card className="bg-brand-50">
          <h2 className="text-xl font-bold text-slate-900">Ish izlovchilar uchun</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {["Bepul profil va avtomatik CV", "Uyingizga yaqin ishlar birinchi", "Yangi mos vakansiya chiqsa — bildirishnoma", "Manzilingiz va raqamingiz himoyalangan"].map((x) => (
              <li key={x} className="flex gap-2"><ShieldIcon size={18} className="shrink-0 text-brand-600" />{x}</li>
            ))}
          </ul>
          <ButtonLink href="/register?role=job_seeker" className="mt-6">Profil yaratish</ButtonLink>
        </Card>
      </Container>

      {plans.length > 0 ? (
        <section className="bg-white py-12">
          <Container>
            <div className="mb-6 flex items-end justify-between">
              <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Tariflar</h2>
              <Link href="/pricing" className="text-sm font-medium text-brand-700 hover:underline">Batafsil →</Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {plans.map((p) => (
                <Card key={p.id} className={p.code === "PRO" ? "border-brand-500 ring-2 ring-brand-500" : undefined}>
                  <p className="font-semibold text-slate-900">{p.name_uz}</p>
                  <p className="mt-1 text-2xl font-extrabold text-slate-900">{p.price_uzs ? `${formatNumber(p.price_uzs)} soʻm` : "Bepul"}</p>
                  {p.price_uzs ? <p className="text-xs text-slate-500">oyiga</p> : <p className="text-xs text-slate-500">doimiy</p>}
                </Card>
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      <Container className="py-12">
        <h2 className="mb-6 text-xl font-bold text-slate-900 sm:text-2xl">Koʻp soʻraladigan savollar</h2>
        <div className="space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="rounded-xl border border-slate-200 bg-white p-4">
              <summary className="cursor-pointer font-medium text-slate-900">{f.q}</summary>
              <p className="mt-2 text-sm text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </>
  );
}
