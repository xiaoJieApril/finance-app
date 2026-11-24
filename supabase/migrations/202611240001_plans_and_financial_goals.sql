-- Monthly spending plans, their linked expense transactions, and balance goals.
begin;

create table if not exists public.planned_expenses (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  title text not null check (length(trim(title)) > 0),
  amount numeric not null check (amount > 0),
  category_id uuid not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, user_id),
  constraint planned_expenses_category_user_id_fkey
    foreign key (category_id, user_id) references public.categories(id, user_id)
);

create index if not exists planned_expenses_user_month_idx
  on public.planned_expenses (user_id, month desc) where deleted_at is null;

create table if not exists public.planned_expense_transactions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  planned_expense_id uuid not null,
  transaction_id uuid not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, user_id),
  constraint planned_expense_transactions_plan_user_id_fkey
    foreign key (planned_expense_id, user_id) references public.planned_expenses(id, user_id) on delete cascade,
  constraint planned_expense_transactions_transaction_user_id_fkey
    foreign key (transaction_id) references public.transactions(id) on delete cascade
);

create unique index if not exists planned_expense_transactions_active_transaction_uidx
  on public.planned_expense_transactions (user_id, transaction_id) where deleted_at is null;
create index if not exists planned_expense_transactions_user_plan_idx
  on public.planned_expense_transactions (user_id, planned_expense_id) where deleted_at is null;

create table if not exists public.financial_goals (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('investment', 'emergency_fund')),
  balance numeric not null default 0 check (balance >= 0),
  target numeric check (target is null or target > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, kind)
);

alter table public.planned_expenses enable row level security;
alter table public.planned_expense_transactions enable row level security;
alter table public.financial_goals enable row level security;

drop policy if exists planned_expenses_owner_select on public.planned_expenses;
drop policy if exists planned_expenses_owner_insert on public.planned_expenses;
drop policy if exists planned_expenses_owner_update on public.planned_expenses;
create policy planned_expenses_owner_select on public.planned_expenses for select to authenticated using (auth.uid() = user_id);
create policy planned_expenses_owner_insert on public.planned_expenses for insert to authenticated with check (
  auth.uid() = user_id and exists (select 1 from public.categories c where c.id = category_id and c.user_id = auth.uid() and c.type = 'expense')
);
create policy planned_expenses_owner_update on public.planned_expenses for update to authenticated using (auth.uid() = user_id) with check (
  auth.uid() = user_id and exists (select 1 from public.categories c where c.id = category_id and c.user_id = auth.uid() and c.type = 'expense')
);

drop policy if exists planned_expense_transactions_owner_select on public.planned_expense_transactions;
drop policy if exists planned_expense_transactions_owner_insert on public.planned_expense_transactions;
drop policy if exists planned_expense_transactions_owner_update on public.planned_expense_transactions;
create policy planned_expense_transactions_owner_select on public.planned_expense_transactions for select to authenticated using (auth.uid() = user_id);
create policy planned_expense_transactions_owner_insert on public.planned_expense_transactions for insert to authenticated with check (
  auth.uid() = user_id
  and exists (select 1 from public.planned_expenses p where p.id = planned_expense_id and p.user_id = auth.uid() and p.deleted_at is null)
  and exists (select 1 from public.transactions t join public.categories c on c.id = t.category_id and c.user_id = t.user_id where t.id = transaction_id and t.user_id = auth.uid() and t.deleted_at is null and c.type = 'expense')
);
create policy planned_expense_transactions_owner_update on public.planned_expense_transactions for update to authenticated using (auth.uid() = user_id) with check (
  auth.uid() = user_id
  and exists (select 1 from public.planned_expenses p where p.id = planned_expense_id and p.user_id = auth.uid())
  and exists (select 1 from public.transactions t join public.categories c on c.id = t.category_id and c.user_id = t.user_id where t.id = transaction_id and t.user_id = auth.uid() and c.type = 'expense')
);

drop policy if exists financial_goals_owner_select on public.financial_goals;
drop policy if exists financial_goals_owner_insert on public.financial_goals;
drop policy if exists financial_goals_owner_update on public.financial_goals;
create policy financial_goals_owner_select on public.financial_goals for select to authenticated using (auth.uid() = user_id);
create policy financial_goals_owner_insert on public.financial_goals for insert to authenticated with check (auth.uid() = user_id);
create policy financial_goals_owner_update on public.financial_goals for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update on public.planned_expenses to authenticated;
grant select, insert, update on public.planned_expense_transactions to authenticated;
grant select, insert, update on public.financial_goals to authenticated;
commit;
