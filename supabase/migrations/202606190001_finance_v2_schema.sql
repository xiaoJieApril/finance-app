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

create table if not exists public.notification_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  source_app text not null,
  source_package text not null,
  notification_title text,
  notification_text_preview text not null,
  notification_hash text not null,
  parsed_type text check (parsed_type in ('income', 'expense', 'transfer')),
  parsed_amount numeric,
  parsed_currency text not null default 'MYR',
  parsed_merchant text,
  parsed_account_hint text,
  occurred_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'ignored', 'duplicate')),
  confirmed_entry_id uuid references public.transaction_entries(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(user_id, notification_hash)
);

alter table public.accounts enable row level security;
alter table public.finance_categories enable row level security;
alter table public.transaction_entries enable row level security;
alter table public.budgets enable row level security;
alter table public.savings_goals enable row level security;
alter table public.recurring_items enable row level security;
alter table public.exchange_rates enable row level security;
alter table public.notification_imports enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'accounts' and policyname = 'accounts own rows') then
    create policy "accounts own rows" on public.accounts
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'finance_categories' and policyname = 'finance_categories own rows') then
    create policy "finance_categories own rows" on public.finance_categories
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'transaction_entries' and policyname = 'transaction_entries own rows') then
    create policy "transaction_entries own rows" on public.transaction_entries
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'budgets' and policyname = 'budgets own rows') then
    create policy "budgets own rows" on public.budgets
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'savings_goals' and policyname = 'savings_goals own rows') then
    create policy "savings_goals own rows" on public.savings_goals
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'recurring_items' and policyname = 'recurring_items own rows') then
    create policy "recurring_items own rows" on public.recurring_items
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'exchange_rates' and policyname = 'exchange_rates readable') then
    create policy "exchange_rates readable" on public.exchange_rates
      for select using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'exchange_rates' and policyname = 'exchange_rates insertable') then
    create policy "exchange_rates insertable" on public.exchange_rates
      for insert with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notification_imports' and policyname = 'notification_imports own rows') then
    create policy "notification_imports own rows" on public.notification_imports
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

create index if not exists idx_transaction_entries_user_date on public.transaction_entries(user_id, date desc);
create unique index if not exists idx_transaction_entries_legacy_unique
  on public.transaction_entries(user_id, legacy_transaction_id)
  where legacy_transaction_id is not null;
create index if not exists idx_recurring_items_due on public.recurring_items(user_id, next_due_date);
create index if not exists idx_notification_imports_status on public.notification_imports(user_id, status, occurred_at desc);
