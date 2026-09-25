-- LOCATION-FIRST search: tier ordering, radius, filters, injection safety.
begin;

select tests.create_user('99999999-0000-0000-0000-000000000001', 'emp9@test.uz', 'employer');
insert into public.companies (id, owner_id, name, slug) values
  ('99999999-aaaa-0000-0000-000000000001', '99999999-0000-0000-0000-000000000001', 'Search MChJ', 'search-mchj');

-- three welder vacancies: exact settlement, same district, neighbouring region
insert into public.vacancies (id, company_id, created_by, title, description, profession_id, settlement_id, district_id, region_id, status, lat, lng)
select ('99999999-bbbb-0000-0000-00000000000' || n)::uuid, '99999999-aaaa-0000-0000-000000000001', '99999999-0000-0000-0000-000000000001',
       t, 'Test uchun payvandchi vakansiyasi tavsifi.', (select id from public.professions where slug = 'payvandchi'),
       s, d, r, 'active', lat, lng
from (values
  (1, 'Payvandchi A (qishloq)', (select id from public.settlements where slug = 'beshterak'), null::int, null::int, null::float8, null::float8),
  (2, 'Payvandchi B (tuman)', null, (select id from public.districts where slug = 'kitob'), null, 39.10, 66.90),
  (3, 'Payvandchi C (Samarqand)', null, (select id from public.districts where slug = 'urgut'), null, null, null),
  (4, 'Payvandchi D (Xorazm)', null, (select d.id from public.districts d where d.slug = 'urganch-shahri'), null, null, null)
) as x(n, t, s, d, r, lat, lng);

select tests.login_anon();

-- exact settlement first, then district, then region-level / nearby
select tests.assert_eq(
  (select string_agg(left(title, 12), ',' order by location_tier, distance_km)
   from public.search_vacancies(p_profession_id := (select id from public.professions where slug = 'payvandchi'),
                                p_settlement_id := (select id from public.settlements where slug = 'beshterak'),
                                p_query := 'Payvandchi ')
   where title like 'Payvandchi _ (%'),
  'Payvandchi A,Payvandchi B,Payvandchi C', 'tiers: settlement, district, then nearby region (Urgut ~40 km, within default 50 km)');

select tests.assert_eq(
  (select location_tier from public.search_vacancies(p_settlement_id := (select id from public.settlements where slug = 'beshterak'))
   where title = 'Payvandchi A (qishloq)'), 2::smallint, 'exact settlement tier = 2');

-- neighbouring region (Urgut ~40 km from Kitob) is tier 5 within the radius
select tests.assert_eq(
  (select location_tier from public.search_vacancies(p_district_id := (select id from public.districts where slug = 'kitob'), p_radius_km := 100)
   where title = 'Payvandchi C (Samarqand)'), 5::smallint, 'nearby region tier = 5');
select tests.assert_eq(
  (select count(*)::int from public.search_vacancies(p_district_id := (select id from public.districts where slug = 'kitob'), p_radius_km := 10)
   where title = 'Payvandchi C (Samarqand)'), 0, 'radius excludes far results');
select tests.assert_eq(
  (select count(*)::int from public.search_vacancies(p_district_id := (select id from public.districts where slug = 'kitob'), p_radius_km := 100)
   where title = 'Payvandchi D (Xorazm)'), 0, 'far region excluded');

-- GPS origin: distance computed, nearest first
select tests.assert_eq(
  (select title from public.search_vacancies(p_query := 'Payvandchi', p_lat := 39.10, p_lng := 66.90, p_radius_km := 25, p_sort := 'distance') limit 1),
  'Payvandchi B (tuman)', 'nearest first by GPS');

-- no location: everything, newest first
select tests.assert_true((select count(*) from public.search_vacancies(p_query := 'Payvandchi')) >= 4, 'no location = no geo filter');

-- user input is treated as data (LIKE wildcards escaped, no SQL injection)
select tests.assert_eq((select count(*)::int from public.search_vacancies(p_query := '%')), 0, 'percent sign escaped');
select tests.assert_eq((select count(*)::int from public.search_vacancies(p_query := $q$'; drop table public.vacancies; --$q$)), 0, 'injection string is inert');
select tests.assert_true(exists (select 1 from public.vacancies), 'vacancies table intact');

-- synonyms
select tests.assert_true((select count(*) from public.search_vacancies(p_query := 'svarshik')) >= 4, 'synonym search');

-- candidate search exposes no contact data
select tests.assert_true(
  not exists (select 1 from information_schema.routines r
              join information_schema.parameters p on p.specific_name = r.specific_name
              where r.routine_name = 'search_candidates' and p.parameter_mode = 'OUT' and p.parameter_name in ('phone', 'email', 'last_name')),
  'search_candidates returns no phone/email/full last name');
select tests.assert_true((select count(*) from public.search_candidates(p_region_id := (select id from public.regions where slug = 'toshkent'))) > 0, 'candidate search works for anon');

-- local talent map
select tests.assert_true(
  ((public.talent_count((select id from public.professions where slug = 'elektrik'), p_region_id := (select id from public.regions where slug = 'toshkent'))) ->> 'in_area')::int >= 1,
  'talent count');

reset role;
rollback;
