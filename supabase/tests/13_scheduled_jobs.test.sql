-- Scheduled jobs, reminders, Telegram linking and delivery queue.
begin;

select tests.create_user('dddddddd-0000-0000-0000-000000000001', 'e13@test.uz', 'employer');
select tests.create_user('dddddddd-0000-0000-0000-000000000002', 'c13@test.uz', 'job_seeker');
insert into public.companies (id, owner_id, name, slug) values
  ('dddddddd-aaaa-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001', 'Cron MChJ', 'cron-mchj');
insert into public.vacancies (id, company_id, created_by, title, description, status, remote_allowed) values
  ('dddddddd-bbbb-0000-0000-000000000001', 'dddddddd-aaaa-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001',
   'Tez tugaydigan', 'Muddati tez orada tugaydigan vakansiya tavsifi.', 'active', true),
  ('dddddddd-bbbb-0000-0000-000000000002', 'dddddddd-aaaa-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001',
   'Tugagan', 'Muddati allaqachon tugagan vakansiya tavsifi matni.', 'active', true);
update public.vacancies set expires_at = now() + interval '1 day' where id = 'dddddddd-bbbb-0000-0000-000000000001';
update public.vacancies set expires_at = now() - interval '1 hour' where id = 'dddddddd-bbbb-0000-0000-000000000002';
insert into public.subscriptions (user_id, company_id, plan_id, status, current_period_end) values
  ('dddddddd-0000-0000-0000-000000000001', 'dddddddd-aaaa-0000-0000-000000000001', (select id from public.subscription_plans where code = 'PRO'), 'active', now() + interval '2 days');

-- clients cannot run jobs
select tests.login('dddddddd-0000-0000-0000-000000000001');
select tests.assert_raises($$select public.run_scheduled_jobs()$$, 'permission denied', 'client cannot run jobs');
select tests.assert_raises($$select * from public.pending_notification_deliveries()$$, 'permission denied', 'client cannot read queue');
select tests.assert_raises($$update public.profiles set telegram_chat_id = 42 where id = auth.uid()$$, 'PROTECTED_FIELDS', 'cannot set chat id');
insert into public.telegram_link_tokens (token, user_id) values ('abcdefghijklmnop1234', auth.uid());
update public.profiles set notify_email = false where id = auth.uid();
reset role;

set local role service_role;
select set_config('test.jobs', public.run_scheduled_jobs()::text, true);
reset role;
select tests.assert_eq((current_setting('test.jobs')::jsonb ->> 'vacancy_reminders')::int, 1, 'one expiry reminder');
select tests.assert_true((current_setting('test.jobs')::jsonb ->> 'vacancies_expired')::int >= 1, 'expired vacancy');
select tests.assert_eq((select status::text from public.vacancies where id = 'dddddddd-bbbb-0000-0000-000000000002'), 'expired', 'status expired');
select tests.assert_eq((current_setting('test.jobs')::jsonb ->> 'subscription_reminders')::int, 1, 'subscription reminder');
select tests.assert_eq((select count(*)::int from public.notifications where user_id = 'dddddddd-0000-0000-0000-000000000001' and type = 'job_expiration'), 2, 'employer notified twice');

-- idempotent: second run sends no duplicate reminders
set local role service_role;
select tests.assert_eq((public.run_scheduled_jobs() ->> 'vacancy_reminders')::int, 0, 'no duplicate reminder');

-- telegram linking consumes the token once
select tests.assert_eq(public.link_telegram_chat('abcdefghijklmnop1234', 777), 'dddddddd-0000-0000-0000-000000000001'::uuid, 'chat linked');
select tests.assert_eq(public.link_telegram_chat('abcdefghijklmnop1234', 888), null::uuid, 'token single use');
select tests.assert_true((select count(*) from public.pending_notification_deliveries(50) where user_id = 'dddddddd-0000-0000-0000-000000000001') >= 3, 'queue has items');
select tests.assert_eq((select telegram_chat_id from public.pending_notification_deliveries(50) where user_id = 'dddddddd-0000-0000-0000-000000000001' limit 1), 777::bigint, 'queue exposes chat id');
select tests.assert_true(public.mark_notifications_delivered(array(select id from public.notifications where user_id = 'dddddddd-0000-0000-0000-000000000001')) >= 3, 'marked delivered');
select tests.assert_eq((select count(*)::int from public.pending_notification_deliveries(50) where user_id = 'dddddddd-0000-0000-0000-000000000001'), 0, 'queue drained');
reset role;

rollback;
