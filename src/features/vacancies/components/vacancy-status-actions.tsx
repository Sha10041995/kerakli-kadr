"use client";

import { ConfirmButton } from "@/components/ui/action-form";
import { deleteVacancyAction, setVacancyStatusAction } from "@/features/vacancies/actions";
import { useI18n } from "@/lib/i18n/client";

export function VacancyStatusActions({ id, status }: { id: string; status: string }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap gap-3 text-sm">
      {status === "active" || status === "pending_review" ? (
        <ConfirmButton
          className="text-slate-700 hover:underline"
          confirmText={t("employer.closeConfirm")}
          onConfirm={() => setVacancyStatusAction(id, "closed")}
        >
          {t("employer.close")}
        </ConfirmButton>
      ) : null}
      {status === "draft" || status === "closed" || status === "expired" ? (
        <ConfirmButton
          className="text-brand-700 font-medium hover:underline"
          confirmText={t("employer.publishConfirm")}
          onConfirm={() => setVacancyStatusAction(id, "pending_review")}
        >
          {t("employer.publish")}
        </ConfirmButton>
      ) : null}
      {status === "draft" ? (
        <ConfirmButton confirmText={t("employer.deleteDraftConfirm")} onConfirm={() => deleteVacancyAction(id)}>
          {t("common.delete")}
        </ConfirmButton>
      ) : null}
    </div>
  );
}
