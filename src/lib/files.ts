// Secure upload validation: size limits + MIME detection from file content
// (magic bytes). The client-declared type and file extension are never trusted.

export type AllowedMime = "image/jpeg" | "image/png" | "image/webp" | "application/pdf";

export const UPLOAD_RULES = {
  avatars: { maxBytes: 2 * 1024 * 1024, types: ["image/jpeg", "image/png", "image/webp"] },
  "company-logos": { maxBytes: 2 * 1024 * 1024, types: ["image/jpeg", "image/png", "image/webp"] },
  portfolio: { maxBytes: 5 * 1024 * 1024, types: ["image/jpeg", "image/png", "image/webp"] },
  "vacancy-images": { maxBytes: 5 * 1024 * 1024, types: ["image/jpeg", "image/png", "image/webp"] },
  documents: { maxBytes: 10 * 1024 * 1024, types: ["application/pdf", "image/jpeg", "image/png"] },
  "company-documents": { maxBytes: 10 * 1024 * 1024, types: ["application/pdf", "image/jpeg", "image/png"] },
  verification: { maxBytes: 10 * 1024 * 1024, types: ["application/pdf", "image/jpeg", "image/png"] },
  "chat-attachments": { maxBytes: 10 * 1024 * 1024, types: ["application/pdf", "image/jpeg", "image/png", "image/webp"] },
} as const satisfies Record<string, { maxBytes: number; types: readonly AllowedMime[] }>;

export type Bucket = keyof typeof UPLOAD_RULES;

export const EXTENSIONS: Record<AllowedMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

const startsWith = (bytes: Uint8Array, sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b);

/** Detects the real file type from its first bytes. */
export function sniffMime(bytes: Uint8Array): AllowedMime | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf"; // %PDF-
  return null;
}

export type FileCheck = { ok: true; mime: AllowedMime; ext: string } | { ok: false; error: string };

export function validateUpload(bucket: Bucket, bytes: Uint8Array, size: number): FileCheck {
  const rule = UPLOAD_RULES[bucket];
  if (size <= 0) return { ok: false, error: "errors.fileEmpty" };
  if (size > rule.maxBytes) {
    return { ok: false, error: `errors.fileTooLarge?mb=${Math.round(rule.maxBytes / 1024 / 1024)}` };
  }
  const mime = sniffMime(bytes);
  if (!mime || !(rule.types as readonly string[]).includes(mime)) {
    return { ok: false, error: "errors.fileType" };
  }
  return { ok: true, mime, ext: EXTENSIONS[mime] };
}

/** Storage object path: always inside the owner's folder, random file name. */
export function objectPath(ownerFolder: string, ext: string, subFolder?: string): string {
  const id = globalThis.crypto.randomUUID();
  return [ownerFolder, subFolder, `${id}.${ext}`].filter(Boolean).join("/");
}
