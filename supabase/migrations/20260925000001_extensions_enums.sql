-- KADR TOP UZ — extensions, enum types and shared helpers.
-- Distance maths is implemented in plain SQL (haversine) so the schema runs on
-- any PostgreSQL; PostGIS can replace geo_distance_km later without API changes.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.app_role as enum (
  'job_seeker', 'employer', 'company', 'admin', 'moderator', 'super_admin',
  'partner', 'recruiter'
);

create type public.employment_type as enum (
  'full_time', 'part_time', 'temporary', 'freelance', 'daily', 'hourly',
  'seasonal', 'internship', 'remote'
);

create type public.salary_type as enum ('monthly', 'daily', 'hourly', 'per_task', 'negotiable');

create type public.work_schedule as enum ('full_day', 'shift', 'flexible', 'night', 'weekends');

create type public.availability_status as enum (
  'immediately', 'within_week', 'within_month', 'open_to_offers', 'not_available'
);

create type public.education_level as enum (
  'none', 'secondary', 'vocational', 'bachelor', 'master', 'doctorate'
);

create type public.vacancy_status as enum (
  'draft', 'pending_review', 'active', 'rejected', 'expired', 'closed'
);

create type public.vacancy_tier as enum ('standard', 'premium');

create type public.application_status as enum (
  'applied', 'viewed', 'shortlisted', 'interview', 'offered', 'hired', 'rejected', 'withdrawn'
);

create type public.company_type as enum (
  'individual', 'sole_proprietor', 'llc', 'farm', 'state', 'ngo', 'other'
);

create type public.verification_status as enum ('unverified', 'pending', 'verified', 'rejected');

create type public.verification_type as enum ('phone', 'identity', 'certificate', 'company');

create type public.request_status as enum ('pending', 'approved', 'rejected');

create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded', 'cancelled');

create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'cancelled', 'expired');

create type public.plan_audience as enum ('employer', 'candidate');

create type public.report_reason as enum (
  'scam', 'spam', 'fake_job', 'illegal_job', 'misleading_salary', 'inappropriate', 'other'
);

create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

create type public.report_target as enum ('vacancy', 'user', 'company', 'message', 'review');

create type public.notification_type as enum (
  'new_application', 'application_status', 'new_matching_job', 'new_matching_candidate',
  'new_message', 'interview', 'job_expiration', 'payment', 'subscription', 'verification',
  'review', 'system'
);

create type public.district_kind as enum ('district', 'city');

create type public.settlement_kind as enum ('city', 'town', 'village');

create type public.message_kind as enum ('text', 'image', 'document', 'system');

create type public.review_status as enum ('published', 'hidden');

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Great-circle distance in kilometres (haversine).
create or replace function public.geo_distance_km(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
)
returns double precision
language sql
immutable
parallel safe
as $$
  select case
    when lat1 is null or lng1 is null or lat2 is null or lng2 is null then null
    else 6371.0088 * 2 * asin(least(1, sqrt(
      power(sin(radians(lat2 - lat1) / 2), 2) +
      cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
    )))
  end
$$;

-- True when the current database role is a trusted backend role
-- (migrations, service role key, Supabase internals).
create or replace function public.is_backend_role()
returns boolean
language sql
stable
as $$
  select current_user in ('postgres', 'service_role', 'supabase_admin')
$$;
