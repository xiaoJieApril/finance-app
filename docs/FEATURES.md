# Feature Catalog

## Cashflow Overview

Location: `features/finance/screens/OverviewScreen.tsx`, `features/finance/hooks/useFinanceOverview.ts`, `features/finance/utils/finance.ts`

Shows monthly income, expenses, balance, net worth, budget usage, health score, upcoming recurring items, quick transaction actions, and Future Note pending items.

## Ledger

Location: `features/finance/screens/HistoryScreen.tsx`, `features/finance/services/financeRepository.ts`

Supports searching, filtering, editing, and deleting transaction entries. Transaction entries are the main v2 ledger rows in Supabase.

## Budgets And Categories

Location: `features/finance/screens/BudgetScreen.tsx`, `features/finance/screens/CategoriesScreen.tsx`, `features/finance/types.ts`

Categories classify income and expense entries. Budgets attach monthly spending limits to expense categories and power risk reminders.

## Accounts

Location: `features/finance/screens/AccountsScreen.tsx`, `features/finance/services/financeRepository.ts`

Accounts represent cash, bank, e-wallet, and credit card balances. Deleting an account archives it so historical transactions can still show the original account context.

## Savings Goals

Location: `features/finance/screens/GoalsScreen.tsx`

Tracks savings target amount, current progress, and target date. Goals are editable and deletable.

## Recurring Bills

Location: `features/finance/screens/RecurringScreen.tsx`, `features/finance/services/notifications.ts`

Tracks fixed income and fixed expenses. Upcoming items are used in cashflow forecasting and local reminder scheduling.

## Future Note Imports

Location: `features/imports/future-note/screens/FutureNoteImportsScreen.tsx`, `features/imports/future-note/`

External planned expenses arrive as pending imports. The user confirms or ignores them; confirmed imports create real ledger entries.

## AI Review

Location: `features/assistant/screens/AIAgentScreen.tsx`, `features/assistant/`

Builds weekly or monthly finance context and sends it to the AI review service. Structured responses can render as finance review reports.

## Reports

Location: `features/reports/utils/exportReport.ts`

Exports transaction data as CSV or PDF for weekly or monthly review.

## Local Reminders

Location: `shared/hooks/useNotificationSettings.ts`, `features/finance/services/notifications.ts`

Uses Expo local notifications for daily logging reminders, budget threshold alerts, and recurring bill reminders. Android notification-reading imports are not part of the app anymore.
