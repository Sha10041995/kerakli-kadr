// Content Security Policy with a per-request nonce (set in proxy.ts).
// Scripts: only 'self' + nonce ('strict-dynamic' lets Next.js-loaded chunks run).
// Styles keep 'unsafe-inline' because React style={{…}} attributes cannot carry a nonce.

export function generateNonce(): string {
  return Buffer.from(globalThis.crypto.randomUUID()).toString("base64");
}

export function buildCsp(nonce: string, opts: { dev?: boolean; supabaseUrl?: string } = {}): string {
  const dev = opts.dev ?? process.env.NODE_ENV !== "production";
  const supabaseHost = opts.supabaseUrl ? new URL(opts.supabaseUrl).host : "";
  const supabaseHttp = supabaseHost ? `${opts.supabaseUrl!.startsWith("http://") ? "http" : "https"}://${supabaseHost}` : "";
  const supabaseWs = supabaseHost ? `${opts.supabaseUrl!.startsWith("http://") ? "ws" : "wss"}://${supabaseHost}` : "";
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${supabaseHttp} https://tile.openstreetmap.org https://*.tile.openstreetmap.org`.trim(),
    "font-src 'self' data:",
    `connect-src 'self' ${supabaseHttp} ${supabaseWs}${dev ? " ws: http://localhost:*" : ""}`.replace(/\s+/g, " ").trim(),
    "frame-src https://www.openstreetmap.org",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ];
  return directives.join("; ");
}
