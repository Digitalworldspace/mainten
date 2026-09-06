-- ============================================================
-- AI HOMEOWNER ASSISTANT — SUPABASE SCHEMA (Table Editor / SQL only)
-- No Supabase Auth is used anywhere in this project. Accounts, plans,
-- and sessions are all just rows in plain tables, managed the same way
-- you'd manage any other table — via the SQL editor or Table Editor UI.
-- Run this once: Project → SQL Editor → New query → paste → Run.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- USERS  (our own account table — replaces Supabase Auth entirely)
-- Passwords are stored as a salted SHA-256 hash, computed in the
-- browser before it's ever sent to Supabase (see js/db.js). This is
-- fine for an MVP/demo but is NOT the same level of security as a
-- real auth system — see the security note at the bottom of this file.
-- ------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  salt text not null,
  full_name text,
  plan text not null default 'free' check (plan in ('free', 'plus', 'pro')),
  plan_updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- HOMES  (a user's home profile — supports more than one property)
-- ------------------------------------------------------------
create table if not exists public.homes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  nickname text default 'My Home',
  location text,
  home_value numeric,
  year_built int,
  sqft numeric,
  mortgage_monthly numeric default 0,
  insurance_monthly numeric default 0,
  insurance_renewal_date date,
  property_tax_annual numeric default 0,
  property_tax_due_date date,
  utilities_monthly numeric default 0,
  hoa_monthly numeric default 0,
  last_hvac_service date,
  last_gutter_cleaning date,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- MAINTENANCE TASKS
-- ------------------------------------------------------------
create table if not exists public.maintenance_tasks (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes (id) on delete cascade,
  title text not null,
  category text default 'general',
  status text not null default 'pending' check (status in ('pending', 'done', 'skipped')),
  due_date date,
  recurring_interval_months int,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- EXPENSES  (actuals the homeowner logs, for cost tracking)
-- ------------------------------------------------------------
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes (id) on delete cascade,
  category text not null,
  amount numeric not null,
  expense_date date not null default current_date,
  note text,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- AI INSIGHTS  (this month's generated action plan / recommendations)
-- ------------------------------------------------------------
create table if not exists public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes (id) on delete cascade,
  month date not null default date_trunc('month', current_date),
  sort_order int not null default 0,
  title text not null,
  description text,
  category text default 'general',
  potential_savings numeric,
  priority text default 'medium' check (priority in ('low', 'medium', 'high')),
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- Helpful indexes
-- ------------------------------------------------------------
create index if not exists idx_users_email on public.users (email);
create index if not exists idx_homes_user on public.homes (user_id);
create index if not exists idx_tasks_home on public.maintenance_tasks (home_id);
create index if not exists idx_expenses_home on public.expenses (home_id);
create index if not exists idx_insights_home on public.ai_insights (home_id, month);

-- ============================================================
-- SECURITY NOTE — please read
-- ============================================================
-- Row Level Security is intentionally left OFF here. Supabase Auth
-- normally provides auth.uid() for RLS policies to check against, but
-- since this project doesn't use Supabase Auth, there's no server-
-- verified identity to check — the browser just sends its anon key,
-- and every user's app currently uses the SAME anon key.
--
-- Practically: with the public anon key, anyone who inspects your
-- frontend's network requests could query these tables directly and
-- see other users' rows. That's an acceptable tradeoff for a demo/MVP
-- you're showing to yourself or a few trusted testers, but NOT for a
-- product with real users and real data.
--
-- Before you launch for real, do ONE of:
--   A) Turn Supabase Auth back on and re-add RLS policies keyed off
--      auth.uid() (this is the standard, well-supported path), OR
--   B) Keep this custom `users` table, but move ALL writes/reads
--      behind a Supabase Edge Function (or any small server) that
--      uses the service_role key and checks a session token yourself
--      — never let the browser talk to these tables with the anon
--      key directly once real user data is involved.
-- ============================================================
