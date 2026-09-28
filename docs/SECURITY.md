# Xavfsizlik

## Amalga oshirilgan choralar

| Talab                  | Qanday                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Autentifikatsiya       | Supabase Auth; serverda `getClaims()` (JWT tekshiriladi), `proxy.ts` sessiyani yangilaydi                                 |
| Avtorizatsiya / RBAC   | `user_roles` + `has_role/is_admin/is_staff`; faqat super admin admin tayinlaydi; oʻz-oʻziga rol berib boʻlmaydi           |
| Row Level Security     | Barcha jadvallarda; SQL testlari bilan tekshirilgan (`npm run test:db`)                                                   |
| Himoyalangan maydonlar | `BEFORE` triggerlar: tasdiqlash, reyting, premium, reklama, hisoblagichlar, status oʻtishlari                             |
| Input validatsiya      | Zod (server actions'da qayta), qidiruv parametrlari qatʼiy parse qilinadi                                                 |
| SQL injection          | Faqat parametrlangan so'rovlar (PostgREST/RPC); `ILIKE` uchun `like_escape()`                                             |
| XSS                    | React escaping; `dangerouslySetInnerHTML` faqat JSON-LD uchun, `<` escape qilinadi; nonce asosidagi CSP                   |
| CSRF                   | Server Actions'da Next.js Origin tekshiruvi; `/auth/signout` faqat POST + Origin                                          |
| Open redirect          | `safeRedirectPath()` — faqat `/` bilan boshlanadigan lokal yoʻllar                                                        |
| Rate limiting          | Ilova (Postgres ombori, instanslar orasida umumiy): auth, yozish, yuklash, qidiruv; Baza: arizalar, xabarlar, murojaatlar |
| Fayl yuklash           | Magic-byte MIME aniqlash, hajm limiti, tasodifiy nom, egasining papkasi, bucket MIME/size cheklovi, Storage RLS           |
| Maxfiylik              | Telefon/email hech qachon ommaviy emas; kontakt faqat ariza yuborilgan kompaniyaga; koordinatalar ~1 km                   |
| Toʻlovlar              | Narx bazada; holatni faqat `service_role`; webhook imzosi provayderda; karta maʼlumotlari saqlanmaydi                     |
| Audit                  | `audit_logs` (rollar, moderatsiya, toʻlov, tasdiqlash, bloklash) — faqat admin oʻqiydi                                    |
| Sirlar                 | `.env*` gitignore'da; `SUPABASE_SERVICE_ROLE_KEY` faqat `server-only` modulda                                             |
| Xavfsizlik headerlari  | CSP (har soʻrovga nonce, `strict-dynamic`), HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy      |
| Cron / webhooklar      | `/api/cron` — `Bearer CRON_SECRET` (constant-time); Telegram webhook — `X-Telegram-Bot-Api-Secret-Token`                  |

## Tekshirilgan hujum ssenariylari (avtomatik testlar)

SQL (`supabase/tests`): boshqa profilni oʻqish/tahrirlash, oʻzini tasdiqlash, rol eskalatsiyasi, begona kompaniya
nomidan vakansiya, limitni chetlab oʻtish, oʻziga reyting/premium berish, ariza statusini soxtalashtirish, begona
suhbatni oʻqish, jo'natuvchini soxtalashtirish, notoʻgʻri sharh, toʻlovni oʻzi “toʻlangan” qilish, yopiq hujjatlarni
oʻqish, SQL-injection satrlari qidiruvda.
E2E (`tests/e2e/security.spec.ts`): himoyalangan sahifalar, open redirect, rolsiz admin kirishi, API parametr
injeksiyasi, nomaʼlum toʻlov provayderi, security headerlar, telefon raqam oshkor boʻlmasligi.

## Maʼlum cheklovlar / keyingi qadamlar

- CSP `style-src 'unsafe-inline'` (Tailwind/Leaflet inline style'lari) qoldirilgan; skriptlar faqat nonce bilan.
- Rate-limit kalitlari bazada sha256 xesh koʻrinishida; baza ishlamasa vaqtincha xotiradagi omborga tushadi.
- Telefon OTP tasdiqlash hali ulanmagan (SMS provayder kerak); hozir admin tasdiqlaydi.
- `public_profiles` view bloklanmagan foydalanuvchilarning ism/avatarini koʻrsatadi (chat va arizalar uchun) — telefon va email yoʻq.
- Viruslarga skanerlash (ClamAV) fayl yuklashga qoʻshilishi kerak.
- Tuman koordinatalari taxminiy — rasmiy dataset import qilinishi kerak.
