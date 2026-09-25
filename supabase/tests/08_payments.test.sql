-- Monetisation: server-side prices, backend-only settlement, entitlements.
begin;

select tests.create_user('88888888-0000-0000-0000-000000000001', 'emp8@test.uz', 'employer');
select tests.create_user('88888888-0000-0000-0000-000000000002', 'other8@test.uz', 'employer');
insert into public.companies (id, owner_id, name, slug) values
  ('88888888-aaaa-0000-0000-000000000001', '88888888-0000-0000-0000-000000000001', 'Pay MChJ', 'pay-mchj');

select tests.login('88888888-0000-0000-0000-000000000001');
select tests.assert_eq((public.company_plan_limits('88888888-aaaa-0000-0000-000000000001') ->> 'max_active_vacancies')::int, 2, 'FREE plan by default');
select set_config('test.payment', public.create_payment_intent('subscription', 'PRO', 'mock', '88888888-aaaa-0000-0000-000000000001')::text, true);
select tests.assert_eq((select amount_uzs from public.payments where id = current_setting('test.payment')::uuid), 249000::bigint, 'amount taken from DB price');
select tests.assert_eq((select status::text from public.payments where id = current_setting('test.payment')::uuid), 'pending', 'pending payment');
select tests.assert_raises($$select public.create_payment_intent('subscription', 'FREE', 'mock', '88888888-aaaa-0000-0000-000000000001')$$, 'PLAN_NOT_FOUND', 'free plan is not purchasable');
select tests.assert_raises($$insert into public.payments (user_id, amount_uzs, provider, purpose, plan_id) values (auth.uid(), 1, 'mock', 'subscription', 1)$$, 'row-level security', 'cannot insert payments directly');
select tests.assert_eq(tests.row_count($$update public.payments set status = 'paid'$$), 0, 'cannot mark own payment paid');
select tests.assert_raises($$select public.mark_payment_paid(current_setting('test.payment')::uuid, 'fake')$$, 'permission denied', 'clients cannot settle payments');

-- other users cannot see or buy for this company
reset role;
select tests.login('88888888-0000-0000-0000-000000000002');
select tests.assert_eq((select count(*)::int from public.payments), 0, 'payments are private');
select tests.assert_raises($$select public.create_payment_intent('subscription', 'PRO', 'mock', '88888888-aaaa-0000-0000-000000000001')$$, 'NOT_ALLOWED', 'cannot pay for foreign company');

-- backend (payment webhook) settles the payment
reset role;
set local role service_role;
select public.mark_payment_paid(current_setting('test.payment')::uuid, 'mock-ref-1');
select public.mark_payment_paid(current_setting('test.payment')::uuid, 'mock-ref-1'); -- idempotent
reset role;
select tests.assert_eq((select count(*)::int from public.subscriptions where company_id = '88888888-aaaa-0000-0000-000000000001'), 1, 'one subscription created');
select tests.assert_eq((public.company_plan_limits('88888888-aaaa-0000-0000-000000000001') ->> 'max_active_vacancies')::int, 20, 'PRO limits active');
select tests.assert_raises($$update public.payments set status = 'pending' where id = current_setting('test.payment')::uuid$$, 'INVALID_PAYMENT_TRANSITION', 'paid cannot go back to pending');
update public.payments set status = 'refunded' where id = current_setting('test.payment')::uuid;
select tests.assert_true(exists (select 1 from public.audit_logs where entity_type = 'payments'), 'payment status changes audited');

-- promotion service on a vacancy
insert into public.vacancies (id, company_id, created_by, title, description, status, remote_allowed) values
  ('88888888-bbbb-0000-0000-000000000001', '88888888-aaaa-0000-0000-000000000001', '88888888-0000-0000-0000-000000000001',
   'Buxgalter kerak', 'Kichik korxona uchun tajribali buxgalter kerak.', 'active', true);
select tests.login('88888888-0000-0000-0000-000000000001');
select set_config('test.payment2', public.create_payment_intent('service', 'vacancy_promotion', 'mock', null, '88888888-bbbb-0000-0000-000000000001')::text, true);
reset role;
set local role service_role;
select public.mark_payment_paid(current_setting('test.payment2')::uuid, 'mock-ref-2');
reset role;
select tests.assert_true((select promoted_until > now() + interval '6 days' from public.vacancies where id = '88888888-bbbb-0000-0000-000000000001'), 'vacancy promoted for 7 days');

rollback;
