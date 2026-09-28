import Link from "next/link";
import { getCurrentUser } from "@/features/auth/session";
import { getUnreadCount } from "@/features/notifications/queries";
import { Avatar, Container } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { BellIcon, ChatIcon } from "@/components/ui/icons";
import { getI18n } from "@/lib/i18n/server";
import { SITE_NAME } from "@/lib/seo";
import { LocaleSwitcher } from "./locale-switcher";

export async function SiteHeader() {
  const [user, { t }] = await Promise.all([getCurrentUser(), getI18n()]);
  const unread = user ? await getUnreadCount(user.id) : 0;

  return (
    <header className="no-print sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <Container className="flex h-14 items-center gap-4 sm:h-16">
        <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight text-slate-900">
          <span className="bg-brand-600 inline-flex size-8 items-center justify-center rounded-lg text-sm text-white">KT</span>
          <span className="hidden sm:inline">{SITE_NAME}</span>
        </Link>
        <nav aria-label={t("nav.mainMenu")} className="hidden items-center gap-1 text-sm font-medium text-slate-600 md:flex">
          <Link href="/jobs" className="rounded-md px-3 py-2 hover:bg-slate-100 hover:text-slate-900">
            {t("nav.jobs")}
          </Link>
          <Link href="/candidates" className="rounded-md px-3 py-2 hover:bg-slate-100 hover:text-slate-900">
            {t("nav.candidates")}
          </Link>
          <Link href="/pricing" className="rounded-md px-3 py-2 hover:bg-slate-100 hover:text-slate-900">
            {t("nav.pricing")}
          </Link>
          {user?.isStaff ? (
            <Link href="/admin" className="text-brand-700 hover:bg-brand-50 rounded-md px-3 py-2">
              {t("nav.admin")}
            </Link>
          ) : null}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LocaleSwitcher className="hidden sm:block" />
          {user ? (
            <>
              {user.isEmployer ? (
                <ButtonLink href="/dashboard/vacancies/new" size="sm" className="hidden sm:inline-flex">
                  {t("nav.addVacancy")}
                </ButtonLink>
              ) : null}
              <Link
                href="/messages"
                aria-label={t("nav.messages")}
                className="hidden rounded-full p-2 text-slate-600 hover:bg-slate-100 md:inline-flex"
              >
                <ChatIcon />
              </Link>
              <Link
                href="/notifications"
                aria-label={`${t("nav.notifications")}${unread ? ` (${unread})` : ""}`}
                className="relative rounded-full p-2 text-slate-600 hover:bg-slate-100"
              >
                <BellIcon />
                {unread > 0 ? (
                  <span className="absolute top-1 right-1 inline-flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                ) : null}
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-full p-1 hover:bg-slate-100"
                aria-label={t("nav.cabinet")}
              >
                <Avatar src={user.avatarUrl} first={user.firstName} last={user.lastName} size={32} />
              </Link>
            </>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm">
                {t("nav.login")}
              </ButtonLink>
              <ButtonLink href="/register" size="sm">
                {t("nav.register")}
              </ButtonLink>
            </>
          )}
        </div>
      </Container>
    </header>
  );
}
