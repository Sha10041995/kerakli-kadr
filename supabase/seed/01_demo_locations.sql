-- DEMO DATA — development only. Sample settlements (shahar/qishloq) and
-- mahallas. Production data must be imported from the official dataset
-- (scripts/import-locations.mjs).

insert into public.settlements (district_id, slug, kind, name_uz, lat, lng)
select d.id, s.slug, s.kind::public.settlement_kind, s.name_uz, s.lat, s.lng
from (values
  ('qashqadaryo', 'kitob', 'kitob-shahri', 'city', 'Kitob shahri', 39.1200, 66.8800),
  ('qashqadaryo', 'kitob', 'beshterak', 'village', 'Beshterak qishlogʻi', 39.1550, 66.9300),
  ('qashqadaryo', 'kitob', 'qaynarbuloq', 'village', 'Qaynarbuloq qishlogʻi', 39.0900, 66.8200),
  ('qashqadaryo', 'kitob', 'varganza', 'village', 'Varganza qishlogʻi', 39.1800, 66.8600),
  ('qoraqalpogiston', 'qongirot', 'qongirot-shahri', 'city', 'Qoʻngʻirot shahri', 43.0500, 58.8400),
  ('qoraqalpogiston', 'qongirot', 'jaslyq', 'village', 'Jasliq qishlogʻi', 43.4500, 57.5000),
  ('xorazm', 'urganch', 'qorovul', 'town', 'Qorovul shaharchasi', 41.5200, 60.6000),
  ('xorazm', 'urganch', 'chandir', 'village', 'Chandir qishlogʻi', 41.4900, 60.5500),
  ('toshkent-viloyati', 'chirchiq', 'chirchiq-markaz', 'city', 'Chirchiq (markaz)', 41.4689, 69.5822),
  ('samarqand', 'urgut', 'urgut-shahri', 'city', 'Urgut shahri', 39.4000, 67.2400)
) as s(region_slug, district_slug, slug, kind, name_uz, lat, lng)
join public.regions r on r.slug = s.region_slug
join public.districts d on d.region_id = r.id and d.slug = s.district_slug
on conflict (district_id, slug) do nothing;

insert into public.mahallas (district_id, settlement_id, slug, name_uz, lat, lng)
select d.id, st.id, m.slug, m.name_uz, m.lat, m.lng
from (values
  ('toshkent', 'chilonzor', null, 'chilonzor-9', 'Chilonzor-9 mahallasi', 41.2800, 69.2000),
  ('toshkent', 'chilonzor', null, 'qatortol', 'Qatortol mahallasi', 41.2900, 69.2150),
  ('toshkent', 'chilonzor', null, 'novza', 'Novza mahallasi', 41.2950, 69.2250),
  ('toshkent', 'yunusobod', null, 'yunusobod-4', 'Yunusobod-4 mahallasi', 41.3600, 69.2900),
  ('toshkent', 'yunusobod', null, 'bogishamol', 'Bogʻishamol mahallasi', 41.3750, 69.3000),
  ('xorazm', 'urganch-shahri', null, 'al-xorazmiy', 'Al-Xorazmiy mahallasi', 41.5550, 60.6250),
  ('xorazm', 'urganch-shahri', null, 'bogbonlar', 'Bogʻbonlar mahallasi', 41.5450, 60.6400),
  ('xorazm', 'urganch-shahri', null, 'navoiy-mfy', 'Navoiy mahallasi', 41.5600, 60.6150),
  ('qashqadaryo', 'kitob', 'kitob-shahri', 'mustaqillik', 'Mustaqillik mahallasi', 39.1180, 66.8750),
  ('qashqadaryo', 'kitob', 'kitob-shahri', 'bogiston', 'Bogʻiston mahallasi', 39.1230, 66.8850),
  ('qashqadaryo', 'kitob', 'beshterak', 'beshterak-mfy', 'Beshterak mahallasi', 39.1550, 66.9300),
  ('qoraqalpogiston', 'qongirot', 'qongirot-shahri', 'dostlik-mfy', 'Doʻstlik mahallasi', 43.0550, 58.8450)
) as m(region_slug, district_slug, settlement_slug, slug, name_uz, lat, lng)
join public.regions r on r.slug = m.region_slug
join public.districts d on d.region_id = r.id and d.slug = m.district_slug
left join public.settlements st on st.district_id = d.id and st.slug = m.settlement_slug
on conflict (district_id, slug) do nothing;
