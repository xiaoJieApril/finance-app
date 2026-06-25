# finaTracker

finaTracker is a React Native finance app built with Expo Router. It focuses on daily cashflow visibility: manual accounts, transaction tracking, budgets, categories, savings goals, recurring bills, Future Note imports, AI review, reports, and local reminders.

## Core Features

- Cashflow overview: monthly income, expense, balance, net worth, budget risk, and upcoming recurring items.
- Ledger: create, edit, delete, search, and filter transaction records.
- Budgets and categories: manage spending categories, income categories, and monthly limits.
- Accounts: track cash, banks, e-wallets, and credit cards while preserving historical transaction context.
- Goals: track savings targets and progress.
- Recurring bills: manage fixed income and expenses with local reminder support.
- Future Note imports: review external planned expenses before they become ledger entries.
- AI review: summarize weekly or monthly finance context and produce structured review reports.
- Reports: export transaction summaries to CSV or PDF.

## Project Structure

- `app/`: Expo Router route files. Keep routes here so URLs and tab navigation stay stable.
- `features/`: domain-owned app features such as finance, imports, assistant, reports, and auth.
- `shared/`: reusable UI, hooks, theme helpers, and app-level stores.
- `infrastructure/`: external clients and platform integrations, currently Supabase.
- `supabase/`: database migrations and Edge Functions.
- `scripts/`: one-off local maintenance and asset generation tools.
- `docs/`: English architecture and feature notes for future maintenance.

See [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) and [docs/FEATURES.md](docs/FEATURES.md) for a deeper folder-by-folder guide.

## Development

Install dependencies:

```bash
npm install
```

Start Expo:

```bash
npx expo start
```

Validate code before shipping changes:

```bash
npx tsc --noEmit
npm run lint
```

## Environment

Copy `.env.example` and provide the Supabase and AI keys used by the app:

```bash
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_GEMINI_API_KEY=...
```

Local reminders use `expo-notifications`. Android notification-reading imports were intentionally removed and should not be reintroduced unless the product direction changes.
