-- Storage access control, reports and saved searches.
begin;

select tests.create_user('aaaaaaaa-0000-0000-0000-000000000001', 'cand10@test.uz', 'job_seeker');
select tests.create_user('aaaaaaaa-0000-0000-0000-000000000002', 'emp10@test.uz', 'employer');
select tests.create_user('aaaaaaaa-0000-0000-0000-000000000003', 'emp10b@test.uz', 'employer');

-- owner folder only
select tests.login('aaaaaaaa-0000-0000-0000-000000000001');
insert into storage.objects (bucket_id, name) values ('documents', 'aaaaaaaa-0000-0000-0000-000000000001/cv.pdf');
select tests.assert_raises($$insert into storage.objects (bucket_id, name) values ('documents', 'aaaaaaaa-0000-0000-0000-000000000002/cv.pdf')$$, 'row-level security', 'cannot upload into foreign folder');
select tests.assert_raises($$insert into storage.objects (bucket_id, name) values ('avatars', 'cv.pdf')$$, 'row-level security', 'root uploads rejected');

-- private documents: invisible to unrelated employers
reset role;
select tests.login('aaaaaaaa-0000-0000-0000-000000000002');
select tests.assert_eq((select count(*)::int from storage.objects where bucket_id = 'documents'), 0, 'employer cannot read CV without application');

-- ...visible once the candidate applies to their vacancy
reset role;
insert into public.companies (id, owner_id, name, slug) values
  ('aaaaaaaa-aaaa-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', 'Storage MChJ', 'storage-mchj');
insert into public.vacancies (id, company_id, created_by, title, description, status, remote_allowed) values
  ('aaaaaaaa-bbbb-0000-0000-000000000001', 'aaaaaaaa-aaaa-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002',
   'Kuryer kerak', 'Shahar boʻylab yetkazib berish uchun kuryer.', 'active', true);
insert into public.candidate_profiles (id, is_public) values ('aaaaaaaa-0000-0000-0000-000000000001', false);
insert into public.applications (vacancy_id, candidate_id) values ('aaaaaaaa-bbbb-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001');
select tests.login('aaaaaaaa-0000-0000-0000-000000000002');
select tests.assert_eq((select count(*)::int from storage.objects where bucket_id = 'documents'), 1, 'employer reads applicant CV');
select tests.assert_eq((select count(*)::int from public.candidate_profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 1, 'employer sees hidden profile of applicant');
reset role;
select tests.login('aaaaaaaa-0000-0000-0000-000000000003');
select tests.assert_eq((select count(*)::int from storage.objects where bucket_id = 'documents'), 0, 'other employer still blocked');

-- reports: one per target per user, status controlled by staff
insert into public.reports (target_type, target_id, reason, status) values ('vacancy', 'aaaaaaaa-bbbb-0000-0000-000000000001', 'scam', 'resolved');
select tests.assert_eq((select status::text from public.reports limit 1), 'open', 'report forced open');
select tests.assert_raises($$insert into public.reports (target_type, target_id, reason) values ('vacancy', 'aaaaaaaa-bbbb-0000-0000-000000000001', 'spam')$$, 'duplicate', 'one report per target');
select tests.assert_eq(tests.row_count($$update public.reports set status = 'dismissed'$$), 0, 'reporter cannot resolve');

-- saved search -> notification on new matching vacancy
reset role;
select tests.login('aaaaaaaa-0000-0000-0000-000000000001');
insert into public.saved_searches (user_id, kind, name, profession_id, district_id)
values (auth.uid(), 'vacancies', 'Kitob + payvandchi', (select id from public.professions where slug = 'payvandchi'), (select id from public.districts where slug = 'kitob'));
reset role;
insert into public.vacancies (company_id, created_by, title, description, profession_id, district_id, status) values
  ('aaaaaaaa-aaaa-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', 'Payvandchi kerak', 'Kitobda payvandchi kerak, tajriba 2 yil.',
   (select id from public.professions where slug = 'payvandchi'), (select id from public.districts where slug = 'kitob'), 'active');
select tests.assert_true(exists (select 1 from public.notifications where user_id = 'aaaaaaaa-0000-0000-0000-000000000001' and type = 'new_matching_job'), 'saved search notified');

-- favorites are private
select tests.login('aaaaaaaa-0000-0000-0000-000000000001');
insert into public.favorites (user_id, vacancy_id) values (auth.uid(), 'aaaaaaaa-bbbb-0000-0000-000000000001');
reset role;
select tests.login('aaaaaaaa-0000-0000-0000-000000000003');
select tests.assert_eq((select count(*)::int from public.favorites), 0, 'favorites private');
select tests.assert_eq((select count(*)::int from public.saved_searches), 0, 'saved searches private');

-- admin stats are staff-only
select tests.assert_raises($$select public.admin_dashboard_stats()$$, 'NOT_ALLOWED', 'stats require staff');

reset role;
rollback;
