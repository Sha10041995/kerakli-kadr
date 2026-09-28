// Locale-independent translation helpers (usable on server and client).
import type { Locale } from "./config";

/** A translatable leaf: every UI string is stored with all locales side by side. */
export type Leaf = { uz: string; ru: string; en: string };
export type Localized<T> = T extends Leaf ? string : { [K in keyof T]: Localized<T[K]> };
export type Vars = Record<string, string | number>;

type Paths<T> = T extends string
  ? never
  : { [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}` }[keyof T & string];

function isLeaf(v: unknown): v is Leaf {
  return typeof v === "object" && v !== null && "uz" in v && "ru" in v && "en" in v;
}

export function localize<T>(tree: T, locale: Locale): Localized<T> {
  if (isLeaf(tree)) return tree[locale] as Localized<T>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(tree as Record<string, unknown>)) out[k] = localize(v, locale);
  return out as Localized<T>;
}

export function lookup(dict: unknown, key: string): string | undefined {
  let cur: unknown = dict;
  for (const part of key.split(".")) {
    if (typeof cur !== "object" || cur === null) return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" ? cur : undefined;
}

export function format(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
}

const KEY_RE = /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_]+)+(\?.*)?$/;

/** "validation.maxChars?max=120" -> ["validation.maxChars", { max: "120" }] */
function splitKey(message: string): [string, Vars] {
  const i = message.indexOf("?");
  if (i < 0) return [message, {}];
  return [message.slice(0, i), Object.fromEntries(new URLSearchParams(message.slice(i + 1)))];
}

export function createTranslator<D>(dict: D) {
  /** Typed lookup of a dictionary key. */
  const t = (key: Paths<D>, vars?: Vars): string => format(lookup(dict, key) ?? key, vars);
  /**
   * Translates server-provided messages: when `message` is a dictionary key
   * (e.g. "errors.RATE_LIMITED") it is translated, otherwise returned as-is.
   */
  const tr = (message: string | undefined | null, vars?: Vars): string => {
    if (!message) return "";
    if (KEY_RE.test(message)) {
      const [key, embedded] = splitKey(message);
      const hit = lookup(dict, key);
      if (hit) return format(hit, { ...embedded, ...vars });
    }
    return message;
  };
  return { t, tr };
}

export type DictKey<D> = Paths<D>;
