-- ============================================================
-- Blood Donor Matching & Emergency Response — Database Schema
-- Run this in Supabase SQL Editor (Project → SQL Editor → New Query)
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- USERS / PROFILES
-- Supabase Auth handles login (auth.users). This table extends it.
-- ------------------------------------------------------------
create type user_role as enum ('donor', 'hospital', 'admin');
create type blood_type as enum ('A+','A-','B+','B-','AB+','AB-','O+','O-');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'donor',
  full_name text not null,
  phone text,
  email text not null,
  -- Donor-specific fields
  blood_group blood_type,
  last_donation_date date,
  is_available boolean default true,
  weight_kg numeric(5,2),
  date_of_birth date,
  -- Hospital-specific fields
  hospital_name text,
  license_number text,
  -- Shared location fields (lat/lng for distance calc)
  latitude double precision,
  longitude double precision,
  address text,
  city text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_profiles_role on profiles(role);
create index idx_profiles_blood_group on profiles(blood_group);
create index idx_profiles_availability on profiles(is_available) where is_available = true;
create index idx_profiles_location on profiles(latitude, longitude);

-- ------------------------------------------------------------
-- EMERGENCY BLOOD REQUESTS
-- ------------------------------------------------------------
create type urgency_level as enum ('critical', 'high', 'medium', 'low');
create type request_status as enum ('open', 'matched', 'fulfilled', 'cancelled', 'expired');

create table blood_requests (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references profiles(id) on delete cascade,
  blood_group_needed blood_type not null,
  units_needed integer not null check (units_needed > 0),
  urgency urgency_level not null default 'medium',
  status request_status not null default 'open',
  patient_condition text,
  latitude double precision not null,
  longitude double precision not null,
  hospital_address text,
  notes text,
  needed_by timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_requests_status on blood_requests(status);
create index idx_requests_blood_group on blood_requests(blood_group_needed);
create index idx_requests_urgency on blood_requests(urgency);
create index idx_requests_hospital on blood_requests(hospital_id);
create index idx_requests_created on blood_requests(created_at desc);

-- ------------------------------------------------------------
-- DONOR RESPONSES (a donor accepting/declining a matched request)
-- ------------------------------------------------------------
create type response_status as enum ('pending', 'accepted', 'declined', 'completed', 'no_show');

create table donor_responses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references blood_requests(id) on delete cascade,
  donor_id uuid not null references profiles(id) on delete cascade,
  status response_status not null default 'pending',
  ai_match_score numeric(5,2),
  ai_match_reasoning jsonb,
  responded_at timestamptz,
  created_at timestamptz default now(),
  unique(request_id, donor_id)
);

create index idx_responses_request on donor_responses(request_id);
create index idx_responses_donor on donor_responses(donor_id);
create index idx_responses_status on donor_responses(status);

-- ------------------------------------------------------------
-- DONATION HISTORY (feeds "response history" into AI ranking)
-- ------------------------------------------------------------
create table donation_history (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid not null references profiles(id) on delete cascade,
  request_id uuid references blood_requests(id) on delete set null,
  donation_date date not null,
  units_donated integer default 1,
  created_at timestamptz default now()
);

create index idx_history_donor on donation_history(donor_id);

-- ------------------------------------------------------------
-- updated_at trigger helper
-- ------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

create trigger trg_requests_updated_at before update on blood_requests
  for each row execute function set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table blood_requests enable row level security;
alter table donor_responses enable row level security;
alter table donation_history enable row level security;

-- Profiles: users can read all profiles (needed for matching UI),
-- but only edit their own.
create policy "Profiles are viewable by authenticated users"
  on profiles for select
  using (auth.role() = 'authenticated');

create policy "Users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- Blood requests: any authenticated user can view (donors need to see them).
-- Only the owning hospital can create/update their own requests.
create policy "Requests are viewable by authenticated users"
  on blood_requests for select
  using (auth.role() = 'authenticated');

create policy "Hospitals can create their own requests"
  on blood_requests for insert
  with check (auth.uid() = hospital_id);

create policy "Hospitals can update their own requests"
  on blood_requests for update
  using (auth.uid() = hospital_id);

-- Donor responses: donor sees their own; hospital sees responses to their requests.
create policy "Donors view their own responses"
  on donor_responses for select
  using (
    auth.uid() = donor_id
    or auth.uid() in (select hospital_id from blood_requests where id = request_id)
  );

create policy "Donors can insert their own response"
  on donor_responses for insert
  with check (auth.uid() = donor_id);

create policy "Donors can update their own response"
  on donor_responses for update
  using (auth.uid() = donor_id);

-- Donation history: donor sees their own; hospitals can insert on completion.
create policy "Donors view their own donation history"
  on donation_history for select
  using (auth.uid() = donor_id);

create policy "System can insert donation history"
  on donation_history for insert
  with check (auth.role() = 'authenticated');

-- ============================================================
-- SEED DATA (sample donors + hospitals for demo)
-- NOTE: Run this only in a fresh dev project. Auth users must exist
-- first (see backend/seed.js which creates auth users + profiles together).
-- This file alone documents the shape of seed data.
-- ============================================================
-- See backend/seed.js for actual runnable seed script (creates auth users too).
