import "server-only";

import { createClient } from "@/lib/supabase/server";
import { validateUpload, objectPath, type Bucket } from "@/lib/files";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { checkRateLimit } from "@/lib/request";
import { toUserMessage } from "@/lib/errors";

export type UploadResult = { ok: true; path: string; publicUrl: string | null; mime: string } | { ok: false; error: string };

const PUBLIC_BUCKETS: Bucket[] = ["avatars", "company-logos", "portfolio", "vacancy-images"];

/**
 * Validates (size + magic bytes) and stores a file in the caller's own folder.
 * Server-only helper (NOT a server action), used by actions after auth checks.
 * Storage RLS additionally restricts writes to "<auth.uid()>/..." paths.
 */
export async function uploadFile(bucket: Bucket, file: File, folderOverride?: string): Promise<UploadResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return { ok: false, error: "Iltimos, avval tizimga kiring." };

  const limit = await checkRateLimit("upload", RATE_LIMITS.upload, userId);
  if (!limit.ok) return { ok: false, error: toUserMessage({ message: "RATE_LIMITED" }) };

  if (!(file instanceof File)) return { ok: false, error: "Fayl tanlanmagan." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = validateUpload(bucket, bytes.subarray(0, 16), file.size);
  if (!check.ok) return check;

  const path = objectPath(folderOverride ?? userId, check.ext);
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, { contentType: check.mime, upsert: false });
  if (error) return { ok: false, error: toUserMessage(error) };

  const publicUrl = PUBLIC_BUCKETS.includes(bucket) ? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl : null;
  return { ok: true, path, publicUrl, mime: check.mime };
}
