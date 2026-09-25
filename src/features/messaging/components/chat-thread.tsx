"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { getBrowserClient } from "@/lib/supabase/client";
import { analyzeMessage } from "@/features/messaging/moderation";
import { getAttachmentUrlAction, markConversationReadAction, sendMessageAction } from "@/features/messaging/actions";
import { cn } from "@/lib/utils";

export type ChatMessage = {
  id: string;
  sender_id: string | null;
  body: string | null;
  kind: string;
  attachment_path: string | null;
  attachment_name: string | null;
  is_flagged: boolean;
  created_at: string;
};

function Attachment({ path, name }: { path: string; name: string | null }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="mt-1 text-xs underline"
      onClick={() => start(async () => {
        const res = await getAttachmentUrlAction(path);
        if (res.ok && res.data) window.open(res.data.url, "_blank", "noopener,noreferrer");
      })}
    >
      📎 {name ?? "Fayl"}
    </button>
  );
}

export function ChatThread({ conversationId, meId, initial }: { conversationId: string; meId: string; initial: ChatMessage[] }) {
  const [messages, setMessages] = useState(initial);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const bottom = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const warning = body ? analyzeMessage(body).warning : null;

  useEffect(() => {
    void markConversationReadAction(conversationId);
    const supabase = getBrowserClient();
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as ChatMessage;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          if (m.sender_id !== meId) void markConversationReadAction(conversationId);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, meId]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  function send() {
    const file = fileRef.current?.files?.[0];
    if (!body.trim() && !file) return;
    const fd = new FormData();
    fd.set("conversationId", conversationId);
    fd.set("body", body);
    if (file) fd.set("file", file);
    start(async () => {
      setError(null);
      const res = await sendMessageAction(fd);
      if (!res.ok) return setError(res.error);
      setBody("");
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  return (
    <div className="flex h-[calc(100dvh-16rem)] min-h-96 flex-col rounded-xl border border-slate-200 bg-white">
      <div className="flex-1 space-y-2 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 ? <p className="text-center text-sm text-slate-500">Suhbatni boshlang</p> : null}
        {messages.map((m) => {
          const mine = m.sender_id === meId;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[80%] rounded-2xl px-3 py-2 text-sm", mine ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-900")}>
                {m.body ? <p className="break-words whitespace-pre-wrap">{m.body}</p> : null}
                {m.attachment_path ? <Attachment path={m.attachment_path} name={m.attachment_name} /> : null}
                {m.is_flagged && !mine ? <p className="mt-1 text-[11px] text-amber-700">⚠ Havolali xabar — ehtiyot boʻling</p> : null}
                <p className={cn("mt-0.5 text-[10px]", mine ? "text-brand-100" : "text-slate-400")}>
                  {new Date(m.created_at).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      <form
        className="border-t border-slate-200 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        {warning ? <p className="mb-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">{warning}</p> : null}
        {error ? <p role="alert" className="mb-2 text-xs text-red-600">{error}</p> : null}
        <div className="flex items-end gap-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            maxLength={4000}
            placeholder="Xabar yozing…"
            aria-label="Xabar"
            className="min-h-10 flex-1 resize-none"
          />
          <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50" title="Fayl biriktirish (rasm yoki PDF, 10 MB)">
            📎
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" />
          </label>
          <Button type="submit" disabled={pending}>{pending ? "…" : "Yuborish"}</Button>
        </div>
      </form>
    </div>
  );
}
