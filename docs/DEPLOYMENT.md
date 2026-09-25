# Production'ga chiqarish

> ⚠️ Quyidagi amallar (production baza, real toʻlov provayderi, domen/DNS, real kalitlar) mahsulot egasining
> tasdigʻidan keyin bajariladi.

## 1. Supabase loyihasi

1. Supabase'da yangi loyiha (region: Yevropa/Frankfurt eng yaqin).
2. `npx supabase link --project-ref <ref>` → `npx supabase db push` (faqat `supabase/migrations`).
   **`supabase/seed` DEMO maʼlumotlarini productionga yuklamang.**
3. Auth: Email provider yoqilgan, “Confirm email” yoqilgan; Site URL = `https://kadrtop.uz`;
   Redirect URL: `https://kadrtop.uz/auth/callback`.
4. Realtime: `messages` jadvali `supabase_realtime` publikatsiyasida (migratsiya avtomatik qoʻshadi).
5. pg_cron: `expire_vacancies()` ni soatlik rejalashtiring (docs/DATABASE.md).
6. Birinchi super admin: roʻyxatdan oʻting, soʻng SQL editor'da
   `insert into user_roles (user_id, role) values ('<uuid>', 'super_admin'), ('<uuid>', 'admin');`
7. Rasmiy hududlar datasetini import qiling: `scripts/import-locations.mjs`.

## 2. Hosting (Vercel yoki Node server)

Muhit oʻzgaruvchilari:

```
NEXT_PUBLIC_SITE_URL=https://kadrtop.uz
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # faqat server
PAYMENT_PROVIDER=<provayder>          # mock productionda avtomatik oʻchadi
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=... # koʻp instansli self-hostingda
```

Build: `npm ci && npm run build && npm start` (Node ≥ 20.9).

## 3. Toʻlov provayderi (Click / Payme / Uzum)

`features/payments/providers/<name>.ts` da `PaymentProvider`ni amalga oshiring (checkout URL + webhook imzosini
tekshirish), `providers/index.ts` da roʻyxatdan oʻtkazing. Webhook: `POST /api/payments/<name>/webhook`.
Avval provayderning test muhitida sinang.

## 4. Chiqarishdan oldingi tekshiruv

- [ ] `npm run check` va `npm run test:db`, `npm run test:e2e` yashil
- [ ] Production bazada demo maʼlumot yoʻq (`select count(*) from profiles where is_demo`)
- [ ] Service role kaliti faqat serverda
- [ ] Storage bucket cheklovlari va RLS policy'lari qoʻllangan
- [ ] Monitoring/log (Sentry yoki muqobil), zaxira nusxa (Supabase PITR)
