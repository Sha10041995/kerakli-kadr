// Shared configuration for the Docker-free local stack (dev + E2E only).
// Production uses a real Supabase project; these values are NOT secrets.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHmac } from "node:crypto";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const STACK_DIR = path.join(ROOT, ".local-stack");
export const BIN_DIR = path.join(STACK_DIR, "bin");

export const PG_ADMIN_URL = process.env.LOCAL_PG_URL ?? "postgres://postgres:postgres@localhost:5432/postgres";
export const DB_NAME = process.env.LOCAL_DB_NAME ?? "kadrtop_dev";
export const AUTHENTICATOR_PASSWORD = "authenticator-local-dev";
export const JWT_SECRET = "local-dev-jwt-secret-with-at-least-32-characters";

export const PORTS = { gateway: 54321, postgrest: 54330, auth: 54331 };
export const SITE_URL = process.env.LOCAL_SITE_URL ?? "http://localhost:3000";

export const VERSIONS = { postgrest: "v12.2.3", auth: "v2.180.0" };

export function dbUrl(user = "postgres", password = "postgres") {
  const u = new URL(PG_ADMIN_URL);
  u.username = user;
  u.password = password;
  u.pathname = `/${DB_NAME}`;
  return u.toString();
}

const b64url = (input) => Buffer.from(input).toString("base64url");

/** HS256 JWT (for the anon / service_role API keys of the local stack). */
export function signJwt(payload, secret = JWT_SECRET) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

export function verifyJwt(token, secret = JWT_SECRET) {
  const [h, p, s] = String(token).split(".");
  if (!h || !p || !s) return null;
  const expected = createHmac("sha256", secret).update(`${h}.${p}`).digest("base64url");
  if (expected !== s) return null;
  const payload = JSON.parse(Buffer.from(p, "base64url").toString());
  if (payload.exp && payload.exp * 1000 < Date.now()) return null;
  return payload;
}

const far = Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 3600;
export const ANON_KEY = signJwt({ iss: "kadrtop-local", role: "anon", exp: far });
export const SERVICE_ROLE_KEY = signJwt({ iss: "kadrtop-local", role: "service_role", exp: far });
