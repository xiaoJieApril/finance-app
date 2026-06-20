-- Generated from transactions_rows.csv.
-- Run this in Supabase SQL Editor after the v2 finance schema migration.
-- It is safe to rerun: existing legacy_transaction_id rows are skipped.

with legacy_rows(id, user_id, category_id, amount, note, date, is_savings) as (
  values
    (2, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 8, 50, null, '2026-05-16 04:00:00+00'::timestamptz, true),
    (3, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 9, null, '2026-05-16 04:00:00+00'::timestamptz, false),
    (5, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 7, 10, 'Maimai', '2026-05-17 04:00:00+00'::timestamptz, false),
    (6, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 8, 'Lunch', '2026-05-17 04:00:00+00'::timestamptz, false),
    (7, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 31.1, 'Lunch and dinner', '2026-05-01 04:00:00+00'::timestamptz, false),
    (8, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 4, 7, 'Bixue', '2026-05-01 04:00:00+00'::timestamptz, false),
    (9, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 7, 10, 'Maimai', '2026-05-01 04:00:00+00'::timestamptz, false),
    (10, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 39, 'Dinner', '2026-05-02 04:00:00+00'::timestamptz, false),
    (11, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 12, 'Lunch', '2026-05-04 04:00:00+00'::timestamptz, false),
    (12, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 10, 'Lunch ', '2026-05-05 04:00:00+00'::timestamptz, false),
    (13, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 9, 'Lunch and dinner', '2026-05-06 04:00:00+00'::timestamptz, false),
    (14, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 14, 'Lunch', '2026-05-07 04:00:00+00'::timestamptz, false),
    (15, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 12, 'Lunch', '2026-05-08 04:00:00+00'::timestamptz, false),
    (16, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 28, 'Dinner', '2026-05-08 04:00:00+00'::timestamptz, false),
    (17, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 20.05, 'Lunch', '2026-05-09 04:00:00+00'::timestamptz, false),
    (18, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 29, 'Dinner', '2026-05-09 04:00:00+00'::timestamptz, false),
    (19, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 13, 'Lunch', '2026-05-10 04:00:00+00'::timestamptz, false),
    (20, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 20.8, 'Mcd', '2026-05-10 04:00:00+00'::timestamptz, false),
    (21, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 7, 'Lunch', '2026-05-11 04:00:00+00'::timestamptz, false),
    (22, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 14.5, 'Lunch', '2026-05-12 04:00:00+00'::timestamptz, false),
    (23, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 10, 'Lunch', '2026-05-13 04:00:00+00'::timestamptz, false),
    (24, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 16.5, 'Lunch', '2026-05-14 04:00:00+00'::timestamptz, false),
    (25, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 30.45, 'Lunch dinner', '2026-05-15 04:00:00+00'::timestamptz, false),
    (26, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 12, 'Lunch', '2026-05-18 04:00:00+00'::timestamptz, false),
    (27, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 10.9, 'Lunch', '2026-05-19 04:00:00+00'::timestamptz, false),
    (28, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 4, 5.8, 'Cham', '2026-05-19 04:00:00+00'::timestamptz, false),
    (29, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 9.9, 'Domino dinner', '2026-05-19 04:00:00+00'::timestamptz, false),
    (30, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 8, 200, null, '2026-05-19 04:00:00+00'::timestamptz, true),
    (31, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 14, 'Lunch', '2026-05-20 04:00:00+00'::timestamptz, false),
    (32, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 8, 50, null, '2026-05-20 04:00:00+00'::timestamptz, true),
    (33, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 10, 'Lunch', '2026-05-21 04:00:00+00'::timestamptz, false),
    (34, 'c32f5d37-4b5f-4fb4-bd04-754fafd8e775'::uuid, 1, 10, null, '2026-05-22 04:00:00+00'::timestamptz, false),
    (37, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 9, 'Lunch', '2026-05-23 04:00:00+00'::timestamptz, false),
    (38, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 7, 3, 'Maimai', '2026-05-23 04:00:00+00'::timestamptz, false),
    (39, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 12, 'Lunch', '2026-05-25 04:00:00+00'::timestamptz, false),
    (40, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 17.65, 'Mcd', '2026-05-26 04:00:00+00'::timestamptz, false),
    (41, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 4, 3, 'Mixue', '2026-05-27 04:00:00+00'::timestamptz, false),
    (42, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 7, 20, 'Maimai', '2026-05-27 04:00:00+00'::timestamptz, false),
    (43, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 41, 'Alimama', '2026-05-27 04:00:00+00'::timestamptz, false),
    (44, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 8, 100, null, '2026-05-26 16:00:00+00'::timestamptz, true),
    (45, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 10, 38, 'Diy', '2026-05-27 16:00:00+00'::timestamptz, false),
    (46, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 11, 427.03, 'Shope pay later ', '2026-05-28 16:00:00+00'::timestamptz, false),
    (47, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 9, 700, null, '2026-05-28 16:00:00+00'::timestamptz, false),
    (48, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 8, 500, null, '2026-05-28 16:00:00+00'::timestamptz, true),
    (49, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 12, 100, null, '2026-05-28 16:00:00+00'::timestamptz, true),
    (50, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 8, 300, null, '2026-05-28 16:00:00+00'::timestamptz, true),
    (51, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 13.8, 'Lunch', '2026-05-28 16:00:00+00'::timestamptz, false),
    (52, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 4, 4.23, 'Luckin', '2026-05-29 16:00:00+00'::timestamptz, false),
    (53, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 15, 'Lunch', '2026-05-29 16:00:00+00'::timestamptz, false),
    (54, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 7, 8, 'Maimai', '2026-05-29 16:00:00+00'::timestamptz, false),
    (55, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 11.2, 'Dinner', '2026-05-29 16:00:00+00'::timestamptz, false),
    (56, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 10, 12.8, 'Shampoo ', '2026-05-30 16:00:00+00'::timestamptz, false),
    (57, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 12, 'Lunch ', '2026-05-30 16:00:00+00'::timestamptz, false),
    (58, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 6.7, null, '2026-05-30 16:00:00+00'::timestamptz, false),
    (59, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 19.05, 'Dinner', '2026-05-30 16:00:00+00'::timestamptz, false),
    (60, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 10, 6, 'Kk', '2026-05-30 16:00:00+00'::timestamptz, false),
    (61, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 5, 12, 'Grab', '2026-05-30 16:00:00+00'::timestamptz, false),
    (62, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 10, 'Lunch', '2026-05-31 16:00:00+00'::timestamptz, false),
    (63, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 10, 'Lunch ', '2026-06-01 16:00:00+00'::timestamptz, false),
    (64, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 4, 3, 'Mixue', '2026-06-01 16:00:00+00'::timestamptz, false),
    (65, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 10, 65.8, null, '2026-06-01 16:00:00+00'::timestamptz, false),
    (66, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 7, 10, 'Maimai', '2026-06-01 16:00:00+00'::timestamptz, false),
    (67, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 32.6, 'Mcd', '2026-06-02 16:00:00+00'::timestamptz, false),
    (68, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 10, 'Lunch ', '2026-06-03 16:00:00+00'::timestamptz, false),
    (69, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 11, 110, 'AMG ticket', '2026-06-03 16:00:00+00'::timestamptz, false),
    (70, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 4, 4, 'Mixue', '2026-06-03 16:00:00+00'::timestamptz, false),
    (71, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 28, 'Dinner', '2026-06-05 16:00:00+00'::timestamptz, false),
    (72, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 4, 5.5, 'Mixue', '2026-06-05 16:00:00+00'::timestamptz, false),
    (73, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 4, 5.5, 'Mixue', '2026-06-06 16:00:00+00'::timestamptz, false),
    (74, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 40, 'Dinner', '2026-06-06 16:00:00+00'::timestamptz, false),
    (75, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 5, 15, 'Grab 来回', '2026-06-08 16:00:00+00'::timestamptz, false),
    (76, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 20, 'Popcorn ', '2026-06-08 16:00:00+00'::timestamptz, false),
    (77, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 11, 25, 'Movie', '2026-06-08 16:00:00+00'::timestamptz, false),
    (78, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 15, 'Lunch', '2026-06-09 16:00:00+00'::timestamptz, false),
    (79, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 16.9, 'Lunch', '2026-06-10 16:00:00+00'::timestamptz, false),
    (80, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 20, 'Dinner', '2026-06-09 16:00:00+00'::timestamptz, false),
    (81, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 18.9, 'Dinner', '2026-06-10 16:00:00+00'::timestamptz, false),
    (82, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 11, 40.28, 'Utilities ', '2026-06-11 16:00:00+00'::timestamptz, false),
    (83, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 13, 'Lunch', '2026-06-11 16:00:00+00'::timestamptz, false),
    (84, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 11, 22, '运费', '2026-06-12 16:00:00+00'::timestamptz, false),
    (85, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 7, 23, 'Maimai', '2026-06-12 16:00:00+00'::timestamptz, false),
    (86, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 14, 'Dinner', '2026-06-12 16:00:00+00'::timestamptz, false),
    (87, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 10, 16.8, '消遣', '2026-06-12 16:00:00+00'::timestamptz, false),
    (88, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 9, 70, '帮朋友看店', '2026-06-13 16:00:00+00'::timestamptz, false),
    (89, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 11.9, 'Lunch', '2026-06-13 16:00:00+00'::timestamptz, false),
    (90, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 9, 250, '爸爸給的', '2026-06-14 16:00:00+00'::timestamptz, false),
    (91, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 13, 'Lunch', '2026-06-14 16:00:00+00'::timestamptz, false),
    (92, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 5, 8, 'Bolt', '2026-06-15 16:00:00+00'::timestamptz, false),
    (93, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 5, 5, 'Bolt', '2026-06-15 16:00:00+00'::timestamptz, false),
    (94, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 13, 'Lunch', '2026-06-15 16:00:00+00'::timestamptz, false),
    (95, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 22.4, 'Lunch', '2026-06-16 16:00:00+00'::timestamptz, false),
    (96, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 4, 5.5, 'Mixue', '2026-06-16 16:00:00+00'::timestamptz, false),
    (97, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 5.2, 'Lunch', '2026-06-16 16:00:00+00'::timestamptz, false),
    (98, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 7, 20, 'Maimai', '2026-06-16 16:00:00+00'::timestamptz, false),
    (99, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 12.15, 'Mcd', '2026-06-17 16:00:00+00'::timestamptz, false),
    (100, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 11, 79.16, 'Shipping fee', '2026-06-17 16:00:00+00'::timestamptz, false),
    (101, '735870ee-00ad-4167-9c95-e7f6806a5574'::uuid, 1, 13.8, 'Lunch', '2026-06-18 16:00:00+00'::timestamptz, false)
),
created_categories as (
  insert into public.finance_categories (
    user_id,
    name,
    icon,
    type,
    budget_limit,
    legacy_category_id
  )
  select distinct
    lr.user_id,
    coalesce(c.name, '未分類'),
    coalesce(c.icon, 'wallet'),
    coalesce(c.type, 'expense'),
    coalesce(c.budget_limit, 0),
    lr.category_id
  from legacy_rows lr
  left join public.categories c on c.id = lr.category_id
  left join public.finance_categories fc
    on fc.user_id = lr.user_id
   and fc.legacy_category_id = lr.category_id
  where lr.category_id is not null
    and fc.id is null
  returning id
),
default_accounts as (
  insert into public.accounts (
    user_id,
    name,
    type,
    currency,
    initial_balance,
    current_balance,
    icon
  )
  select distinct
    lr.user_id,
    'Default Wallet',
    'cash',
    'MYR',
    0,
    0,
    'wallet'
  from legacy_rows lr
  left join public.accounts a
    on a.user_id = lr.user_id
   and a.name = 'Default Wallet'
  where a.id is null
  returning id
)
insert into public.transaction_entries (
  user_id,
  type,
  account_id,
  category_id,
  currency,
  amount,
  base_currency,
  base_currency_amount,
  exchange_rate,
  note,
  date,
  is_savings,
  legacy_transaction_id
)
select
  lr.user_id,
  case when coalesce(c.type, fc.type, 'expense') = 'income' then 'income' else 'expense' end,
  a.id,
  fc.id,
  'MYR',
  lr.amount,
  'MYR',
  lr.amount,
  1,
  coalesce(lr.note, ''),
  lr.date,
  lr.is_savings,
  lr.id
from legacy_rows lr
left join public.categories c on c.id = lr.category_id
left join public.finance_categories fc
  on fc.user_id = lr.user_id
 and fc.legacy_category_id = lr.category_id
left join public.accounts a
  on a.user_id = lr.user_id
 and a.name = 'Default Wallet'
left join public.transaction_entries existing
  on existing.user_id = lr.user_id
 and existing.legacy_transaction_id = lr.id
where existing.id is null;
