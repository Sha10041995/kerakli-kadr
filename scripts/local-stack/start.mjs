#!/usr/bin/env node
// Starts Supabase Auth, PostgREST and the gateway (http://localhost:54321).
// Run after `npm run stack:setup`:  npm run stack:start
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { AUTHENTICATOR_PASSWORD, BIN_DIR, JWT_SECRET, PORTS, STACK_DIR, dbUrl } from "./config.mjs";
import { authEnv } from "./setup-env.mjs";
import { startGateway } from "./gateway.mjs";

const procs = [];
function start(name, cmd, cmdArgs, env) {
  const p = spawn(cmd, cmdArgs, { env, stdio: ["ignore", "pipe", "pipe"] });
  const prefix = (line) => `[${name}] ${line}`;
  p.stdout.on("data", (d) => process.env.STACK_VERBOSE && process.stdout.write(prefix(d.toString())));
  p.stderr.on("data", (d) => process.stderr.write(prefix(d.toString())));
  p.on("exit", (code) => {
    console.error(`[${name}] exited with code ${code}`);
    if (!shuttingDown) shutdown(1);
  });
  procs.push(p);
}

const postgrestConf = path.join(STACK_DIR, "postgrest.conf");
writeFileSync(
  postgrestConf,
  [
    `db-uri = "${dbUrl("authenticator", AUTHENTICATOR_PASSWORD)}"`,
    `db-schemas = "public,storage"`,
    `db-anon-role = "anon"`,
    `db-extra-search-path = "public,extensions"`,
    `jwt-secret = "${JWT_SECRET}"`,
    `server-host = "127.0.0.1"`,
    `server-port = ${PORTS.postgrest}`,
    `db-max-rows = 1000`,
    `log-level = "warn"`,
  ].join("\n"),
);

let shuttingDown = false;
function shutdown(code = 0) {
  shuttingDown = true;
  for (const p of procs) p.kill("SIGTERM");
  process.exit(code);
}
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

start("auth", path.join(BIN_DIR, "auth", "auth"), ["serve"], authEnv());
start("postgrest", path.join(BIN_DIR, "postgrest"), [postgrestConf], process.env);
await startGateway();
console.log(`Local Supabase-compatible API: http://localhost:${PORTS.gateway}  (auth, rest, storage)`);
