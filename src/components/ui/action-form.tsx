"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/lib/errors";

/**
 * FormData-based form bound to a server action returning ActionResult.
 * Shows the error, resets the form and refreshes the page on success.
 */
export function ActionForm({
  action,
  children,
  className,
  successMessage,
  resetOnSuccess = true,
}: {
  action: (fd: FormData) => Promise<ActionResult | ActionResult<unknown>>;
  children: ReactNode;
  className?: string;
  successMessage?: string;
  resetOnSuccess?: boolean;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <form
      ref={ref}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const res = await action(fd);
          if (res.ok) {
            setMsg(successMessage || res.message ? { ok: true, text: res.message ?? successMessage ?? "" } : null);
            if (resetOnSuccess) ref.current?.reset();
            router.refresh();
          } else {
            const firstField = Object.values(res.fieldErrors ?? {})[0]?.[0];
            setMsg({ ok: false, text: firstField ? `${res.error}: ${firstField}` : res.error });
          }
        });
      }}
    >
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {msg ? (
        <p role="status" className={msg.ok ? "mt-2 text-sm text-emerald-700" : "mt-2 text-sm text-red-600"}>{msg.text}</p>
      ) : null}
    </form>
  );
}

export function ConfirmButton({
  onConfirm,
  children,
  confirmText = "Ishonchingiz komilmi?",
  className,
}: {
  onConfirm: () => Promise<ActionResult | ActionResult<unknown>>;
  children: ReactNode;
  confirmText?: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        disabled={pending}
        className={className ?? "text-sm text-red-600 hover:underline disabled:opacity-50"}
        onClick={() => {
          if (!window.confirm(confirmText)) return;
          start(async () => {
            const res = await onConfirm();
            if (!res.ok) setError(res.error);
            else router.refresh();
          });
        }}
      >
        {children}
      </button>
      {error ? <span role="alert" className="ml-2 text-xs text-red-600">{error}</span> : null}
    </>
  );
}
