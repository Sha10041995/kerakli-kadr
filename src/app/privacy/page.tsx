import type { Metadata } from "next";
import { Card, Container, PageHeader } from "@/components/ui/misc";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("pages.privacy.title"), alternates: { canonical: "/privacy" } };
}

const SECTIONS = [1, 2, 3, 4, 5] as const;

export default async function PrivacyPage() {
  const { t } = await getI18n();
  return (
    <Container className="max-w-3xl py-10">
      <PageHeader title={t("pages.privacy.title")} description={t("pages.privacy.intro")} />
      <Card className="space-y-4 text-sm leading-relaxed text-slate-700">
        {SECTIONS.map((n) => (
          <section key={n} className="space-y-2">
            <h2 className="text-base font-semibold text-slate-900">{t(`pages.privacy.h${n}`)}</h2>
            <p>{t(`pages.privacy.p${n}`)}</p>
          </section>
        ))}
      </Card>
    </Container>
  );
}
