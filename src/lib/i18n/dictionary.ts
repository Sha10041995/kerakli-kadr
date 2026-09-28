import type { Locale } from "./config";
import { messages } from "./messages";
import { localize, type Localized } from "./translate";

export type Dictionary = Localized<typeof messages>;

const cache = new Map<Locale, Dictionary>();

export function getDictionary(locale: Locale): Dictionary {
  let d = cache.get(locale);
  if (!d) {
    d = localize(messages, locale);
    cache.set(locale, d);
  }
  return d;
}

/** Dictionary sent to Client Components (long static page texts stay on the server). */
export type ClientDictionary = Omit<Dictionary, "pages">;

export function getClientDictionary(locale: Locale): ClientDictionary {
  const rest: Partial<Dictionary> = { ...getDictionary(locale) };
  delete rest.pages;
  return rest as ClientDictionary;
}

export function enumOptions<T extends string>(labels: Record<T, string>): { value: T; label: string }[] {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}
