import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/misc";
import { getI18n } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <Container className="flex flex-col items-center py-24 text-center">
      <p className="text-brand-600 text-6xl font-extrabold">404</p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">{t("common.notFoundTitle")}</h1>
      <p className="mt-2 text-slate-600">{t("common.notFoundText")}</p>
      <div className="mt-6 flex gap-3">
        <ButtonLink href="/">{t("nav.home")}</ButtonLink>
        <ButtonLink href="/jobs" variant="outline">
          {t("nav.jobs")}
        </ButtonLink>
      </div>
    </Container>
  );
}
