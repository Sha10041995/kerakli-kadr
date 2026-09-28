-- Reputation metrics: candidate profile views, employer and candidate response rates.

-- Separate counter table so views never touch candidate_profiles (no updated_at churn).
create table public.candidate_profile_stats (
  candidate_id uuid primary key references public.candidate_profiles (id) on delete cascade,
  views_count integer not null default 0,
  last_viewed_at timestamptz
);

alter table public.candidate_profile_stats enable row level security;
create policy candidate_profile_stats_read on public.candidate_profile_stats for select
  using (candidate_id = auth.uid() or public.is_staff());

create or replace function public.increment_candidate_views(p_candidate_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.candidate_profile_stats as s (candidate_id, views_count, last_viewed_at)
  select c.id, 1, now() from public.candidate_profiles c
  where c.id = p_candidate_id and c.is_public and c.id is distinct from auth.uid()
  on conflict (candidate_id) do update set views_count = s.views_count + 1, last_viewed_at = now()
$$;

-- Share of applications the employer reacted to (anything beyond "applied").
-- Applications younger than 48h that are still untouched are not counted yet.
create or replace function public.company_response_stats(p_company_id uuid)
returns table (response_rate integer, responded integer, total integer)
language sql
stable
security definer
set search_path = ''
as $$
  with a as (
    select a.status, a.created_at
    from public.applications a
    join public.vacancies v on v.id = a.vacancy_id
    where v.company_id = p_company_id and a.status <> 'withdrawn'
      and not (a.status = 'applied' and a.created_at > now() - interval '48 hours')
  )
  select case when count(*) = 0 then null else round(100.0 * count(*) filter (where status <> 'applied') / count(*))::integer end,
         (count(*) filter (where status <> 'applied'))::integer,
         count(*)::integer
  from a
$$;

-- Share of employer-initiated conversations the candidate replied to.
create or replace function public.candidate_response_stats(p_candidate_id uuid)
returns table (response_rate integer, replied integer, total integer)
language sql
stable
security definer
set search_path = ''
as $$
  with c as (
    select cv.id,
           exists (select 1 from public.messages m where m.conversation_id = cv.id and m.sender_id = p_candidate_id) as replied
    from public.conversations cv
    join public.conversation_participants p on p.conversation_id = cv.id and p.user_id = p_candidate_id
    where cv.created_by is distinct from p_candidate_id
      and exists (select 1 from public.messages m where m.conversation_id = cv.id and m.sender_id <> p_candidate_id)
  )
  select case when count(*) = 0 then null else round(100.0 * count(*) filter (where replied) / count(*))::integer end,
         (count(*) filter (where replied))::integer,
         count(*)::integer
  from c
$$;

create or replace function public.engagement_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('admin', 'super_admin', 'moderator')) then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'vacancy_views', (select coalesce(sum(views_count), 0) from public.vacancies),
    'profile_views', (select coalesce(sum(views_count), 0) from public.candidate_profile_stats),
    'applications_per_vacancy', (select round(avg(applications_count)::numeric, 1) from public.vacancies where status = 'active'),
    'view_to_apply_rate', (select case when sum(views_count) = 0 then 0
                                  else round(100.0 * sum(applications_count) / sum(views_count), 1) end from public.vacancies),
    'hire_rate', (select case when count(*) = 0 then 0 else round(100.0 * count(*) filter (where status = 'hired') / count(*), 1) end
                  from public.applications)
  );
end;
$$;

grant execute on function public.company_response_stats(uuid) to anon, authenticated;
grant execute on function public.candidate_response_stats(uuid) to anon, authenticated;
