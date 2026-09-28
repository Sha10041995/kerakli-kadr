// Maps database / auth errors to translatable message keys ("errors.*", see
// src/lib/i18n/messages/errors.ts). Raw database errors are never shown to users.
import { errors as ERROR_MESSAGES } from "@/lib/i18n/messages/errors";

const KNOWN = new Set(Object.keys(ERROR_MESSAGES));
// longest first so "CONVERSATION_NOT_ALLOWED" wins over "NOT_ALLOWED"
const DB_CODES = Object.keys(ERROR_MESSAGES)
  .filter((k) => /^[A-Z_]+$/.test(k))
  .sort((a, b) => b.length - a.length);

export const GENERIC_ERROR = "errors.generic";

export type ErrorLike = { message?: string; code?: string } | null | undefined;

/** Returns a dictionary key such as "errors.VACANCY_LIMIT_REACHED". */
export function toUserMessage(error: ErrorLike): string {
  if (!error) return GENERIC_ERROR;
  const message = error.message ?? "";
  for (const code of DB_CODES) {
    if (message.includes(code)) return `errors.${code}`;
  }
  if (error.code && KNOWN.has(error.code)) return `errors.${error.code}`;
  if (message.includes("row-level security")) return "errors.NOT_ALLOWED";
  if (message.includes("duplicate key")) return "errors.23505";
  return GENERIC_ERROR;
}

/** Standard result shape for server actions consumed by forms. */
export type ActionResult<T = undefined> =
  { ok: true; data?: T; message?: string } | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

export function fail(error: string, fieldErrors?: Record<string, string[] | undefined>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}
