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

alter table public.savings_goals
  add column if not exists goal_type text not null default 'custom',
  add column if not exists is_primary boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'savings_goals_goal_type_check'
      and conrelid = 'public.savings_goals'::regclass
  ) then
    alter table public.savings_goals
      add constraint savings_goals_goal_type_check
      check (goal_type in ('emergency', 'travel', 'car', 'debt', 'custom'));
  end if;
end $$;

alter table public.saving_plans enable row level security;

drop policy if exists "saving_plans own rows" on public.saving_plans;
create policy "saving_plans own rows" on public.saving_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists saving_plans_user_id_idx on public.saving_plans(user_id);
