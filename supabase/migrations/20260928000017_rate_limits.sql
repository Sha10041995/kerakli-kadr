-- Shared fixed-window rate limiter for multi-instance deployments.
-- Keys are SHA-256 hashes computed by the app (no raw IPs / emails stored).
-- UNLOGGED: counters are disposable, so we skip WAL for speed.

create unlogged table public.rate_limits (
  key text primary key check (char_length(key) <= 128),
  hits integer not null default 1,
  reset_at timestamptz not null
);

create index rate_limits_reset_idx on public.rate_limits (reset_at);

alter table public.rate_limits enable row level security;
-- no policies: only the backend (service role / definer functions) touches it

create or replace function public.rate_limit_hit(p_key text, p_window_ms integer)
returns table (hits integer, reset_at timestamptz)
language sql
security definer
set search_path = ''
as $$
  insert into public.rate_limits as rl (key, hits, reset_at)
  values (p_key, 1, now() + make_interval(secs => greatest(p_window_ms, 1000) / 1000.0))
  on conflict (key) do update set
    hits = case when rl.reset_at <= now() then 1 else rl.hits + 1 end,
    reset_at = case when rl.reset_at <= now() then excluded.reset_at else rl.reset_at end
  returning rl.hits, rl.reset_at
$$;

create or replace function public.rate_limits_cleanup()
returns integer
language sql
security definer
set search_path = ''
as $$
  with d as (delete from public.rate_limits where reset_at < now() - interval '1 hour' returning 1)
  select count(*)::integer from d
$$;

revoke execute on function public.rate_limit_hit(text, integer) from public, anon, authenticated;
revoke execute on function public.rate_limits_cleanup() from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer) to service_role;
grant execute on function public.rate_limits_cleanup() to service_role;
