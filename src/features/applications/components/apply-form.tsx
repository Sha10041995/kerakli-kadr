"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { Alert } from "@/components/ui/misc";
import { ActionForm } from "@/components/ui/action-form";
import { applyAction } from "@/features/applications/actions";
import { useI18n } from "@/lib/i18n/client";

type State = "guest" | "no_role" | "no_profile" | "can_apply" | "applied" | "own" | "closed";

export function ApplyForm({ vacancyId, state }: { vacancyId: string; state: State }) {
  const { t } = useI18n();
  const [done, setDone] = useState(false);
  if (state === "closed") return <Alert tone="warning">{t("vacancy.closed")}</Alert>;
  if (state === "own") return <Alert tone="info">{t("vacancy.own")}</Alert>;
  if (state === "applied" || done) return <Alert tone="success">{t("vacancy.applied")}</Alert>;
  if (state === "guest") {
    return (
      <div className="space-y-2 text-sm text-slate-600">
        <p>{t("vacancy.loginToApply")}</p>
        <div className="flex gap-2">
          <Link href={`/login?next=/vacancy/${vacancyId}`} className="text-brand-700 font-medium hover:underline">
            {t("nav.login")}
          </Link>
          <span>·</span>
          <Link href="/register?role=job_seeker" className="text-brand-700 font-medium hover:underline">
            {t("nav.register")}
          </Link>
        </div>
      </div>
    );
  }
  if (state === "no_role" || state === "no_profile") {
    return (
      <Alert tone="info">
        {t("vacancy.completeProfileBefore")}{" "}
        <Link href="/dashboard/profile" className="font-medium underline">
          {t("vacancy.seekerProfile")}
        </Link>{" "}
        {t("vacancy.completeProfileAfter")}
      </Alert>
    );
  }
  return (
    <ActionForm
      action={async (fd) => {
        const res = await applyAction({ vacancyId, coverLetter: String(fd.get("coverLetter") ?? "") || undefined });
        if (res.ok) setDone(true);
        return res;
      }}
      className="space-y-3"
    >
      <Textarea
        name="coverLetter"
        rows={3}
        maxLength={3000}
        placeholder={t("vacancy.coverLetter")}
        aria-label={t("vacancy.coverLetterAria")}
      />
      <Button type="submit" className="w-full">
        {t("vacancy.applyTitle")}
      </Button>
      <p className="text-xs text-slate-500">{t("vacancy.applyNote")}</p>
    </ActionForm>
  );
}
