#!/usr/bin/env node
// Starts Next.js (dev) with the local-stack environment for E2E tests.
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

const env = { ...process.env };
for (const line of readFileSync(".local-stack/env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}
const child = spawn("npx", ["next", "dev", "-p", "3000"], { env, stdio: "inherit" });
const stop = () => child.kill("SIGTERM");
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
child.on("exit", (code) => process.exit(code ?? 0));
