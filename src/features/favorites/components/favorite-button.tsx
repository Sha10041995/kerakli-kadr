"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { StarIcon } from "@/components/ui/icons";
import { toggleFavoriteAction } from "@/features/favorites/actions";

export function FavoriteButton({
  kind,
  targetId,
  initial,
}: {
  kind: "vacancy" | "candidate";
  targetId: string;
  initial: boolean;
}) {
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
            else setError(res.error);
          })
        }
      >
        <StarIcon size={16} className={saved ? "text-amber-500" : "text-slate-300"} />
        {saved ? "Saqlangan" : "Saqlash"}
      </Button>
      {error ? <span className="mt-1 text-xs text-red-600">{error}</span> : null}
    </span>
  );
}
