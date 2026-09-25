-- Companies & vacancies: ownership, moderation workflow, plan limits.
begin;

select tests.create_user('44444444-0000-0000-0000-000000000001', 'emp4@test.uz', 'employer');
select tests.create_user('44444444-0000-0000-0000-000000000002', 'emp4b@test.uz', 'employer');
select tests.create_user('44444444-0000-0000-0000-000000000003', 'seeker4@test.uz', 'job_seeker');
select tests.create_user('44444444-0000-0000-0000-000000000004', 'mod4@test.uz');
insert into public.user_roles (user_id, role) values ('44444444-0000-0000-0000-000000000004', 'moderator');

-- job seekers cannot create companies
select tests.login('44444444-0000-0000-0000-000000000003');
select tests.assert_raises($$insert into public.companies (owner_id, name, slug) values (auth.uid(), 'Fake', 'fake-co')$$, 'row-level security', 'job seeker cannot create company');

reset role;
select tests.login('44444444-0000-0000-0000-000000000001');
insert into public.companies (id, owner_id, name, slug, company_type, district_id, verification_status, is_featured)
values ('44444444-aaaa-0000-0000-000000000001', auth.uid(), 'Test MChJ', 'test-mchj', 'llc',
        (select id from public.districts where slug = 'kitob'), 'verified', true);
select tests.assert_eq((select verification_status::text from public.companies where slug = 'test-mchj'), 'unverified', 'cannot self-verify company');
select tests.assert_eq((select is_featured from public.companies where slug = 'test-mchj'), false, 'cannot self-feature');
select tests.assert_true(public.is_company_owner('44444444-aaaa-0000-0000-000000000001'), 'owner membership created');

-- vacancy creation: auto-published, protected fields reset
insert into public.vacancies (id, company_id, created_by, title, description, profession_id, district_id, status, is_featured, views_count)
values ('44444444-bbbb-0000-0000-000000000001', '44444444-aaaa-0000-0000-000000000001', auth.uid(), 'Payvandchi kerak',
        'Metall konstruksiyalarni payvandlash boʻyicha tajribali usta kerak.', (select id from public.professions where slug = 'payvandchi'),
        (select id from public.districts where slug = 'kitob'), 'active', true, 999);
select tests.assert_eq((select status::text from public.vacancies where id = '44444444-bbbb-0000-0000-000000000001'), 'active', 'auto published');
select tests.assert_eq((select is_featured from public.vacancies where id = '44444444-bbbb-0000-0000-000000000001'), false, 'is_featured reset');
select tests.assert_eq((select views_count from public.vacancies where id = '44444444-bbbb-0000-0000-000000000001'), 0, 'views reset');
select tests.assert_true((select expires_at > now() + interval '29 days' from public.vacancies where id = '44444444-bbbb-0000-0000-000000000001'), 'expiry set');
select tests.assert_raises($$update public.vacancies set promoted_until = now() + interval '1 year' where id = '44444444-bbbb-0000-0000-000000000001'$$, 'PROTECTED_FIELDS', 'cannot self-promote');

-- draft stays hidden
insert into public.vacancies (id, company_id, created_by, title, description, district_id, status)
values ('44444444-bbbb-0000-0000-000000000002', '44444444-aaaa-0000-0000-000000000001', auth.uid(), 'Qoralama vakansiya',
        'Bu hali eʼlon qilinmagan qoralama vakansiya matni.', (select id from public.districts where slug = 'kitob'), 'draft');

-- FREE plan: max 2 active vacancies
insert into public.vacancies (company_id, created_by, title, description, district_id, status)
values ('44444444-aaaa-0000-0000-000000000001', auth.uid(), 'Ikkinchi vakansiya', 'Ikkinchi faol vakansiya uchun tavsif matni.',
        (select id from public.districts where slug = 'kitob'), 'pending_review');
select tests.assert_raises($$insert into public.vacancies (company_id, created_by, title, description, district_id, status)
  values ('44444444-aaaa-0000-0000-000000000001', auth.uid(), 'Uchinchi vakansiya', 'Limitdan oshadigan uchinchi vakansiya matni.',
  (select id from public.districts where slug = 'kitob'), 'pending_review')$$, 'VACANCY_LIMIT_REACHED', 'plan limit enforced');
select tests.assert_raises($$update public.vacancies set status = 'pending_review' where id = '44444444-bbbb-0000-0000-000000000002'$$, 'VACANCY_LIMIT_REACHED', 'publishing draft also limited');

-- closing frees a slot; employers cannot pick arbitrary statuses
update public.vacancies set status = 'closed' where id = '44444444-bbbb-0000-0000-000000000001';
select tests.assert_raises($$update public.vacancies set status = 'expired' where id = '44444444-bbbb-0000-0000-000000000002'$$, 'INVALID_STATUS_TRANSITION', 'cannot set expired');
update public.vacancies set status = 'active' where id = '44444444-bbbb-0000-0000-000000000002';
select tests.assert_eq((select status::text from public.vacancies where id = '44444444-bbbb-0000-0000-000000000002'), 'active', 'publish request auto-approved');

-- another employer cannot touch it
reset role;
select tests.login('44444444-0000-0000-0000-000000000002');
select tests.assert_eq(tests.row_count($$update public.vacancies set title = 'hacked' where company_id = '44444444-aaaa-0000-0000-000000000001'$$), 0, 'other employer cannot edit');
select tests.assert_raises($$insert into public.vacancies (company_id, created_by, title, description, remote_allowed)
  values ('44444444-aaaa-0000-0000-000000000001', auth.uid(), 'Begona vakansiya', 'Boshqa kompaniya nomidan vakansiya matni.', true)$$,
  'row-level security', 'cannot post for foreign company');
select tests.assert_eq((select count(*)::int from public.vacancies where status = 'closed' and company_id = '44444444-aaaa-0000-0000-000000000001'), 0, 'closed vacancy invisible to others');

-- moderation: moderator rejects, audit log written, public no longer sees it
reset role;
select tests.login('44444444-0000-0000-0000-000000000004');
update public.vacancies set status = 'rejected', rejection_reason = 'Maosh notoʻgʻri koʻrsatilgan' where id = '44444444-bbbb-0000-0000-000000000002';
select tests.assert_eq((select count(*)::int from public.audit_logs), 0, 'moderator cannot read audit log');
reset role;
select tests.assert_true(exists (select 1 from public.audit_logs where entity_type = 'vacancies' and entity_id = '44444444-bbbb-0000-0000-000000000002'), 'moderation audited');
select tests.login_anon();
select tests.assert_eq((select count(*)::int from public.vacancies where id = '44444444-bbbb-0000-0000-000000000002'), 0, 'rejected hidden');

-- editing a rejected vacancy resubmits it
reset role;
select tests.login('44444444-0000-0000-0000-000000000001');
update public.vacancies set description = 'Tuzatilgan tavsif: maosh 6 mln soʻmdan boshlanadi.' where id = '44444444-bbbb-0000-0000-000000000002';
select tests.assert_eq((select status::text from public.vacancies where id = '44444444-bbbb-0000-0000-000000000002'), 'active', 'resubmitted and auto-published');

-- manual moderation mode
reset role;
update public.app_settings set value = 'false' where key = 'moderation.auto_publish';
update public.vacancies set status = 'closed' where company_id = '44444444-aaaa-0000-0000-000000000001';
select tests.login('44444444-0000-0000-0000-000000000001');
update public.vacancies set status = 'pending_review' where id = '44444444-bbbb-0000-0000-000000000002';
select tests.assert_eq((select status::text from public.vacancies where id = '44444444-bbbb-0000-0000-000000000002'), 'pending_review', 'waits for moderator when auto publish off');

reset role;
rollback;
