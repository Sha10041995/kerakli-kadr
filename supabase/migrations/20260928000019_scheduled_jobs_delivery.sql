-- Scheduled maintenance jobs, expiry reminders and external notification delivery
-- (email / Telegram) preferences.

alter table public.vacancies add column expiry_reminder_sent_at timestamptz;
alter table public.subscriptions add column reminder_sent_at timestamptz;

alter table public.profiles
  add column notify_email boolean not null default true,
  add column notify_telegram boolean not null default true,
  add column telegram_chat_id bigint unique;

comment on column public.profiles.telegram_chat_id is 'Set only by the Telegram bot webhook after a verified /start link.';

-- telegram_chat_id is backend-only (prevents routing notifications to someone else's chat)
create or replace function public.profiles_telegram_guard()
returns trigger
language plpgsql
as $$
begin
  if not public.is_backend_role() and new.telegram_chat_id is distinct from old.telegram_chat_id
     and new.telegram_chat_id is not null then
    raise exception 'PROTECTED_FIELDS' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_telegram_guard before update of telegram_chat_id on public.profiles
  for each row execute function public.profiles_telegram_guard();

-- One-time deep-link tokens for connecting a Telegram chat.
create table public.telegram_link_tokens (
  token text primary key check (token ~ '^[A-Za-z0-9_-]{16,64}$'),
  user_id uuid not null references public.profiles (id) on delete cascade,
  expires_at timestamptz not null default now() + interval '15 minutes',
  created_at timestamptz not null default now()
);

alter table public.telegram_link_tokens enable row level security;
create policy telegram_tokens_own_insert on public.telegram_link_tokens for insert
  with check (user_id = auth.uid());
create policy telegram_tokens_own_read on public.telegram_link_tokens for select
  using (user_id = auth.uid());

-- Called by the bot webhook (service role): consumes the token, links the chat.
create or replace function public.link_telegram_chat(p_token text, p_chat_id bigint)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  delete from public.telegram_link_tokens
  where token = p_token and expires_at > now()
  returning user_id into v_user;
  if v_user is null then
    return null;
  end if;
  update public.profiles set telegram_chat_id = null where telegram_chat_id = p_chat_id and id <> v_user;
  update public.profiles set telegram_chat_id = p_chat_id, notify_telegram = true where id = v_user;
  return v_user;
end;
$$;

revoke execute on function public.link_telegram_chat(text, bigint) from public, anon, authenticated;
grant execute on function public.link_telegram_chat(text, bigint) to service_role;

-- ---------------------------------------------------------------------------
-- Scheduled jobs (run hourly by /api/cron or pg_cron)
-- ---------------------------------------------------------------------------
create or replace function public.run_scheduled_jobs()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v record;
  v_member record;
  v_reminded integer := 0;
  v_expired integer := 0;
  v_subs_reminded integer := 0;
  v_subs_expired integer := 0;
  v_unfeatured integer := 0;
  v_rate integer := 0;
begin
  -- 1. vacancies expiring within 3 days → one reminder
  for v in
    update public.vacancies set expiry_reminder_sent_at = now()
    where status = 'active' and expiry_reminder_sent_at is null
      and expires_at between now() and now() + interval '3 days'
    returning id, title, company_id, expires_at
  loop
    v_reminded := v_reminded + 1;
    for v_member in select user_id from public.company_members where company_id = v.company_id loop
      perform public.create_notification(v_member.user_id, 'job_expiration', 'Vakansiya muddati tugamoqda: ' || v.title,
        'Muddat: ' || to_char(v.expires_at at time zone 'Asia/Tashkent', 'DD.MM.YYYY') || '. Uzaytirish uchun qayta eʼlon qiling.',
        '/dashboard/vacancies/' || v.id, jsonb_build_object('vacancy_id', v.id));
    end loop;
  end loop;

  -- 2. expire vacancies (deadline or 30-day period) → notify
  for v in
    update public.vacancies set status = 'expired'
    where status = 'active'
      and (expires_at < now() or (application_deadline is not null and application_deadline < current_date))
    returning id, title, company_id
  loop
    v_expired := v_expired + 1;
    for v_member in select user_id from public.company_members where company_id = v.company_id loop
      perform public.create_notification(v_member.user_id, 'job_expiration', 'Vakansiya muddati tugadi: ' || v.title,
        'Vakansiya qidiruvdan olindi. Kerak boʻlsa qayta eʼlon qiling.', '/dashboard/vacancies/' || v.id,
        jsonb_build_object('vacancy_id', v.id));
    end loop;
  end loop;

  -- 3. subscriptions: reminder 3 days before, then expire
  for v in
    update public.subscriptions s set reminder_sent_at = now()
    from public.subscription_plans p
    where p.id = s.plan_id and s.status = 'active' and s.reminder_sent_at is null
      and s.current_period_end between now() and now() + interval '3 days'
    returning s.id, s.user_id, p.name_uz, s.current_period_end
  loop
    v_subs_reminded := v_subs_reminded + 1;
    perform public.create_notification(v.user_id, 'subscription', v.name_uz || ' tarifi muddati tugamoqda',
      to_char(v.current_period_end at time zone 'Asia/Tashkent', 'DD.MM.YYYY') || ' gacha amal qiladi.', '/dashboard/billing',
      jsonb_build_object('subscription_id', v.id));
  end loop;

  for v in
    update public.subscriptions s set status = 'expired'
    from public.subscription_plans p
    where p.id = s.plan_id and s.status = 'active' and s.current_period_end < now()
    returning s.id, s.user_id, p.name_uz
  loop
    v_subs_expired := v_subs_expired + 1;
    perform public.create_notification(v.user_id, 'subscription', v.name_uz || ' tarifi muddati tugadi',
      'Bepul tarifga oʻtdingiz. Imkoniyatlarni qaytarish uchun tarifni yangilang.', '/dashboard/billing',
      jsonb_build_object('subscription_id', v.id));
  end loop;

  -- 4. paid placements that ended
  update public.companies set is_featured = false
  where is_featured and featured_until is not null and featured_until < now();
  get diagnostics v_unfeatured = row_count;
  update public.vacancies set is_featured = false, vacancy_tier = 'standard'
  where (is_featured or vacancy_tier = 'premium') and (promoted_until is null or promoted_until < now()) and not is_demo;

  -- 5. housekeeping
  v_rate := public.rate_limits_cleanup();
  delete from public.telegram_link_tokens where expires_at < now();

  return jsonb_build_object(
    'vacancy_reminders', v_reminded, 'vacancies_expired', v_expired,
    'subscription_reminders', v_subs_reminded, 'subscriptions_expired', v_subs_expired,
    'companies_unfeatured', v_unfeatured, 'rate_limit_rows_cleaned', v_rate);
end;
$$;

revoke execute on function public.run_scheduled_jobs() from public, anon, authenticated;
grant execute on function public.run_scheduled_jobs() to service_role;

-- Undelivered notifications for the external dispatcher (service role only).
create or replace function public.pending_notification_deliveries(p_limit integer default 200)
returns table (
  id uuid, user_id uuid, title text, body text, link text,
  email text, notify_email boolean, telegram_chat_id bigint, notify_telegram boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select n.id, n.user_id, n.title, n.body, n.link, p.email, p.notify_email, p.telegram_chat_id, p.notify_telegram
  from public.notifications n
  join public.profiles p on p.id = n.user_id
  where n.emailed_at is null and n.read_at is null and n.created_at > now() - interval '2 days'
    and not p.is_blocked and not p.is_demo
  order by n.created_at
  limit least(greatest(coalesce(p_limit, 200), 1), 1000)
$$;

create or replace function public.mark_notifications_delivered(p_ids uuid[])
returns integer
language sql
security definer
set search_path = ''
as $$
  with u as (update public.notifications set emailed_at = now() where id = any (p_ids) and emailed_at is null returning 1)
  select count(*)::integer from u
$$;

revoke execute on function public.pending_notification_deliveries(integer) from public, anon, authenticated;
revoke execute on function public.mark_notifications_delivered(uuid[]) from public, anon, authenticated;
grant execute on function public.pending_notification_deliveries(integer) to service_role;
grant execute on function public.mark_notifications_delivered(uuid[]) to service_role;
