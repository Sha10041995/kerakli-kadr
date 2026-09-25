-- Reports, complaints, audit logs and analytics helpers.

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  target_type public.report_target not null,
  target_id uuid not null,
  reason public.report_reason not null,
  details text check (details is null or char_length(details) <= 2000),
  status public.report_status not null default 'open',
  resolution_note text check (resolution_note is null or char_length(resolution_note) <= 2000),
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);

create index reports_status_idx on public.reports (status, created_at);
create index reports_target_idx on public.reports (target_type, target_id);

create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null check (char_length(subject) between 3 and 200),
  body text not null check (char_length(body) between 10 and 5000),
  status public.report_status not null default 'open',
  admin_reply text check (admin_reply is null or char_length(admin_reply) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger complaints_updated_at before update on public.complaints
  for each row execute function public.set_updated_at();

create or replace function public.reports_guard()
returns trigger
language plpgsql
as $$
declare
  v_recent integer;
begin
  if public.is_backend_role() or public.is_staff() then
    if tg_op = 'UPDATE' and new.status in ('resolved', 'dismissed') and old.status not in ('resolved', 'dismissed') then
      new.resolved_by := auth.uid();
      new.resolved_at := now();
    end if;
    return new;
  end if;
  if tg_op = 'UPDATE' then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  new.reporter_id := auth.uid();
  new.status := 'open';
  new.resolved_by := null;
  new.resolved_at := null;
  new.resolution_note := null;
  select count(*) into v_recent from public.reports
  where reporter_id = auth.uid() and created_at > now() - interval '24 hours';
  if v_recent >= 20 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger reports_guard before insert or update on public.reports
  for each row execute function public.reports_guard();

-- Vacancies with many open reports are hidden until reviewed.
create or replace function public.reports_auto_hide()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_threshold integer := coalesce((public.get_setting('moderation.auto_hide_reports', '5'::jsonb))::integer, 5);
begin
  if new.target_type = 'vacancy' and (
    select count(*) from public.reports r
    where r.target_type = 'vacancy' and r.target_id = new.target_id and r.status = 'open'
  ) >= v_threshold then
    update public.vacancies set status = 'pending_review' where id = new.target_id and status = 'active';
  end if;
  return new;
end;
$$;

create trigger reports_auto_hide after insert on public.reports
  for each row execute function public.reports_auto_hide();

alter table public.reports enable row level security;
alter table public.complaints enable row level security;

create policy reports_read on public.reports for select using (reporter_id = auth.uid() or public.is_staff());
create policy reports_insert on public.reports for insert with check (auth.uid() is not null);
create policy reports_staff_update on public.reports for update using (public.is_staff()) with check (public.is_staff());

create policy complaints_read on public.complaints for select using (user_id = auth.uid() or public.is_staff());
create policy complaints_insert on public.complaints for insert with check (user_id = auth.uid());
create policy complaints_staff_update on public.complaints for update using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- Audit log (append-only)
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  data jsonb not null default '{}'::jsonb,
  ip inet,
  created_at timestamptz not null default now()
);

create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;
create policy audit_logs_admin_read on public.audit_logs for select using (public.is_admin());

create or replace function public.log_audit(
  p_action text, p_entity_type text, p_entity_id text, p_data jsonb default '{}'::jsonb, p_ip inet default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, data, ip)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_data, '{}'::jsonb), p_ip)
$$;

revoke execute on function public.log_audit(text, text, text, jsonb, inet) from public, anon;

create or replace function public.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id text;
  v_data jsonb;
begin
  if tg_table_name = 'user_roles' then
    v_id := coalesce(new.user_id, old.user_id)::text;
    v_data := jsonb_build_object('role', coalesce(new.role, old.role));
  elsif tg_table_name = 'vacancies' then
    if new.status is not distinct from old.status then return null; end if;
    v_id := new.id::text;
    v_data := jsonb_build_object('from', old.status, 'to', new.status, 'reason', new.rejection_reason);
  elsif tg_table_name = 'payments' then
    if new.status is not distinct from old.status then return null; end if;
    v_id := new.id::text;
    v_data := jsonb_build_object('from', old.status, 'to', new.status, 'amount', new.amount_uzs);
  elsif tg_table_name = 'verification_requests' then
    if new.status is not distinct from old.status then return null; end if;
    v_id := new.id::text;
    v_data := jsonb_build_object('type', new.type, 'to', new.status);
  elsif tg_table_name = 'profiles' then
    if new.is_blocked is not distinct from old.is_blocked then return null; end if;
    v_id := new.id::text;
    v_data := jsonb_build_object('is_blocked', new.is_blocked);
  else
    v_id := null;
    v_data := '{}'::jsonb;
  end if;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, data)
  values (auth.uid(), lower(tg_op), tg_table_name, v_id, v_data);
  return null;
end;
$$;

create trigger audit_user_roles after insert or delete on public.user_roles
  for each row execute function public.audit_trigger();
create trigger audit_vacancies_status after update of status on public.vacancies
  for each row execute function public.audit_trigger();
create trigger audit_payments_status after update of status on public.payments
  for each row execute function public.audit_trigger();
create trigger audit_verification after update of status on public.verification_requests
  for each row execute function public.audit_trigger();
create trigger audit_profiles_block after update of is_blocked on public.profiles
  for each row execute function public.audit_trigger();

-- ---------------------------------------------------------------------------
-- Analytics
-- ---------------------------------------------------------------------------
create table public.search_logs (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles (id) on delete set null,
  kind text not null check (kind in ('vacancies', 'candidates')),
  query text check (query is null or char_length(query) <= 120),
  profession_id integer references public.professions (id) on delete set null,
  region_id integer references public.regions (id) on delete set null,
  district_id integer references public.districts (id) on delete set null,
  results_count integer,
  created_at timestamptz not null default now()
);

create index search_logs_created_idx on public.search_logs (created_at desc);
create index search_logs_profession_idx on public.search_logs (profession_id, district_id);

alter table public.search_logs enable row level security;
create policy search_logs_insert on public.search_logs for insert
  with check (user_id is null or user_id = auth.uid());
create policy search_logs_admin_read on public.search_logs for select using (public.is_staff());

create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  -- NB: inside SECURITY DEFINER current_user is the owner, so the caller is
  -- identified via the JWT role instead of is_backend_role().
  if not (public.is_staff() or coalesce(auth.role(), '') = 'service_role') then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'total_users', (select count(*) from public.profiles),
    'job_seekers', (select count(*) from public.user_roles where role = 'job_seeker'),
    'employers', (select count(*) from public.user_roles where role = 'employer'),
    'companies', (select count(*) from public.companies where company_type <> 'individual'),
    'candidate_profiles', (select count(*) from public.candidate_profiles),
    'vacancies_total', (select count(*) from public.vacancies),
    'vacancies_active', (select count(*) from public.vacancies where status = 'active'),
    'vacancies_pending', (select count(*) from public.vacancies where status = 'pending_review'),
    'applications', (select count(*) from public.applications),
    'hires', (select count(*) from public.applications where status = 'hired'),
    'active_users_30d', (select count(distinct sender_id) from public.messages where created_at > now() - interval '30 days')
                        + (select count(distinct candidate_id) from public.applications where created_at > now() - interval '30 days'),
    'revenue_uzs', (select coalesce(sum(amount_uzs), 0) from public.payments where status = 'paid'),
    'revenue_30d_uzs', (select coalesce(sum(amount_uzs), 0) from public.payments where status = 'paid' and paid_at > now() - interval '30 days'),
    'active_subscriptions', (select count(*) from public.subscriptions where status = 'active' and current_period_end > now()),
    'open_reports', (select count(*) from public.reports where status in ('open', 'reviewing')),
    'open_complaints', (select count(*) from public.complaints where status in ('open', 'reviewing')),
    'pending_verifications', (select count(*) from public.verification_requests where status = 'pending'),
    'searches_30d', (select count(*) from public.search_logs where created_at > now() - interval '30 days')
  );
end;
$$;

-- Demand (vacancies) vs supply (candidates) per district and profession.
create or replace function public.demand_supply(p_region_id integer default null, p_limit integer default 50)
returns table (
  region_id integer, district_id integer, district_name text, profession_id integer,
  profession_name text, vacancy_count bigint, candidate_count bigint, demand_ratio numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  with demand as (
    select v.district_id, v.profession_id, count(*) as n
    from public.vacancies v
    where v.status = 'active' and v.district_id is not null and v.profession_id is not null
      and (p_region_id is null or v.region_id = p_region_id)
    group by 1, 2
  ), supply as (
    select c.district_id, c.profession_id, count(*) as n
    from public.candidate_profiles c
    where c.is_public and c.district_id is not null and c.profession_id is not null
      and c.availability <> 'not_available'
      and (p_region_id is null or c.region_id = p_region_id)
    group by 1, 2
  )
  select d.region_id, d.id, d.name_uz, p.id, p.name_uz,
         coalesce(de.n, 0), coalesce(su.n, 0),
         round(coalesce(de.n, 0)::numeric / greatest(coalesce(su.n, 0), 1), 2)
  from demand de
  full join supply su on su.district_id = de.district_id and su.profession_id = de.profession_id
  join public.districts d on d.id = coalesce(de.district_id, su.district_id)
  join public.professions p on p.id = coalesce(de.profession_id, su.profession_id)
  order by 8 desc, 6 desc
  limit least(greatest(p_limit, 1), 500)
$$;
