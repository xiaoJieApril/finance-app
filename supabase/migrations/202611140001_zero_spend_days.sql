-- Additive support for account-synced zero-spend day markers and preference.
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
