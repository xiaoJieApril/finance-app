-- Finance App ledger setup for Supabase SQL Editor.
-- Safe to rerun: creates missing tables/columns and does not delete table data.
-- For pre-existing tables, this assumes their core columns already use UUID IDs
-- and the same field names documented in SCHEMA_CONTRACT.md.

begin;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  icon text not null,
  type text not null,
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint categories_user_id_v1_fkey
    foreign key (user_id) references auth.users(id) on delete cascade,
  constraint categories_v1_shape_check
    check (user_id is not null and length(trim(name)) > 0 and icon is not null and type in ('income', 'expense'))
);

-- Complete the sync columns when categories was created by the earlier app version.
alter table public.categories
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists archived_at timestamptz;

create unique index if not exists categories_id_offline_sync_uidx
  on public.categories (id);
create unique index if not exists categories_id_user_v1_uidx
  on public.categories (id, user_id);
create index if not exists categories_user_type_offline_sync_idx
  on public.categories (user_id, type);

update public.categories set updated_at = now() where updated_at is null;
alter table public.categories alter column updated_at set default now();
alter table public.categories alter column updated_at set not null;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  category_id uuid not null,
  amount numeric not null,
  note text not null default '',
  date timestamptz not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint transactions_user_id_v1_fkey
    foreign key (user_id) references auth.users(id) on delete cascade,
  constraint transactions_category_user_id_fkey
    foreign key (category_id, user_id) references public.categories(id, user_id),
  constraint transactions_v1_shape_check
    check (user_id is not null and category_id is not null and amount > 0 and note is not null and date is not null)
);

-- Complete the sync columns when transactions was created by the earlier app version.
alter table public.transactions
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

create unique index if not exists transactions_id_offline_sync_uidx
  on public.transactions (id);
create index if not exists transactions_user_date_offline_sync_idx
  on public.transactions (user_id, date desc);

update public.transactions set updated_at = now() where updated_at is null;
alter table public.transactions alter column updated_at set default now();
alter table public.transactions alter column updated_at set not null;

-- Add the v1 rules to existing tables without validating/rewriting legacy rows.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'categories_user_id_v1_fkey'
      and conrelid = 'public.categories'::regclass
  ) then
    alter table public.categories add constraint categories_user_id_v1_fkey
      foreign key (user_id) references auth.users(id) on delete cascade not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'transactions_user_id_v1_fkey'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions add constraint transactions_user_id_v1_fkey
      foreign key (user_id) references auth.users(id) on delete cascade not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'transactions_category_user_id_fkey'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions add constraint transactions_category_user_id_fkey
      foreign key (category_id, user_id) references public.categories(id, user_id) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'categories_v1_shape_check'
      and conrelid = 'public.categories'::regclass
  ) then
    alter table public.categories add constraint categories_v1_shape_check
      check (user_id is not null and name is not null and length(trim(name)) > 0 and icon is not null and type in ('income', 'expense')) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'transactions_v1_shape_check'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions add constraint transactions_v1_shape_check
      check (user_id is not null and category_id is not null and amount > 0 and note is not null and date is not null) not valid;
  end if;
end;
$$;

-- A category's type determines the meaning of every linked transaction.
create or replace function public.keep_ledger_category_type_immutable()
returns trigger
language plpgsql
as $$
begin
  if new.type is distinct from old.type then
    raise exception 'A ledger category type is immutable; create a new category instead.';
  end if;
  return new;
end;
$$;

drop trigger if exists ledger_category_type_immutable on public.categories;
create trigger ledger_category_type_immutable
  before update of type on public.categories
  for each row execute function public.keep_ledger_category_type_immutable();

-- Use owner-only access for the two account-private ledger tables.
do $$
declare policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public' and tablename in ('transactions', 'categories')
  loop
    execute format('drop policy if exists %I on %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
  end loop;
end;
$$;

alter table public.categories enable row level security;
alter table public.transactions enable row level security;

create policy categories_owner_select on public.categories
  for select to authenticated using (auth.uid() = user_id);
create policy categories_owner_insert on public.categories
  for insert to authenticated with check (auth.uid() = user_id);
create policy categories_owner_update on public.categories
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy transactions_owner_select on public.transactions
  for select to authenticated using (auth.uid() = user_id);
create policy transactions_owner_insert on public.transactions
  for insert to authenticated with check (auth.uid() = user_id);
create policy transactions_owner_update on public.transactions
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update on public.categories to authenticated;
grant select, insert, update on public.transactions to authenticated;

-- Account-scoped zero-spend preferences and local-date markers.
create table if not exists public.zero_spend_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  enabled_from_local_date date,
  updated_at timestamptz not null default now()
);
create table if not exists public.zero_spend_days (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  local_date date not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint zero_spend_days_user_date_key unique (user_id, local_date)
);
create index if not exists zero_spend_days_user_date_idx
  on public.zero_spend_days (user_id, local_date desc);

alter table public.zero_spend_settings enable row level security;
alter table public.zero_spend_days enable row level security;
drop policy if exists zero_spend_settings_owner_select on public.zero_spend_settings;
drop policy if exists zero_spend_settings_owner_insert on public.zero_spend_settings;
drop policy if exists zero_spend_settings_owner_update on public.zero_spend_settings;
create policy zero_spend_settings_owner_select on public.zero_spend_settings
  for select to authenticated using (auth.uid() = user_id);
create policy zero_spend_settings_owner_insert on public.zero_spend_settings
  for insert to authenticated with check (auth.uid() = user_id);
create policy zero_spend_settings_owner_update on public.zero_spend_settings
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists zero_spend_days_owner_select on public.zero_spend_days;
drop policy if exists zero_spend_days_owner_insert on public.zero_spend_days;
drop policy if exists zero_spend_days_owner_update on public.zero_spend_days;
create policy zero_spend_days_owner_select on public.zero_spend_days
  for select to authenticated using (auth.uid() = user_id);
create policy zero_spend_days_owner_insert on public.zero_spend_days
  for insert to authenticated with check (auth.uid() = user_id);
create policy zero_spend_days_owner_update on public.zero_spend_days
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update on public.zero_spend_settings to authenticated;
grant select, insert, update on public.zero_spend_days to authenticated;

commit;
