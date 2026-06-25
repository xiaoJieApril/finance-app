-- Adds planning-first fields for the feature expansion roadmap.
-- These columns keep AI recommendations read-only while giving the UI enough
-- structured data for credit-card planning, goal pacing, and spending rules.

alter table public.accounts
  add column if not exists statement_day integer check (statement_day is null or (statement_day between 1 and 31)),
  add column if not exists payment_due_day integer check (payment_due_day is null or (payment_due_day between 1 and 31)),
  add column if not exists minimum_payment numeric default 0,
  add column if not exists outstanding_balance numeric default 0,
  add column if not exists interest_rate numeric default 0,
  add column if not exists credit_limit numeric default 0;

alter table public.savings_goals
  add column if not exists monthly_contribution numeric default 0;

create table if not exists public.spending_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category_id uuid references public.finance_categories(id) on delete set null,
  period text not null default 'month' check (period in ('day', 'week', 'month')),
  limit_amount numeric not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists spending_rules_user_id_idx on public.spending_rules(user_id);
create index if not exists spending_rules_category_id_idx on public.spending_rules(category_id);

alter table public.spending_rules enable row level security;

drop policy if exists "Users manage own spending rules" on public.spending_rules;
create policy "Users manage own spending rules"
  on public.spending_rules
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
