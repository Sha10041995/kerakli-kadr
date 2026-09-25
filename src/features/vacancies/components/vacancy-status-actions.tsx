"use client";

import { ConfirmButton } from "@/components/ui/action-form";
import { deleteVacancyAction, setVacancyStatusAction } from "@/features/vacancies/actions";

export function VacancyStatusActions({ id, status }: { id: string; status: string }) {
  return (
    <div className="flex flex-wrap gap-3 text-sm">
      {status === "active" || status === "pending_review" ? (
        <ConfirmButton
          className="text-slate-700 hover:underline"
          confirmText="Vakansiyani yopasizmi?"
          onConfirm={() => setVacancyStatusAction(id, "closed")}
        >
          Yopish
        </ConfirmButton>
      ) : null}
      {status === "draft" || status === "closed" || status === "expired" ? (
        <ConfirmButton
          className="text-brand-700 font-medium hover:underline"
          confirmText="Vakansiyani eʼlon qilasizmi?"
          onConfirm={() => setVacancyStatusAction(id, "pending_review")}
        >
          Eʼlon qilish
        </ConfirmButton>
      ) : null}
      {status === "draft" ? (
        <ConfirmButton confirmText="Qoralamani oʻchirasizmi?" onConfirm={() => deleteVacancyAction(id)}>
          Oʻchirish
        </ConfirmButton>
      ) : null}
    </div>
  );
}
