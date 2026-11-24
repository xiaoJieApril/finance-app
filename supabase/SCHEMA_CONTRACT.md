# Ledger schema contract v1

Effective baseline: `202611070002_ledger_v1_contract.sql`.

`categories` and `transactions` are the stable ledger core. Future features must add tables that reference this core; they must not rename, remove, reinterpret, or change the types, nullability, keys, or relationships of its columns. The matching Supabase client types live in `type/database.ts`; the offline JSON snapshot shape is `LocalDatabaseV1` in `type/localDatabase.ts`.

## Tables

### `categories`

| Column | Type | Rule |
| --- | --- | --- |
| `id` | UUID | Primary key; client-generated and stable |
| `user_id` | UUID | Required; references `auth.users.id` |
| `name` | text | Required, non-empty |
| `icon` | text | Required presentation key |
| `type` | text | Required; `expense` or `income`; immutable after creation |
| `updated_at` | timestamptz | Required; updated on rename/archive |
| `archived_at` | timestamptz, nullable | `NULL` means selectable; set to archive |

### `transactions`

| Column | Type | Rule |
| --- | --- | --- |
| `id` | UUID | Primary key; client-generated and stable |
| `user_id` | UUID | Required; references `auth.users.id` |
| `category_id` | UUID | Required; references a category owned by the same user |
| `amount` | numeric | Required and greater than zero; currency is MYR |
| `note` | text | Required; empty string means no note |
| `date` | timestamptz | Required transaction date |
| `updated_at` | timestamptz | Required; updated on every edit |
| `deleted_at` | timestamptz, nullable | `NULL` means active; set instead of hard deleting |

## Fixed relationships and meaning

```text
auth.users 1 ─── many categories
auth.users 1 ─── many transactions
categories 1 ─── many transactions
transactions(category_id, user_id) → categories(id, user_id)
```

Each transaction has exactly one category, and both rows belong to the same account. The category's immutable `type` determines whether its transactions are income or expense. Renaming a category changes its displayed name in history; archiving it does not remove it or its transactions.

## Adding future tables

- Add a new table in a new migration. Do not modify these two table definitions or the composite transaction-to-category relationship.
- Reference the core with foreign keys from the new table. For account-owned category data, use `(category_id, user_id)` so cross-account references cannot be created.
- If a feature needs optional per-category fields, put them in a separate one-to-one extension table keyed by `(category_id, user_id)` instead of adding columns to `categories`.
- Keep the `categories` and `transactions` entries in `type/database.ts` unchanged; append new table definitions there.
- Auxiliary features may add account-owned tables with their own RLS policies and additive migrations. The zero-spend feature uses `zero_spend_settings` and `zero_spend_days`; neither changes ledger row semantics.
- The planning feature adds `planned_expenses`, `planned_expense_transactions`, and `financial_goals` in `202611240001_plans_and_financial_goals.sql`. Its offline snapshot is stored under a separate `finance-planning-v1:<userId>` key, so the stable ledger JSON envelope remains unchanged. Plans reference account-owned expense categories; active transaction links are unique per user and RLS checks that linked transactions are expenses owned by that user.
- Keep the existing transaction/category arrays and row shapes in local storage unchanged. If a future feature changes the JSON envelope, add an explicit version migration that preserves both arrays and their records.

The v1 migration adds constraints as `NOT VALID` so legacy rows remain in place; new writes and updates must satisfy the contract. Rows that do not have an account-owned category relationship remain stored but are excluded from the new account-scoped ledger query. Before applying the migrations, check the existing Supabase column types against this document. Do not edit the v1 migrations after applying them; future changes belong in a new migration.

Run `npm run schema:check` to verify the TypeScript row shapes, relationship, offline envelope, locked migration files, and that later migrations do not alter the core tables.
