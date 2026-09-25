"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { startConversationAction } from "@/features/messaging/actions";

export function StartChatButton({ otherUserId, vacancyId, label = "Bogʻlanish" }: { otherUserId: string; vacancyId?: string; label?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => start(async () => {
        const res = await startConversationAction({ otherUserId, vacancyId });
        if (res.ok && res.data) router.push(`/messages/${res.data.conversationId}`);
        else if (!res.ok) setError(res.error);
      })}>{pending ? "…" : label}</Button>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
