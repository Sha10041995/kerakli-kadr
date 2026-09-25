import Link from "next/link";
import { Container } from "@/components/ui/misc";
import { SITE_NAME } from "@/lib/seo";

export function SiteFooter() {
  return (
    <footer className="no-print mt-16 border-t border-slate-200 bg-white pb-20 md:pb-0">
      <Container className="grid gap-8 py-10 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-extrabold text-slate-900">{SITE_NAME}</p>
          <p className="mt-2 max-w-xs">Katta shaharda emas, oʻz hududingda ham imkoniyat bor.</p>
        </div>
        <div>
          <p className="font-semibold text-slate-900">Ish izlovchilar uchun</p>
          <ul className="mt-2 space-y-1">
            <li>
              <Link href="/jobs" className="hover:text-brand-700">
                Vakansiyalar
              </Link>
            </li>
            <li>
              <Link href="/register?role=job_seeker" className="hover:text-brand-700">
                Rezyume yaratish
              </Link>
            </li>
            <li>
              <Link href="/jobs?urgent=1" className="hover:text-brand-700">
                Shoshilinch ishlar
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-slate-900">Ish beruvchilar uchun</p>
          <ul className="mt-2 space-y-1">
            <li>
              <Link href="/candidates" className="hover:text-brand-700">
                Kadrlar bazasi
              </Link>
            </li>
            <li>
              <Link href="/register?role=employer" className="hover:text-brand-700">
                Vakansiya joylash
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="hover:text-brand-700">
                Tariflar
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-slate-900">Platforma</p>
          <ul className="mt-2 space-y-1">
            <li>
              <Link href="/about" className="hover:text-brand-700">
                Biz haqimizda
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-brand-700">
                Maxfiylik siyosati
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-brand-700">
                Foydalanish shartlari
              </Link>
            </li>
          </ul>
        </div>
      </Container>
      <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} {SITE_NAME}. Barcha huquqlar himoyalangan.
      </div>
    </footer>
  );
}
