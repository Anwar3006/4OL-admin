-- =============================================================================
-- FacilityScout extension (Gap Analysis Part N).
--
-- Community facility discovery: app users submit unregistered facilities
-- (GPS + photos), field collectors verify, rewards are paid as mobile-data
-- bundles (N-D4). Decisions: N-D1 (new table — collector_submissions stays
-- untouched, its staff-data-entry lifecycle differs), N-D2 (SCT-{year}-{nnn}
-- references), N-D3 (match result set by admin; auto-detection deferred),
-- N-D5 (MNO API out of scope — Disburse records delivery_status only),
-- N-D6 (single-row config table), N-D7 (SLA stored + badge only, no cron).
-- Additive and re-runnable; access via service-role server routes guarded
-- by facilityscout.view / facilityscout.review.
-- =============================================================================

-- 1. App-user submissions (N1/N3/N4) ------------------------------------------------
create table if not exists public.facility_scout_submissions (
  id uuid primary key default gen_random_uuid(),
  submission_ref text unique,                     -- SCT-{year}-{sequence}
  submitted_by uuid not null
    references public.user_profiles (user_id) on delete cascade,
  facility_name text not null,
  facility_type text not null
    check (facility_type in ('hospital', 'pharmacy', 'clinic', 'lab', 'chps')),
  gps_location text,                              -- "lat,lng"
  photos text[] not null default '{}',
  region text,
  match_status text not null default 'new'
    check (match_status in ('new', 'duplicate')),
  matched_facility_id uuid references public.facility_profile (id),
  status text not null default 'pending'
    check (status in ('pending', 'field_review', 'registered', 'rewarded', 'rejected')),
  assigned_collector_id uuid references public.data_collectors (id),
  priority text not null default 'normal'
    check (priority in ('normal', 'high', 'urgent')),
  sla_due_at timestamptz,
  admin_notes text,
  reviewed_by uuid references public.user_profiles (user_id),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_scout_submissions_status
  on public.facility_scout_submissions (status, created_at desc);
create index if not exists idx_scout_submissions_user
  on public.facility_scout_submissions (submitted_by);
create index if not exists idx_scout_submissions_collector
  on public.facility_scout_submissions (assigned_collector_id);

-- SCT reference generation (N-D2): SCT-{year}-{sequence over the year}.
create or replace function public.assign_scout_submission_ref()
returns trigger
language plpgsql
as $$
declare
  v_year text := to_char(now(), 'YYYY');
  v_seq integer;
begin
  if new.submission_ref is null then
    select count(*) + 1 into v_seq
    from public.facility_scout_submissions
    where submission_ref like 'SCT-' || v_year || '-%';
    new.submission_ref := 'SCT-' || v_year || '-' || lpad(v_seq::text, 3, '0');
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_scout_submissions_ref on public.facility_scout_submissions;
create trigger trg_scout_submissions_ref
  before insert on public.facility_scout_submissions
  for each row execute function public.assign_scout_submission_ref();

-- 2. Data-bundle reward semantics (N5) ------------------------------------------------
alter table public.facility_scout_referrals
  add column if not exists submission_id uuid
    references public.facility_scout_submissions (id),
  add column if not exists reward_mb integer check (reward_mb >= 0),
  add column if not exists network text
    check (network in ('mtn', 'vodafone', 'airteltigo')),
  add column if not exists delivery_phone text,
  add column if not exists delivery_status text not null default 'pending'
    check (delivery_status in ('pending', 'sent', 'failed'));

create index if not exists idx_scout_referrals_submission
  on public.facility_scout_referrals (submission_id);

-- 3. Programme configuration (N-D6) ----------------------------------------------------
create table if not exists public.facility_scout_config (
  id integer primary key default 1 check (id = 1),   -- single row
  reward_hospital_mb integer not null default 1024,
  reward_pharmacy_mb integer not null default 500,
  reward_clinic_mb integer not null default 250,
  reward_lab_mb integer not null default 250,
  reward_chps_mb integer not null default 100,
  max_pending_per_user integer not null default 10,
  gps_match_radius_m integer not null default 50,
  photo_required boolean not null default true,
  duplicate_detection text not null default 'gps_name'
    check (duplicate_detection in ('gps_name', 'gps_only', 'manual')),
  collector_auto_assign boolean not null default false,
  reward_disbursement text not null default 'manual'
    check (reward_disbursement in ('auto', 'manual')),
  updated_by uuid references public.user_profiles (user_id),
  updated_at timestamptz not null default now()
);

insert into public.facility_scout_config (id)
values (1)
on conflict (id) do nothing;

-- 4. Leaderboard aggregation RPC (N7) ------------------------------------------------------
create or replace function public.get_facility_scout_leaderboard(
  p_limit integer default 20
)
returns table (
  user_id uuid,
  full_name text,
  region text,
  submissions bigint,
  registered bigint,
  duplicates bigint,
  data_earned_mb bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.submitted_by as user_id,
    trim(coalesce(up.first_name, '') || ' ' || coalesce(up.last_name, '')) as full_name,
    up.region,
    count(*) as submissions,
    count(*) filter (where s.status in ('registered', 'rewarded')) as registered,
    count(*) filter (where s.match_status = 'duplicate') as duplicates,
    coalesce(sum(
      case s.facility_type
        when 'hospital' then c.reward_hospital_mb
        when 'pharmacy' then c.reward_pharmacy_mb
        when 'clinic'   then c.reward_clinic_mb
        when 'lab'      then c.reward_lab_mb
        when 'chps'     then c.reward_chps_mb
        else 0
      end) filter (where s.status = 'rewarded'), 0) as data_earned_mb
  from public.facility_scout_submissions s
  join public.user_profiles up on up.user_id = s.submitted_by
  cross join public.facility_scout_config c
  group by s.submitted_by, up.first_name, up.last_name, up.region
  order by registered desc, submissions desc
  limit greatest(p_limit, 1);
$$;

-- 5. RLS: service-role-only surfaces --------------------------------------------------------
alter table public.facility_scout_submissions enable row level security;
alter table public.facility_scout_config enable row level security;
-- No policies: service-role server routes only (facilityscout.view/review).

revoke all on function public.get_facility_scout_leaderboard(integer)
  from public, anon, authenticated;
grant execute on function public.get_facility_scout_leaderboard(integer)
  to service_role;
