-- LOCATION-FIRST search.
-- Ranking tiers (lower = closer match), see docs/SEARCH.md:
--   1 exact mahalla, 2 exact settlement (shahar/qishloq), 3 exact district,
--   4 same region within radius (nearby district), 5 other region within radius
--   (nearby region), 6 same region beyond radius, 7 other.
-- Distances use approximate coordinates; candidate coordinates are rounded (~1 km).

create or replace function public.like_escape(p text)
returns text
language sql
immutable
as $$
  select replace(replace(replace(p, '\', '\\'), '%', '\%'), '_', '\_')
$$;

-- Resolve a (partial) location selection into its full chain and centre point.
create or replace function public.resolve_origin(
  p_region_id integer, p_district_id integer, p_settlement_id integer, p_mahalla_id integer,
  p_lat double precision, p_lng double precision,
  out region_id integer, out district_id integer, out settlement_id integer, out mahalla_id integer,
  out lat double precision, out lng double precision, out has_location boolean, out region_only boolean
)
language sql
stable
as $$
  select r.id, d.id, s.id, m.id,
         coalesce(p_lat, m.lat, s.lat, d.lat, r.lat),
         coalesce(p_lng, m.lng, s.lng, d.lng, r.lng),
         (r.id is not null or p_lat is not null),
         (p_lat is null and d.id is null and r.id is not null)
  from (select 1) x
  left join public.mahallas m on m.id = p_mahalla_id
  left join public.settlements s on s.id = coalesce(p_settlement_id, m.settlement_id)
  left join public.districts d on d.id = coalesce(p_district_id, m.district_id, s.district_id)
  left join public.regions r on r.id = coalesce(p_region_id, d.region_id)
$$;

create or replace function public.location_tier(
  o_mahalla integer, o_settlement integer, o_district integer, o_region integer, o_has_location boolean,
  t_mahalla integer, t_settlement integer, t_district integer, t_region integer,
  p_distance double precision, p_radius double precision, p_region_only boolean
)
returns smallint
language sql
immutable
as $$
  select (case
    when not o_has_location then 0
    when o_mahalla is not null and t_mahalla = o_mahalla then 1
    when o_settlement is not null and t_settlement = o_settlement then 2
    when o_district is not null and t_district = o_district then 3
    when t_region = o_region and (p_region_only or p_distance <= p_radius) then 4
    when p_distance <= p_radius then 5
    when t_region = o_region then 6
    else 7
  end)::smallint
$$;

-- ---------------------------------------------------------------------------
-- Vacancy search (for job seekers)
-- ---------------------------------------------------------------------------
create or replace function public.search_vacancies(
  p_query text default null,
  p_category_id integer default null,
  p_profession_id integer default null,
  p_region_id integer default null,
  p_district_id integer default null,
  p_settlement_id integer default null,
  p_mahalla_id integer default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_km integer default null,
  p_employment_types public.employment_type[] default null,
  p_salary_min bigint default null,
  p_experience_max numeric default null,
  p_remote boolean default null,
  p_urgent boolean default null,
  p_transport boolean default null,
  p_accommodation boolean default null,
  p_company_id uuid default null,
  p_verified_only boolean default false,
  p_sort text default 'relevance',
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid, title text, company_id uuid, company_name text, company_slug text, company_logo text,
  company_verified boolean, profession_id integer, profession_name text,
  salary_min bigint, salary_max bigint, salary_currency text, salary_type public.salary_type,
  employment_type public.employment_type, work_schedule public.work_schedule,
  experience_min_years numeric, region_id integer, region_name text, district_id integer,
  district_name text, settlement_name text, lat double precision, lng double precision,
  remote_allowed boolean, urgent boolean, is_featured boolean, is_promoted boolean,
  transport_provided boolean, accommodation_provided boolean, meal_provided boolean,
  published_at timestamptz, distance_km double precision, location_tier smallint, total_count bigint
)
language sql
stable
as $$
  with o as (
    select * from public.resolve_origin(p_region_id, p_district_id, p_settlement_id, p_mahalla_id, p_lat, p_lng)
  ),
  base as (
    select v.*,
      public.geo_distance_km(o.lat, o.lng, v.lat, v.lng) as dist,
      o.has_location, o.region_only
    from public.vacancies v, o
    where v.status = 'active'
      and (v.expires_at is null or v.expires_at > now())
      and (p_profession_id is null or v.profession_id = p_profession_id)
      and (p_category_id is null or v.category_id = p_category_id
           or v.profession_id in (select pr.id from public.professions pr where pr.category_id = p_category_id))
      and (p_employment_types is null or v.employment_type = any (p_employment_types))
      and (p_salary_min is null or coalesce(v.salary_max, v.salary_min) >= p_salary_min)
      and (p_experience_max is null or v.experience_min_years <= p_experience_max)
      and (p_remote is not true or v.remote_allowed)
      and (p_urgent is not true or v.urgent)
      and (p_transport is not true or v.transport_provided)
      and (p_accommodation is not true or v.accommodation_provided)
      and (p_company_id is null or v.company_id = p_company_id)
      and (p_query is null or btrim(p_query) = ''
           or v.title ilike '%' || public.like_escape(btrim(p_query)) || '%'
           or exists (select 1 from public.professions pq where pq.id = v.profession_id
                      and (pq.name_uz ilike '%' || public.like_escape(btrim(p_query)) || '%'
                           or btrim(lower(p_query)) = any (pq.synonyms))))
  ),
  ranked as (
    select b.*,
      public.location_tier(o.mahalla_id, o.settlement_id, o.district_id, o.region_id, o.has_location,
                           b.mahalla_id, b.settlement_id, b.district_id, b.region_id,
                           b.dist, coalesce(p_radius_km, 50), o.region_only) as tier
    from base b, o
  )
  select r.id, r.title, c.id, c.name, c.slug, c.logo_url, c.verification_status = 'verified',
    r.profession_id, pr.name_uz,
    r.salary_min, r.salary_max, r.salary_currency, r.salary_type, r.employment_type, r.work_schedule,
    r.experience_min_years, r.region_id, rg.name_uz, r.district_id, d.name_uz, s.name_uz, r.lat, r.lng,
    r.remote_allowed, r.urgent, r.is_featured, coalesce(r.promoted_until > now(), false),
    r.transport_provided, r.accommodation_provided, r.meal_provided, r.published_at,
    round(r.dist::numeric, 1)::double precision, r.tier, count(*) over ()
  from ranked r
  join public.companies c on c.id = r.company_id
  left join public.professions pr on pr.id = r.profession_id
  left join public.regions rg on rg.id = r.region_id
  left join public.districts d on d.id = r.district_id
  left join public.settlements s on s.id = r.settlement_id
  where (not r.has_location
         or r.tier <= case when p_radius_km is not null then 5 when r.region_only then 4 else 6 end
         or (p_remote is true and r.remote_allowed))
    and (not coalesce(p_verified_only, false) or c.verification_status = 'verified')
  order by
    case when coalesce(p_sort, 'relevance') = 'relevance' then r.tier end asc,
    case when coalesce(p_sort, 'relevance') = 'relevance' then coalesce(r.promoted_until > now(), false) end desc,
    case when coalesce(p_sort, 'relevance') in ('relevance', 'distance') then r.dist end asc nulls last,
    case when p_sort = 'salary' then coalesce(r.salary_max, r.salary_min) end desc nulls last,
    r.published_at desc nulls last,
    r.id
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0)
$$;

-- ---------------------------------------------------------------------------
-- Candidate search (for employers). Returns only public-safe fields.
-- ---------------------------------------------------------------------------
create or replace function public.search_candidates(
  p_query text default null,
  p_category_id integer default null,
  p_profession_id integer default null,
  p_region_id integer default null,
  p_district_id integer default null,
  p_settlement_id integer default null,
  p_mahalla_id integer default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_km integer default null,
  p_experience_min numeric default null,
  p_salary_max bigint default null,
  p_availability public.availability_status[] default null,
  p_employment_types public.employment_type[] default null,
  p_min_rating numeric default null,
  p_verified_only boolean default false,
  p_has_transport boolean default null,
  p_remote boolean default null,
  p_skill_ids integer[] default null,
  p_sort text default 'relevance',
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid, first_name text, last_initial text, avatar_url text, headline text,
  profession_id integer, profession_name text, experience_years numeric,
  region_id integer, region_name text, district_id integer, district_name text, settlement_name text,
  expected_salary_min bigint, expected_salary_max bigint, salary_type public.salary_type,
  availability public.availability_status, employment_types public.employment_type[],
  has_transport boolean, remote_ok boolean, rating_avg numeric, rating_count integer,
  completed_jobs integer, phone_verified boolean, identity_verified boolean, certificate_verified boolean,
  is_premium boolean, completeness smallint, skills text[],
  lat double precision, lng double precision,
  distance_km double precision, location_tier smallint, total_count bigint
)
language sql
stable
as $$
  with o as (
    select * from public.resolve_origin(p_region_id, p_district_id, p_settlement_id, p_mahalla_id, p_lat, p_lng)
  ),
  base as (
    select c.*,
      public.geo_distance_km(o.lat, o.lng, c.lat, c.lng) as dist,
      o.has_location, o.region_only
    from public.candidate_profiles c, o
    where c.is_public
      and (p_profession_id is null or c.profession_id = p_profession_id)
      and (p_category_id is null
           or c.profession_id in (select pr.id from public.professions pr where pr.category_id = p_category_id))
      and (p_experience_min is null or c.experience_years >= p_experience_min)
      and (p_salary_max is null or c.expected_salary_min is null or c.expected_salary_min <= p_salary_max)
      and (p_availability is null or c.availability = any (p_availability))
      and (p_employment_types is null or c.employment_types && p_employment_types)
      and (p_min_rating is null or c.rating_avg >= p_min_rating)
      and (p_has_transport is not true or c.has_transport)
      and (p_remote is not true or c.remote_ok)
      and (p_skill_ids is null or cardinality(p_skill_ids) = 0 or exists (
            select 1 from public.candidate_skills cs where cs.candidate_id = c.id and cs.skill_id = any (p_skill_ids)))
      and (p_query is null or btrim(p_query) = ''
           or c.headline ilike '%' || public.like_escape(btrim(p_query)) || '%'
           or exists (select 1 from public.professions pq where pq.id = c.profession_id
                      and (pq.name_uz ilike '%' || public.like_escape(btrim(p_query)) || '%'
                           or btrim(lower(p_query)) = any (pq.synonyms))))
  ),
  ranked as (
    select b.*,
      public.location_tier(o.mahalla_id, o.settlement_id, o.district_id, o.region_id, o.has_location,
                           b.mahalla_id, b.settlement_id, b.district_id, b.region_id,
                           b.dist, coalesce(p_radius_km, 50), o.region_only) as tier
    from base b, o
  )
  select r.id, pp.first_name, left(pp.last_name, 1), pp.avatar_url, r.headline,
    r.profession_id, pr.name_uz, r.experience_years,
    r.region_id, rg.name_uz, r.district_id, d.name_uz, s.name_uz,
    r.expected_salary_min, r.expected_salary_max, r.salary_type, r.availability, r.employment_types,
    r.has_transport, r.remote_ok, r.rating_avg, r.rating_count, r.completed_jobs,
    pp.phone_verified, pp.identity_verified, pp.certificate_verified,
    coalesce(r.premium_until > now(), false), r.completeness,
    array(select sk.name_uz from public.candidate_skills cs join public.skills sk on sk.id = cs.skill_id
          where cs.candidate_id = r.id order by cs.level desc, sk.name_uz limit 6),
    r.lat, r.lng,
    round(r.dist::numeric, 1)::double precision, r.tier, count(*) over ()
  from ranked r
  join public.public_profiles pp on pp.id = r.id
  left join public.professions pr on pr.id = r.profession_id
  left join public.regions rg on rg.id = r.region_id
  left join public.districts d on d.id = r.district_id
  left join public.settlements s on s.id = r.settlement_id
  where (not r.has_location
         or r.tier <= case when p_radius_km is not null then 5 when r.region_only then 4 else 6 end
         or (p_remote is true and r.remote_ok))
    and (not coalesce(p_verified_only, false) or pp.phone_verified or pp.identity_verified)
  order by
    case when coalesce(p_sort, 'relevance') = 'relevance' then r.tier end asc,
    case when coalesce(p_sort, 'relevance') = 'relevance' then coalesce(r.premium_until > now(), false) end desc,
    case when coalesce(p_sort, 'relevance') in ('relevance', 'distance') then r.dist end asc nulls last,
    case when p_sort = 'rating' then r.rating_avg end desc,
    case when p_sort = 'experience' then r.experience_years end desc,
    r.completeness desc,
    r.updated_at desc,
    r.id
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0)
$$;

-- ---------------------------------------------------------------------------
-- Local talent map: "Yaqin atrofda 37 ta elektrik mavjud"
-- ---------------------------------------------------------------------------
create or replace function public.talent_count(
  p_profession_id integer,
  p_region_id integer default null,
  p_district_id integer default null,
  p_settlement_id integer default null,
  p_radius_km integer default 25
)
returns jsonb
language sql
stable
as $$
  with o as (
    select * from public.resolve_origin(p_region_id, p_district_id, p_settlement_id, null, null, null)
  ),
  cand as (
    select c.region_id, c.district_id, c.settlement_id, c.lat, c.lng
    from public.candidate_profiles c
    where c.is_public and c.profession_id = p_profession_id and c.availability <> 'not_available'
  )
  select jsonb_build_object(
    'in_area', (select count(*) from cand c where
        (o.settlement_id is not null and c.settlement_id = o.settlement_id)
        or (o.settlement_id is null and o.district_id is not null and c.district_id = o.district_id)
        or (o.district_id is null and c.region_id = o.region_id)),
    'nearby', (select count(*) from cand c
        where public.geo_distance_km(o.lat, o.lng, c.lat, c.lng) <= coalesce(p_radius_km, 25)),
    'in_region', (select count(*) from cand c where c.region_id = o.region_id),
    'vacancies_in_area', (
      select count(*) from public.vacancies v
      where v.status = 'active' and v.profession_id = p_profession_id
        and ((o.district_id is not null and v.district_id = o.district_id)
             or (o.district_id is null and v.region_id = o.region_id))
    )
  )
  from o
$$;

-- Top professions by available candidates (and open vacancies) in an area.
create or replace function public.talent_summary(
  p_region_id integer default null,
  p_district_id integer default null,
  p_limit integer default 12
)
returns table (profession_id integer, profession_slug text, profession_name text, candidate_count bigint, vacancy_count bigint)
language sql
stable
as $$
  select p.id, p.slug, p.name_uz,
    (select count(*) from public.candidate_profiles c
      where c.is_public and c.profession_id = p.id and c.availability <> 'not_available'
        and (p_region_id is null or c.region_id = p_region_id)
        and (p_district_id is null or c.district_id = p_district_id)) as candidates,
    (select count(*) from public.vacancies v
      where v.status = 'active' and v.profession_id = p.id
        and (p_region_id is null or v.region_id = p_region_id)
        and (p_district_id is null or v.district_id = p_district_id)) as vacancies
  from public.professions p
  where p.is_active
  order by 4 desc, 5 desc, p.sort_order
  limit least(greatest(coalesce(p_limit, 12), 1), 100)
$$;

create or replace function public.category_stats()
returns table (id integer, slug text, name_uz text, icon text, vacancy_count bigint, candidate_count bigint)
language sql
stable
as $$
  select c.id, c.slug, c.name_uz, c.icon,
    (select count(*) from public.vacancies v
      left join public.professions p on p.id = v.profession_id
      where v.status = 'active' and (v.category_id = c.id or p.category_id = c.id)),
    (select count(*) from public.candidate_profiles cp
      join public.professions p on p.id = cp.profession_id
      where cp.is_public and p.category_id = c.id)
  from public.categories c
  where c.is_active and c.parent_id is null
  order by c.sort_order, c.name_uz
$$;

create or replace function public.region_stats()
returns table (id integer, slug text, name_uz text, vacancy_count bigint, candidate_count bigint)
language sql
stable
as $$
  select r.id, r.slug, r.name_uz,
    (select count(*) from public.vacancies v where v.status = 'active' and v.region_id = r.id),
    (select count(*) from public.candidate_profiles c where c.is_public and c.region_id = r.id)
  from public.regions r
  where r.is_active
  order by r.sort_order, r.name_uz
$$;

-- ---------------------------------------------------------------------------
-- Matching feature extraction. The score itself is computed in
-- src/features/matching/score.ts with admin-configurable weights so that the
-- algorithm stays transparent and unit-testable.
-- ---------------------------------------------------------------------------
create or replace function public.match_candidates_for_vacancy(p_vacancy_id uuid, p_limit integer default 100)
returns table (
  candidate_id uuid, first_name text, last_initial text, avatar_url text, headline text,
  profession_id integer, profession_name text, district_name text,
  same_profession boolean, same_category boolean, distance_km double precision, location_tier smallint,
  experience_years numeric, required_experience numeric, availability public.availability_status,
  expected_salary_min bigint, expected_salary_max bigint, vacancy_salary_min bigint, vacancy_salary_max bigint,
  employment_match boolean, rating_avg numeric, rating_count integer, completeness smallint,
  skills_matched integer, skills_required integer, has_transport boolean, remote_ok boolean,
  remote_allowed boolean, phone_verified boolean, identity_verified boolean
)
language plpgsql
stable
as $$
#variable_conflict use_column
declare
  v public.vacancies;
  v_category integer;
begin
  select * into v from public.vacancies where id = p_vacancy_id;
  if v.id is null or not (public.is_company_member(v.company_id) or public.is_staff()) then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  v_category := coalesce(v.category_id, (select p.category_id from public.professions p where p.id = v.profession_id));

  return query
  with vs as (select skill_id from public.vacancy_skills where vacancy_id = v.id)
  select c.id, pp.first_name, left(pp.last_name, 1), pp.avatar_url, c.headline,
    c.profession_id, pr.name_uz, d.name_uz,
    c.profession_id is not distinct from v.profession_id and v.profession_id is not null,
    pr.category_id is not distinct from v_category and v_category is not null,
    round(public.geo_distance_km(v.lat, v.lng, c.lat, c.lng)::numeric, 1)::double precision,
    public.location_tier(v.mahalla_id, v.settlement_id, v.district_id, v.region_id, v.region_id is not null,
                         c.mahalla_id, c.settlement_id, c.district_id, c.region_id,
                         public.geo_distance_km(v.lat, v.lng, c.lat, c.lng), 50, false),
    c.experience_years, v.experience_min_years, c.availability,
    c.expected_salary_min, c.expected_salary_max, v.salary_min, v.salary_max,
    v.employment_type = any (c.employment_types),
    c.rating_avg, c.rating_count, c.completeness,
    (select count(*)::integer from public.candidate_skills cs where cs.candidate_id = c.id and cs.skill_id in (select skill_id from vs)),
    (select count(*)::integer from vs),
    c.has_transport, c.remote_ok, v.remote_allowed, pp.phone_verified, pp.identity_verified
  from public.candidate_profiles c
  join public.public_profiles pp on pp.id = c.id
  left join public.professions pr on pr.id = c.profession_id
  left join public.districts d on d.id = c.district_id
  where c.is_public
    and c.availability <> 'not_available'
    and (c.profession_id = v.profession_id or (v_category is not null and pr.category_id = v_category))
    and (
      v.region_id is null
      or c.region_id = v.region_id
      or public.geo_distance_km(v.lat, v.lng, c.lat, c.lng) <= 100
      or (v.remote_allowed and c.remote_ok)
    )
    and not exists (select 1 from public.company_members cm where cm.company_id = v.company_id and cm.user_id = c.id)
  order by (c.profession_id = v.profession_id) desc nulls last,
    public.geo_distance_km(v.lat, v.lng, c.lat, c.lng) asc nulls last
  limit least(greatest(coalesce(p_limit, 100), 1), 300);
end;
$$;

-- Vacancies matching the calling candidate's profile ("Sizga mos ishlar").
create or replace function public.match_vacancies_for_candidate(p_limit integer default 50)
returns table (
  vacancy_id uuid, title text, company_name text, company_verified boolean, district_name text,
  same_profession boolean, same_category boolean, distance_km double precision, location_tier smallint,
  experience_years numeric, required_experience numeric, availability public.availability_status,
  expected_salary_min bigint, expected_salary_max bigint, vacancy_salary_min bigint, vacancy_salary_max bigint,
  salary_type public.salary_type, employment_type public.employment_type, employment_match boolean,
  company_rating numeric, completeness smallint, skills_matched integer, skills_required integer,
  remote_allowed boolean, remote_ok boolean, urgent boolean, published_at timestamptz
)
language plpgsql
stable
as $$
#variable_conflict use_column
declare
  c public.candidate_profiles;
  v_category integer;
begin
  select * into c from public.candidate_profiles where id = auth.uid();
  if c.id is null then
    return;
  end if;
  v_category := (select p.category_id from public.professions p where p.id = c.profession_id);

  return query
  select v.id, v.title, co.name, co.verification_status = 'verified', d.name_uz,
    v.profession_id is not distinct from c.profession_id and c.profession_id is not null,
    coalesce(v.category_id, pr.category_id) is not distinct from v_category and v_category is not null,
    round(public.geo_distance_km(c.lat, c.lng, v.lat, v.lng)::numeric, 1)::double precision,
    public.location_tier(c.mahalla_id, c.settlement_id, c.district_id, c.region_id, c.region_id is not null,
                         v.mahalla_id, v.settlement_id, v.district_id, v.region_id,
                         public.geo_distance_km(c.lat, c.lng, v.lat, v.lng), c.work_radius_km, false),
    c.experience_years, v.experience_min_years, c.availability,
    c.expected_salary_min, c.expected_salary_max, v.salary_min, v.salary_max, v.salary_type,
    v.employment_type, v.employment_type = any (c.employment_types),
    co.rating_avg, c.completeness,
    (select count(*)::integer from public.vacancy_skills vs join public.candidate_skills cs
       on cs.skill_id = vs.skill_id and cs.candidate_id = c.id where vs.vacancy_id = v.id),
    (select count(*)::integer from public.vacancy_skills vs where vs.vacancy_id = v.id),
    v.remote_allowed, c.remote_ok, v.urgent, v.published_at
  from public.vacancies v
  join public.companies co on co.id = v.company_id
  left join public.professions pr on pr.id = v.profession_id
  left join public.districts d on d.id = v.district_id
  where v.status = 'active'
    and (v.expires_at is null or v.expires_at > now())
    and (v.profession_id = c.profession_id or (v_category is not null and coalesce(v.category_id, pr.category_id) = v_category))
    and (
      c.region_id is null
      or v.region_id = c.region_id
      or public.geo_distance_km(c.lat, c.lng, v.lat, v.lng) <= greatest(c.work_radius_km, 50)
      or (v.remote_allowed and c.remote_ok)
    )
    and not exists (select 1 from public.applications a where a.vacancy_id = v.id and a.candidate_id = c.id)
  order by (v.profession_id = c.profession_id) desc nulls last,
    public.geo_distance_km(c.lat, c.lng, v.lat, v.lng) asc nulls last
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
end;
$$;
