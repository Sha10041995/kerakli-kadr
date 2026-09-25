"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { BellIcon } from "@/components/ui/icons";
import { saveSearchAction } from "@/features/search/actions";

type Props = {
  kind: "vacancies" | "candidates";
  label: string;
  search: { q?: string; profession?: number; category?: number; region?: number; district?: number; settlement?: number; radius?: number };
};

export function SaveSearchButton({ kind, label, search }: Props) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <Button
        variant="outline"
        size="sm"
        disabled={pending || msg?.ok}
        onClick={() =>
          start(async () => {
            const res = await saveSearchAction({
              kind,
              name: label.slice(0, 120),
              query: search.q,
              professionId: search.profession ?? null,
              categoryId: search.category ?? null,
              regionId: search.region ?? null,
              districtId: search.district ?? null,
              settlementId: search.settlement ?? null,
              radiusKm: search.radius ?? null,
            });
            setMsg(res.ok ? { ok: true, text: res.message ?? "Saqlandi" } : { ok: false, text: res.error });
          })
        }
      >
        <BellIcon size={16} /> {msg?.ok ? "Saqlandi" : "Qidiruvni saqlash"}
      </Button>
      {msg ? <p role="status" className={msg.ok ? "text-xs text-emerald-700" : "text-xs text-red-600"}>{msg.text}</p> : null}
    </div>
  );
}
