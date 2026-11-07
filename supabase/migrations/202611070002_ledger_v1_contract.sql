-- Ledger schema contract v1. Additive only; do not edit/drop/rename the v1 columns.
-- Existing rows are preserved. NOT VALID leaves old rows untouched while the
-- constraints apply to new rows and future updates.

create unique index if not exists categories_id_user_v1_uidx
  on public.categories (id, user_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'categories_user_id_v1_fkey' and conrelid = 'public.categories'::regclass) then
    alter table public.categories add constraint categories_user_id_v1_fkey
      foreign key (user_id) references auth.users(id) on delete cascade not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'transactions_user_id_v1_fkey' and conrelid = 'public.transactions'::regclass) then
    alter table public.transactions add constraint transactions_user_id_v1_fkey
      foreign key (user_id) references auth.users(id) on delete cascade not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'transactions_category_user_id_fkey' and conrelid = 'public.transactions'::regclass) then
    alter table public.transactions add constraint transactions_category_user_id_fkey
      foreign key (category_id, user_id) references public.categories (id, user_id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'categories_v1_shape_check' and conrelid = 'public.categories'::regclass) then
    alter table public.categories add constraint categories_v1_shape_check
      check (user_id is not null and name is not null and length(trim(name)) > 0 and icon is not null and type in ('income', 'expense')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'transactions_v1_shape_check' and conrelid = 'public.transactions'::regclass) then
    alter table public.transactions add constraint transactions_v1_shape_check
      check (user_id is not null and category_id is not null and amount > 0 and note is not null and date is not null) not valid;
  end if;
end;
$$;

-- A category's kind determines whether all linked transactions are income or expense.
-- Rename/archive remain allowed; changing kind would reinterpret every linked record.
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
