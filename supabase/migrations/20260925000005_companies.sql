-- Employers. Every employer (including private individuals) acts through a
-- company record; individuals get company_type = 'individual'.

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  company_type public.company_type not null default 'individual',
  stir text check (stir is null or stir ~ '^[0-9]{9}$'),
  logo_url text check (logo_url is null or char_length(logo_url) <= 500),
  description text check (description is null or char_length(description) <= 5000),
  website text check (website is null or website ~* '^https?://'),
  region_id integer references public.regions (id),
  district_id integer references public.districts (id),
  settlement_id integer references public.settlements (id),
  mahalla_id integer references public.mahallas (id),
  address text check (address is null or char_length(address) <= 300),
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  verification_status public.verification_status not null default 'unverified',
  is_featured boolean not null default false,
  featured_until timestamptz,
  rating_avg numeric(3, 2) not null default 0,
  rating_count integer not null default 0,
  hires_count integer not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.company_members (
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  member_role text not null default 'recruiter' check (member_role in ('owner', 'recruiter')),
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

create index companies_owner_idx on public.companies (owner_id);
create index companies_district_idx on public.companies (district_id);
create index company_members_user_idx on public.company_members (user_id);

create trigger companies_updated_at before update on public.companies
  for each row execute function public.set_updated_at();
create trigger companies_location before insert or update of region_id, district_id, settlement_id, mahalla_id, lat, lng
  on public.companies for each row execute function public.normalize_location();

create or replace function public.is_company_member(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.company_members cm
    where cm.company_id = p_company_id and cm.user_id = auth.uid()
  )
$$;

create or replace function public.is_company_owner(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.company_members cm
    where cm.company_id = p_company_id and cm.user_id = auth.uid() and cm.member_role = 'owner'
  )
$$;

create or replace function public.companies_guard()
returns trigger
language plpgsql
as $$
begin
  if public.is_privileged() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.verification_status := 'unverified';
    new.is_featured := false;
    new.featured_until := null;
    new.rating_avg := 0;
    new.rating_count := 0;
    new.hires_count := 0;
    new.is_demo := false;
    return new;
  end if;
  if new.verification_status is distinct from old.verification_status
     or new.is_featured is distinct from old.is_featured
     or new.featured_until is distinct from old.featured_until
     or new.rating_avg is distinct from old.rating_avg
     or new.rating_count is distinct from old.rating_count
     or new.hires_count is distinct from old.hires_count
     or new.is_demo is distinct from old.is_demo
     or new.owner_id is distinct from old.owner_id then
    raise exception 'PROTECTED_FIELDS' using errcode = '42501';
  end if;
  -- Changing legal identity requires re-verification.
  if (new.stir is distinct from old.stir or new.name is distinct from old.name)
     and old.verification_status = 'verified' then
    new.verification_status := 'unverified';
  end if;
  return new;
end;
$$;

create trigger companies_guard before insert or update on public.companies
  for each row execute function public.companies_guard();

create or replace function public.companies_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.company_members (company_id, user_id, member_role)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

create trigger companies_after_insert after insert on public.companies
  for each row execute function public.companies_after_insert();

alter table public.companies enable row level security;
alter table public.company_members enable row level security;

create policy companies_read on public.companies for select using (true);
create policy companies_insert on public.companies for insert
  with check (owner_id = auth.uid() and (public.has_role('employer') or public.has_role('company')));
create policy companies_update on public.companies for update
  using (public.is_company_owner(id) or public.is_admin())
  with check (public.is_company_owner(id) or public.is_admin());
create policy companies_delete on public.companies for delete
  using (public.is_company_owner(id) or public.is_admin());

create policy company_members_read on public.company_members for select
  using (user_id = auth.uid() or public.is_company_member(company_id) or public.is_staff());
create policy company_members_owner_insert on public.company_members for insert
  with check (public.is_company_owner(company_id) and member_role = 'recruiter');
create policy company_members_owner_delete on public.company_members for delete
  using ((public.is_company_owner(company_id) and member_role <> 'owner') or public.is_admin());
