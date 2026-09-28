-- Support tickets and admin broadcasts.
begin;

select tests.create_user('cccccccc-0000-0000-0000-000000000001', 'u12@test.uz', 'job_seeker');
select tests.create_user('cccccccc-0000-0000-0000-000000000002', 'e12@test.uz', 'employer');
select tests.create_user('cccccccc-0000-0000-0000-000000000003', 'a12@test.uz');
insert into public.user_roles (user_id, role) values ('cccccccc-0000-0000-0000-000000000003', 'admin');

select tests.login('cccccccc-0000-0000-0000-000000000001');
insert into public.complaints (user_id, subject, body, status, admin_reply)
values ('cccccccc-0000-0000-0000-000000000002', 'Toʻlov muammosi', 'Toʻlov qildim, lekin tarif faollashmadi.', 'resolved', 'hack');
select tests.assert_eq((select user_id from public.complaints limit 1), 'cccccccc-0000-0000-0000-000000000001'::uuid, 'owner forced');
select tests.assert_eq((select status::text from public.complaints limit 1), 'open', 'status forced open');
select tests.assert_eq((select admin_reply from public.complaints limit 1), null::text, 'reply cleared');
select tests.assert_eq(tests.row_count($$update public.complaints set admin_reply = 'x'$$), 0, 'user cannot update');
select tests.assert_raises($$select public.broadcast_notification('Salom hammaga')$$, 'NOT_ALLOWED', 'non-admin cannot broadcast');

reset role;
select tests.login('cccccccc-0000-0000-0000-000000000002');
select tests.assert_eq((select count(*)::int from public.complaints), 0, 'others cannot read complaint');

reset role;
select tests.login('cccccccc-0000-0000-0000-000000000003');
update public.complaints set admin_reply = 'Tekshirdik, tarif faollashtirildi.', status = 'resolved';
select tests.assert_true(public.broadcast_notification('Yangi imkoniyat', 'Xarita qidiruvi ishga tushdi', '/jobs', 'employer') >= 1, 'broadcast to employers');
select tests.assert_raises($$select public.broadcast_notification('Yomon havola', null, 'https://evil.example')$$, 'INVALID_INPUT', 'external links rejected');
reset role;

select tests.assert_true(exists (select 1 from public.notifications where user_id = 'cccccccc-0000-0000-0000-000000000001' and title = 'Murojaatingizga javob berildi'), 'reply notified');
select tests.assert_true(exists (select 1 from public.notifications where user_id = 'cccccccc-0000-0000-0000-000000000002' and title = 'Yangi imkoniyat'), 'employer received broadcast');
select tests.assert_true(not exists (select 1 from public.notifications where user_id = 'cccccccc-0000-0000-0000-000000000001' and title = 'Yangi imkoniyat'), 'job seeker excluded');
select tests.assert_true(exists (select 1 from public.audit_logs where action = 'broadcast'), 'broadcast audited');

rollback;
