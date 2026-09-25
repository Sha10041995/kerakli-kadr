-- Job applications: candidate + vacancy = application.

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  vacancy_id uuid not null references public.vacancies (id) on delete cascade,
  candidate_id uuid not null references public.candidate_profiles (id) on delete cascade,
  cover_letter text check (cover_letter is null or char_length(cover_letter) <= 3000),
  status public.application_status not null default 'applied',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vacancy_id, candidate_id)
);

create table public.application_status_history (
  id bigint generated always as identity primary key,
  application_id uuid not null references public.applications (id) on delete cascade,
  from_status public.application_status,
  to_status public.application_status not null,
  changed_by uuid references public.profiles (id) on delete set null,
  note text check (note is null or char_length(note) <= 1000),
  created_at timestamptz not null default now()
);

create index applications_candidate_idx on public.applications (candidate_id, created_at desc);
create index applications_vacancy_idx on public.applications (vacancy_id, status);
create index application_history_app_idx on public.application_status_history (application_id);

-- Allowed employer-side status transitions (mirrored in src/features/applications/status.ts).
create or replace function public.application_transition_allowed(
  p_from public.application_status, p_to public.application_status
)
returns boolean
language sql
immutable
as $$
  select case
    when p_from = p_to then true
    when p_from in ('hired', 'rejected', 'withdrawn') then false
    when p_to = 'rejected' then true
    when p_from = 'applied' then p_to in ('viewed', 'shortlisted', 'interview')
    when p_from = 'viewed' then p_to in ('shortlisted', 'interview')
    when p_from = 'shortlisted' then p_to in ('interview', 'offered')
    when p_from = 'interview' then p_to in ('offered', 'hired')
    when p_from = 'offered' then p_to = 'hired'
    else false
  end
$$;

-- In-app notification helper (backend only; not executable by clients).
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.notification_type not null,
  title text not null check (char_length(title) <= 200),
  body text check (body is null or char_length(body) <= 1000),
  link text check (link is null or link ~ '^/'),
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

create or replace function public.create_notification(
  p_user_id uuid, p_type public.notification_type, p_title text,
  p_body text default null, p_link text default null, p_data jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.notifications (user_id, type, title, body, link, data)
  values (p_user_id, p_type, left(p_title, 200), left(p_body, 1000), p_link, coalesce(p_data, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.create_notification(uuid, public.notification_type, text, text, text, jsonb)
  from public, anon, authenticated;

alter table public.notifications enable row level security;
create policy notifications_read_own on public.notifications for select using (user_id = auth.uid());
create policy notifications_update_own on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete_own on public.notifications for delete using (user_id = auth.uid());

-- Only read_at may be changed by the owner.
create or replace function public.notifications_guard()
returns trigger
language plpgsql
as $$
begin
  if public.is_backend_role() then
    return new;
  end if;
  if new.user_id is distinct from old.user_id or new.type is distinct from old.type
     or new.title is distinct from old.title or new.body is distinct from old.body
     or new.link is distinct from old.link or new.data is distinct from old.data
     or new.emailed_at is distinct from old.emailed_at then
    raise exception 'PROTECTED_FIELDS' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger notifications_guard before update on public.notifications
  for each row execute function public.notifications_guard();

-- ---------------------------------------------------------------------------
-- Application integrity
-- ---------------------------------------------------------------------------
-- SECURITY INVOKER on purpose: guards rely on current_user (see is_backend_role).
create or replace function public.applications_before_write()
returns trigger
language plpgsql
as $$
declare
  v_vacancy public.vacancies;
  v_is_candidate boolean := auth.uid() = coalesce(new.candidate_id, old.candidate_id);
  v_is_member boolean;
  v_recent integer;
begin
  select * into v_vacancy from public.vacancies where id = new.vacancy_id;

  if tg_op = 'INSERT' then
    if public.is_backend_role() then
      return new;
    end if;
    if v_vacancy.id is null or v_vacancy.status <> 'active' then
      raise exception 'VACANCY_NOT_OPEN' using errcode = 'P0001';
    end if;
    if v_vacancy.application_deadline is not null and v_vacancy.application_deadline < current_date then
      raise exception 'VACANCY_NOT_OPEN' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.company_members cm where cm.company_id = v_vacancy.company_id and cm.user_id = new.candidate_id) then
      raise exception 'CANNOT_APPLY_OWN_VACANCY' using errcode = 'P0001';
    end if;
    -- anti-spam: at most 30 applications per 24h
    select count(*) into v_recent from public.applications
    where candidate_id = new.candidate_id and created_at > now() - interval '24 hours';
    if v_recent >= 30 then
      raise exception 'RATE_LIMITED' using errcode = 'P0001';
    end if;
    new.status := 'applied';
    return new;
  end if;

  -- UPDATE
  new.updated_at := now();
  if public.is_backend_role() then
    return new;
  end if;
  if new.vacancy_id <> old.vacancy_id or new.candidate_id <> old.candidate_id then
    raise exception 'PROTECTED_FIELDS' using errcode = '42501';
  end if;

  v_is_member := exists (
    select 1 from public.company_members cm
    where cm.company_id = v_vacancy.company_id and cm.user_id = auth.uid()
  );

  if v_is_candidate then
    if new.status is distinct from old.status and not (new.status = 'withdrawn' and old.status not in ('hired', 'rejected', 'withdrawn')) then
      raise exception 'INVALID_STATUS_TRANSITION' using errcode = '42501';
    end if;
  elsif v_is_member then
    if new.cover_letter is distinct from old.cover_letter then
      raise exception 'PROTECTED_FIELDS' using errcode = '42501';
    end if;
    if new.status = 'withdrawn' or not public.application_transition_allowed(old.status, new.status) then
      raise exception 'INVALID_STATUS_TRANSITION' using errcode = '42501';
    end if;
  elsif not public.is_staff() then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger applications_before_write before insert or update on public.applications
  for each row execute function public.applications_before_write();

create or replace function public.applications_after_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_vacancy public.vacancies;
  v_member record;
  v_label text;
begin
  select * into v_vacancy from public.vacancies where id = new.vacancy_id;

  if tg_op = 'INSERT' then
    insert into public.application_status_history (application_id, from_status, to_status, changed_by)
    values (new.id, null, new.status, auth.uid());
    update public.vacancies set applications_count = applications_count + 1 where id = new.vacancy_id;
    for v_member in select cm.user_id from public.company_members cm where cm.company_id = v_vacancy.company_id loop
      perform public.create_notification(
        v_member.user_id, 'new_application', 'Yangi ariza: ' || v_vacancy.title,
        'Vakansiyangizga yangi nomzod ariza yubordi.',
        '/dashboard/vacancies/' || v_vacancy.id, jsonb_build_object('application_id', new.id)
      );
    end loop;
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into public.application_status_history (application_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());

    v_label := case new.status
      when 'viewed' then 'Arizangiz ko‘rib chiqildi'
      when 'shortlisted' then 'Siz saralangan nomzodlar ro‘yxatidasiz'
      when 'interview' then 'Sizni suhbatga taklif qilishdi'
      when 'offered' then 'Sizga ish taklif qilindi'
      when 'hired' then 'Tabriklaymiz! Siz ishga qabul qilindingiz'
      when 'rejected' then 'Afsuski, arizangiz rad etildi'
      else null end;

    if v_label is not null then
      perform public.create_notification(
        new.candidate_id,
        case when new.status = 'interview' then 'interview'::public.notification_type else 'application_status'::public.notification_type end,
        v_label, v_vacancy.title, '/dashboard/applications', jsonb_build_object('application_id', new.id)
      );
    end if;

    if new.status = 'withdrawn' then
      for v_member in select cm.user_id from public.company_members cm where cm.company_id = v_vacancy.company_id loop
        perform public.create_notification(v_member.user_id, 'application_status',
          'Nomzod arizasini qaytarib oldi', v_vacancy.title, '/dashboard/vacancies/' || v_vacancy.id,
          jsonb_build_object('application_id', new.id));
      end loop;
    end if;

    if new.status = 'hired' then
      update public.candidate_profiles set completed_jobs = completed_jobs + 1 where id = new.candidate_id;
      update public.companies set hires_count = hires_count + 1 where id = v_vacancy.company_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger applications_after_write after insert or update on public.applications
  for each row execute function public.applications_after_write();

-- Contact details are shared only with companies the candidate applied to.
create or replace function public.get_applicant_contact(p_application_id uuid)
returns table (phone text, email text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return query
  select p.phone, p.email
  from public.applications a
  join public.vacancies v on v.id = a.vacancy_id
  join public.profiles p on p.id = a.candidate_id
  where a.id = p_application_id
    and a.status <> 'withdrawn'
    and exists (select 1 from public.company_members cm where cm.company_id = v.company_id and cm.user_id = auth.uid());
end;
$$;

alter table public.applications enable row level security;
alter table public.application_status_history enable row level security;

create policy applications_read on public.applications for select
  using (
    candidate_id = auth.uid()
    or exists (select 1 from public.vacancies v where v.id = vacancy_id and public.is_company_member(v.company_id))
    or public.is_staff()
  );
create policy applications_insert on public.applications for insert
  with check (candidate_id = auth.uid() and public.has_role('job_seeker'));
create policy applications_update on public.applications for update
  using (
    candidate_id = auth.uid()
    or exists (select 1 from public.vacancies v where v.id = vacancy_id and public.is_company_member(v.company_id))
    or public.is_staff()
  );

create policy application_history_read on public.application_status_history for select
  using (exists (select 1 from public.applications a where a.id = application_id));
