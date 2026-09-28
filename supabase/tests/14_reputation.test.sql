-- Reputation metrics.
begin;

select tests.create_user('eeeeeeee-0000-0000-0000-000000000001', 'e14@test.uz', 'employer');
select tests.create_user('eeeeeeee-0000-0000-0000-000000000002', 'c14@test.uz', 'job_seeker');
select tests.create_user('eeeeeeee-0000-0000-0000-000000000003', 'c14b@test.uz', 'job_seeker');
insert into public.companies (id, owner_id, name, slug) values
  ('eeeeeeee-aaaa-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000001', 'Rep MChJ', 'rep-mchj');
insert into public.vacancies (id, company_id, created_by, title, description, status, remote_allowed) values
  ('eeeeeeee-bbbb-0000-0000-000000000001', 'eeeeeeee-aaaa-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000001',
   'Operator kerak', 'Call-markaz uchun operator kerak, tajriba shart emas.', 'active', true);
insert into public.candidate_profiles (id, is_public) values
  ('eeeeeeee-0000-0000-0000-000000000002', true), ('eeeeeeee-0000-0000-0000-000000000003', true);
insert into public.applications (vacancy_id, candidate_id, created_at) values
  ('eeeeeeee-bbbb-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000002', now() - interval '5 days'),
  ('eeeeeeee-bbbb-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000003', now() - interval '5 days');
update public.applications set status = 'viewed' where candidate_id = 'eeeeeeee-0000-0000-0000-000000000002';

select tests.assert_eq((select response_rate from public.company_response_stats('eeeeeeee-aaaa-0000-0000-000000000001')), 50, 'employer answered 1 of 2');

-- profile views: counted for others, not for self
select tests.login('eeeeeeee-0000-0000-0000-000000000001');
select public.increment_candidate_views('eeeeeeee-0000-0000-0000-000000000002');
select public.increment_candidate_views('eeeeeeee-0000-0000-0000-000000000002');
select tests.assert_eq((select count(*)::int from public.candidate_profile_stats), 0, 'employer cannot read stats of others');
select set_config('test.conv', public.start_conversation('eeeeeeee-0000-0000-0000-000000000002')::text, true);
insert into public.messages (conversation_id, body) values (current_setting('test.conv')::uuid, 'Salom, ishga taklif bor');
reset role;
select tests.login('eeeeeeee-0000-0000-0000-000000000002');
select public.increment_candidate_views('eeeeeeee-0000-0000-0000-000000000002');
select tests.assert_eq((select views_count from public.candidate_profile_stats), 2, 'self views ignored, owner can read');
select tests.assert_eq((select response_rate from public.candidate_response_stats(auth.uid())), 0, 'not replied yet');
insert into public.messages (conversation_id, body) values (current_setting('test.conv')::uuid, 'Assalomu alaykum, qiziqaman');
select tests.assert_eq((select response_rate from public.candidate_response_stats(auth.uid())), 100, 'replied');
select tests.assert_raises($$select public.engagement_stats()$$, 'NOT_ALLOWED', 'engagement stats staff only');
reset role;

rollback;
