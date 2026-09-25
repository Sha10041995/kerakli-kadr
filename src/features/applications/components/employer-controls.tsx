"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { changeApplicationStatusAction, revealContactAction } from "@/features/applications/actions";
import { startConversationAction } from "@/features/messaging/actions";
import { nextStatuses, type ApplicationStatus } from "@/features/applications/status";
import { APPLICATION_STATUS_LABELS } from "@/lib/i18n/uz";

export function StatusSelect({ applicationId, status }: { applicationId: string; status: ApplicationStatus }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const next = nextStatuses(status);
  if (next.length === 0) return <span className="text-sm font-medium text-slate-700">{APPLICATION_STATUS_LABELS[status]}</span>;
  return (
    <div>
      <Select
        aria-label="Ariza holati"
        value=""
        disabled={pending}
        className="h-9 w-44"
        onChange={(e) => {
          const value = e.target.value as ApplicationStatus;
          if (!value) return;
          if (value === "hired" && !window.confirm("Nomzodni ishga qabul qilganingizni tasdiqlaysizmi?")) return;
          start(async () => {
            const res = await changeApplicationStatusAction({ applicationId, status: value });
            if (!res.ok) setError(res.error);
            else router.refresh();
          });
        }}
      >
        <option value="">{APPLICATION_STATUS_LABELS[status]} → …</option>
        {next.map((s) => (
          <option key={s} value={s}>
            {APPLICATION_STATUS_LABELS[s]}
          </option>
        ))}
      </Select>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

export function ContactButtons({ applicationId, candidateId }: { applicationId: string; candidateId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [contact, setContact] = useState<{ phone: string | null; email: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {contact ? (
        <span className="text-sm text-slate-800">
          {contact.phone ? (
            <a href={`tel:${contact.phone}`} className="text-brand-700 font-medium">
              {contact.phone}
            </a>
          ) : (
            "Telefon koʻrsatilmagan"
          )}
          {contact.email ? (
            <>
              {" "}
              ·{" "}
              <a href={`mailto:${contact.email}`} className="text-brand-700">
                {contact.email}
              </a>
            </>
          ) : null}
        </span>
      ) : (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await revealContactAction(applicationId);
              if (res.ok) setContact(res.data ?? null);
              else setError(res.error);
            })
          }
        >
          Kontaktni koʻrish
        </Button>
      )}
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await startConversationAction({ otherUserId: candidateId, applicationId });
            if (res.ok && res.data) router.push(`/messages/${res.data.conversationId}`);
            else if (!res.ok) setError(res.error);
          })
        }
      >
        Xabar yozish
      </Button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
