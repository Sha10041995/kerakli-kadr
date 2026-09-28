"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/form";
import { ActionForm } from "@/components/ui/action-form";
import { submitReportAction } from "@/features/reports/actions";
import { useI18n } from "@/lib/i18n/client";
import { enumOptions } from "@/lib/i18n/dictionary";

type Target = "vacancy" | "user" | "company" | "message" | "review";

export function ReportButton({ targetType, targetId }: { targetType: Target; targetId: string }) {
  const { t, d } = useI18n();
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-slate-500 hover:text-red-600 hover:underline">
        {t("company.report")}
      </button>
    );
  }
  return (
    <ActionForm
      action={(fd) =>
        submitReportAction({
          targetType,
          targetId,
          reason: fd.get("reason"),
          details: String(fd.get("details") ?? "") || undefined,
        })
      }
      className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3"
      resetOnSuccess={false}
    >
      <p className="text-sm font-medium text-red-900">{t("company.reportTitle")}</p>
      <Select name="reason" required defaultValue="" aria-label={t("company.reason")}>
        <option value="" disabled>
          {t("company.chooseReason")}
        </option>
        {enumOptions(d.enums.reportReason).map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      <Textarea
        name="details"
        rows={2}
        maxLength={2000}
        placeholder={t("company.detailsOptional")}
        aria-label={t("company.details")}
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="danger">
          {t("common.send")}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          {t("common.cancel")}
        </Button>
      </div>
    </ActionForm>
  );
}
