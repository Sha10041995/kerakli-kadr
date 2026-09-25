# Arxitektura

## Umumiy koʻrinish

```
Brauzer ──► Next.js 16 (proxy.ts: sessiya yangilash + himoyalangan yoʻllar)
              ├─ Server Components  → Supabase (foydalanuvchi JWT, RLS qoʻllanadi)
              ├─ Server Actions     → Zod validatsiya → Supabase (RLS + triggerlar)
              └─ Route Handlers     → /api/locations, /api/payments/[provider]/webhook, /auth/*
Supabase ──► PostgreSQL (RLS, triggerlar, SQL funksiyalar) · Auth · Storage · Realtime
```

Asosiy tamoyil: **xavfsizlik va biznes-qoidalar bazada** (RLS, `BEFORE` triggerlar, `SECURITY DEFINER` RPC'lar).
Next.js qatlami — UX, validatsiya va rate-limiting (himoyaning ikkinchi qatori). Mijoz hech qachon narx, status,
reyting yoki tasdiqlash belgilarini oʻzgartira olmaydi — buni triggerlar bloklaydi.

## Papkalar

```
src/
  app/                    # Marshrutlar (App Router)
    jobs/[[...slug]]      # /jobs, /jobs/xorazm/urganch-shahri/payvandchi (SEO)
    candidates/[[...slug]]
    vacancy/[id], candidate/[id], company/[slug]
    dashboard/…           # kabinet (nomzod + ish beruvchi)
    admin/…               # boshqaruv paneli
    messages/, notifications/, pricing/, login/, register/, onboarding/
    api/                  # route handlers
    sitemap.ts, robots.ts
  components/             # UI primitivlari, layout, xarita
  features/               # domen modullari (queries / actions / components)
    auth, locations, catalog, candidates, employers, vacancies, applications,
    search, matching, messaging, notifications, reviews, verification,
    payments, admin, favorites, reports, ai
  lib/                    # env, supabase klientlari, xatolar, fayllar, rate-limit, seo, maps, i18n
  validations/            # Zod sxemalari (client + server)
  types/database.ts       # bazadan generatsiya qilingan turlar
supabase/
  migrations/             # 16 ta migratsiya (sxema, RLS, funksiyalar, reference data)
  seed/                   # DEMO maʼlumotlar
  tests/                  # SQL/RLS testlari + Supabase shim
scripts/                  # db-test, typegen, reference data, import, lokal stek
tests/unit, tests/e2e     # Vitest va Playwright
```

## Maʼlumot oqimi namunasi — ariza yuborish

1. `ApplyForm` (client) → `applyAction` (server action): Zod + rate limit + profil tekshiruvi.
2. `insert into applications` foydalanuvchi JWT'si bilan → RLS: `candidate_id = auth.uid()` va `job_seeker` roli.
3. `applications_before_write` trigger: vakansiya faolmi, muddat, oʻz vakansiyasi emasmi, 24 soatda ≤30 ariza, status majburan `applied`.
4. `applications_after_write`: status tarixi, hisoblagich, kompaniya aʼzolariga bildirishnoma.

## Kengaytirish nuqtalari

| Nuqta                          | Joyi                                                      |
| ------------------------------ | --------------------------------------------------------- |
| Toʻlov provayderlari           | `features/payments/providers/*` (`PaymentProvider`)       |
| Xarita provayderi              | `lib/maps` (`MapProvider`)                                |
| Bildirishnoma kanallari        | `features/notifications/channels.ts` (email/Telegram/SMS) |
| AI (CV tahlili, tarjima, spam) | `features/ai` (`AiProvider`, hozircha `noAiProvider`)     |
| Chat moderatsiyasi             | `features/messaging/moderation.ts` + DB flag              |
| Rate-limit ombori              | `lib/rate-limit.ts` (`RateLimitStore` → Redis)            |
| Til (ru/en)                    | `lib/i18n/*`, bazada `name_ru`, `name_en`                 |
| Kelajakdagi rollar             | `app_role`: `partner`, `recruiter` allaqachon mavjud      |

## Nima uchun shunday qarorlar

- **PostGIS oʻrniga haversine** — sxema har qanday PostgreSQL'da ishlaydi va lokal testlanadi. `geo_distance_km`
  imzosi saqlanib, keyinchalik PostGIS `geography` + GiST indeksga almashtirish mumkin.
- **Kompaniya har bir ish beruvchida** — jismoniy shaxslar `company_type = 'individual'` bilan ishlaydi, shu sabab
  vakansiya, obuna va aʼzolik logikasi bitta.
- **MATCH SCORE TypeScript'da** — SQL xususiyatlarni (masofa, tier, koʻnikma mosligi…) qaytaradi, ball esa sof
  funksiyada hisoblanadi: tushunarli, unit-testlanadigan, admin vaznlari bilan boshqariladi.
- **Kategoriya → subkategoriya** `categories.parent_id` orqali (alohida `subcategories` jadvali oʻrniga).
