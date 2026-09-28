"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { startConversationAction } from "@/features/messaging/actions";
import { useI18n } from "@/lib/i18n/client";

export function StartChatButton({ otherUserId, vacancyId, label }: { otherUserId: string; vacancyId?: string; label?: string }) {
  const router = useRouter();
  const { t, tr } = useI18n();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await startConversationAction({ otherUserId, vacancyId });
            if (res.ok && res.data) router.push(`/messages/${res.data.conversationId}`);
            else if (!res.ok) setError(tr(res.error));
          })
        }
      >
        {pending ? "…" : (label ?? t("company.contact"))}
      </Button>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
