-- Shared rate limiter: counting, window reset, client access denied.
begin;

select tests.assert_eq((select hits from public.rate_limit_hit('k1', 60000)), 1, 'first hit');
select tests.assert_eq((select hits from public.rate_limit_hit('k1', 60000)), 2, 'second hit');
select tests.assert_eq((select hits from public.rate_limit_hit('k2', 60000)), 1, 'keys are independent');

-- expired window restarts the counter
update public.rate_limits set reset_at = now() - interval '1 second' where key = 'k1';
select tests.assert_eq((select hits from public.rate_limit_hit('k1', 60000)), 1, 'window reset');

-- clients can neither call the function nor read the table
select tests.create_user('bbbbbbbb-0000-0000-0000-000000000001', 'rl@test.uz', 'job_seeker');
select tests.login('bbbbbbbb-0000-0000-0000-000000000001');
select tests.assert_raises($$select public.rate_limit_hit('x', 1000)$$, 'permission denied', 'authenticated cannot hit');
select tests.assert_eq((select count(*)::int from public.rate_limits), 0, 'table invisible to clients');
reset role;

set local role service_role;
select tests.assert_eq((select hits from public.rate_limit_hit('svc', 1000)), 1, 'service role allowed');
reset role;

rollback;
