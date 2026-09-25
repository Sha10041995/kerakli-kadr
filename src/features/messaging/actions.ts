"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fail, toUserMessage, type ActionResult } from "@/lib/errors";
import { uploadFile } from "@/features/uploads";
import { analyzeMessage } from "@/features/messaging/moderation";
import { messageSchema } from "@/validations/misc";
import { fieldErrors, uuidSchema } from "@/validations/common";

const startSchema = z.object({
  otherUserId: uuidSchema,
  vacancyId: uuidSchema.optional(),
  applicationId: uuidSchema.optional(),
});

export async function startConversationAction(input: unknown): Promise<ActionResult<{ conversationId: string }>> {
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return fail("Notoʻgʻri soʻrov");
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) return fail("Iltimos, avval tizimga kiring.");
  // Who may contact whom is enforced inside start_conversation() (SECURITY DEFINER).
  const { data, error } = await supabase.rpc("start_conversation", {
    p_other_user: parsed.data.otherUserId,
    p_vacancy_id: parsed.data.vacancyId ?? null,
    p_application_id: parsed.data.applicationId ?? null,
  });
  if (error || !data) return fail(toUserMessage(error));
  return { ok: true, data: { conversationId: data } };
}

export async function sendMessageAction(formData: FormData): Promise<ActionResult<{ warning: string | null }>> {
  const conversationId = String(formData.get("conversationId") ?? "");
  const body = String(formData.get("body") ?? "");
  const file = formData.get("file");
  const hasFile = file instanceof File && file.size > 0;

  if (!uuidSchema.safeParse(conversationId).success) return fail("Notoʻgʻri soʻrov");
  if (!hasFile) {
    const parsed = messageSchema.safeParse({ conversationId, body });
    if (!parsed.success) return fail("Xabarni tekshiring", fieldErrors(parsed.error));
  } else if (body.length > 4000) return fail("Xabar juda uzun");

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return fail("Iltimos, avval tizimga kiring.");

  let attachment: { path: string; name: string; mime: string } | null = null;
  if (hasFile) {
    const up = await uploadFile("chat-attachments", file, `${conversationId}/${userId}`);
    if (!up.ok) return fail(up.error);
    attachment = { path: up.path, name: file.name.slice(0, 200), mime: up.mime };
  }

  const analysis = analyzeMessage(body);
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: userId,
    body: body.trim() || null,
    kind: attachment ? (attachment.mime.startsWith("image/") ? "image" : "document") : "text",
    attachment_path: attachment?.path ?? null,
    attachment_name: attachment?.name ?? null,
    attachment_mime: attachment?.mime ?? null,
  });
  if (error) return fail(toUserMessage(error));
  revalidatePath(`/messages/${conversationId}`);
  return { ok: true, data: { warning: analysis.warning } };
}

export async function markConversationReadAction(conversationId: string) {
  if (!uuidSchema.safeParse(conversationId).success) return;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return;
  await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("type", "new_message")
    .is("read_at", null)
    .contains("data", { conversation_id: conversationId });
}

export async function getAttachmentUrlAction(path: string): Promise<ActionResult<{ url: string }>> {
  if (typeof path !== "string" || path.length > 500 || path.includes("..")) return fail("Notoʻgʻri soʻrov");
  const supabase = await createClient();
  // Storage RLS allows signing only for conversation participants.
  const { data, error } = await supabase.storage.from("chat-attachments").createSignedUrl(path, 60);
  if (error || !data) return fail("Fayl topilmadi");
  return { ok: true, data: { url: data.signedUrl } };
}
