"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/form";
import { ActionForm } from "@/components/ui/action-form";
import { submitReportAction } from "@/features/reports/actions";
import { REPORT_REASON_LABELS, options } from "@/lib/i18n/uz";

type Target = "vacancy" | "user" | "company" | "message" | "review";

export function ReportButton({ targetType, targetId }: { targetType: Target; targetId: string }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-slate-500 hover:text-red-600 hover:underline">
        Shikoyat qilish
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
      <p className="text-sm font-medium text-red-900">Nima muammo bor?</p>
      <Select name="reason" required defaultValue="" aria-label="Sabab">
        <option value="" disabled>
          Sababni tanlang
        </option>
        {options(REPORT_REASON_LABELS).map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      <Textarea name="details" rows={2} maxLength={2000} placeholder="Batafsil (ixtiyoriy)" aria-label="Batafsil" />
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="danger">
          Yuborish
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Bekor qilish
        </Button>
      </div>
    </ActionForm>
  );
}
