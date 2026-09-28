import type { Metadata } from "next";
import { Card, Container, PageHeader } from "@/components/ui/misc";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("pages.about.title"), alternates: { canonical: "/about" } };
}

export default async function AboutPage() {
  const { t } = await getI18n();
  return (
    <Container className="max-w-3xl py-10">
      <PageHeader title={t("pages.about.title")} />
      <Card className="space-y-4 text-slate-700">
        <p className="text-lg font-semibold text-slate-900">{t("pages.about.motto")}</p>
        <p>{t("pages.about.p1")}</p>
        <p>{t("pages.about.p2")}</p>
        <p>{t("pages.about.p3")}</p>
      </Card>
    </Container>
  );
}
