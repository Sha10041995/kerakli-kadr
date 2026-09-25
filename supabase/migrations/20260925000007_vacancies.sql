-- Vacancies and moderation workflow.

create table public.app_settings (
  key text primary key check (key ~ '^[a-z0-9_.]+$'),
  value jsonb not null,
  description text,
  is_public boolean not null default true,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

create or replace function public.get_setting(p_key text, p_default jsonb default null)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select s.value from public.app_settings s where s.key = p_key), p_default)
$$;

alter table public.app_settings enable row level security;
create policy app_settings_read on public.app_settings for select using (is_public or public.is_staff());
create policy app_settings_admin on public.app_settings for all using (public.is_admin()) with check (public.is_admin());

create table public.vacancies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  title text not null check (char_length(title) between 3 and 160),
  description text not null check (char_length(description) between 20 and 10000),
  category_id integer references public.categories (id),
  profession_id integer references public.professions (id),
  experience_min_years numeric(4, 1) not null default 0 check (experience_min_years between 0 and 50),
  education_level public.education_level,
  salary_min bigint check (salary_min is null or salary_min >= 0),
  salary_max bigint check (salary_max is null or salary_max >= 0),
  salary_currency text not null default 'UZS' check (salary_currency in ('UZS', 'USD')),
  salary_type public.salary_type not null default 'monthly',
  employment_type public.employment_type not null default 'full_time',
  work_schedule public.work_schedule not null default 'full_day',
  vacancy_tier public.vacancy_tier not null default 'standard',
  positions_count integer not null default 1 check (positions_count between 1 and 1000),
  region_id integer references public.regions (id),
  district_id integer references public.districts (id),
  settlement_id integer references public.settlements (id),
  mahalla_id integer references public.mahallas (id),
  address_text text check (address_text is null or char_length(address_text) <= 300),
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  remote_allowed boolean not null default false,
  transport_provided boolean not null default false,
  accommodation_provided boolean not null default false,
  meal_provided boolean not null default false,
  urgent boolean not null default false,
  application_deadline date,
  status public.vacancy_status not null default 'draft',
  rejection_reason text check (rejection_reason is null or char_length(rejection_reason) <= 1000),
  is_featured boolean not null default false,
  promoted_until timestamptz,
  published_at timestamptz,
  expires_at timestamptz,
  views_count integer not null default 0,
  applications_count integer not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (salary_max is null or salary_min is null or salary_max >= salary_min),
  check (region_id is not null or remote_allowed)
);

create table public.vacancy_skills (
  vacancy_id uuid not null references public.vacancies (id) on delete cascade,
  skill_id integer not null references public.skills (id),
  is_required boolean not null default true,
  primary key (vacancy_id, skill_id)
);

create index vacancies_status_profession_idx on public.vacancies (status, profession_id);
create index vacancies_status_category_idx on public.vacancies (status, category_id);
create index vacancies_district_idx on public.vacancies (district_id) where status = 'active';
create index vacancies_region_idx on public.vacancies (region_id) where status = 'active';
create index vacancies_settlement_idx on public.vacancies (settlement_id) where status = 'active';
create index vacancies_geo_idx on public.vacancies (lat, lng) where status = 'active';
create index vacancies_company_idx on public.vacancies (company_id, status);
create index vacancies_published_idx on public.vacancies (published_at desc) where status = 'active';
create index vacancies_title_trgm on public.vacancies using gin (title extensions.gin_trgm_ops);
create index vacancy_skills_skill_idx on public.vacancy_skills (skill_id);

create trigger vacancies_location before insert or update of region_id, district_id, settlement_id, mahalla_id, lat, lng
  on public.vacancies for each row execute function public.normalize_location();

-- Active plan limits for a company (falls back to the FREE plan).
create or replace function public.company_plan_limits(p_company_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limits jsonb;
begin
  select sp.limits into v_limits
  from public.subscriptions s
  join public.subscription_plans sp on sp.id = s.plan_id
  where s.company_id = p_company_id
    and s.status in ('active', 'trialing')
    and s.current_period_end > now()
  order by sp.price_uzs desc
  limit 1;

  if v_limits is null then
    select sp.limits into v_limits from public.subscription_plans sp where sp.code = 'FREE';
  end if;
  return coalesce(v_limits, '{"max_active_vacancies": 1}'::jsonb);
end;
$$;

-- Moderation & integrity rules for vacancies (runs for every write).
--  * Employers may only move between draft / pending_review / closed; publishing
--    is decided here (auto-publish setting) and by moderators.
--  * Monetisation / counter fields are backend-only.
--  * Active vacancy count is capped by the company's plan.
create or replace function public.vacancies_before_write()
returns trigger
language plpgsql
as $$
declare
  v_active_count integer;
  v_limit integer;
  v_auto_publish boolean;
  v_duration integer;
  v_privileged boolean := public.is_backend_role() or public.is_staff();
  v_content_changed boolean := false;
begin
  new.updated_at := now();

  if not v_privileged then
    if tg_op = 'INSERT' then
      new.is_featured := false;
      new.promoted_until := null;
      new.views_count := 0;
      new.applications_count := 0;
      new.vacancy_tier := 'standard';
      new.is_demo := false;
      new.rejection_reason := null;
      new.published_at := null;
      new.expires_at := null;
      if new.status not in ('draft', 'pending_review') then
        new.status := 'pending_review';
      end if;
    else
      if new.is_featured is distinct from old.is_featured
         or new.promoted_until is distinct from old.promoted_until
         or new.views_count is distinct from old.views_count
         or new.applications_count is distinct from old.applications_count
         or new.vacancy_tier is distinct from old.vacancy_tier
         or new.is_demo is distinct from old.is_demo
         or new.rejection_reason is distinct from old.rejection_reason
         or new.published_at is distinct from old.published_at
         or new.expires_at is distinct from old.expires_at
         or new.company_id is distinct from old.company_id
         or new.created_by is distinct from old.created_by then
        raise exception 'PROTECTED_FIELDS' using errcode = '42501';
      end if;

      v_content_changed := new.title is distinct from old.title
        or new.description is distinct from old.description
        or new.salary_min is distinct from old.salary_min
        or new.salary_max is distinct from old.salary_max
        or new.profession_id is distinct from old.profession_id;

      if new.status is distinct from old.status then
        -- employers: draft/pending_review (= publish request) / closed
        if new.status = 'active' then
          new.status := 'pending_review';
        elsif new.status not in ('draft', 'pending_review', 'closed') then
          raise exception 'INVALID_STATUS_TRANSITION' using errcode = '42501';
        end if;
        if old.status in ('expired', 'closed') and new.status = 'pending_review'
           and old.expires_at is not null and old.expires_at < now() then
          new.published_at := null;
          new.expires_at := null;
        end if;
      elsif old.status = 'rejected' and v_content_changed then
        -- editing a rejected vacancy resubmits it for review
        new.status := 'pending_review';
        new.rejection_reason := null;
      end if;
    end if;

    -- Auto-publish (configurable) turns a publish request straight into "active".
    if new.status = 'pending_review' then
      v_auto_publish := coalesce((public.get_setting('moderation.auto_publish', 'true'::jsonb))::boolean, true);
      if v_auto_publish and not exists (
        select 1 from public.profiles p join public.companies c on c.owner_id = p.id
        where c.id = new.company_id and p.is_blocked
      ) then
        new.status := 'active';
      end if;
    end if;
  end if;

  -- Plan limit for vacancies that are (or will become) visible.
  if new.status in ('active', 'pending_review')
     and (tg_op = 'INSERT' or old.status not in ('active', 'pending_review'))
     and not public.is_backend_role() then
    select count(*) into v_active_count from public.vacancies v
    where v.company_id = new.company_id and v.status in ('active', 'pending_review') and v.id <> new.id;
    v_limit := coalesce((public.company_plan_limits(new.company_id) ->> 'max_active_vacancies')::integer, 1);
    if v_active_count >= v_limit then
      raise exception 'VACANCY_LIMIT_REACHED' using errcode = 'P0001',
        hint = format('Plan limit: %s active vacancies', v_limit);
    end if;
  end if;

  if new.status = 'active' and (tg_op = 'INSERT' or old.status <> 'active') then
    v_duration := coalesce((public.get_setting('vacancy.default_duration_days', '30'::jsonb))::integer, 30);
    new.published_at := coalesce(new.published_at, now());
    if new.expires_at is null or new.expires_at < now() then
      new.expires_at := now() + make_interval(days => v_duration);
    end if;
  end if;

  return new;
end;
$$;

create trigger vacancies_write before insert or update on public.vacancies
  for each row execute function public.vacancies_before_write();

-- Expire outdated vacancies (schedule with pg_cron: select public.expire_vacancies();)
create or replace function public.expire_vacancies()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.vacancies set status = 'expired'
  where status = 'active'
    and (expires_at < now() or (application_deadline is not null and application_deadline < current_date));
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.expire_vacancies() from public, anon, authenticated;

-- Public view counter without granting UPDATE on the table.
create or replace function public.increment_vacancy_views(p_vacancy_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.vacancies set views_count = views_count + 1
  where id = p_vacancy_id and status = 'active'
$$;

alter table public.vacancies enable row level security;
alter table public.vacancy_skills enable row level security;

create policy vacancies_read on public.vacancies for select
  using (status = 'active' or public.is_company_member(company_id) or public.is_staff());
create policy vacancies_insert on public.vacancies for insert
  with check (public.is_company_member(company_id) and created_by = auth.uid());
create policy vacancies_update on public.vacancies for update
  using (public.is_company_member(company_id) or public.is_staff())
  with check (public.is_company_member(company_id) or public.is_staff());
create policy vacancies_delete on public.vacancies for delete
  using ((public.is_company_member(company_id) and status = 'draft') or public.is_admin());

create policy vacancy_skills_read on public.vacancy_skills for select
  using (exists (select 1 from public.vacancies v where v.id = vacancy_id));
create policy vacancy_skills_write on public.vacancy_skills for all
  using (exists (select 1 from public.vacancies v where v.id = vacancy_id and public.is_company_member(v.company_id)))
  with check (exists (select 1 from public.vacancies v where v.id = vacancy_id and public.is_company_member(v.company_id)));
