# Hududiy qidiruv va MATCH SCORE

## LOCATION-FIRST qidiruv (`search_vacancies`, `search_candidates`)

Kelib chiqish nuqtasi: GPS (brauzer, ~1 km gacha yaxlitlangan) yoki tanlangan eng aniq hudud markazi.

| Tier | Maʼnosi                                  | UI belgisi           |
| ---- | ---------------------------------------- | -------------------- |
| 1    | Aynan shu mahalla                        | “Mahallangizda”      |
| 2    | Aynan shu shahar/qishloq                 | “Aholi punktingizda” |
| 3    | Aynan shu tuman                          | “Tumaningizda”       |
| 4    | Shu viloyat, radius ichida (yaqin tuman) | “Yaqin tumanda”      |
| 5    | Boshqa viloyat, radius ichida            | “Qoʻshni hududda”    |
| 6    | Shu viloyat, radiusdan tashqarida        | —                    |
| 7    | Boshqa                                   | —                    |

Filtr qoidasi: radius berilsa `tier ≤ 5` (aniq hudud mosliklari doim kiradi); faqat viloyat tanlansa — shu viloyat;
aks holda `tier ≤ 6`. Masofaviy ishlar `remote=1` bilan hududdan qatʼi nazar qoʻshiladi. Standart radius 50 km.

Saralash (relevance): tier ↑ → reklama/premium ↓ → masofa ↑ → yangilik. Boshqa variantlar: eng yaqin, eng yangi,
maosh (vakansiya), reyting/tajriba (nomzod).

SEO sahifalar: `/jobs/{viloyat}/{tuman}/{kasb}`, `/candidates/{viloyat}/{kasb}` va h.k. — segmentlar bazadan tekshiriladi,
notoʻgʻri kombinatsiya 404 qaytaradi. Kanonik URL, dinamik metadata, JobPosting JSON-LD, sitemap.

**Local Talent Map**: `talent_count` va `talent_summary` — “Yaqin atrofda 37 ta elektrik mavjud”, bosh sahifadagi
“Hududingizdagi kadrlar” bloki. **Demand map**: `demand_supply` (tuman × kasb: vakansiya / nomzod nisbati) admin
analitikasida.

## MATCH SCORE (`src/features/matching/score.ts`)

Bu **reyting emas** — nomzodning aniq vakansiyaga mosligi. UI'da “Nega?” tugmasi har bir omil ulushini koʻrsatadi.

| Omil (standart vazn)  | Hisoblash (0..1)                                                            |
| --------------------- | --------------------------------------------------------------------------- |
| Hudud (25)            | tier 1→1, 2→0.95, 3→0.85, 4→0.6, 5→0.45, 6→0.25, 7→0; masofaviy moslik ≥0.8 |
| Masofa (10)           | ≤5 km → 1, keyin 100 km gacha chiziqli pasayadi                             |
| Kasb (20)             | bir xil kasb 1, bir xil kategoriya 0.5                                      |
| Koʻnikmalar (15)      | mos / talab qilingan                                                        |
| Tajriba (10)          | min(1, tajriba / talab)                                                     |
| Mavjudlik (5)         | darhol 1 … band 0                                                           |
| Maosh (5)             | kutilma ≤ taklif → 1, oshsa pasayadi                                        |
| Reyting (5)           | baho/5 (sharh boʻlmasa neytral 0.6)                                         |
| Profil toʻliqligi (5) | completeness / 100                                                          |

`score = Σ(vazn × qiymat) / Σ vazn × 100`. Vaznlar: Admin → Sozlamalar (`app_settings.matching.weights`).
Tarif boʻyicha koʻrinadigan tavsiyalar soni: `limits.match_view_limit` (FREE: 5).
