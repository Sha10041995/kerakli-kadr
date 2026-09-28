"use client";

import { useI18n } from "@/lib/i18n/client";

/** Shows the first error; message keys from Zod/server actions are translated. */
export function FieldError({ message }: { message?: string | string[] }) {
  const { tr } = useI18n();
  const text = Array.isArray(message) ? message[0] : message;
  if (!text) return null;
  return (
    <p role="alert" className="mt-1 text-xs text-red-600">
      {tr(text)}
    </p>
  );
}
