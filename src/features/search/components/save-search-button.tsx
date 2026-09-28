"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { BellIcon } from "@/components/ui/icons";
import { saveSearchAction } from "@/features/search/actions";
import { useI18n } from "@/lib/i18n/client";

type Props = {
  kind: "vacancies" | "candidates";
  label: string;
  search: {
    q?: string;
    profession?: number;
    category?: number;
    region?: number;
    district?: number;
    settlement?: number;
    radius?: number;
  };
};

export function SaveSearchButton({ kind, label, search }: Props) {
  const { t, tr } = useI18n();
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
            setMsg(res.ok ? { ok: true, text: tr(res.message) || t("search.saved") } : { ok: false, text: tr(res.error) });
          })
        }
      >
        <BellIcon size={16} /> {msg?.ok ? t("search.saved") : t("search.saveSearch")}
      </Button>
      {msg ? (
        <p role="status" className={msg.ok ? "text-xs text-emerald-700" : "text-xs text-red-600"}>
          {msg.text}
        </p>
      ) : null}
    </div>
  );
}
