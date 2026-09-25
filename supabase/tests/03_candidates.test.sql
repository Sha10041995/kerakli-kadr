-- Candidate profiles: ownership, privacy, protected fields, completeness.
begin;

select tests.create_user('33333333-0000-0000-0000-000000000001', 'cand3@test.uz', 'job_seeker', 'Nodir', 'Karimov');
select tests.create_user('33333333-0000-0000-0000-000000000002', 'emp3@test.uz', 'employer');

select tests.login('33333333-0000-0000-0000-000000000001');
insert into public.candidate_profiles (id, headline, profession_id, experience_years, district_id, lat, lng, is_public)
values (auth.uid(), 'Tajribali elektrik', (select id from public.professions where slug = 'elektrik'), 5,
        (select d.id from public.districts d join public.regions r on r.id = d.region_id where r.slug = 'xorazm' and d.slug = 'urganch-shahri'),
        41.551234, 60.639876, true);

select tests.assert_eq((select lat from public.candidate_profiles where id = auth.uid()), 41.55::double precision, 'latitude rounded (~1 km privacy)');
select tests.assert_eq((select lng from public.candidate_profiles where id = auth.uid()), 60.64::double precision, 'longitude rounded');
select tests.assert_eq((select r.slug from public.candidate_profiles c join public.regions r on r.id = c.region_id where c.id = auth.uid()), 'xorazm', 'region filled from district');
select tests.assert_eq((select completeness from public.candidate_profiles where id = auth.uid()), 45::smallint, 'completeness computed');

-- completeness grows with child rows
insert into public.candidate_skills (candidate_id, skill_id) select auth.uid(), id from public.skills where slug = 'elektr-montaj';
select tests.assert_eq((select completeness from public.candidate_profiles where id = auth.uid()), 55::smallint, 'skills raise completeness (45 -> 55)');

-- protected fields
select tests.assert_raises($$update public.candidate_profiles set rating_avg = 5 where id = auth.uid()$$, 'PROTECTED_FIELDS', 'cannot fake rating');
select tests.assert_raises($$update public.candidate_profiles set premium_until = now() + interval '1 year' where id = auth.uid()$$, 'PROTECTED_FIELDS', 'cannot self-grant premium');
select tests.assert_raises($$update public.candidate_skills set is_verified = true where candidate_id = auth.uid()$$, 'PROTECTED_FIELDS', 'cannot verify own skill');
insert into public.candidate_certificates (candidate_id, name, is_verified) values (auth.uid(), 'Elektr xavfsizligi', true);
select tests.assert_eq((select is_verified from public.candidate_certificates where candidate_id = auth.uid()), false, 'certificate verification forced false');

-- location mismatch
select tests.assert_raises($$update public.candidate_profiles set region_id = (select id from public.regions where slug = 'andijon'),
  district_id = (select id from public.districts where slug = 'kitob') where id = auth.uid()$$, 'LOCATION_MISMATCH', 'inconsistent location rejected');

-- moving district re-derives region and coordinates
update public.candidate_profiles set district_id = (select id from public.districts where slug = 'kitob') where id = auth.uid();
select tests.assert_eq((select r.slug from public.candidate_profiles c join public.regions r on r.id = c.region_id where c.id = auth.uid()), 'qashqadaryo', 'region re-derived on move');
select tests.assert_true((select abs(lat - 39.12) < 0.02 from public.candidate_profiles where id = auth.uid()), 'coordinates re-derived on move');

-- employers cannot create candidate profiles for others / themselves without role
reset role;
select tests.login('33333333-0000-0000-0000-000000000002');
select tests.assert_raises($$insert into public.candidate_profiles (id) values ('33333333-0000-0000-0000-000000000002')$$, 'row-level security', 'employer without job_seeker role cannot create profile');
select tests.assert_eq(tests.row_count($$update public.candidate_profiles set headline = 'hacked' where id = '33333333-0000-0000-0000-000000000001'$$), 0, 'cannot edit others');
select tests.assert_eq(tests.row_count($$delete from public.candidate_experience where candidate_id = '33333333-0000-0000-0000-000000000001'$$), 0, 'cannot delete others experience');

-- hidden profiles are invisible to others
reset role;
update public.candidate_profiles set is_public = false where id = '33333333-0000-0000-0000-000000000001';
select tests.login('33333333-0000-0000-0000-000000000002');
select tests.assert_eq((select count(*)::int from public.candidate_profiles where id = '33333333-0000-0000-0000-000000000001'), 0, 'hidden profile invisible');
select tests.assert_eq((select count(*)::int from public.candidate_skills where candidate_id = '33333333-0000-0000-0000-000000000001'), 0, 'hidden profile skills invisible');
reset role;
select tests.login_anon();
select tests.assert_eq((select count(*)::int from public.candidate_profiles where id = '33333333-0000-0000-0000-000000000001'), 0, 'hidden profile invisible to anon');

reset role;
rollback;
