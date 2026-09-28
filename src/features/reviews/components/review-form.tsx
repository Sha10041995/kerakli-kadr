"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { StarIcon } from "@/components/ui/icons";
import { ActionForm } from "@/components/ui/action-form";
import { submitReviewAction } from "@/features/reviews/actions";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export function ReviewForm({ applicationId, label }: { applicationId: string; label?: string }) {
  const { t } = useI18n();
  const [rating, setRating] = useState(5);
  return (
    <ActionForm
      action={(fd) => submitReviewAction({ applicationId, rating, comment: String(fd.get("comment") ?? "") || undefined })}
      className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3"
      resetOnSuccess={false}
    >
      <p className="text-sm font-medium text-slate-800">{label ?? t("company.leaveReview")}</p>
      <div className="flex gap-1" role="radiogroup" aria-label={t("company.rating")}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={t("company.stars", { n })}
            onClick={() => setRating(n)}
            className={cn("rounded p-0.5", n <= rating ? "text-amber-500" : "text-slate-300")}
          >
            <StarIcon size={22} />
          </button>
        ))}
      </div>
      <Textarea
        name="comment"
        rows={2}
        maxLength={2000}
        placeholder={t("company.commentOptional")}
        aria-label={t("company.comment")}
      />
      <Button type="submit" size="sm">
        {t("common.send")}
      </Button>
    </ActionForm>
  );
}
