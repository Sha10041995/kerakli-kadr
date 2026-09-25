# Maʼlumotlar bazasi

PostgreSQL (Supabase). Barcha jadvallarda **RLS yoqilgan**. Migratsiyalar: `supabase/migrations/`.

## Jadvallar

| Guruh         | Jadvallar                                                                                                                                |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Foydalanuvchi | `auth.users` (Supabase), `profiles`, `roles`, `user_roles`, view `public_profiles`                                                       |
| Hudud         | `countries` → `regions` → `districts` → `settlements` → `mahallas`                                                                       |
| Katalog       | `categories` (parent_id = subkategoriya), `professions`, `skills`, `profession_skills`                                                   |
| Nomzod        | `candidate_profiles`, `candidate_skills`, `candidate_experience`, `candidate_education`, `candidate_certificates`, `candidate_portfolio` |
| Ish beruvchi  | `companies`, `company_members`                                                                                                           |
| Vakansiya     | `vacancies`, `vacancy_skills`                                                                                                            |
| Ariza         | `applications`, `application_status_history`                                                                                             |
| Chat          | `conversations`, `conversation_participants`, `messages`                                                                                 |
| Ishonch       | `reviews`, `verification_requests`, `reports`, `complaints`                                                                              |
| Monetizatsiya | `subscription_plans`, `paid_services`, `subscriptions`, `payments`                                                                       |
| Tizim         | `notifications`, `favorites`, `saved_searches`, `app_settings`, `audit_logs`, `search_logs`                                              |

## Muhim qoidalar (triggerlar)

- **Himoyalangan maydonlar**: `phone_verified`, `identity_verified`, `is_blocked`, `rating_*`, `premium_until`,
  `is_featured`, `promoted_until`, `views_count`… faqat backend/admin oʻzgartiradi (`PROTECTED_FIELDS`).
- **Hudud normalizatsiyasi** (`normalize_location`): eng aniq darajadan ota darajalar toʻldiriladi, nomuvofiqlik rad
  etiladi, koordinata boʻlmasa hudud markazi olinadi. Tahrirda oʻzgartirilmagan darajalar qayta hisoblanadi.
- **Maxfiylik**: nomzod koordinatalari yozishda 2 xonagacha (~1 km) yaxlitlanadi — aniq uy manzili saqlanmaydi.
- **Vakansiya moderatsiyasi**: ish beruvchi faqat `draft / pending_review / closed` tanlaydi; `moderation.auto_publish`
  sozlamasi boʻyicha avtomatik `active`; tahrirlangan `rejected` qayta tekshiruvga ketadi; tarif limiti
  (`VACANCY_LIMIT_REACHED`); 5 ta ochiq shikoyatdan keyin vaqtincha yashiriladi.
- **Ariza statuslari**: `applied → viewed → shortlisted → interview → offered → hired` yoki `rejected`;
  nomzod faqat `withdrawn`. Qoida TypeScript'da ham bor (`features/applications/status.ts`).
- **Sharhlar**: faqat `hired` arizadan keyin, har tomondan bittadan; yoʻnalish va kimga yozilishi bazada aniqlanadi.
- **Toʻlovlar**: summa `create_payment_intent()` ichida bazadagi narxdan olinadi; `mark_payment_paid()` faqat
  `service_role`ga ruxsat; holat mashinasi `payment_transition_allowed`. Karta maʼlumotlari saqlanmaydi.
- **Chat**: `start_conversation()` kim kimga yozishi mumkinligini tekshiradi; xabarlarda havolalar belgilanadi,
  daqiqasiga 20 ta xabar limiti, bloklash.
- **Audit**: rollar, vakansiya statuslari, toʻlovlar, tasdiqlash va bloklash `audit_logs`ga yoziladi.

## RPC funksiyalar

`search_vacancies`, `search_candidates`, `talent_count`, `talent_summary`, `category_stats`, `region_stats`,
`match_candidates_for_vacancy`, `match_vacancies_for_candidate`, `choose_role`, `start_conversation`,
`get_applicant_contact`, `create_payment_intent`, `mark_payment_paid` (backend), `admin_dashboard_stats`,
`demand_supply`, `company_plan_limits`, `increment_vacancy_views`, `expire_vacancies` (cron).

## Storage buckets

Ochiq: `avatars`, `company-logos`, `portfolio`, `vacancy-images`. Yopiq: `documents` (CV/sertifikat — egasi, staff va
nomzod ariza yuborgan kompaniya), `company-documents`, `verification` (egasi + staff), `chat-attachments`
(suhbat ishtirokchilari). Yoʻl har doim `<user_id>/<uuid>.<ext>`.

## Testlar

`npm run test:db` — toza bazada: shim → migratsiyalar → seed → `supabase/tests/*.test.sql` (10 ta toʻplam: auth/rollar,
hududlar, nomzodlar, vakansiyalar, arizalar, chat, sharh/tasdiqlash, toʻlovlar, qidiruv, storage/shikoyatlar).

## Cron (production)

```sql
select cron.schedule('expire-vacancies', '15 * * * *', $$select public.expire_vacancies()$$);
```

## Turlarni yangilash

```bash
npm run test:db -- --setup-only && npm run db:types
```
