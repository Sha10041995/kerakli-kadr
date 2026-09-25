-- Location hierarchy: public read, admin write, normalisation.
begin;

select tests.create_user('22222222-0000-0000-0000-000000000001', 'admin2@test.uz');
insert into public.user_roles (user_id, role) values ('22222222-0000-0000-0000-000000000001', 'admin');
select tests.create_user('22222222-0000-0000-0000-000000000002', 'user2@test.uz', 'job_seeker');

select tests.login_anon();
select tests.assert_eq((select count(*)::int from public.regions), 14, '14 regions visible to anon');
select tests.assert_true((select count(*) from public.districts) >= 200, 'districts visible to anon');
select tests.assert_raises($$insert into public.regions (country_id, slug, name_uz) values (1, 'x', 'X')$$, 'row-level security', 'anon cannot add region');

reset role;
select tests.login('22222222-0000-0000-0000-000000000002');
select tests.assert_raises($$insert into public.settlements (district_id, slug, name_uz) values (1, 'hack', 'Hack')$$, 'row-level security', 'user cannot add settlement');
select tests.assert_eq(tests.row_count($$update public.districts set is_active = false where id = 1$$), 0, 'user cannot deactivate district');

reset role;
select tests.login('22222222-0000-0000-0000-000000000001');
insert into public.settlements (district_id, slug, kind, name_uz, lat, lng)
select d.id, 'test-qishloq', 'village', 'Test qishlogʻi', 39.2, 66.9 from public.districts d where d.slug = 'kitob';
update public.settlements set is_active = false where slug = 'test-qishloq';
select tests.assert_true(exists (select 1 from public.settlements where slug = 'test-qishloq' and not is_active), 'admin sees inactive rows');

reset role;
select tests.login_anon();
select tests.assert_true(not exists (select 1 from public.settlements where slug = 'test-qishloq'), 'inactive hidden from public');

-- mahalla must match its settlement's district
reset role;
select tests.assert_raises($$
  insert into public.mahallas (district_id, settlement_id, slug, name_uz)
  select (select id from public.districts where slug = 'chilonzor'), (select id from public.settlements where slug = 'kitob-shahri'), 'bad', 'Bad'
$$, 'MAHALLA_SETTLEMENT_MISMATCH', 'mahalla/settlement mismatch rejected');

-- location_point falls back to the most specific centre
select tests.assert_true(
  (select abs(lat - 39.12) < 0.01 from public.location_point(null, (select id from public.districts where slug = 'kitob'), null, null)),
  'district centre used');

rollback;
