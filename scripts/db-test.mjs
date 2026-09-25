#!/usr/bin/env node
// Applies all migrations + seeds to a throw-away local PostgreSQL database
// (with a minimal Supabase shim) and runs the SQL test suites in
// supabase/tests/*.test.sql.
//
//   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres npm run test:db
//   npm run test:db -- --setup-only     # create + migrate + seed, skip tests
//   npm run test:db -- --no-seed        # skip demo seed data
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const adminUrl = process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/postgres";
const dbName = process.env.TEST_DATABASE_NAME ?? "kadrtop_test";
const args = new Set(process.argv.slice(2));

const sqlFiles = (dir, filter = () => true) =>
  readdirSync(path.join(root, dir))
    .filter((f) => f.endsWith(".sql") && filter(f))
    .sort()
    .map((f) => path.join(dir, f));

async function run() {
  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  await admin.query(`drop database if exists ${dbName} with (force)`);
  await admin.query(`create database ${dbName}`);
  await admin.end();

  const url = new URL(adminUrl);
  url.pathname = `/${dbName}`;
  const db = new pg.Client({ connectionString: url.toString() });
  await db.connect();
  db.on("notice", (n) => {
    if (process.env.DEBUG_SQL) console.log(`  notice: ${n.message}`);
  });

  const apply = async (file) => {
    try {
      await db.query(readFileSync(path.join(root, file), "utf8"));
    } catch (err) {
      const e = /** @type {any} */ (err);
      console.error(`\n✗ ${file}\n  ${e.message}${e.where ? `\n  where: ${e.where}` : ""}`);
      if (e.position) {
        const src = readFileSync(path.join(root, file), "utf8");
        const pos = Number(e.position);
        console.error(`  near: ${src.slice(Math.max(0, pos - 120), pos + 60).replace(/\n/g, "\n        ")}`);
      }
      throw err;
    }
  };

  const setup = [
    ...sqlFiles("supabase/tests/shim"),
    ...sqlFiles("supabase/migrations"),
    ...(args.has("--no-seed") ? [] : sqlFiles("supabase/seed")),
  ];
  for (const file of setup) {
    await apply(file);
    console.log(`✓ ${file}`);
  }

  if (args.has("--setup-only")) {
    await db.end();
    console.log(`\nDatabase ${dbName} ready.`);
    return;
  }

  let failed = 0;
  const tests = sqlFiles("supabase/tests", (f) => f.endsWith(".test.sql"));
  console.log("");
  for (const file of tests) {
    try {
      await db.query(readFileSync(path.join(root, file), "utf8"));
      console.log(`PASS ${file}`);
    } catch (err) {
      failed++;
      console.error(`FAIL ${file}\n     ${/** @type {Error} */ (err).message}`);
      await db.query("rollback").catch(() => {});
      await db.query("reset role").catch(() => {});
    }
  }
  await db.end();
  console.log(`\n${tests.length - failed}/${tests.length} SQL test files passed`);
  if (failed) process.exit(1);
}

run().catch(() => process.exit(1));
