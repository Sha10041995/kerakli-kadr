-- Favorites and saved searches (with new-match notifications).

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  vacancy_id uuid references public.vacancies (id) on delete cascade,
  candidate_id uuid references public.candidate_profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (num_nonnulls(vacancy_id, candidate_id) = 1)
);

create unique index favorites_vacancy_uq on public.favorites (user_id, vacancy_id) where vacancy_id is not null;
create unique index favorites_candidate_uq on public.favorites (user_id, candidate_id) where candidate_id is not null;

alter table public.favorites enable row level security;
create policy favorites_own on public.favorites for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('vacancies', 'candidates')),
  name text not null check (char_length(name) between 1 and 120),
  query text check (query is null or char_length(query) <= 120),
  profession_id integer references public.professions (id) on delete cascade,
  category_id integer references public.categories (id) on delete cascade,
  region_id integer references public.regions (id),
  district_id integer references public.districts (id),
  settlement_id integer references public.settlements (id),
  radius_km integer check (radius_km is null or radius_km between 1 and 500),
  params jsonb not null default '{}'::jsonb,
  notify boolean not null default true,
  last_notified_at timestamptz,
  created_at timestamptz not null default now()
);

create index saved_searches_match_idx on public.saved_searches (kind, profession_id) where notify;

alter table public.saved_searches enable row level security;
create policy saved_searches_own on public.saved_searches for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.saved_searches_limit()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.saved_searches where user_id = new.user_id) >= 20 then
    raise exception 'SAVED_SEARCH_LIMIT' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger saved_searches_limit before insert on public.saved_searches
  for each row execute function public.saved_searches_limit();

-- Does a saved search match a location/profession?
create or replace function public.saved_search_matches(
  s public.saved_searches, p_profession_id integer, p_category_id integer,
  p_region_id integer, p_district_id integer, p_settlement_id integer,
  p_lat double precision, p_lng double precision
)
returns boolean
language sql
stable
as $$
  select (s.profession_id is null or s.profession_id = p_profession_id)
    and (s.category_id is null or s.category_id = p_category_id)
    and (
      (s.region_id is null and s.district_id is null and s.settlement_id is null)
      or s.settlement_id = p_settlement_id
      or (s.settlement_id is null and s.district_id = p_district_id)
      or (s.settlement_id is null and s.district_id is null and s.region_id = p_region_id)
      or (s.radius_km is not null and public.geo_distance_km(
            (public.location_point(s.region_id, s.district_id, s.settlement_id, null)).lat,
            (public.location_point(s.region_id, s.district_id, s.settlement_id, null)).lng,
            p_lat, p_lng) <= s.radius_km)
    )
$$;

-- New active vacancy -> notify job seekers with matching saved searches.
create or replace function public.notify_saved_searches_vacancy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.saved_searches;
  v_category integer := coalesce(new.category_id, (select p.category_id from public.professions p where p.id = new.profession_id));
begin
  if new.status <> 'active' or (tg_op = 'UPDATE' and old.status = 'active') then
    return new;
  end if;
  for s in
    select * from public.saved_searches ss
    where ss.kind = 'vacancies' and ss.notify
      and (ss.profession_id is null or ss.profession_id = new.profession_id)
    limit 500
  loop
    if public.saved_search_matches(s, new.profession_id, v_category, new.region_id, new.district_id,
                                   new.settlement_id, new.lat, new.lng) then
      perform public.create_notification(s.user_id, 'new_matching_job',
        'Yangi mos vakansiya: ' || new.title, s.name, '/vacancy/' || new.id,
        jsonb_build_object('saved_search_id', s.id, 'vacancy_id', new.id));
      update public.saved_searches set last_notified_at = now() where id = s.id;
    end if;
  end loop;
  return new;
end;
$$;

create trigger vacancies_notify_saved_searches after insert or update of status on public.vacancies
  for each row execute function public.notify_saved_searches_vacancy();

-- New public candidate profile (or profession change) -> notify employers.
create or replace function public.notify_saved_searches_candidate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.saved_searches;
  v_category integer := (select p.category_id from public.professions p where p.id = new.profession_id);
begin
  if not new.is_public or new.profession_id is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.is_public and old.profession_id is not distinct from new.profession_id
     and old.district_id is not distinct from new.district_id then
    return new;
  end if;
  for s in
    select * from public.saved_searches ss
    where ss.kind = 'candidates' and ss.notify and ss.user_id <> new.id
      and (ss.profession_id is null or ss.profession_id = new.profession_id)
    limit 500
  loop
    if public.saved_search_matches(s, new.profession_id, v_category, new.region_id, new.district_id,
                                   new.settlement_id, new.lat, new.lng) then
      perform public.create_notification(s.user_id, 'new_matching_candidate',
        'Hududingizda yangi mos nomzod', s.name, '/candidate/' || new.id,
        jsonb_build_object('saved_search_id', s.id, 'candidate_id', new.id));
      update public.saved_searches set last_notified_at = now() where id = s.id;
    end if;
  end loop;
  return new;
end;
$$;

create trigger candidate_profiles_notify_saved_searches
  after insert or update of is_public, profession_id, district_id on public.candidate_profiles
  for each row execute function public.notify_saved_searches_candidate();
