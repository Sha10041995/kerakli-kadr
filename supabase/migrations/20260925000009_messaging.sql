-- Internal chat between employers and candidates.
-- Phone numbers are never shared automatically; conversations can only be
-- started through start_conversation(), which enforces who may contact whom.

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles (id) on delete set null,
  vacancy_id uuid references public.vacancies (id) on delete set null,
  application_id uuid references public.applications (id) on delete set null,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz,
  is_blocked boolean not null default false,
  primary key (conversation_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  kind public.message_kind not null default 'text',
  body text check (body is null or char_length(body) <= 4000),
  attachment_path text check (attachment_path is null or char_length(attachment_path) <= 500),
  attachment_name text check (attachment_name is null or char_length(attachment_name) <= 200),
  attachment_mime text check (attachment_mime is null or char_length(attachment_mime) <= 100),
  ref_vacancy_id uuid references public.vacancies (id) on delete set null,
  ref_application_id uuid references public.applications (id) on delete set null,
  is_flagged boolean not null default false,
  flag_reason text,
  created_at timestamptz not null default now(),
  check (body is not null or attachment_path is not null)
);

create index conversation_participants_user_idx on public.conversation_participants (user_id);
create index messages_conversation_idx on public.messages (conversation_id, created_at desc);
create index messages_sender_recent_idx on public.messages (sender_id, created_at desc);
create index conversations_application_idx on public.conversations (application_id);

create or replace function public.is_conversation_participant(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id and cp.user_id = auth.uid()
  )
$$;

-- Start (or reuse) a conversation.
-- Rules:
--  * employer (company member) -> candidate with a public profile or who applied
--  * candidate -> members of a company they applied to (p_application_id required)
create or replace function public.start_conversation(
  p_other_user uuid,
  p_vacancy_id uuid default null,
  p_application_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_conv uuid;
  v_allowed boolean := false;
  v_recent integer;
begin
  if v_me is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;
  if p_other_user is null or p_other_user = v_me then
    raise exception 'INVALID_RECIPIENT' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.profiles where id = v_me and is_blocked) then
    raise exception 'ACCOUNT_BLOCKED' using errcode = '42501';
  end if;

  if p_application_id is not null then
    -- Either side of an application may talk to the other.
    select true into v_allowed
    from public.applications a
    join public.vacancies v on v.id = a.vacancy_id
    where a.id = p_application_id
      and (
        (a.candidate_id = v_me and exists (select 1 from public.company_members cm where cm.company_id = v.company_id and cm.user_id = p_other_user))
        or (a.candidate_id = p_other_user and exists (select 1 from public.company_members cm where cm.company_id = v.company_id and cm.user_id = v_me))
      );
    select a.vacancy_id into p_vacancy_id from public.applications a where a.id = p_application_id;
  else
    -- Employer reaching out to a public candidate profile.
    select true into v_allowed
    where exists (select 1 from public.company_members cm where cm.user_id = v_me)
      and exists (select 1 from public.candidate_profiles c where c.id = p_other_user and c.is_public);
  end if;

  if not coalesce(v_allowed, false) then
    raise exception 'CONVERSATION_NOT_ALLOWED' using errcode = '42501';
  end if;

  -- Reuse an existing thread between the two users for the same context.
  select c.id into v_conv
  from public.conversations c
  join public.conversation_participants a on a.conversation_id = c.id and a.user_id = v_me
  join public.conversation_participants b on b.conversation_id = c.id and b.user_id = p_other_user
  where c.application_id is not distinct from p_application_id
    and (p_application_id is not null or c.vacancy_id is not distinct from p_vacancy_id)
  limit 1;

  if v_conv is not null then
    return v_conv;
  end if;

  -- anti-spam: at most 30 new conversations per 24h per user
  select count(*) into v_recent from public.conversations
  where created_by = v_me and created_at > now() - interval '24 hours';
  if v_recent >= 30 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;

  insert into public.conversations (created_by, vacancy_id, application_id)
  values (v_me, p_vacancy_id, p_application_id)
  returning id into v_conv;

  insert into public.conversation_participants (conversation_id, user_id, last_read_at)
  values (v_conv, v_me, now()), (v_conv, p_other_user, null);

  return v_conv;
end;
$$;

-- Message integrity, rate limiting and basic content flagging.
create or replace function public.messages_before_insert()
returns trigger
language plpgsql
as $$
declare
  v_recent integer;
begin
  if public.is_backend_role() then
    return new;
  end if;
  new.sender_id := auth.uid();
  new.created_at := now();
  new.is_flagged := false;
  new.flag_reason := null;

  if exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = new.conversation_id and cp.user_id <> auth.uid() and cp.is_blocked
  ) then
    raise exception 'CONVERSATION_BLOCKED' using errcode = '42501';
  end if;

  select count(*) into v_recent from public.messages
  where sender_id = auth.uid() and created_at > now() - interval '1 minute';
  if v_recent >= 20 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;

  if new.attachment_path is not null
     and split_part(new.attachment_path, '/', 1) <> new.conversation_id::text then
    raise exception 'INVALID_ATTACHMENT' using errcode = '42501';
  end if;

  -- Suspicious links are allowed but flagged for moderation / UI warning.
  if new.body ~* '(https?://|www\.|t\.me/|bit\.ly|wa\.me/)' then
    new.is_flagged := true;
    new.flag_reason := 'link';
  end if;
  return new;
end;
$$;

create trigger messages_before_insert before insert on public.messages
  for each row execute function public.messages_before_insert();

create or replace function public.messages_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_participant record;
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  update public.conversation_participants set last_read_at = new.created_at
  where conversation_id = new.conversation_id and user_id = new.sender_id;

  for v_participant in
    select cp.user_id from public.conversation_participants cp
    where cp.conversation_id = new.conversation_id and cp.user_id <> new.sender_id
  loop
    -- one unread notification per conversation is enough
    if not exists (
      select 1 from public.notifications n
      where n.user_id = v_participant.user_id and n.type = 'new_message' and n.read_at is null
        and n.data ->> 'conversation_id' = new.conversation_id::text
    ) then
      perform public.create_notification(
        v_participant.user_id, 'new_message', 'Yangi xabar',
        left(coalesce(new.body, 'Fayl yuborildi'), 140),
        '/messages/' || new.conversation_id,
        jsonb_build_object('conversation_id', new.conversation_id)
      );
    end if;
  end loop;
  return new;
end;
$$;

create trigger messages_after_insert after insert on public.messages
  for each row execute function public.messages_after_insert();

create or replace function public.participants_guard()
returns trigger
language plpgsql
as $$
begin
  if not public.is_backend_role()
     and (new.conversation_id <> old.conversation_id or new.user_id <> old.user_id) then
    raise exception 'PROTECTED_FIELDS' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger participants_guard before update on public.conversation_participants
  for each row execute function public.participants_guard();

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

create policy conversations_read on public.conversations for select
  using (public.is_conversation_participant(id) or public.is_staff());

create policy participants_read on public.conversation_participants for select
  using (public.is_conversation_participant(conversation_id) or public.is_staff());
create policy participants_update_own on public.conversation_participants for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy messages_read on public.messages for select
  using (public.is_conversation_participant(conversation_id) or public.is_staff());
create policy messages_insert on public.messages for insert
  with check (sender_id = auth.uid() and public.is_conversation_participant(conversation_id));

-- Realtime delivery (Supabase)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;
