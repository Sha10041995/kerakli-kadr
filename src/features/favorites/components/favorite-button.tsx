"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { StarIcon } from "@/components/ui/icons";
import { toggleFavoriteAction } from "@/features/favorites/actions";
import { useI18n } from "@/lib/i18n/client";

export function FavoriteButton({
  kind,
  targetId,
  initial,
}: {
  kind: "vacancy" | "candidate";
  targetId: string;
  initial: boolean;
}) {
  const { t, tr } = useI18n();
  const [saved, setSaved] = useState(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col">
      <Button
        variant="outline"
        size="sm"
        aria-pressed={saved}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await toggleFavoriteAction(kind, targetId);
            if (res.ok) setSaved(Boolean(res.data?.saved));
            else setError(tr(res.error));
          })
        }
      >
        <StarIcon size={16} className={saved ? "text-amber-500" : "text-slate-300"} />
        {saved ? t("search.favSaved") : t("search.favSave")}
      </Button>
      {error ? <span className="mt-1 text-xs text-red-600">{error}</span> : null}
    </span>
  );
}
