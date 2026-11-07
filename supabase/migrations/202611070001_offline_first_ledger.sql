-- Offline-first ledger support. This migration is additive and preserves existing rows.
-- It expects the existing tables to use UUID primary keys named `id`.

alter table public.transactions
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

alter table public.categories
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists archived_at timestamptz;

alter table public.transactions
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create unique index if not exists transactions_id_offline_sync_uidx on public.transactions (id);
create unique index if not exists categories_id_offline_sync_uidx on public.categories (id);
create index if not exists transactions_user_date_offline_sync_idx on public.transactions (user_id, date desc);
create index if not exists categories_user_type_offline_sync_idx on public.categories (user_id, type);

-- Replace any previous policies on these account-private tables so permissive legacy
-- policies cannot expose another user's records through Postgres' OR policy semantics.
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

alter table public.transactions enable row level security;
alter table public.categories enable row level security;

create policy transactions_owner_select on public.transactions
  for select to authenticated using (auth.uid() = user_id);
create policy transactions_owner_insert on public.transactions
  for insert to authenticated with check (auth.uid() = user_id);
create policy transactions_owner_update on public.transactions
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy categories_owner_select on public.categories
  for select to authenticated using (auth.uid() = user_id);
create policy categories_owner_insert on public.categories
  for insert to authenticated with check (auth.uid() = user_id);
create policy categories_owner_update on public.categories
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update on public.transactions to authenticated;
grant select, insert, update on public.categories to authenticated;
