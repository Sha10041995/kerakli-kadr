"use client";

import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/misc";
import { BriefcaseIcon, UserIcon } from "@/components/ui/icons";
import { chooseRoleAction } from "@/features/auth/actions";
import { useI18n } from "@/lib/i18n/client";

export function RoleChooser() {
  const { t, tr } = useI18n();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const choose = (role: "job_seeker" | "employer") =>
    start(async () => {
      const res = await chooseRoleAction(role);
      if (res && !res.ok) setError(tr(res.error));
    });
  return (
    <div className="space-y-3">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          disabled={pending}
          onClick={() => choose("job_seeker")}
          className="hover:border-brand-500 hover:bg-brand-50 rounded-xl border-2 border-slate-200 p-5 text-left disabled:opacity-50"
        >
          <UserIcon size={28} className="text-brand-600" />
          <p className="mt-2 font-semibold text-slate-900">{t("auth.seekingJob")}</p>
          <p className="text-sm text-slate-600">{t("auth.seekingJobText")}</p>
        </button>
        <button
          disabled={pending}
          onClick={() => choose("employer")}
          className="hover:border-brand-500 hover:bg-brand-50 rounded-xl border-2 border-slate-200 p-5 text-left disabled:opacity-50"
        >
          <BriefcaseIcon size={28} className="text-brand-600" />
          <p className="mt-2 font-semibold text-slate-900">{t("auth.seekingStaff")}</p>
          <p className="text-sm text-slate-600">{t("auth.seekingStaffText")}</p>
        </button>
      </div>
    </div>
  );
}
