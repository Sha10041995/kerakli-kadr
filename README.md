# KADR TOP UZ

**Kadr ham, ish ham — oʻz hududingizdan toping.**

Oʻzbekiston boʻyicha hududiy (LOCATION-FIRST) ish va kadrlar marketplace'i: ish beruvchi oʻz tumani, shahri,
qishlogʻi yoki mahallasidan kerakli kadrni, ish izlovchi esa oʻz hududidagi ishni topadi.

> Qidiruv formulasi: **KASB + HUDUD + MASOFA + TAJRIBA + MAVJUDLIK**
> Natijalar tartibi: mahalla → qishloq/shahar → tuman → yaqin tuman → yaqin viloyat.

## Texnologiyalar

| Qatlam      | Tanlov                                                                             |
| ----------- | ---------------------------------------------------------------------------------- |
| Frontend    | Next.js 16 (App Router, Turbopack), React 19, TypeScript (strict), Tailwind CSS v4 |
| Backend     | Next.js Server Actions + Route Handlers                                            |
| Maʼlumotlar | Supabase PostgreSQL (RLS), Supabase Auth, Supabase Storage, Realtime               |
| Validatsiya | Zod (server + client), React Hook Form                                             |
| Xarita      | Leaflet + OpenStreetMap (roʻyxat/xarita koʻrinishi), provayder abstraksiyasi       |
| Tillar      | Oʻzbek (asosiy), rus, ingliz — `src/lib/i18n` (cookie `locale`)                    |
| Test        | Vitest (unit), SQL/RLS testlari, Playwright (E2E)                                  |
| Sifat       | ESLint, Prettier, GitHub Actions CI                                                |

## Tezkor start

```bash
npm install
cp .env.example .env.local        # Supabase kalitlarini kiriting
npm run dev                       # http://localhost:3000
```

### A) Supabase CLI bilan (tavsiya etiladi, Docker kerak)

```bash
npx supabase start                # migratsiyalar + supabase/seed/*.sql (demo)
# chiqqan URL va anon/service kalitlarini .env.local ga yozing
npm run dev
```

### B) Docker'siz lokal stek (PostgreSQL 16 yetarli)

PostgREST + Supabase Auth binarlari va Storage emulyatsiyasi bilan kichik gateway (E2E testlar ham shu stekda ishlaydi):

```bash
npm run stack:setup               # kadrtop_dev bazasi, migratsiyalar, demo seed, binarlar
npm run stack:start               # http://localhost:54321 (auth, rest, storage)
cp .local-stack/env.local .env.local   # agar .env.local hali yoʻq boʻlsa
npm run dev
```

`stack:setup` bazani qayta yaratadi — stek ishlab turgan boʻlsa, undan keyin `stack:start`ni qayta ishga tushiring.

### Demo hisoblar (faqat development)

Barcha demo hisoblar paroli: `Demo12345!` (domen: `@kadrtop.demo`, barcha qatorlar `is_demo = true`)

| Rol               | Email                                                  |
| ----------------- | ------------------------------------------------------ |
| Super admin       | `admin@kadrtop.demo`                                   |
| Moderator         | `moderator@kadrtop.demo`                               |
| Ish izlovchi (50) | `demo.candidate01@kadrtop.demo` … `demo.candidate50@…` |
| Ish beruvchi (20) | `demo.employer01@kadrtop.demo` … `demo.employer20@…`   |

## Buyruqlar

| Buyruq                 | Vazifasi                                                      |
| ---------------------- | ------------------------------------------------------------- |
| `npm run dev`          | Development server                                            |
| `npm run typecheck`    | Route turlari generatsiyasi + `tsc --noEmit`                  |
| `npm run lint`         | ESLint                                                        |
| `npm test`             | Vitest unit testlari                                          |
| `npm run test:db`      | Migratsiyalar + seed + SQL/RLS testlari (lokal PostgreSQL)    |
| `npm run test:e2e`     | Playwright E2E (lokal stekda)                                 |
| `npm run build`        | Production build                                              |
| `npm run check`        | typecheck → lint → test → build                               |
| `npm run db:types`     | `src/types/database.ts` ni bazadan generatsiya qilish         |
| `npm run db:reference` | Hududlar/kasblar maʼlumotidan reference migratsiyani yaratish |
| `npm run format`       | Prettier                                                      |

Rasmiy hududlar datasetini import qilish: `DATABASE_URL=... node scripts/import-locations.mjs data.json --dry-run`

## Hujjatlar

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — arxitektura va papkalar tuzilmasi
- [docs/DATABASE.md](docs/DATABASE.md) — jadvallar, RLS, triggerlar
- [docs/SEARCH_AND_MATCHING.md](docs/SEARCH_AND_MATCHING.md) — hududiy qidiruv va MATCH SCORE
- [docs/SECURITY.md](docs/SECURITY.md) — xavfsizlik choralari va audit natijalari
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — production'ga chiqarish
- [docs/ROADMAP.md](docs/ROADMAP.md) — bosqichlar holati va MVP qabul mezonlari

## Falsafa

> “Katta shaharda emas, oʻz hududingda ham imkoniyat bor.”

Sunʼiy intellekt (kelajakda) faqat tavsiya vositasi — ishga olish boʻyicha yakuniy qarorni doim inson qabul qiladi.
