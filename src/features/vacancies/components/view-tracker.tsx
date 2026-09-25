"use client";

import { useEffect } from "react";
import { recordVacancyViewAction } from "@/features/vacancies/actions";

export function ViewTracker({ vacancyId }: { vacancyId: string }) {
  useEffect(() => {
    void recordVacancyViewAction(vacancyId);
  }, [vacancyId]);
  return null;
}
