-- Support tickets (complaints) workflow and admin broadcast notifications.

create or replace function public.complaints_guard()
returns trigger
language plpgsql
as $$
declare
  v_recent integer;
begin
  if public.is_backend_role() or public.is_staff() then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  new.user_id := auth.uid();
  new.status := 'open';
  new.admin_reply := null;
  select count(*) into v_recent from public.complaints
  where user_id = auth.uid() and created_at > now() - interval '24 hours';
  if v_recent >= 5 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger complaints_guard before insert or update on public.complaints
  for each row execute function public.complaints_guard();

create or replace function public.complaints_notify_reply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.admin_reply is not null and new.admin_reply is distinct from old.admin_reply then
    perform public.create_notification(new.user_id, 'system', 'Murojaatingizga javob berildi', left(new.admin_reply, 200),
      '/support', jsonb_build_object('complaint_id', new.id));
  end if;
  return new;
end;
$$;

create trigger complaints_notify_reply after update on public.complaints
  for each row execute function public.complaints_notify_reply();

-- Admin broadcast (system notification) to all users or one audience.
create or replace function public.broadcast_notification(
  p_title text, p_body text default null, p_link text default null, p_audience text default 'all'
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  -- caller check via JWT user (current_user is the owner inside SECURITY DEFINER)
  if not exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('admin', 'super_admin')) then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  if p_audience not in ('all', 'job_seeker', 'employer') then
    raise exception 'INVALID_AUDIENCE' using errcode = 'P0001';
  end if;
  if char_length(coalesce(p_title, '')) < 3 or (p_link is not null and p_link !~ '^/') then
    raise exception 'INVALID_INPUT' using errcode = '23514';
  end if;

  insert into public.notifications (user_id, type, title, body, link, data)
  select p.id, 'system', left(p_title, 200), left(p_body, 1000), p_link, jsonb_build_object('broadcast', true)
  from public.profiles p
  where not p.is_blocked
    and (p_audience = 'all' or exists (
      select 1 from public.user_roles ur where ur.user_id = p.id and ur.role::text = p_audience));
  get diagnostics v_count = row_count;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, data)
  values (auth.uid(), 'broadcast', 'notifications', null,
          jsonb_build_object('title', left(p_title, 200), 'audience', p_audience, 'recipients', v_count));
  return v_count;
end;
$$;

revoke execute on function public.broadcast_notification(text, text, text, text) from public, anon;
