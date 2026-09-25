// Minimal Supabase-compatible HTTP gateway for local dev / E2E:
//   /auth/v1/*    -> Supabase Auth (GoTrue) binary
//   /rest/v1/*    -> PostgREST binary
//   /storage/v1/* -> tiny Storage emulation that enforces the SAME storage RLS
//                    policies (inserts/selects run as the calling user).
// Realtime is not emulated (the chat UI falls back to polling).
import http from "node:http";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";
import { PORTS, STACK_DIR, JWT_SECRET, dbUrl, verifyJwt } from "./config.mjs";

const STORAGE_DIR = path.join(STACK_DIR, "storage");
const pool = new pg.Pool({ connectionString: dbUrl(), max: 5 });

function proxy(req, res, port, targetPath) {
  const upstream = http.request(
    { host: "127.0.0.1", port, path: targetPath, method: req.method, headers: { ...req.headers, host: `127.0.0.1:${port}` } },
    (up) => {
      res.writeHead(up.statusCode ?? 502, up.headers);
      up.pipe(res);
    },
  );
  upstream.on("error", () => {
    res.writeHead(502, { "content-type": "application/json" });
    res.end(JSON.stringify({ message: "upstream unavailable" }));
  });
  req.pipe(upstream);
}

const json = (res, status, body) => {
  res.writeHead(status, { "content-type": "application/json", "access-control-allow-origin": "*" });
  res.end(JSON.stringify(body));
};

function readBody(req, limit = 12 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error("too large"));
        req.destroy();
      } else chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function claimsFrom(req) {
  const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  return verifyJwt(token);
}

/** Runs fn inside a transaction as the JWT's database role (RLS applies). */
async function asUser(claims, fn) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const role = ["anon", "authenticated", "service_role"].includes(claims?.role) ? claims.role : "anon";
    await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims ?? { role: "anon" })]);
    await client.query(`set local role ${role}`);
    const out = await fn(client);
    await client.query("commit");
    return out;
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

const sign = (value) => createHmac("sha256", JWT_SECRET).update(value).digest("base64url");

function serveFile(res, bucket, name) {
  const file = path.join(STORAGE_DIR, bucket, name);
  if (!file.startsWith(path.join(STORAGE_DIR, bucket)) || !existsSync(file)) return json(res, 404, { message: "not found" });
  const meta = existsSync(`${file}.meta.json`) ? JSON.parse(readFileSync(`${file}.meta.json`, "utf8")) : {};
  res.writeHead(200, { "content-type": meta.mimetype ?? "application/octet-stream", "cache-control": "private, max-age=60" });
  res.end(readFileSync(file));
}

async function handleStorage(req, res, url) {
  const parts = url.pathname.replace(/^\/storage\/v1\//, "").split("/").map(decodeURIComponent);
  const [kind, second, ...rest] = parts;

  if (kind !== "object") return json(res, 404, { message: "not supported by local gateway" });

  // Public download
  if (second === "public" && req.method === "GET") {
    const [bucket, ...nameParts] = rest;
    const { rows } = await pool.query("select public from storage.buckets where id = $1", [bucket]);
    if (!rows[0]?.public) return json(res, 404, { message: "not found" });
    return serveFile(res, bucket, nameParts.join("/"));
  }

  // Signed URL create / download
  if (second === "sign") {
    const [bucket, ...nameParts] = rest;
    const name = nameParts.join("/");
    if (req.method === "GET") {
      const token = url.searchParams.get("token") ?? "";
      const [exp, sig] = token.split(".");
      const expected = sign(`${bucket}/${name}:${exp}`);
      if (!sig || sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) || Number(exp) < Date.now()) {
        return json(res, 400, { message: "invalid signature" });
      }
      return serveFile(res, bucket, name);
    }
    const body = JSON.parse((await readBody(req)).toString() || "{}");
    const claims = claimsFrom(req);
    const found = await asUser(claims, async (c) => (await c.query("select 1 from storage.objects where bucket_id = $1 and name = $2", [bucket, name])).rowCount);
    if (!found) return json(res, 400, { statusCode: "404", error: "not_found", message: "Object not found" });
    const exp = Date.now() + Math.min(Number(body.expiresIn ?? 60), 3600) * 1000;
    const token = `${exp}.${sign(`${bucket}/${name}:${exp}`)}`;
    return json(res, 200, { signedURL: `/object/sign/${encodeURIComponent(bucket)}/${nameParts.map(encodeURIComponent).join("/")}?token=${token}` });
  }

  // Upload
  if (req.method === "POST" || req.method === "PUT") {
    const bucket = second;
    const name = rest.join("/");
    const claims = claimsFrom(req);
    const bytes = await readBody(req);
    const mimetype = String(req.headers["content-type"] ?? "application/octet-stream").split(";")[0];
    const { rows } = await pool.query("select file_size_limit, allowed_mime_types from storage.buckets where id = $1", [bucket]);
    if (!rows[0]) return json(res, 400, { statusCode: "404", error: "Bucket not found", message: "Bucket not found" });
    if (rows[0].file_size_limit && bytes.length > Number(rows[0].file_size_limit)) return json(res, 413, { statusCode: "413", error: "Payload too large", message: "The object exceeded the maximum allowed size" });
    if (rows[0].allowed_mime_types && !rows[0].allowed_mime_types.includes(mimetype)) return json(res, 415, { statusCode: "415", error: "invalid_mime_type", message: `mime type ${mimetype} is not supported` });
    const id = randomUUID();
    try {
      await asUser(claims, (c) =>
        c.query("insert into storage.objects (id, bucket_id, name, owner, metadata) values ($1, $2, $3, $4, $5)", [
          id, bucket, name, claims?.sub ?? null, { mimetype, size: bytes.length },
        ]),
      );
    } catch (err) {
      return json(res, 403, { statusCode: "403", error: "Unauthorized", message: String(err.message) });
    }
    const file = path.join(STORAGE_DIR, bucket, name);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, bytes);
    writeFileSync(`${file}.meta.json`, JSON.stringify({ mimetype }));
    return json(res, 200, { Id: id, Key: `${bucket}/${name}` });
  }
  return json(res, 405, { message: "method not allowed" });
}

export function startGateway() {
  mkdirSync(STORAGE_DIR, { recursive: true });
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "access-control-allow-origin": req.headers.origin ?? "*",
        "access-control-allow-headers": req.headers["access-control-request-headers"] ?? "*",
        "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        "access-control-allow-credentials": "true",
      });
      return res.end();
    }
    if (url.pathname.startsWith("/auth/v1/")) return proxy(req, res, PORTS.auth, url.pathname.slice("/auth/v1".length) + url.search);
    if (url.pathname.startsWith("/rest/v1/")) return proxy(req, res, PORTS.postgrest, url.pathname.slice("/rest/v1".length) + url.search);
    if (url.pathname.startsWith("/storage/v1/")) {
      return handleStorage(req, res, url).catch((err) => json(res, 500, { message: String(err.message) }));
    }
    json(res, 404, { message: "not found" });
  });
  return new Promise((resolve) => server.listen(PORTS.gateway, "127.0.0.1", () => resolve(server)));
}
