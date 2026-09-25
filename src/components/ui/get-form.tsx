"use client";

import { useRouter } from "next/navigation";
import type { ComponentProps, FormEvent } from "react";

/**
 * GET form that drops empty fields from the URL when JavaScript is available
 * (falls back to a normal GET submit without JS).
 */
export function GetForm({ action, children, ...props }: ComponentProps<"form"> & { action: string }) {
  const router = useRouter();
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const sp = new URLSearchParams();
    for (const [k, v] of fd.entries()) {
      if (typeof v === "string" && v.trim() !== "") sp.append(k, v.trim());
    }
    const qs = sp.toString();
    router.push(qs ? `${action}?${qs}` : action);
  }
  return (
    <form method="get" action={action} onSubmit={onSubmit} {...props}>
      {children}
    </form>
  );
}
