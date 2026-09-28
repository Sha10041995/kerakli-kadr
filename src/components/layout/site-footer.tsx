import Link from "next/link";
import { Container } from "@/components/ui/misc";
import { getI18n } from "@/lib/i18n/server";
import { SITE_NAME } from "@/lib/seo";
import { LocaleSwitcher } from "./locale-switcher";

export async function SiteFooter() {
  const { t } = await getI18n();
  return (
    <footer className="no-print mt-16 border-t border-slate-200 bg-white pb-20 md:pb-0">
      <Container className="grid gap-8 py-10 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-extrabold text-slate-900">{SITE_NAME}</p>
          <p className="mt-2 max-w-xs">{t("nav.footerSlogan")}</p>
          <LocaleSwitcher className="mt-3" />
        </div>
        <div>
          <p className="font-semibold text-slate-900">{t("nav.forSeekers")}</p>
          <ul className="mt-2 space-y-1">
            <li>
              <Link href="/jobs" className="hover:text-brand-700">
                {t("nav.vacancies")}
              </Link>
            </li>
            <li>
              <Link href="/register?role=job_seeker" className="hover:text-brand-700">
                {t("nav.createResume")}
              </Link>
            </li>
            <li>
              <Link href="/jobs?urgent=1" className="hover:text-brand-700">
                {t("nav.urgentJobs")}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-slate-900">{t("nav.forEmployers")}</p>
          <ul className="mt-2 space-y-1">
            <li>
              <Link href="/candidates" className="hover:text-brand-700">
                {t("nav.talentBase")}
              </Link>
            </li>
            <li>
              <Link href="/register?role=employer" className="hover:text-brand-700">
                {t("nav.postVacancy")}
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="hover:text-brand-700">
                {t("nav.pricing")}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-slate-900">{t("nav.platform")}</p>
          <ul className="mt-2 space-y-1">
            <li>
              <Link href="/about" className="hover:text-brand-700">
                {t("nav.about")}
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-brand-700">
                {t("nav.privacy")}
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-brand-700">
                {t("nav.terms")}
              </Link>
            </li>
            <li>
              <Link href="/support" className="hover:text-brand-700">
                {t("nav.support")}
              </Link>
            </li>
          </ul>
        </div>
      </Container>
      <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} {SITE_NAME}. {t("common.copyright")}
      </div>
    </footer>
  );
}
