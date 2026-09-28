# Bosqichlar va MVP qabul mezonlari

## Bosqichlar holati

| #   | Bosqich              | Holat | Izoh                                                                                                  |
| --- | -------------------- | ----- | ----------------------------------------------------------------------------------------------------- |
| 1   | Arxitektura          | ✅    | Next.js 16 + Supabase, feature modullari                                                              |
| 2   | Maʼlumotlar bazasi   | ✅    | 20 migratsiya, RLS, triggerlar, 14 SQL test toʻplami                                                  |
| 3   | Autentifikatsiya     | ✅    | Email/parol; telefon OTP — SMS provayder ulanganda                                                    |
| 4   | Hududlar ierarxiyasi | ✅    | 14 viloyat, 205 tuman/shahar (taxminiy koordinatalar), import skripti, admin CRUD                     |
| 5   | Nomzod profili       | ✅    | Profil, koʻnikmalar, tajriba, taʼlim, sertifikat, portfolio, avatar, CV                               |
| 6   | Ish beruvchi profili | ✅    | Jismoniy shaxs / MChJ / fermer xoʻjaligi…, logo                                                       |
| 7   | Vakansiya            | ✅    | Yaratish/tahrirlash/qoralama/yopish, moderatsiya, muddat                                              |
| 8   | Qidiruv              | ✅    | LOCATION-FIRST, radius, GPS, filtrlar, SEO sahifalar, talent map                                      |
| 9   | Ariza                | ✅    | Pipeline, kontakt, tarix, bildirishnomalar                                                            |
| 10  | Chat                 | ✅    | Realtime, fayl biriktirish, xavfsizlik ogohlantirishlari, bloklash                                    |
| 11  | Admin                | ✅    | Dashboard, moderatsiya, shikoyatlar, foydalanuvchilar, hududlar, katalog, tariflar, sozlamalar, audit |
| 12  | Tasdiqlash           | ✅    | 0–4 darajalar, hujjatlar, badge'lar                                                                   |
| 13  | Sharhlar             | ✅    | Faqat ishga olingandan keyin, soxta sharhga qarshi                                                    |
| 14  | Monetizatsiya        | 🟡    | Arxitektura + tariflar + xizmatlar + mock provayder; real provayder — tasdiqdan keyin                 |
| 15  | Analitika            | ✅    | Admin statistikasi, talab/taklif xaritasi, qidiruvlar, profil koʻrishlari, javob berish foizi         |
| 16  | Testlar              | ✅    | 67 unit, 14 SQL/RLS toʻplami, 26 E2E                                                                  |
| 20  | Koʻp tillilik        | ✅    | Oʻzbek / rus / ingliz UI (admin — oʻzbekcha); bazadagi kontent tarjimasi keyingi bosqich              |
| 21  | Bildirishnomalar     | 🟡    | Sayt ichida ✅, cron ✅; email (Resend) va Telegram kalitlar kiritilganda yoqiladi; SMS — provayder   |
| 17  | Xavfsizlik auditi    | ✅    | docs/SECURITY.md (cheklovlar roʻyxati bilan)                                                          |
| 18  | Performance          | 🟡    | Indekslar, pagination, public data kesh; keyin: PostGIS, CDN, statik sahifalar                        |
| 19  | Production build     | ✅    | `npm run build` yashil; deploy — tasdiqdan keyin                                                      |

## MVP qabul mezonlari

- [x] User registration ishlaydi (E2E)
- [x] Login ishlaydi (E2E)
- [x] Candidate profile ishlaydi (E2E)
- [x] Employer profile ishlaydi (E2E)
- [x] Company profile ishlaydi (E2E)
- [x] Location hierarchy ishlaydi (SQL + E2E)
- [x] Region / District / Settlement filter ishlaydi (SQL + E2E)
- [x] Profession filter ishlaydi
- [x] Vacancy creation ishlaydi (E2E)
- [x] Candidate search ishlaydi (E2E)
- [x] Vacancy search ishlaydi (E2E)
- [x] Application ishlaydi (E2E)
- [x] Messaging ishlaydi (E2E)
- [x] Reviews ishlaydi (SQL testlari; UI ishga olingandan keyin chiqadi)
- [x] Verification ishlaydi (SQL testlari; UI)
- [x] Admin panel ishlaydi (E2E)
- [x] Basic monetization architecture mavjud
- [x] Responsive mobile UI mavjud (pastki navigatsiya, mobil filtrlar)
- [x] Security checks oʻtgan
- [x] Typecheck / Lint / Tests / Production build oʻtgan

## Keyingi bosqichlar (tavsiya)

1. Real Supabase loyihasi + domen + rasmiy hududlar datasetini import qilish (tasdiq kerak).
2. Mahalliy toʻlov provayderi (Click/Payme/Uzum) — test muhitida.
3. SMS OTP (telefon tasdiqlash); Resend va Telegram bot kalitlarini kiritish.
4. Bazadagi kontent tarjimasi: hudud/kasb `name_ru/name_en`, tarif tavsiflari, bildirishnoma shablonlari.
5. PDF CV eksport (server-side), rasm optimizatsiyasi.
6. AI: CV tahlili, koʻnikma ajratish, dublikat/spam aniqlash (`features/ai`).
7. PostGIS (hozir haversine) va xarita klasterlash.
