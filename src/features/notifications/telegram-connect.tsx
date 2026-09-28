"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/action-form";
import { createTelegramLinkAction, disconnectTelegramAction } from "@/features/notifications/settings-actions";

export function TelegramConnect({ connected }: { connected: boolean }) {
  const [pending, start] = useTransition();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (connected) {
    return (
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-emerald-700">✓ Telegram ulangan</span>
        <ConfirmButton confirmText="Telegramni uzasizmi?" onConfirm={disconnectTelegramAction}>
          Uzish
        </ConfirmButton>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 items-center rounded-lg bg-sky-500 px-4 text-sm font-medium text-white hover:bg-sky-600"
        >
          Telegramda ochish va “Start” ni bosing →
        </a>
      ) : (
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await createTelegramLinkAction();
              if (res.ok && res.data) setUrl(res.data.url);
              else if (!res.ok) setError(res.error);
            })
          }
        >
          Telegramni ulash
        </Button>
      )}
      {url ? <p className="text-xs text-slate-500">Havola 15 daqiqa amal qiladi.</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
