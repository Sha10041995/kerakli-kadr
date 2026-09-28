"use client";

import { useI18n } from "@/lib/i18n/client";
import { Badge } from "./misc";

export function DemoBadge() {
  const { t } = useI18n();
  return (
    <Badge tone="warning" title={t("common.demoTitle")}>
      DEMO
    </Badge>
  );
}
