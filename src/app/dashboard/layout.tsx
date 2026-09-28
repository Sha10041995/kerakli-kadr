import Link from "next/link";
import { Container } from "@/components/ui/misc";
import { requireUser } from "@/features/auth/session";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { getI18n } from "@/lib/i18n/server";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const user = await requireUser("/dashboard");
  const { t } = await getI18n();
  const items = [
    { href: "/dashboard", label: t("dashboard.nav.overview") },
    ...(user.isJobSeeker
      ? [
          { href: "/dashboard/profile", label: t("dashboard.nav.profile") },
          { href: "/dashboard/cv", label: t("dashboard.nav.cv") },
          { href: "/dashboard/applications", label: t("dashboard.nav.applications") },
        ]
      : []),
    ...(user.isEmployer
      ? [
          { href: "/dashboard/company", label: t("dashboard.nav.company") },
          { href: "/dashboard/vacancies", label: t("dashboard.nav.vacancies") },
        ]
      : []),
    { href: "/dashboard/saved", label: t("dashboard.nav.saved") },
    { href: "/messages", label: t("dashboard.nav.messages") },
    { href: "/dashboard/verification", label: t("dashboard.nav.verification") },
    { href: "/dashboard/billing", label: t("dashboard.nav.billing") },
    { href: "/dashboard/settings", label: t("dashboard.nav.settings") },
    { href: "/support", label: t("dashboard.nav.support") },
  ];
  return (
    <Container className="py-6 sm:py-8">
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="no-print">
          <DashboardNav items={items} />
          <form action="/auth/signout" method="post" className="mt-2 hidden lg:block">
            <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-100">
              {t("dashboard.signOut")}
            </button>
          </form>
          {!user.isJobSeeker && !user.isEmployer ? (
            <Link href="/onboarding" className="text-brand-700 mt-2 block text-sm">
              {t("dashboard.chooseRoleLink")}
            </Link>
          ) : null}
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  );
}
