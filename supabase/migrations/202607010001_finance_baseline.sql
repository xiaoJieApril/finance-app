create extension if not exists "pgcrypto";

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('cash', 'bank', 'ewallet', 'credit_card')),
  currency text not null default 'MYR',
  initial_balance numeric not null default 0,
  current_balance numeric,
  icon text,
  is_archived boolean not null default false,
  statement_day integer check (statement_day is null or (statement_day between 1 and 31)),
  payment_due_day integer check (payment_due_day is null or (payment_due_day between 1 and 31)),
  minimum_payment numeric default 0,
  outstanding_balance numeric default 0,
  interest_rate numeric default 0,
  credit_limit numeric default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.finance_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  icon text not null default 'wallet',
  type text not null check (type in ('income', 'expense')),
  budget_limit numeric default 0,
  legacy_category_id bigint,
  created_at timestamptz not null default now()
);

create table if not exists public.transaction_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  type text not null check (type in ('income', 'expense', 'transfer')),
  account_id uuid references public.accounts(id) on delete set null,
  to_account_id uuid references public.accounts(id) on delete set null,
  category_id uuid references public.finance_categories(id) on delete set null,
  currency text not null default 'MYR',
  amount numeric not null,
  base_currency text not null default 'MYR',
  base_currency_amount numeric,
  exchange_rate numeric,
  note text not null default '',
  date timestamptz not null,
  is_savings boolean not null default false,
  legacy_transaction_id bigint,
  created_at timestamptz not null default now()
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  category_id uuid references public.finance_categories(id) on delete cascade,
  monthly_limit numeric not null default 0,
  alert_threshold numeric not null default 0.8,
  created_at timestamptz not null default now(),
  unique(user_id, category_id)
);

create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric not null default 0,
  current_amount numeric not null default 0,
  currency text not null default 'MYR',
  target_date date,
  monthly_contribution numeric default 0,
  goal_type text not null default 'custom' check (goal_type in ('emergency', 'travel', 'car', 'debt', 'custom')),
  is_primary boolean not null default false,
  icon text,
  created_at timestamptz not null default now()
);

create table if not exists public.recurring_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  amount numeric not null default 0,
  currency text not null default 'MYR',
  category_id uuid references public.finance_categories(id) on delete set null,
  account_id uuid references public.accounts(id) on delete set null,
  next_due_date date not null,
  frequency text not null check (frequency in ('weekly', 'monthly', 'yearly')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.exchange_rates (
  id uuid primary key default gen_random_uuid(),
  base_currency text not null,
  quote_currency text not null,
  rate numeric not null,
  rate_date date not null,
  provider text not null default 'frankfurter',
  created_at timestamptz not null default now(),
  unique(base_currency, quote_currency, rate_date, provider)
);

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

create table if not exists public.saving_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null default 'rate' check (mode in ('rate', 'amount')),
  target_rate numeric not null default 0.2,
  target_amount numeric not null default 300,
  buffer_amount numeric not null default 300,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

alter table public.accounts enable row level security;
alter table public.finance_categories enable row level security;
alter table public.transaction_entries enable row level security;
alter table public.budgets enable row level security;
alter table public.savings_goals enable row level security;
alter table public.recurring_items enable row level security;
alter table public.exchange_rates enable row level security;
alter table public.spending_rules enable row level security;
alter table public.saving_plans enable row level security;

drop policy if exists "accounts own rows" on public.accounts;
create policy "accounts own rows" on public.accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "finance_categories own rows" on public.finance_categories;
create policy "finance_categories own rows" on public.finance_categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "transaction_entries own rows" on public.transaction_entries;
create policy "transaction_entries own rows" on public.transaction_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "budgets own rows" on public.budgets;
create policy "budgets own rows" on public.budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "savings_goals own rows" on public.savings_goals;
create policy "savings_goals own rows" on public.savings_goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "recurring_items own rows" on public.recurring_items;
create policy "recurring_items own rows" on public.recurring_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "exchange_rates readable" on public.exchange_rates;
create policy "exchange_rates readable" on public.exchange_rates
  for select using (true);

drop policy if exists "exchange_rates insertable" on public.exchange_rates;
create policy "exchange_rates insertable" on public.exchange_rates
  for insert with check (true);

drop policy if exists "Users manage own spending rules" on public.spending_rules;
create policy "Users manage own spending rules" on public.spending_rules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "saving_plans own rows" on public.saving_plans;
create policy "saving_plans own rows" on public.saving_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_transaction_entries_user_date on public.transaction_entries(user_id, date desc);
create unique index if not exists idx_transaction_entries_legacy_unique
  on public.transaction_entries(user_id, legacy_transaction_id)
  where legacy_transaction_id is not null;
create index if not exists idx_recurring_items_due on public.recurring_items(user_id, next_due_date);
create index if not exists spending_rules_user_id_idx on public.spending_rules(user_id);
create index if not exists spending_rules_category_id_idx on public.spending_rules(category_id);
create index if not exists saving_plans_user_id_idx on public.saving_plans(user_id);
