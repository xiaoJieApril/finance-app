# finaTracker

finaTracker is a React Native finance app built with Expo Router. It focuses on daily cashflow visibility: manual accounts, transaction tracking, budgets, categories, savings goals, recurring bills, AI review/planning, reports, and local reminders.

## Core Features

- Cashflow overview: monthly income, expense, balance, net worth, budget risk, safe-to-spend estimate, timeline, and upcoming recurring items.
- Ledger: create, edit, delete, search, and filter transaction records.
- Budgets and categories: manage spending categories, income categories, monthly limits, and user-defined spending rules.
- Accounts: track cash, banks, e-wallets, and credit cards while preserving historical transaction context. Credit cards can store statement day, due day, minimum payment, outstanding balance, interest rate, and credit limit.
- Goals: track savings targets, progress, monthly contribution plans, and projected completion pace.
- Recurring bills: manage fixed income and expenses with local reminder support.
- AI review and planning: summarize weekly/monthly finance context and propose read-only monthly budget plans with conservative, balanced, and aggressive-saving scenarios.
- Reports: export transaction summaries to CSV or PDF.
- Scenario simulator: test a possible future income or expense against current cashflow before committing.

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
