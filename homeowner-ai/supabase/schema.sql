-- ============================================================
-- AI HOMEOWNER ASSISTANT — SUPABASE SCHEMA
-- Run this once in your Supabase project's SQL editor
-- (Project → SQL Editor → New query → paste → Run)
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- PROFILES  (1 row per auth user — plan/billing state lives here)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  plan text not null default 'free' check (plan in ('free', 'plus', 'pro')),
  plan_updated_at timestamptz default now(),
  insights_unlocked_this_month int not null default 3,
  stripe_customer_id text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create a profile row whenever someone signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- HOMES  (a user's home profile — supports more than one property)
-- ------------------------------------------------------------
create table if not exists public.homes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
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

alter table public.homes enable row level security;

create policy "Users manage their own homes"
  on public.homes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

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

alter table public.maintenance_tasks enable row level security;

create policy "Users manage tasks on their own homes"
  on public.maintenance_tasks for all
  using (exists (select 1 from public.homes h where h.id = home_id and h.user_id = auth.uid()))
  with check (exists (select 1 from public.homes h where h.id = home_id and h.user_id = auth.uid()));

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

alter table public.expenses enable row level security;

create policy "Users manage expenses on their own homes"
  on public.expenses for all
  using (exists (select 1 from public.homes h where h.id = home_id and h.user_id = auth.uid()))
  with check (exists (select 1 from public.homes h where h.id = home_id and h.user_id = auth.uid()));

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

alter table public.ai_insights enable row level security;

create policy "Users manage insights on their own homes"
  on public.ai_insights for all
  using (exists (select 1 from public.homes h where h.id = home_id and h.user_id = auth.uid()))
  with check (exists (select 1 from public.homes h where h.id = home_id and h.user_id = auth.uid()));

-- ------------------------------------------------------------
-- Helpful index
-- ------------------------------------------------------------
create index if not exists idx_homes_user on public.homes (user_id);
create index if not exists idx_tasks_home on public.maintenance_tasks (home_id);
create index if not exists idx_expenses_home on public.expenses (home_id);
create index if not exists idx_insights_home on public.ai_insights (home_id, month);
