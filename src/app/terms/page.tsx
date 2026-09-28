import type { Metadata } from "next";
import { Card, Container, PageHeader } from "@/components/ui/misc";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("pages.terms.title"), alternates: { canonical: "/terms" } };
}

const RULES = [1, 2, 3, 4, 5, 6] as const;

export default async function TermsPage() {
  const { t } = await getI18n();
  return (
    <Container className="max-w-3xl py-10">
      <PageHeader title={t("pages.terms.title")} />
      <Card className="space-y-4 text-sm leading-relaxed text-slate-700">
        <p>{t("pages.terms.intro")}</p>
        <ul className="list-disc space-y-2 pl-5">
          {RULES.map((n) => (
            <li key={n}>{t(`pages.terms.r${n}`)}</li>
          ))}
        </ul>
      </Card>
    </Container>
  );
}
