-- Auth, profiles, RBAC and role-escalation protection.
begin;

select tests.create_user('11111111-0000-0000-0000-000000000001', 'seeker@test.uz', 'job_seeker', 'Ali', 'Valiyev');
select tests.create_user('11111111-0000-0000-0000-000000000002', 'boss@test.uz', 'employer', 'Vali', 'Aliyev');
select tests.create_user('11111111-0000-0000-0000-000000000003', 'hacker@test.uz', 'admin');

-- Sign-up trigger creates profile + allowed role only
select tests.assert_eq((select count(*)::int from public.profiles where id::text like '11111111-%'), 3, 'profiles created');
select tests.assert_true(exists (select 1 from public.user_roles where user_id = '11111111-0000-0000-0000-000000000001' and role = 'job_seeker'), 'job_seeker role from metadata');
select tests.assert_true(not exists (select 1 from public.user_roles where user_id = '11111111-0000-0000-0000-000000000003'), 'admin role from metadata is ignored');

update public.profiles set phone = '+998901112233' where id = '11111111-0000-0000-0000-000000000001';

-- A user sees only their own private profile
select tests.login('11111111-0000-0000-0000-000000000002');
select tests.assert_eq((select count(*)::int from public.profiles), 1, 'only own profile visible');
select tests.assert_eq((select phone from public.profiles where id = '11111111-0000-0000-0000-000000000001'), null::text, 'cannot read other phone');
-- public view never exposes phone/email
select tests.assert_true(
  not exists (select 1 from information_schema.columns where table_name = 'public_profiles' and column_name in ('phone', 'email', 'birth_year')),
  'public_profiles has no contact columns');
select tests.assert_eq((select first_name from public.public_profiles where id = '11111111-0000-0000-0000-000000000001'), 'Ali', 'public name visible');

-- Cannot update someone else's profile (RLS → 0 rows)
select tests.assert_eq(tests.row_count($$update public.profiles set first_name = 'X' where id = '11111111-0000-0000-0000-000000000001'$$), 0, 'cannot edit other profile');

-- Cannot self-verify
select tests.assert_raises($$update public.profiles set phone_verified = true where id = '11111111-0000-0000-0000-000000000002'$$, 'PROTECTED_FIELDS', 'cannot set phone_verified');
select tests.assert_raises($$update public.profiles set is_blocked = false, identity_verified = true where id = auth.uid()$$, 'PROTECTED_FIELDS', 'cannot set identity_verified');

-- Role escalation attempts
select tests.assert_raises($$insert into public.user_roles (user_id, role) values (auth.uid(), 'admin')$$, 'ONLY_SUPER_ADMIN', 'cannot grant self admin');
select tests.assert_raises($$insert into public.user_roles (user_id, role) values (auth.uid(), 'moderator')$$, 'row-level security', 'cannot grant self moderator');
select tests.assert_raises($$select public.choose_role('admin')$$, 'ROLE_NOT_ALLOWED', 'choose_role rejects admin');
select tests.assert_raises($$select public.choose_role('moderator')$$, 'ROLE_NOT_ALLOWED', 'choose_role rejects moderator');
select public.choose_role('job_seeker');
select tests.assert_true(public.has_role('job_seeker'), 'employer may also become job seeker');
select tests.assert_true(not public.is_admin(), 'still not admin');

-- Anonymous users
reset role;
select tests.login_anon();
select tests.assert_eq((select count(*)::int from public.profiles), 0, 'anon sees no profiles');
select tests.assert_raises($$select public.choose_role('job_seeker')$$, 'NOT_AUTHENTICATED', 'anon cannot choose role');

-- Admin (non-super) cannot grant admin
reset role;
insert into public.user_roles (user_id, role) values ('11111111-0000-0000-0000-000000000003', 'admin');
select tests.login('11111111-0000-0000-0000-000000000003');
select tests.assert_raises($$insert into public.user_roles (user_id, role) values ('11111111-0000-0000-0000-000000000002', 'admin')$$, 'ONLY_SUPER_ADMIN', 'admin cannot create admins');
insert into public.user_roles (user_id, role) values ('11111111-0000-0000-0000-000000000002', 'moderator');
select tests.assert_true(exists (select 1 from public.audit_logs where entity_type = 'user_roles' and entity_id = '11111111-0000-0000-0000-000000000002'), 'role grant audited');

reset role;
rollback;
