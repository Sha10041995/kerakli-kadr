-- Profiles (1:1 with auth.users) and role based access control.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '' check (char_length(first_name) <= 80),
  last_name text not null default '' check (char_length(last_name) <= 80),
  phone text check (phone is null or phone ~ '^\+?[0-9]{9,15}$'),
  email text check (email is null or char_length(email) <= 254),
  avatar_url text check (avatar_url is null or char_length(avatar_url) <= 500),
  birth_year smallint check (birth_year is null or birth_year between 1940 and 2015),
  gender text check (gender is null or gender in ('male', 'female')),
  locale text not null default 'uz' check (locale in ('uz', 'ru', 'en')),
  phone_verified boolean not null default false,
  identity_verified boolean not null default false,
  certificate_verified boolean not null default false,
  is_blocked boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Private personal data. Phone/email are never exposed publicly; use public_profiles view.';

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.roles (
  code public.app_role primary key,
  name_uz text not null,
  description text
);

create table public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null references public.roles (code),
  granted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create index user_roles_role_idx on public.user_roles (role);

insert into public.roles (code, name_uz, description) values
  ('job_seeker', 'Ish izlovchi', 'Kadr / ish izlovchi'),
  ('employer', 'Ish beruvchi', 'Jismoniy yoki yuridik ish beruvchi'),
  ('company', 'Kompaniya', 'Tasdiqlangan kompaniya hisobi'),
  ('admin', 'Administrator', 'Platforma administratori'),
  ('moderator', 'Moderator', 'Kontent moderatori'),
  ('super_admin', 'Super administrator', 'Toʻliq huquqli administrator'),
  ('partner', 'Hamkor', 'Kelajakdagi hamkorlar uchun'),
  ('recruiter', 'Rekruter', 'Kompaniya nomidan ishlovchi rekruter');

-- ---------------------------------------------------------------------------
-- Role helpers (SECURITY DEFINER so they can be used inside RLS policies
-- without recursive policy evaluation).
-- ---------------------------------------------------------------------------
create or replace function public.has_role(p_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = p_role
  )
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role in ('admin', 'super_admin')
  )
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role in ('admin', 'super_admin', 'moderator')
  )
$$;

create or replace function public.is_privileged()
returns boolean
language sql
stable
as $$
  select public.is_backend_role() or public.is_admin()
$$;

-- ---------------------------------------------------------------------------
-- New auth user -> profile (+ optional self-selected public role)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := new.raw_user_meta_data ->> 'role';
begin
  insert into public.profiles (id, first_name, last_name, email, phone, phone_verified)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'first_name', ''), 80),
    left(coalesce(new.raw_user_meta_data ->> 'last_name', ''), 80),
    new.email,
    case when new.phone is not null and new.phone ~ '^\+?[0-9]{9,15}$' then new.phone end,
    new.phone_confirmed_at is not null
  );

  -- Only the two self-service roles may be chosen at sign-up.
  if v_role in ('job_seeker', 'employer') then
    insert into public.user_roles (user_id, role) values (new.id, v_role::public.app_role);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_auth_user_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.phone_confirmed_at is not null and old.phone_confirmed_at is null then
    update public.profiles set phone_verified = true, phone = coalesce(new.phone, phone)
    where id = new.id;
  end if;
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_updated
  after update on auth.users
  for each row execute function public.handle_auth_user_updated();

-- Self-service role selection during onboarding (job_seeker / employer only).
create or replace function public.choose_role(p_role public.app_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;
  if p_role not in ('job_seeker', 'employer') then
    raise exception 'ROLE_NOT_ALLOWED' using errcode = '42501';
  end if;
  insert into public.user_roles (user_id, role) values (auth.uid(), p_role)
  on conflict do nothing;
end;
$$;

-- Users may edit their own profile but never their verification / moderation flags.
create or replace function public.profiles_guard()
returns trigger
language plpgsql
as $$
begin
  if public.is_privileged() then
    return new;
  end if;
  if new.phone_verified is distinct from old.phone_verified
     or new.identity_verified is distinct from old.identity_verified
     or new.certificate_verified is distinct from old.certificate_verified
     or new.is_blocked is distinct from old.is_blocked
     or new.is_demo is distinct from old.is_demo
     or new.id is distinct from old.id then
    raise exception 'PROTECTED_FIELDS' using errcode = '42501';
  end if;
  -- Changing the phone number drops the verified badge.
  if new.phone is distinct from old.phone then
    new.phone_verified := false;
  end if;
  return new;
end;
$$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.profiles_guard();

-- Public, non-sensitive projection of profiles (no phone / email / birth year).
create view public.public_profiles as
  select p.id, p.first_name, p.last_name, p.avatar_url,
         p.phone_verified, p.identity_verified, p.certificate_verified, p.created_at
  from public.profiles p
  where not p.is_blocked;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.user_roles enable row level security;

create policy profiles_select_own on public.profiles
  for select using (id = auth.uid() or public.is_staff());
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create policy roles_select_all on public.roles for select using (true);

create policy user_roles_select on public.user_roles
  for select using (user_id = auth.uid() or public.is_staff());
create policy user_roles_admin_insert on public.user_roles
  for insert with check (public.is_admin());
create policy user_roles_admin_delete on public.user_roles
  for delete using (public.is_admin());

-- Only super admins may grant admin / super_admin.
create or replace function public.user_roles_guard()
returns trigger
language plpgsql
as $$
begin
  if public.is_backend_role() then
    return coalesce(new, old);
  end if;
  if coalesce(new.role, old.role) in ('admin', 'super_admin') and not public.has_role('super_admin') then
    raise exception 'ONLY_SUPER_ADMIN' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger user_roles_guard before insert or delete on public.user_roles
  for each row execute function public.user_roles_guard();

grant select on public.public_profiles to anon, authenticated;
