"use client";

import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/misc";
import { BriefcaseIcon, UserIcon } from "@/components/ui/icons";
import { chooseRoleAction } from "@/features/auth/actions";

export function RoleChooser() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const choose = (role: "job_seeker" | "employer") =>
    start(async () => {
      const res = await chooseRoleAction(role);
      if (res && !res.ok) setError(res.error);
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
          <p className="mt-2 font-semibold text-slate-900">Ish izlayapman</p>
          <p className="text-sm text-slate-600">Profil va CV yarating, yaqin ishlarni toping.</p>
        </button>
        <button
          disabled={pending}
          onClick={() => choose("employer")}
          className="hover:border-brand-500 hover:bg-brand-50 rounded-xl border-2 border-slate-200 p-5 text-left disabled:opacity-50"
        >
          <BriefcaseIcon size={28} className="text-brand-600" />
          <p className="mt-2 font-semibold text-slate-900">Xodim izlayapman</p>
          <p className="text-sm text-slate-600">Vakansiya joylang va mahalliy kadrlarni toping.</p>
        </button>
      </div>
    </div>
  );
}
