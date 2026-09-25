-- Assertion helpers for SQL tests (local test database only).
create schema if not exists tests;
grant usage on schema tests to anon, authenticated, service_role;

create or replace function tests.create_user(
  p_id uuid, p_email text, p_role text default null, p_first text default 'Test', p_last text default 'User'
) returns uuid
language sql as $$
  insert into auth.users (id, email, raw_user_meta_data)
  values (p_id, p_email, jsonb_build_object('first_name', p_first, 'last_name', p_last, 'role', p_role))
  returning id
$$;

-- Switch the current transaction to an authenticated API user.
create or replace function tests.login(p_user uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end
$$;

create or replace function tests.login_anon() returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
end
$$;

create or replace function tests.assert_true(p_cond boolean, p_msg text) returns void
language plpgsql as $$
begin
  if p_cond is not true then
    raise exception 'ASSERTION FAILED: %', p_msg;
  end if;
end
$$;

create or replace function tests.assert_eq(p_actual anyelement, p_expected anyelement, p_msg text) returns void
language plpgsql as $$
begin
  if p_actual is distinct from p_expected then
    raise exception 'ASSERTION FAILED: % (expected %, got %)', p_msg, p_expected, p_actual;
  end if;
end
$$;

-- Runs p_sql and asserts it raises an error whose message contains p_expected.
create or replace function tests.assert_raises(p_sql text, p_expected text, p_msg text) returns void
language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if p_expected is null or sqlerrm ilike '%' || p_expected || '%' then
      return;
    end if;
    raise exception 'ASSERTION FAILED: % (expected error "%", got "%")', p_msg, p_expected, sqlerrm;
  end;
  raise exception 'ASSERTION FAILED: % (expected error "%", but statement succeeded)', p_msg, p_expected;
end
$$;

-- Runs p_sql and returns the number of affected/returned rows (RLS makes
-- forbidden UPDATE/DELETE silently affect 0 rows).
create or replace function tests.row_count(p_sql text) returns integer
language plpgsql as $$
declare
  v integer;
begin
  execute p_sql;
  get diagnostics v = row_count;
  return v;
end
$$;

grant execute on all functions in schema tests to anon, authenticated, service_role;
