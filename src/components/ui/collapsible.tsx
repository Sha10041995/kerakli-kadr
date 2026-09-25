"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Collapsed on mobile (toggle button), always expanded on large screens. */
export function MobileCollapsible({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-slate-800 lg:hidden"
      >
        {label}
        <span className="text-slate-400">{open ? "▲" : "▼"}</span>
      </button>
      <div className={cn(open ? "block" : "hidden", "lg:block")}>{children}</div>
    </div>
  );
}
