-- ============================================================================
-- Odgers Org Chart — Supabase Schema
-- ============================================================================
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New Query)
-- or via the Supabase CLI: supabase db push
-- ============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================================
-- PEOPLE TABLE
-- ============================================================================
-- Stores the full Person objects as JSONB for maximum flexibility.
-- This avoids needing to alter the DB schema every time a new field is added
-- to the Person type in TypeScript. The entire people array is stored as
-- individual rows for efficient querying, but the JSONB approach means
-- the app can evolve its data model without migrations.
-- ============================================================================

create table if not exists people (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

-- Index for common queries
create index if not exists idx_people_practice on people ((data->>'practiceArea'));
create index if not exists idx_people_status on people ((data->>'status'));
create index if not exists idx_people_reports_to on people ((data->>'reportsTo'));

-- ============================================================================
-- RULES TABLE
-- ============================================================================
-- Business logic rules stored as JSONB rows.
-- ============================================================================

create table if not exists rules (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

-- ============================================================================
-- CUSTOM PRACTICES TABLE
-- ============================================================================
-- Tracks custom practice areas added by users.
-- ============================================================================

create table if not exists custom_practices (
  name text primary key,
  color text not null,
  created_at timestamptz default now()
);

-- ============================================================================
-- APP METADATA TABLE
-- ============================================================================
-- Stores version info and last sync timestamps.
-- ============================================================================

create table if not exists app_metadata (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

-- Insert default metadata
insert into app_metadata (key, value) values
  ('schema_version', '"1"'::jsonb),
  ('last_seed', '"never"'::jsonb)
on conflict (key) do nothing;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- All authenticated users can read and write all data.
-- This is appropriate for a small team app where everyone who has access
-- should be able to see and edit everything.
-- ============================================================================

alter table people enable row level security;
alter table rules enable row level security;
alter table custom_practices enable row level security;
alter table app_metadata enable row level security;

-- Policies: authenticated users can do everything
create policy "Authenticated users can read people"
  on people for select to authenticated using (true);

create policy "Authenticated users can insert people"
  on people for insert to authenticated with check (true);

create policy "Authenticated users can update people"
  on people for update to authenticated using (true) with check (true);

create policy "Authenticated users can delete people"
  on people for delete to authenticated using (true);

-- Rules policies
create policy "Authenticated users can read rules"
  on rules for select to authenticated using (true);

create policy "Authenticated users can insert rules"
  on rules for insert to authenticated with check (true);

create policy "Authenticated users can update rules"
  on rules for update to authenticated using (true) with check (true);

create policy "Authenticated users can delete rules"
  on rules for delete to authenticated using (true);

-- Custom practices policies
create policy "Authenticated users can read custom_practices"
  on custom_practices for select to authenticated using (true);

create policy "Authenticated users can insert custom_practices"
  on custom_practices for insert to authenticated with check (true);

create policy "Authenticated users can update custom_practices"
  on custom_practices for update to authenticated using (true) with check (true);

create policy "Authenticated users can delete custom_practices"
  on custom_practices for delete to authenticated using (true);

-- Metadata policies
create policy "Authenticated users can read app_metadata"
  on app_metadata for select to authenticated using (true);

create policy "Authenticated users can update app_metadata"
  on app_metadata for update to authenticated using (true) with check (true);

-- ============================================================================
-- REALTIME
-- ============================================================================
-- Enable realtime for all tables so changes sync across browsers instantly.
-- ============================================================================

alter publication supabase_realtime add table people;
alter publication supabase_realtime add table rules;
alter publication supabase_realtime add table custom_practices;

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================
-- Automatically update the updated_at timestamp on every write.
-- ============================================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger people_updated_at
  before update on people
  for each row execute function update_updated_at();

create trigger rules_updated_at
  before update on rules
  for each row execute function update_updated_at();
