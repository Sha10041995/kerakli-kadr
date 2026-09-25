-- Job seeker (candidate) profiles.
-- Privacy by design: candidate coordinates are rounded to 2 decimals (~1 km)
-- on write, so an exact home location is never stored.

create table public.candidate_profiles (
  id uuid primary key references public.profiles (id) on delete cascade,
  headline text not null default '' check (char_length(headline) <= 120),
  about text check (about is null or char_length(about) <= 3000),
  profession_id integer references public.professions (id),
  experience_years numeric(4, 1) not null default 0 check (experience_years between 0 and 70),
  education_level public.education_level,
  expected_salary_min bigint check (expected_salary_min is null or expected_salary_min >= 0),
  expected_salary_max bigint check (expected_salary_max is null or expected_salary_max >= 0),
  salary_type public.salary_type not null default 'monthly',
  employment_types public.employment_type[] not null default '{full_time}',
  availability public.availability_status not null default 'immediately',
  available_from date,
  has_transport boolean not null default false,
  driver_license text[] not null default '{}',
  remote_ok boolean not null default false,
  relocate_ok boolean not null default false,
  work_radius_km integer not null default 25 check (work_radius_km between 1 and 500),
  region_id integer references public.regions (id),
  district_id integer references public.districts (id),
  settlement_id integer references public.settlements (id),
  mahalla_id integer references public.mahallas (id),
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  is_public boolean not null default true,
  completeness smallint not null default 0,
  rating_avg numeric(3, 2) not null default 0,
  rating_count integer not null default 0,
  completed_jobs integer not null default 0,
  premium_until timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expected_salary_max is null or expected_salary_min is null or expected_salary_max >= expected_salary_min)
);

create table public.candidate_skills (
  candidate_id uuid not null references public.candidate_profiles (id) on delete cascade,
  skill_id integer not null references public.skills (id),
  level smallint not null default 3 check (level between 1 and 5),
  is_verified boolean not null default false,
  primary key (candidate_id, skill_id)
);

create table public.candidate_experience (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidate_profiles (id) on delete cascade,
  company_name text not null check (char_length(company_name) <= 160),
  position text not null check (char_length(position) <= 160),
  location_text text check (location_text is null or char_length(location_text) <= 160),
  start_date date not null,
  end_date date,
  is_current boolean not null default false,
  description text check (description is null or char_length(description) <= 2000),
  created_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

create table public.candidate_education (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidate_profiles (id) on delete cascade,
  institution text not null check (char_length(institution) <= 200),
  level public.education_level not null default 'secondary',
  field text check (field is null or char_length(field) <= 160),
  start_year smallint check (start_year between 1950 and 2100),
  end_year smallint check (end_year between 1950 and 2100),
  created_at timestamptz not null default now()
);

create table public.candidate_certificates (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidate_profiles (id) on delete cascade,
  name text not null check (char_length(name) <= 200),
  issuer text check (issuer is null or char_length(issuer) <= 200),
  issued_at date,
  file_path text check (file_path is null or char_length(file_path) <= 500),
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.candidate_portfolio (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidate_profiles (id) on delete cascade,
  title text not null check (char_length(title) <= 160),
  description text check (description is null or char_length(description) <= 2000),
  url text check (url is null or url ~* '^https?://'),
  image_path text check (image_path is null or char_length(image_path) <= 500),
  created_at timestamptz not null default now()
);

create index candidate_profiles_profession_idx on public.candidate_profiles (profession_id) where is_public;
create index candidate_profiles_district_idx on public.candidate_profiles (district_id) where is_public;
create index candidate_profiles_region_idx on public.candidate_profiles (region_id) where is_public;
create index candidate_profiles_geo_idx on public.candidate_profiles (lat, lng) where is_public;
create index candidate_profiles_headline_trgm on public.candidate_profiles using gin (headline extensions.gin_trgm_ops);
create index candidate_skills_skill_idx on public.candidate_skills (skill_id);
create index candidate_experience_candidate_idx on public.candidate_experience (candidate_id);
create index candidate_education_candidate_idx on public.candidate_education (candidate_id);
create index candidate_certificates_candidate_idx on public.candidate_certificates (candidate_id);
create index candidate_portfolio_candidate_idx on public.candidate_portfolio (candidate_id);

-- Profile completeness 0..100 (kept in the database so ranking can use it).
create or replace function public.compute_candidate_completeness(p public.candidate_profiles)
returns smallint
language plpgsql
stable
as $$
declare
  v_score integer := 0;
  v_profile public.profiles;
begin
  select * into v_profile from public.profiles where id = p.id;
  if coalesce(v_profile.first_name, '') <> '' and coalesce(v_profile.last_name, '') <> '' then v_score := v_score + 10; end if;
  if v_profile.avatar_url is not null then v_score := v_score + 10; end if;
  if p.profession_id is not null then v_score := v_score + 15; end if;
  if char_length(p.headline) >= 5 then v_score := v_score + 5; end if;
  if char_length(coalesce(p.about, '')) >= 50 then v_score := v_score + 10; end if;
  if p.district_id is not null then v_score := v_score + 15; end if;
  if p.expected_salary_min is not null or p.salary_type = 'negotiable' then v_score := v_score + 5; end if;
  if exists (select 1 from public.candidate_skills s where s.candidate_id = p.id) then v_score := v_score + 10; end if;
  if exists (select 1 from public.candidate_experience e where e.candidate_id = p.id) then v_score := v_score + 10; end if;
  if exists (select 1 from public.candidate_education e where e.candidate_id = p.id) then v_score := v_score + 5; end if;
  if exists (select 1 from public.candidate_certificates c where c.candidate_id = p.id)
     or exists (select 1 from public.candidate_portfolio c where c.candidate_id = p.id) then
    v_score := v_score + 5;
  end if;
  return least(v_score, 100)::smallint;
end;
$$;

create or replace function public.candidate_profiles_before_write()
returns trigger
language plpgsql
as $$
begin
  if not public.is_privileged() then
    if tg_op = 'INSERT' then
      new.rating_avg := 0;
      new.rating_count := 0;
      new.completed_jobs := 0;
      new.premium_until := null;
      new.is_demo := false;
    elsif new.rating_avg is distinct from old.rating_avg
       or new.rating_count is distinct from old.rating_count
       or new.completed_jobs is distinct from old.completed_jobs
       or new.premium_until is distinct from old.premium_until
       or new.is_demo is distinct from old.is_demo
       or new.id is distinct from old.id then
      raise exception 'PROTECTED_FIELDS' using errcode = '42501';
    end if;
  end if;
  -- Privacy: keep only approximate (~1 km) coordinates.
  if new.lat is not null then
    new.lat := round(new.lat::numeric, 2)::double precision;
    new.lng := round(new.lng::numeric, 2)::double precision;
  end if;
  new.completeness := public.compute_candidate_completeness(new);
  new.updated_at := now();
  return new;
end;
$$;

create trigger candidate_profiles_location before insert or update of region_id, district_id, settlement_id, mahalla_id, lat, lng
  on public.candidate_profiles for each row execute function public.normalize_location();
-- runs after normalize_location (alphabetical trigger order: "..._location" < "..._write")
create trigger candidate_profiles_write before insert or update on public.candidate_profiles
  for each row execute function public.candidate_profiles_before_write();

-- Child table changes refresh the parent's completeness.
create or replace function public.touch_candidate_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.candidate_profiles set updated_at = now()
  where id = coalesce(new.candidate_id, old.candidate_id);
  return null;
end;
$$;

create trigger candidate_skills_touch after insert or delete on public.candidate_skills
  for each row execute function public.touch_candidate_profile();
create trigger candidate_experience_touch after insert or delete on public.candidate_experience
  for each row execute function public.touch_candidate_profile();
create trigger candidate_education_touch after insert or delete on public.candidate_education
  for each row execute function public.touch_candidate_profile();
create trigger candidate_certificates_touch after insert or delete on public.candidate_certificates
  for each row execute function public.touch_candidate_profile();
create trigger candidate_portfolio_touch after insert or delete on public.candidate_portfolio
  for each row execute function public.touch_candidate_profile();

-- Verification flags on skills / certificates are admin-controlled.
create or replace function public.candidate_verified_guard()
returns trigger
language plpgsql
as $$
begin
  if public.is_privileged() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.is_verified := false;
  elsif new.is_verified is distinct from old.is_verified then
    raise exception 'PROTECTED_FIELDS' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger candidate_skills_guard before insert or update on public.candidate_skills
  for each row execute function public.candidate_verified_guard();
create trigger candidate_certificates_guard before insert or update on public.candidate_certificates
  for each row execute function public.candidate_verified_guard();

-- Who may view a candidate (and their private documents):
-- the candidate, staff, or members of a company the candidate applied to.
create or replace function public.can_view_candidate_private(p_candidate_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return false;
  end if;
  if auth.uid() = p_candidate_id or public.is_staff() then
    return true;
  end if;
  return exists (
    select 1
    from public.applications a
    join public.vacancies v on v.id = a.vacancy_id
    join public.company_members cm on cm.company_id = v.company_id
    where a.candidate_id = p_candidate_id and cm.user_id = auth.uid()
  );
end;
$$;

create or replace function public.can_view_candidate(p_candidate_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.candidate_profiles c where c.id = p_candidate_id and c.is_public) then
    return true;
  end if;
  return public.can_view_candidate_private(p_candidate_id);
end;
$$;

alter table public.candidate_profiles enable row level security;
alter table public.candidate_skills enable row level security;
alter table public.candidate_experience enable row level security;
alter table public.candidate_education enable row level security;
alter table public.candidate_certificates enable row level security;
alter table public.candidate_portfolio enable row level security;

create policy candidate_profiles_read on public.candidate_profiles for select
  using (is_public or id = auth.uid() or public.can_view_candidate_private(id));
create policy candidate_profiles_insert on public.candidate_profiles for insert
  with check (id = auth.uid() and public.has_role('job_seeker'));
create policy candidate_profiles_update on public.candidate_profiles for update
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
create policy candidate_profiles_delete on public.candidate_profiles for delete
  using (id = auth.uid() or public.is_admin());

-- Child tables: readable when the candidate is viewable, writable by the owner.
create policy candidate_skills_read on public.candidate_skills for select using (public.can_view_candidate(candidate_id));
create policy candidate_skills_write on public.candidate_skills for all
  using (candidate_id = auth.uid() or public.is_admin()) with check (candidate_id = auth.uid() or public.is_admin());

create policy candidate_experience_read on public.candidate_experience for select using (public.can_view_candidate(candidate_id));
create policy candidate_experience_write on public.candidate_experience for all
  using (candidate_id = auth.uid()) with check (candidate_id = auth.uid());

create policy candidate_education_read on public.candidate_education for select using (public.can_view_candidate(candidate_id));
create policy candidate_education_write on public.candidate_education for all
  using (candidate_id = auth.uid()) with check (candidate_id = auth.uid());

create policy candidate_certificates_read on public.candidate_certificates for select using (public.can_view_candidate(candidate_id));
create policy candidate_certificates_write on public.candidate_certificates for all
  using (candidate_id = auth.uid() or public.is_admin()) with check (candidate_id = auth.uid() or public.is_admin());

create policy candidate_portfolio_read on public.candidate_portfolio for select using (public.can_view_candidate(candidate_id));
create policy candidate_portfolio_write on public.candidate_portfolio for all
  using (candidate_id = auth.uid()) with check (candidate_id = auth.uid());
