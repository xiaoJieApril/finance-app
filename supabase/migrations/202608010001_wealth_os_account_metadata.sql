alter table public.accounts
  add column if not exists institution text,
  add column if not exists color text;

alter table public.accounts
  drop constraint if exists accounts_type_check;

alter table public.accounts
  add constraint accounts_type_check
  check (
    type in (
      'cash',
      'bank',
      'ewallet',
      'credit_card',
      'money_market',
      'investment',
      'stock',
      'etf',
      'crypto',
      'retirement',
      'fixed_deposit',
      'other'
    )
  );
