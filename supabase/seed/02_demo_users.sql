-- DEMO DATA — development only, never load into production.
-- 50 candidates, 20 employers (10 companies + 10 private employers),
-- 100 vacancies, applications, reviews, plus demo admin/moderator accounts.
-- Every demo row has is_demo = true and uses the fictional "@kadrtop.demo" domain.
-- Password for all demo accounts: Demo12345!

create or replace function pg_temp.demo_user(
  p_id uuid, p_email text, p_first text, p_last text, p_role text
) returns void
language plpgsql as $$
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email,
    extensions.crypt('Demo12345!', extensions.gen_salt('bf')), now(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('first_name', p_first, 'last_name', p_last, 'role', p_role),
    now(), now(), '', '', '', ''
  ) on conflict (id) do nothing;

  insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
  values (p_id::text, p_id, jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true), 'email', now(), now())
  on conflict do nothing;

  update public.profiles set is_demo = true where id = p_id;
end;
$$;

do $$
declare
  v_first text[] := array['Aziz','Dilshod','Jasur','Sardor','Bekzod','Otabek','Sherzod','Farrux','Ulugʻbek','Rustam',
                          'Malika','Nilufar','Dilnoza','Madina','Gulnoza','Shahnoza','Zarina','Kamola','Sevara','Feruza'];
  v_last_m text[] := array['Karimov','Rahimov','Tursunov','Yusupov','Aliyev','Qodirov','Ergashev','Nazarov','Saidov','Xolmatov'];
  v_last_f text[] := array['Karimova','Rahimova','Tursunova','Yusupova','Aliyeva','Qodirova','Ergasheva','Nazarova','Saidova','Xolmatova'];
  v_places text[][] := array[
    ['toshkent','chilonzor'], ['toshkent','yunusobod'], ['toshkent','mirzo-ulugbek'], ['toshkent','sergeli'],
    ['toshkent-viloyati','chirchiq'], ['xorazm','urganch-shahri'], ['xorazm','urganch'], ['xorazm','xiva-shahri'],
    ['qashqadaryo','kitob'], ['qashqadaryo','qarshi-shahri'], ['qashqadaryo','shahrisabz-shahri'],
    ['qoraqalpogiston','qongirot'], ['qoraqalpogiston','nukus-shahri'], ['samarqand','samarqand-shahri'],
    ['samarqand','urgut'], ['fargona','fargona-shahri'], ['andijon','andijon-shahri'], ['namangan','namangan-shahri'],
    ['buxoro','buxoro-shahri'], ['surxondaryo','termiz-shahri']];
  v_profs text[] := array['elektrik','payvandchi','santexnik','haydovchi','traktorchi','sartarosh','oshpaz','sotuvchi',
                          'frontend-developer','oqituvchi','hamshira','kafelchi','gisht-teruvchi','taksichi','tikuvchi',
                          'buxgalter','qoriqchi','kuryer','agronom','smm-mutaxassis'];
  v_base_salary bigint[] := array[5000000,6000000,5000000,4500000,4000000,4000000,5000000,3500000,
                                  12000000,4500000,4000000,5500000,5000000,5000000,3500000,6000000,3500000,4000000,5000000,6000000];
  v_companies text[][] := array[
    ['Xorazm Qurilish Servis MChJ','llc','xorazm','urganch-shahri'],
    ['Kitob Agro fermer xoʻjaligi','farm','qashqadaryo','kitob'],
    ['Toshkent IT Solutions MChJ','llc','toshkent','mirzo-ulugbek'],
    ['Chirchiq Metall Konstruksiya MChJ','llc','toshkent-viloyati','chirchiq'],
    ['Qoʻngʻirot Servis XK','sole_proprietor','qoraqalpogiston','qongirot'],
    ['Samarqand Mehmonxona Group','llc','samarqand','samarqand-shahri'],
    ['Fargʻona Tekstil MChJ','llc','fargona','fargona-shahri'],
    ['Andijon Avto Servis XK','sole_proprietor','andijon','andijon-shahri'],
    ['Namangan Savdo Markazi MChJ','llc','namangan','namangan-shahri'],
    ['Buxoro Taʼlim Markazi','ngo','buxoro','buxoro-shahri']];
  v_titles text[] := array['kerak', 'kerak (tajribali)', 'ishga taklif qilinadi', 'shoshilinch kerak', 'yordamchisi kerak'];
  v_emp public.employment_type[] := array['full_time','full_time','part_time','daily','temporary','seasonal','hourly','freelance']::public.employment_type[];
  v_avail public.availability_status[] := array['immediately','within_week','within_month','open_to_offers']::public.availability_status[];
  i integer; k integer; v_id uuid; v_first_name text; v_last_name text; v_female boolean;
  v_district integer; v_region integer; v_lat double precision; v_lng double precision;
  v_prof integer; v_company uuid; v_place integer; v_owner uuid;
begin
  -- Staff accounts
  perform pg_temp.demo_user('00000000-0000-4000-a000-000000000001', 'admin@kadrtop.demo', 'Demo', 'Admin', null);
  perform pg_temp.demo_user('00000000-0000-4000-a000-000000000002', 'moderator@kadrtop.demo', 'Demo', 'Moderator', null);
  insert into public.user_roles (user_id, role) values
    ('00000000-0000-4000-a000-000000000001', 'super_admin'),
    ('00000000-0000-4000-a000-000000000001', 'admin'),
    ('00000000-0000-4000-a000-000000000002', 'moderator')
  on conflict do nothing;

  -- Candidates
  for i in 1..50 loop
    v_id := ('00000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid;
    v_female := i % 3 = 0;
    v_first_name := v_first[case when v_female then 11 + ((i + i / 10) % 10) else 1 + ((i + i / 10) % 10) end];
    v_last_name := case when v_female then v_last_f[1 + ((i * 7 + (i / 10) * 3) % 10)] else v_last_m[1 + ((i * 7 + (i / 10) * 3) % 10)] end;
    perform pg_temp.demo_user(v_id, format('demo.candidate%s@kadrtop.demo', lpad(i::text, 2, '0')), v_first_name, v_last_name, 'job_seeker');

    v_place := 1 + ((i * 7 + i / 20) % 20);
    select d.id, d.region_id, d.lat + ((i % 5) - 2) * 0.012, d.lng + ((i % 3) - 1) * 0.015
      into v_district, v_region, v_lat, v_lng
      from public.districts d join public.regions r on r.id = d.region_id
      where r.slug = v_places[v_place][1] and d.slug = v_places[v_place][2];
    select id into v_prof from public.professions where slug = v_profs[1 + (i % 20)];

    update public.profiles set
      phone = '+99890' || lpad((1000000 + i)::text, 7, '0'),
      phone_verified = i % 2 = 0,
      identity_verified = i % 5 = 0,
      birth_year = 1975 + (i % 25),
      gender = case when v_female then 'female' else 'male' end
    where id = v_id;

    insert into public.candidate_profiles (
      id, headline, about, profession_id, experience_years, education_level,
      expected_salary_min, expected_salary_max, employment_types, availability, has_transport,
      remote_ok, work_radius_km, region_id, district_id, lat, lng, is_demo, premium_until
    ) values (
      v_id,
      (select name_uz from public.professions where id = v_prof) || ', ' || (1 + i % 12) || ' yillik tajriba',
      'DEMO profil. Mas’uliyatli, oʻz ishini puxta biladigan mutaxassisman. Hududimdagi ish takliflarini koʻrib chiqaman.',
      v_prof, 1 + (i % 12), (array['secondary','vocational','bachelor','vocational','master']::public.education_level[])[1 + i % 5],
      v_base_salary[1 + (i % 20)], v_base_salary[1 + (i % 20)] + 2000000,
      array[v_emp[1 + (i % 8)], 'full_time']::public.employment_type[],
      v_avail[1 + (i % 4)], i % 3 <> 0, v_profs[1 + (i % 20)] in ('frontend-developer', 'smm-mutaxassis', 'buxgalter'),
      (array[10, 25, 50])[1 + i % 3], v_region, v_district, v_lat, v_lng, true,
      case when i % 10 = 0 then now() + interval '20 days' end
    ) on conflict (id) do nothing;

    insert into public.candidate_skills (candidate_id, skill_id, level)
    select v_id, ps.skill_id, 3 + (ps.skill_id % 3)
    from public.profession_skills ps where ps.profession_id = v_prof
    on conflict do nothing;

    insert into public.candidate_experience (candidate_id, company_name, position, start_date, end_date, is_current, description)
    values (v_id, 'Demo korxona ' || i, (select name_uz from public.professions where id = v_prof),
            (current_date - ((2 + i % 8) * 365))::date, case when i % 2 = 0 then (current_date - 200)::date end, i % 2 = 1,
            'Kundalik vazifalarni bajarish, sifat nazorati, jamoada ishlash.');

    insert into public.candidate_education (candidate_id, institution, level, field, start_year, end_year)
    values (v_id, (array['Kasb-hunar kolleji','Texnikum','Universitet','Akademik litsey'])[1 + i % 4],
            (array['vocational','vocational','bachelor','secondary']::public.education_level[])[1 + i % 4],
            (select name_uz from public.professions where id = v_prof), 2000 + i % 15, 2003 + i % 15);
  end loop;

  -- Employers: 10 companies + 10 private employers
  for i in 1..20 loop
    v_id := ('00000000-0000-4000-9000-' || lpad(i::text, 12, '0'))::uuid;
    v_first_name := v_first[1 + ((i + 3) % 10)];
    v_last_name := v_last_m[1 + ((i * 3) % 10)];
    perform pg_temp.demo_user(v_id, format('demo.employer%s@kadrtop.demo', lpad(i::text, 2, '0')), v_first_name, v_last_name, 'employer');
    update public.profiles set phone = '+99891' || lpad((2000000 + i)::text, 7, '0'), phone_verified = true where id = v_id;

    if i <= 10 then
      select d.id, d.region_id into v_district, v_region
        from public.districts d join public.regions r on r.id = d.region_id
        where r.slug = v_companies[i][3] and d.slug = v_companies[i][4];
      insert into public.companies (id, owner_id, name, slug, company_type, stir, description, region_id, district_id,
                                    verification_status, is_featured, is_demo)
      values (('00000000-0000-4000-b000-' || lpad(i::text, 12, '0'))::uuid, v_id, v_companies[i][1],
              'demo-company-' || i, v_companies[i][2]::public.company_type, lpad((300000000 + i * 1111)::text, 9, '0'),
              'DEMO kompaniya. Hududimizdagi eng yaxshi mutaxassislarni ishga taklif qilamiz.',
              v_region, v_district, case when i % 2 = 1 then 'verified' else 'unverified' end::public.verification_status,
              i <= 3, true)
      on conflict (id) do nothing;
    else
      v_place := 1 + ((i * 3) % 20);
      select d.id, d.region_id into v_district, v_region
        from public.districts d join public.regions r on r.id = d.region_id
        where r.slug = v_places[v_place][1] and d.slug = v_places[v_place][2];
      insert into public.companies (id, owner_id, name, slug, company_type, region_id, district_id, is_demo)
      values (('00000000-0000-4000-b000-' || lpad(i::text, 12, '0'))::uuid, v_id, v_first_name || ' ' || v_last_name,
              'demo-employer-' || i, 'individual', v_region, v_district, true)
      on conflict (id) do nothing;
    end if;
  end loop;

  -- Vacancies
  for k in 1..100 loop
    v_company := ('00000000-0000-4000-b000-' || lpad((1 + (k - 1) % 20)::text, 12, '0'))::uuid;
    select c.owner_id, c.district_id into v_owner, v_district from public.companies c where c.id = v_company;
    select d.region_id, d.lat + ((k % 7) - 3) * 0.01, d.lng + ((k % 5) - 2) * 0.012
      into v_region, v_lat, v_lng from public.districts d where d.id = v_district;
    i := 1 + ((k * 3 + ((k - 1) / 20) * 7) % 20);
    select id into v_prof from public.professions where slug = v_profs[i];

    insert into public.vacancies (
      id, company_id, created_by, title, description, profession_id, category_id, experience_min_years,
      salary_min, salary_max, salary_type, employment_type, work_schedule, region_id, district_id, lat, lng,
      remote_allowed, transport_provided, accommodation_provided, meal_provided, urgent, positions_count,
      status, is_demo, is_featured, promoted_until, published_at, created_at
    ) values (
      ('00000000-0000-4000-c000-' || lpad(k::text, 12, '0'))::uuid, v_company, v_owner,
      (select name_uz from public.professions where id = v_prof) || ' ' || v_titles[1 + (k % 5)],
      'DEMO vakansiya. Vazifalar: oʻz sohasidagi ishlarni sifatli bajarish, xavfsizlik qoidalariga rioya qilish. ' ||
      'Talablar: masʼuliyat, intizom. Biz taklif qilamiz: oʻz vaqtida ish haqi, qulay jamoa, uyga yaqin ish joyi.',
      v_prof, (select category_id from public.professions where id = v_prof), (k % 4),
      v_base_salary[i], v_base_salary[i] + 1000000 * (1 + k % 4),
      case when v_emp[1 + (k % 8)] = 'daily' then 'daily' when v_emp[1 + (k % 8)] = 'hourly' then 'hourly' else 'monthly' end::public.salary_type,
      v_emp[1 + (k % 8)], (array['full_day','shift','flexible','full_day']::public.work_schedule[])[1 + k % 4],
      v_region, v_district, v_lat, v_lng,
      v_profs[i] in ('frontend-developer', 'smm-mutaxassis', 'buxgalter'), k % 4 = 0, k % 9 = 0, k % 3 = 0, k % 7 = 0,
      1 + k % 3, 'active', true, k % 25 = 0, case when k % 10 = 0 then now() + interval '5 days' end,
      now() - make_interval(hours => k * 5), now() - make_interval(hours => k * 5)
    ) on conflict (id) do nothing;

    insert into public.vacancy_skills (vacancy_id, skill_id, is_required)
    select ('00000000-0000-4000-c000-' || lpad(k::text, 12, '0'))::uuid, ps.skill_id, true
    from public.profession_skills ps where ps.profession_id = v_prof
    on conflict do nothing;
  end loop;

  -- Applications: every candidate applies to up to 2 vacancies of their profession
  insert into public.applications (vacancy_id, candidate_id, cover_letter, created_at)
  select x.vacancy_id, x.candidate_id, 'DEMO ariza. Vakansiyangiz bilan qiziqaman.', now() - interval '2 days'
  from (
    select v.id as vacancy_id, c.id as candidate_id,
           row_number() over (partition by c.id order by public.geo_distance_km(c.lat, c.lng, v.lat, v.lng)) as rn
    from public.candidate_profiles c
    join public.vacancies v on v.profession_id = c.profession_id and v.status = 'active'
    where c.is_demo
  ) x
  where x.rn <= 2
  on conflict do nothing;

  -- Move some applications along the pipeline (backend context: triggers record history)
  update public.applications set status = 'viewed' where right(candidate_id::text, 1) in ('1', '2', '3');
  update public.applications set status = 'shortlisted' where right(candidate_id::text, 1) in ('4', '5');
  update public.applications set status = 'hired' where right(candidate_id::text, 1) = '6';
  update public.applications set status = 'rejected' where right(candidate_id::text, 1) = '7';

  -- Reviews for hired applications (both directions)
  insert into public.reviews (application_id, reviewer_id, direction, reviewee_user_id, rating, comment)
  select a.id, a.candidate_id, 'candidate_to_company', null, 4 + (ascii(right(a.id::text, 1)) % 2), 'DEMO sharh: ish beruvchi vaʼdasiga vafo qildi.'
  from public.applications a where a.status = 'hired'
  on conflict do nothing;
  insert into public.reviews (application_id, reviewer_id, direction, reviewee_user_id, rating, comment)
  select a.id, c.owner_id, 'company_to_candidate', a.candidate_id, 5, 'DEMO sharh: masʼuliyatli xodim.'
  from public.applications a join public.vacancies v on v.id = a.vacancy_id join public.companies c on c.id = v.company_id
  where a.status = 'hired'
  on conflict do nothing;
end;
$$;
