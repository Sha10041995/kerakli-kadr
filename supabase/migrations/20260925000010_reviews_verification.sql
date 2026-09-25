-- Reputation (reviews) and verification.
-- Anti-fake-review: a review can only be written for a HIRED application, by
-- one of its two sides, once per side. Direction and reviewee are derived
-- server-side, never trusted from the client.

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  direction text not null check (direction in ('candidate_to_company', 'company_to_candidate')),
  reviewee_user_id uuid references public.profiles (id) on delete cascade,
  reviewee_company_id uuid references public.companies (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 2000),
  status public.review_status not null default 'published',
  created_at timestamptz not null default now(),
  unique (application_id, direction),
  check (num_nonnulls(reviewee_user_id, reviewee_company_id) = 1)
);

create index reviews_reviewee_user_idx on public.reviews (reviewee_user_id) where status = 'published';
create index reviews_reviewee_company_idx on public.reviews (reviewee_company_id) where status = 'published';

create or replace function public.reviews_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_app record;
  -- auth.uid() is null only for trusted backend inserts (RLS requires a user)
  v_reviewer uuid := coalesce(auth.uid(), new.reviewer_id);
begin
  select a.id, a.status, a.candidate_id, v.company_id into v_app
  from public.applications a join public.vacancies v on v.id = a.vacancy_id
  where a.id = new.application_id;

  if v_app.id is null or v_app.status <> 'hired' then
    raise exception 'REVIEW_NOT_ALLOWED' using errcode = '42501';
  end if;

  new.reviewer_id := v_reviewer;
  new.status := 'published';
  new.created_at := now();

  if v_app.candidate_id = v_reviewer then
    new.direction := 'candidate_to_company';
    new.reviewee_company_id := v_app.company_id;
    new.reviewee_user_id := null;
  elsif exists (select 1 from public.company_members cm where cm.company_id = v_app.company_id and cm.user_id = v_reviewer) then
    new.direction := 'company_to_candidate';
    new.reviewee_user_id := v_app.candidate_id;
    new.reviewee_company_id := null;
  else
    raise exception 'REVIEW_NOT_ALLOWED' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger reviews_before_insert before insert on public.reviews
  for each row execute function public.reviews_before_insert();

create or replace function public.reviews_refresh_aggregates()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.reviews := coalesce(new, old);
begin
  if r.reviewee_user_id is not null then
    update public.candidate_profiles c set
      rating_avg = coalesce((select round(avg(rating)::numeric, 2) from public.reviews
                             where reviewee_user_id = r.reviewee_user_id and status = 'published'), 0),
      rating_count = (select count(*) from public.reviews
                      where reviewee_user_id = r.reviewee_user_id and status = 'published')
    where c.id = r.reviewee_user_id;
  else
    update public.companies c set
      rating_avg = coalesce((select round(avg(rating)::numeric, 2) from public.reviews
                             where reviewee_company_id = r.reviewee_company_id and status = 'published'), 0),
      rating_count = (select count(*) from public.reviews
                      where reviewee_company_id = r.reviewee_company_id and status = 'published')
    where c.id = r.reviewee_company_id;
  end if;

  if tg_op = 'INSERT' then
    perform public.create_notification(
      coalesce(r.reviewee_user_id, (select owner_id from public.companies where id = r.reviewee_company_id)),
      'review', 'Sizga yangi baho qoldirildi', r.rating || ' / 5', null, jsonb_build_object('review_id', r.id));
  end if;
  return null;
end;
$$;

create trigger reviews_refresh_aggregates after insert or update or delete on public.reviews
  for each row execute function public.reviews_refresh_aggregates();

alter table public.reviews enable row level security;
create policy reviews_read on public.reviews for select
  using (status = 'published' or reviewer_id = auth.uid() or public.is_staff());
create policy reviews_insert on public.reviews for insert with check (auth.uid() is not null);
create policy reviews_staff_update on public.reviews for update using (public.is_staff()) with check (public.is_staff());
create policy reviews_admin_delete on public.reviews for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Verification requests (identity, certificate, company). Phone verification
-- comes from Supabase Auth (phone_confirmed_at) or admin approval.
-- ---------------------------------------------------------------------------
create table public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  company_id uuid references public.companies (id) on delete cascade,
  type public.verification_type not null,
  document_path text check (document_path is null or char_length(document_path) <= 500),
  certificate_id uuid references public.candidate_certificates (id) on delete cascade,
  note text check (note is null or char_length(note) <= 1000),
  status public.request_status not null default 'pending',
  admin_note text check (admin_note is null or char_length(admin_note) <= 1000),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (type <> 'company' or company_id is not null)
);

create index verification_requests_status_idx on public.verification_requests (status, created_at);
create unique index verification_requests_one_pending
  on public.verification_requests (user_id, type, coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where status = 'pending';

create or replace function public.verification_requests_guard()
returns trigger
language plpgsql
as $$
begin
  if public.is_backend_role() or public.is_staff() then
    if tg_op = 'UPDATE' and new.status is distinct from old.status then
      new.reviewed_by := auth.uid();
      new.reviewed_at := now();
    end if;
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.user_id := auth.uid();
    new.status := 'pending';
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.admin_note := null;
    if new.company_id is not null and not public.is_company_owner(new.company_id) then
      raise exception 'NOT_ALLOWED' using errcode = '42501';
    end if;
    if new.document_path is not null and split_part(new.document_path, '/', 1) <> auth.uid()::text then
      raise exception 'INVALID_DOCUMENT' using errcode = '42501';
    end if;
    return new;
  end if;
  raise exception 'NOT_ALLOWED' using errcode = '42501';
end;
$$;

create trigger verification_requests_guard before insert or update on public.verification_requests
  for each row execute function public.verification_requests_guard();

create or replace function public.verification_requests_apply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = old.status then
    return new;
  end if;
  if new.status = 'approved' then
    case new.type
      when 'phone' then update public.profiles set phone_verified = true where id = new.user_id;
      when 'identity' then update public.profiles set identity_verified = true where id = new.user_id;
      when 'certificate' then
        update public.profiles set certificate_verified = true where id = new.user_id;
        if new.certificate_id is not null then
          update public.candidate_certificates set is_verified = true where id = new.certificate_id;
        end if;
      when 'company' then update public.companies set verification_status = 'verified' where id = new.company_id;
    end case;
  elsif new.status = 'rejected' and new.type = 'company' then
    update public.companies set verification_status = 'rejected' where id = new.company_id;
  end if;

  perform public.create_notification(
    new.user_id, 'verification',
    case when new.status = 'approved' then 'Tasdiqlash soʻrovingiz qabul qilindi' else 'Tasdiqlash soʻrovingiz rad etildi' end,
    new.admin_note, '/dashboard', jsonb_build_object('request_id', new.id));
  return new;
end;
$$;

create trigger verification_requests_apply after update on public.verification_requests
  for each row execute function public.verification_requests_apply();

create or replace function public.verification_requests_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.type = 'company' then
    update public.companies set verification_status = 'pending'
    where id = new.company_id and verification_status <> 'verified';
  end if;
  return new;
end;
$$;

create trigger verification_requests_after_insert after insert on public.verification_requests
  for each row execute function public.verification_requests_after_insert();

-- Verification level 0..4 (mirrored in src/features/verification/levels.ts)
create or replace function public.verification_level(p_user_id uuid)
returns smallint
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (select 1 from public.companies c where c.owner_id = p_user_id and c.verification_status = 'verified') then 4
    when p.certificate_verified then 3
    when p.identity_verified then 2
    when p.phone_verified then 1
    else 0
  end::smallint
  from public.profiles p where p.id = p_user_id
$$;

alter table public.verification_requests enable row level security;
create policy verification_read on public.verification_requests for select
  using (user_id = auth.uid() or public.is_staff());
create policy verification_insert on public.verification_requests for insert
  with check (auth.uid() is not null);
create policy verification_staff_update on public.verification_requests for update
  using (public.is_staff()) with check (public.is_staff());
