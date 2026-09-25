#!/usr/bin/env node
// Imports / updates the Uzbekistan location hierarchy from an official dataset
// (e.g. SOATO classifier export) into the database. Idempotent (upsert by code).
//
//   DATABASE_URL=postgres://... node scripts/import-locations.mjs data/locations.json [--dry-run]
//
// Input: a JSON array of rows (convert CSV exports to this shape first):
//   { "level": "region" | "district" | "settlement" | "mahalla",
//     "code": "1733",            // SOATO / official code (unique)
//     "parent_code": "17",       // code of the parent row (not needed for regions)
//     "slug": "urganch-shahri",  // optional, generated from name_uz when missing
//     "name_uz": "...", "name_ru": "...", "name_en": "...",
//     "kind": "district|city|village|town", "lat": 41.55, "lng": 60.63 }
// Mahallas may reference a settlement or a district as parent.
import { readFileSync } from "node:fs";
import pg from "pg";

const [file, ...flags] = process.argv.slice(2);
const dryRun = flags.includes("--dry-run");
if (!file || !process.env.DATABASE_URL) {
  console.error("Usage: DATABASE_URL=postgres://... node scripts/import-locations.mjs <file.json> [--dry-run]");
  process.exit(1);
}

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[ʻʼ'‘’`]/g, "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const rows = JSON.parse(readFileSync(file, "utf8"));
const order = { region: 0, district: 1, settlement: 2, mahalla: 3 };
rows.sort((a, b) => order[a.level] - order[b.level]);

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
await client.query("begin");
const ids = { region: new Map(), district: new Map(), settlement: new Map() };
const stats = { region: 0, district: 0, settlement: 0, mahalla: 0, skipped: 0 };

try {
  const { rows: country } = await client.query("select id from public.countries where code = 'UZ'");
  const countryId = country[0]?.id;
  for (const r of rows) {
    const slug = r.slug || slugify(r.name_uz);
    const coords = [r.lat ?? null, r.lng ?? null];
    let res;
    if (r.level === "region") {
      res = await client.query(
        `insert into public.regions (country_id, slug, name_uz, name_ru, name_en, soato_code, lat, lng)
         values ($1,$2,$3,$4,$5,$6,$7,$8)
         on conflict (slug) do update set name_uz = excluded.name_uz, name_ru = excluded.name_ru, name_en = excluded.name_en,
           soato_code = excluded.soato_code, lat = coalesce(excluded.lat, regions.lat), lng = coalesce(excluded.lng, regions.lng)
         returning id`,
        [countryId, slug, r.name_uz, r.name_ru ?? null, r.name_en ?? null, r.code, ...coords],
      );
      ids.region.set(r.code, res.rows[0].id);
    } else if (r.level === "district") {
      const parent =
        ids.region.get(r.parent_code) ??
        (await client.query("select id from public.regions where soato_code = $1", [r.parent_code])).rows[0]?.id;
      if (!parent) {
        stats.skipped++;
        continue;
      }
      res = await client.query(
        `insert into public.districts (region_id, slug, kind, name_uz, name_ru, name_en, soato_code, lat, lng)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         on conflict (region_id, slug) do update set name_uz = excluded.name_uz, name_ru = excluded.name_ru, soato_code = excluded.soato_code,
           kind = excluded.kind, lat = coalesce(excluded.lat, districts.lat), lng = coalesce(excluded.lng, districts.lng)
         returning id`,
        [
          parent,
          slug,
          r.kind === "city" ? "city" : "district",
          r.name_uz,
          r.name_ru ?? null,
          r.name_en ?? null,
          r.code,
          ...coords,
        ],
      );
      ids.district.set(r.code, res.rows[0].id);
    } else if (r.level === "settlement") {
      const parent =
        ids.district.get(r.parent_code) ??
        (await client.query("select id from public.districts where soato_code = $1", [r.parent_code])).rows[0]?.id;
      if (!parent) {
        stats.skipped++;
        continue;
      }
      res = await client.query(
        `insert into public.settlements (district_id, slug, kind, name_uz, name_ru, name_en, soato_code, lat, lng)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         on conflict (district_id, slug) do update set name_uz = excluded.name_uz, name_ru = excluded.name_ru, soato_code = excluded.soato_code,
           lat = coalesce(excluded.lat, settlements.lat), lng = coalesce(excluded.lng, settlements.lng)
         returning id`,
        [
          parent,
          slug,
          ["city", "town"].includes(r.kind) ? r.kind : "village",
          r.name_uz,
          r.name_ru ?? null,
          r.name_en ?? null,
          r.code,
          ...coords,
        ],
      );
      ids.settlement.set(r.code, res.rows[0].id);
    } else if (r.level === "mahalla") {
      let settlementId = ids.settlement.get(r.parent_code) ?? null;
      let districtId = ids.district.get(r.parent_code) ?? null;
      if (settlementId && !districtId) {
        districtId = (await client.query("select district_id from public.settlements where id = $1", [settlementId])).rows[0]
          ?.district_id;
      }
      if (!districtId) {
        const s = (await client.query("select id, district_id from public.settlements where soato_code = $1", [r.parent_code]))
          .rows[0];
        settlementId = s?.id ?? null;
        districtId =
          s?.district_id ??
          (await client.query("select id from public.districts where soato_code = $1", [r.parent_code])).rows[0]?.id;
      }
      if (!districtId) {
        stats.skipped++;
        continue;
      }
      await client.query(
        `insert into public.mahallas (district_id, settlement_id, slug, name_uz, name_ru, name_en, code, lat, lng)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         on conflict (district_id, slug) do update set name_uz = excluded.name_uz, code = excluded.code,
           settlement_id = excluded.settlement_id, lat = coalesce(excluded.lat, mahallas.lat), lng = coalesce(excluded.lng, mahallas.lng)`,
        [districtId, settlementId, slug, r.name_uz, r.name_ru ?? null, r.name_en ?? null, r.code, ...coords],
      );
    } else {
      stats.skipped++;
      continue;
    }
    stats[r.level]++;
  }
  await client.query(dryRun ? "rollback" : "commit");
  console.log(`${dryRun ? "[dry run] " : ""}imported`, stats);
} catch (err) {
  await client.query("rollback");
  console.error("Import failed, nothing was changed:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
