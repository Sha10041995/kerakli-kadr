// Client/server-side chat safety checks. The database independently flags
// links (messages_before_insert), so this module adds richer, user-facing
// warnings and is the extension point for future AI spam/fraud detection.

export type MessageFlag = "link" | "phone" | "fraud" | "abuse";

export type MessageAnalysis = { flagged: boolean; flags: MessageFlag[]; warning: string | null };

const LINK_RE = /(https?:\/\/|www\.|t\.me\/|bit\.ly|wa\.me\/)/i;
const PHONE_RE = /(\+?998[\s-]?)?\(?\d{2}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/;
const FRAUD_PATTERNS = [
  /karta\s*raqam/i, /cvv/i, /sms\s*kod/i, /parolingiz/i, /oldindan\s*to[ʻ'‘`]?lov/i, /\bpredoplat/i,
  /hujjat(ingiz)?\s*uchun\s*pul/i, /kod\s*yuboring/i,
];
const ABUSE_PATTERNS = [/\bahmoq\b/i, /\bjinni\b/i];

export function analyzeMessage(body: string): MessageAnalysis {
  const flags: MessageFlag[] = [];
  if (LINK_RE.test(body)) flags.push("link");
  if (PHONE_RE.test(body)) flags.push("phone");
  if (FRAUD_PATTERNS.some((re) => re.test(body))) flags.push("fraud");
  if (ABUSE_PATTERNS.some((re) => re.test(body))) flags.push("abuse");

  let warning: string | null = null;
  if (flags.includes("fraud")) {
    warning = "Diqqat: hech qachon karta maʼlumotlari, SMS-kod yoki oldindan toʻlov yubormang.";
  } else if (flags.includes("link")) {
    warning = "Xabarda havola bor. Notanish havolalarni ochishda ehtiyot boʻling.";
  } else if (flags.includes("phone")) {
    warning = "Telefon raqamingizni faqat ishonchli ish beruvchiga bering.";
  }
  return { flagged: flags.includes("fraud") || flags.includes("link") || flags.includes("abuse"), flags, warning };
}
