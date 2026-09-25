-- Applications: apply rules, status workflow, visibility, contact sharing.
begin;

select tests.create_user('55555555-0000-0000-0000-000000000001', 'emp5@test.uz', 'employer');
select tests.create_user('55555555-0000-0000-0000-000000000002', 'cand5@test.uz', 'job_seeker');
select tests.create_user('55555555-0000-0000-0000-000000000003', 'cand5b@test.uz', 'job_seeker');
update public.profiles set phone = '+998901234567' where id = '55555555-0000-0000-0000-000000000002';

insert into public.companies (id, owner_id, name, slug, district_id)
values ('55555555-aaaa-0000-0000-000000000001', '55555555-0000-0000-0000-000000000001', 'Ariza MChJ', 'ariza-mchj',
        (select id from public.districts where slug = 'chilonzor'));
insert into public.vacancies (id, company_id, created_by, title, description, district_id, status)
values ('55555555-bbbb-0000-0000-000000000001', '55555555-aaaa-0000-0000-000000000001', '55555555-0000-0000-0000-000000000001',
        'Sotuvchi kerak', 'Doʻkonda ishlash uchun xushmuomala sotuvchi kerak.', (select id from public.districts where slug = 'chilonzor'), 'active'),
       ('55555555-bbbb-0000-0000-000000000002', '55555555-aaaa-0000-0000-000000000001', '55555555-0000-0000-0000-000000000001',
        'Yopiq vakansiya', 'Bu vakansiya allaqachon yopilgan, ariza qabul qilinmaydi.', (select id from public.districts where slug = 'chilonzor'), 'closed');
insert into public.candidate_profiles (id, district_id) values
  ('55555555-0000-0000-0000-000000000002', (select id from public.districts where slug = 'chilonzor')),
  ('55555555-0000-0000-0000-000000000003', (select id from public.districts where slug = 'chilonzor'));

-- candidate applies
select tests.login('55555555-0000-0000-0000-000000000002');
insert into public.applications (id, vacancy_id, candidate_id, cover_letter, status)
values ('55555555-cccc-0000-0000-000000000001', '55555555-bbbb-0000-0000-000000000001', auth.uid(), 'Salom!', 'hired');
select tests.assert_eq((select status::text from public.applications where id = '55555555-cccc-0000-0000-000000000001'), 'applied', 'initial status forced to applied');
select tests.assert_raises($$insert into public.applications (vacancy_id, candidate_id) values ('55555555-bbbb-0000-0000-000000000001', auth.uid())$$, 'duplicate', 'no duplicate application');
select tests.assert_raises($$insert into public.applications (vacancy_id, candidate_id) values ('55555555-bbbb-0000-0000-000000000002', auth.uid())$$, 'VACANCY_NOT_OPEN', 'cannot apply to closed vacancy');
select tests.assert_raises($$insert into public.applications (vacancy_id, candidate_id) values ('55555555-bbbb-0000-0000-000000000001', '55555555-0000-0000-0000-000000000003')$$, 'row-level security', 'cannot apply on behalf of others');
select tests.assert_raises($$update public.applications set status = 'hired' where id = '55555555-cccc-0000-0000-000000000001'$$, 'INVALID_STATUS_TRANSITION', 'candidate cannot hire themselves');
select tests.assert_eq((select count(*)::int from public.get_applicant_contact('55555555-cccc-0000-0000-000000000001')), 0, 'candidate is not given contacts via employer function');

-- other candidate cannot see it
reset role;
select tests.login('55555555-0000-0000-0000-000000000003');
select tests.assert_eq((select count(*)::int from public.applications), 0, 'other candidate sees nothing');

-- employer sees it, got notified, moves it through the pipeline
reset role;
select tests.login('55555555-0000-0000-0000-000000000001');
select tests.assert_eq((select count(*)::int from public.applications where vacancy_id = '55555555-bbbb-0000-0000-000000000001'), 1, 'employer sees application');
select tests.assert_true(exists (select 1 from public.notifications where type = 'new_application'), 'employer notified');
select tests.assert_eq((select applications_count from public.vacancies where id = '55555555-bbbb-0000-0000-000000000001'), 1, 'counter incremented');
select tests.assert_eq((select phone from public.get_applicant_contact('55555555-cccc-0000-0000-000000000001')), '+998901234567', 'employer gets applicant phone');
select tests.assert_raises($$update public.applications set cover_letter = 'edited' where id = '55555555-cccc-0000-0000-000000000001'$$, 'PROTECTED_FIELDS', 'employer cannot edit cover letter');
select tests.assert_raises($$update public.applications set status = 'hired' where id = '55555555-cccc-0000-0000-000000000001'$$, 'INVALID_STATUS_TRANSITION', 'cannot skip to hired');
update public.applications set status = 'viewed' where id = '55555555-cccc-0000-0000-000000000001';
update public.applications set status = 'shortlisted' where id = '55555555-cccc-0000-0000-000000000001';
update public.applications set status = 'interview' where id = '55555555-cccc-0000-0000-000000000001';
update public.applications set status = 'hired' where id = '55555555-cccc-0000-0000-000000000001';
select tests.assert_raises($$update public.applications set status = 'rejected' where id = '55555555-cccc-0000-0000-000000000001'$$, 'INVALID_STATUS_TRANSITION', 'hired is final');
select tests.assert_eq((select count(*)::int from public.application_status_history where application_id = '55555555-cccc-0000-0000-000000000001'), 5, 'history recorded');

reset role;
select tests.assert_eq((select completed_jobs from public.candidate_profiles where id = '55555555-0000-0000-0000-000000000002'), 1, 'candidate completed_jobs incremented');
select tests.assert_eq((select hires_count from public.companies where id = '55555555-aaaa-0000-0000-000000000001'), 1, 'company hires incremented');
select tests.assert_true(exists (select 1 from public.notifications where user_id = '55555555-0000-0000-0000-000000000002' and type = 'interview'), 'candidate got interview notification');

-- notifications: owner may only mark as read
select tests.login('55555555-0000-0000-0000-000000000002');
update public.notifications set read_at = now() where user_id = auth.uid();
select tests.assert_raises($$update public.notifications set title = 'x' where user_id = auth.uid()$$, 'PROTECTED_FIELDS', 'notification content immutable');
select tests.assert_raises($$select public.create_notification(auth.uid(), 'system', 'spam')$$, 'permission denied', 'clients cannot create notifications');

reset role;
rollback;
