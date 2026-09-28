"use client";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";

export function PrintButton() {
  const { t } = useI18n();
  return (
    <Button variant="outline" onClick={() => window.print()}>
      {t("common.print")}
    </Button>
  );
}
