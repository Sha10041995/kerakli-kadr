"use client";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/misc";
import { useI18n } from "@/lib/i18n/client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  return (
    <Container className="flex flex-col items-center py-24 text-center">
      <h1 className="text-2xl font-bold text-slate-900">{t("common.errorTitle")}</h1>
      <p className="mt-2 text-slate-600">{t("common.errorText")}</p>
      <Button className="mt-6" onClick={reset}>
        {t("common.retry")}
      </Button>
    </Container>
  );
}
