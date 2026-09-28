import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { getCurrentUser } from "@/features/auth/session";
import { env } from "@/lib/env";
import { I18nProvider } from "@/lib/i18n/client";
import { HTML_LANG } from "@/lib/i18n/config";
import { getClientDictionary } from "@/lib/i18n/dictionary";
import { getI18n } from "@/lib/i18n/server";
import { SITE_NAME } from "@/lib/seo";

const OG_LOCALE = { uz: "uz_UZ", ru: "ru_RU", en: "en_US" } as const;

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return {
    metadataBase: new URL(env.siteUrl),
    title: { default: `${SITE_NAME} — ${t("common.siteTagline")}`, template: `%s | ${SITE_NAME}` },
    description: t("common.siteDescription"),
    applicationName: SITE_NAME,
    openGraph: { type: "website", siteName: SITE_NAME, locale: OG_LOCALE[locale] },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [user, { locale, t }] = await Promise.all([getCurrentUser(), getI18n()]);
  const role = !user ? "guest" : user.isEmployer ? "employer" : "candidate";
  return (
    <html lang={HTML_LANG[locale]} className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <I18nProvider locale={locale} dictionary={getClientDictionary(locale)}>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2"
          >
            {t("common.skipToContent")}
          </a>
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
          <MobileNav role={role} />
        </I18nProvider>
      </body>
    </html>
  );
}
