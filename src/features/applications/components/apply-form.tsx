"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { Alert } from "@/components/ui/misc";
import { ActionForm } from "@/components/ui/action-form";
import { applyAction } from "@/features/applications/actions";

type State = "guest" | "no_role" | "no_profile" | "can_apply" | "applied" | "own" | "closed";

export function ApplyForm({ vacancyId, state }: { vacancyId: string; state: State }) {
  const [done, setDone] = useState(false);
  if (state === "closed") return <Alert tone="warning">Bu vakansiya hozir ariza qabul qilmayapti.</Alert>;
  if (state === "own") return <Alert tone="info">Bu sizning vakansiyangiz.</Alert>;
  if (state === "applied" || done) return <Alert tone="success">Siz ariza yuborgansiz. Holatini “Arizalarim” boʻlimida kuzating.</Alert>;
  if (state === "guest") {
    return (
      <div className="space-y-2 text-sm text-slate-600">
        <p>Ariza yuborish uchun tizimga kiring.</p>
        <div className="flex gap-2">
          <Link href={`/login?next=/vacancy/${vacancyId}`} className="font-medium text-brand-700 hover:underline">Kirish</Link>
          <span>·</span>
          <Link href="/register?role=job_seeker" className="font-medium text-brand-700 hover:underline">Roʻyxatdan oʻtish</Link>
        </div>
      </div>
    );
  }
  if (state === "no_role" || state === "no_profile") {
    return (
      <Alert tone="info">
        Ariza yuborishdan oldin <Link href="/dashboard/profile" className="font-medium underline">ish izlovchi profilingizni</Link> toʻldiring.
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
      <Textarea name="coverLetter" rows={3} maxLength={3000} placeholder="Qisqacha oʻzingiz haqingizda (ixtiyoriy)" aria-label="Qoʻshimcha xat" />
      <Button type="submit" className="w-full">Ariza yuborish</Button>
      <p className="text-xs text-slate-500">Ish beruvchi profilingizni va telefon raqamingizni koʻra oladi.</p>
    </ActionForm>
  );
}
