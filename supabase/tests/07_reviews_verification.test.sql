-- Reviews (anti-fake) and verification workflow.
begin;

select tests.create_user('77777777-0000-0000-0000-000000000001', 'emp7@test.uz', 'employer');
select tests.create_user('77777777-0000-0000-0000-000000000002', 'cand7@test.uz', 'job_seeker');
select tests.create_user('77777777-0000-0000-0000-000000000003', 'stranger7@test.uz', 'job_seeker');
select tests.create_user('77777777-0000-0000-0000-000000000004', 'mod7@test.uz');
insert into public.user_roles (user_id, role) values ('77777777-0000-0000-0000-000000000004', 'moderator');

insert into public.companies (id, owner_id, name, slug) values
  ('77777777-aaaa-0000-0000-000000000001', '77777777-0000-0000-0000-000000000001', 'Review MChJ', 'review-mchj');
insert into public.vacancies (id, company_id, created_by, title, description, status, remote_allowed) values
  ('77777777-bbbb-0000-0000-000000000001', '77777777-aaaa-0000-0000-000000000001', '77777777-0000-0000-0000-000000000001',
   'Dizayner kerak', 'Masofadan ishlaydigan grafik dizayner kerak.', 'active', true);
insert into public.candidate_profiles (id) values ('77777777-0000-0000-0000-000000000002');
insert into public.applications (id, vacancy_id, candidate_id) values
  ('77777777-cccc-0000-0000-000000000001', '77777777-bbbb-0000-0000-000000000001', '77777777-0000-0000-0000-000000000002');

-- cannot review before hire
select tests.login('77777777-0000-0000-0000-000000000002');
select tests.assert_raises($$insert into public.reviews (application_id, reviewer_id, direction, reviewee_company_id, rating)
  values ('77777777-cccc-0000-0000-000000000001', auth.uid(), 'candidate_to_company', '77777777-aaaa-0000-0000-000000000001', 5)$$,
  'REVIEW_NOT_ALLOWED', 'no review before hire');

reset role;
update public.applications set status = 'hired' where id = '77777777-cccc-0000-0000-000000000001';

-- stranger cannot review
select tests.login('77777777-0000-0000-0000-000000000003');
select tests.assert_raises($$insert into public.reviews (application_id, reviewer_id, direction, reviewee_company_id, rating)
  values ('77777777-cccc-0000-0000-000000000001', auth.uid(), 'candidate_to_company', '77777777-aaaa-0000-0000-000000000001', 1)$$,
  'REVIEW_NOT_ALLOWED', 'stranger cannot review');

-- candidate reviews company (direction/reviewee derived server-side)
reset role;
select tests.login('77777777-0000-0000-0000-000000000002');
insert into public.reviews (application_id, reviewer_id, direction, reviewee_user_id, rating, comment)
values ('77777777-cccc-0000-0000-000000000001', '77777777-0000-0000-0000-000000000003', 'company_to_candidate', '77777777-0000-0000-0000-000000000003', 4, 'Yaxshi');
select tests.assert_eq((select reviewee_company_id from public.reviews where application_id = '77777777-cccc-0000-0000-000000000001'),
  '77777777-aaaa-0000-0000-000000000001'::uuid, 'reviewee derived, spoofing ignored');
select tests.assert_raises($$insert into public.reviews (application_id, reviewer_id, direction, reviewee_company_id, rating)
  values ('77777777-cccc-0000-0000-000000000001', auth.uid(), 'candidate_to_company', '77777777-aaaa-0000-0000-000000000001', 5)$$,
  'duplicate', 'one review per side');

-- employer reviews candidate
reset role;
select tests.login('77777777-0000-0000-0000-000000000001');
insert into public.reviews (application_id, reviewer_id, direction, rating, reviewee_user_id)
values ('77777777-cccc-0000-0000-000000000001', auth.uid(), 'company_to_candidate', 5, '77777777-0000-0000-0000-000000000002');
reset role;
select tests.assert_eq((select rating_avg from public.companies where id = '77777777-aaaa-0000-0000-000000000001'), 4.00::numeric(3,2), 'company rating aggregated');
select tests.assert_eq((select rating_count from public.candidate_profiles where id = '77777777-0000-0000-0000-000000000002'), 1, 'candidate rating aggregated');

-- moderator hides a review -> aggregates recalculated
select tests.login('77777777-0000-0000-0000-000000000004');
update public.reviews set status = 'hidden' where direction = 'candidate_to_company' and application_id = '77777777-cccc-0000-0000-000000000001';
reset role;
select tests.assert_eq((select rating_count from public.companies where id = '77777777-aaaa-0000-0000-000000000001'), 0, 'hidden review excluded');

-- verification requests
select tests.login('77777777-0000-0000-0000-000000000002');
insert into public.verification_requests (user_id, type, document_path, status)
values ('77777777-0000-0000-0000-000000000003', 'identity', '77777777-0000-0000-0000-000000000002/passport.pdf', 'approved');
select tests.assert_eq((select status::text from public.verification_requests where user_id = auth.uid()), 'pending', 'request forced to pending for self');
select tests.assert_raises($$insert into public.verification_requests (type, document_path) values ('identity', 'someone-else/doc.pdf')$$, null, 'document must be in own folder (or duplicate pending)');
select tests.assert_eq(tests.row_count($$update public.verification_requests set status = 'approved' where user_id = auth.uid()$$), 0, 'user cannot approve own request');
select tests.assert_raises($$insert into public.verification_requests (type, company_id) values ('company', '77777777-aaaa-0000-0000-000000000001')$$, 'NOT_ALLOWED', 'cannot verify foreign company');

reset role;
select tests.login('77777777-0000-0000-0000-000000000004');
update public.verification_requests set status = 'approved', admin_note = 'Hujjat tasdiqlandi' where user_id = '77777777-0000-0000-0000-000000000002';
reset role;
select tests.assert_true((select identity_verified from public.profiles where id = '77777777-0000-0000-0000-000000000002'), 'identity flag applied');
select tests.assert_eq(public.verification_level('77777777-0000-0000-0000-000000000002'), 2::smallint, 'verification level 2');
select tests.assert_eq((select reviewed_by from public.verification_requests where user_id = '77777777-0000-0000-0000-000000000002'), '77777777-0000-0000-0000-000000000004'::uuid, 'reviewer recorded');

-- company verification
select tests.login('77777777-0000-0000-0000-000000000001');
insert into public.verification_requests (type, company_id) values ('company', '77777777-aaaa-0000-0000-000000000001');
select tests.assert_eq((select verification_status::text from public.companies where id = '77777777-aaaa-0000-0000-000000000001'), 'pending', 'company pending');
reset role;
select tests.login('77777777-0000-0000-0000-000000000004');
update public.verification_requests set status = 'approved' where company_id = '77777777-aaaa-0000-0000-000000000001';
reset role;
select tests.assert_eq(public.verification_level('77777777-0000-0000-0000-000000000001'), 4::smallint, 'company verified = level 4');

rollback;
