import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function listConversations(userId: string) {
  const supabase = await createClient();
  const { data: mine } = await supabase
    .from("conversation_participants")
    .select("conversation_id, last_read_at, conversations(id, last_message_at, vacancy_id, vacancies(title))")
    .eq("user_id", userId);
  const ids = (mine ?? []).map((m) => m.conversation_id);
  if (!ids.length) return [];
  const [{ data: others }, { data: recent }] = await Promise.all([
    supabase.from("conversation_participants").select("conversation_id, user_id").in("conversation_id", ids).neq("user_id", userId),
    supabase.from("messages").select("conversation_id, body, kind, sender_id, created_at").in("conversation_id", ids).order("created_at", { ascending: false }).limit(300),
  ]);
  const otherIds = [...new Set((others ?? []).map((o) => o.user_id))];
  const { data: people } = otherIds.length
    ? await supabase.from("public_profiles").select("id, first_name, last_name, avatar_url").in("id", otherIds)
    : { data: [] };
  const personById = new Map((people ?? []).map((p) => [p.id, p]));
  const lastByConv = new Map<string, NonNullable<typeof recent>[number]>();
  for (const m of recent ?? []) if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m);

  return (mine ?? [])
    .map((m) => {
      const other = (others ?? []).find((o) => o.conversation_id === m.conversation_id);
      const last = lastByConv.get(m.conversation_id);
      return {
        id: m.conversation_id,
        vacancyTitle: m.conversations?.vacancies?.title ?? null,
        lastMessageAt: m.conversations?.last_message_at ?? null,
        other: other ? personById.get(other.user_id) ?? null : null,
        last,
        unread: Boolean(last && last.sender_id !== userId && (!m.last_read_at || last.created_at > m.last_read_at)),
      };
    })
    .sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""));
}

export async function getConversation(conversationId: string, userId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(conversationId)) return null;
  const supabase = await createClient();
  const { data: conv } = await supabase
    .from("conversations")
    .select("id, vacancy_id, application_id, vacancies(id, title)")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conv) return null;
  const [{ data: participants }, { data: messages }] = await Promise.all([
    supabase.from("conversation_participants").select("user_id, is_blocked").eq("conversation_id", conversationId),
    supabase
      .from("messages")
      .select("id, sender_id, body, kind, attachment_path, attachment_name, is_flagged, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  const otherId = (participants ?? []).find((p) => p.user_id !== userId)?.user_id ?? null;
  const { data: other } = otherId
    ? await supabase.from("public_profiles").select("id, first_name, last_name, avatar_url").eq("id", otherId).maybeSingle()
    : { data: null };
  const me = (participants ?? []).find((p) => p.user_id === userId);
  return { conv, other, messages: (messages ?? []).reverse(), blockedByMe: me?.is_blocked ?? false };
}
