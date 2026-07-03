# Feature Catalog

## Cashflow Overview

Location: `features/finance/screens/OverviewScreen.tsx`, `features/finance/hooks/useFinanceOverview.ts`, `features/finance/utils/finance.ts`

Shows monthly income, expenses, balance, net worth, budget usage, health score, saving-plan progress, daily/weekly/monthly safe-to-spend allowance, cashflow timeline, scenario simulator, upcoming recurring items, and quick transaction actions.

## Saving Coach

Location: `features/finance/screens/OverviewScreen.tsx`, `features/finance/hooks/useFinanceOverview.ts`, `features/finance/utils/finance.ts`

Saving plans define a monthly target by income rate or fixed amount plus a safety buffer. The overview turns this into a daily, weekly, and monthly spending allowance, then shows strict-but-non-shaming coach signals such as when to pause discretionary spending or protect the monthly savings target.

## Ledger

Location: `features/finance/screens/HistoryScreen.tsx`, `features/finance/services/financeRepository.ts`

Supports searching, filtering, editing, and deleting transaction entries. Transaction entries are the main v2 ledger rows in Supabase.

## Budgets And Categories

Location: `features/finance/screens/BudgetScreen.tsx`, `features/finance/screens/CategoriesScreen.tsx`, `features/finance/types.ts`

Categories classify income and expense entries. Budgets attach monthly spending limits to expense categories and power risk reminders.

Spending rules are stricter user-defined limits such as daily food caps or weekly entertainment caps. They are stored separately from budgets so they can warn about short-period behavior without changing the monthly budget source of truth.

## Accounts

Location: `features/finance/screens/AccountsScreen.tsx`, `features/finance/services/financeRepository.ts`

Accounts represent cash, bank, e-wallet, and credit card balances. Deleting an account archives it so historical transactions can still show the original account context.

Credit-card accounts can also store statement day, payment due day, minimum payment, outstanding balance, interest rate, and credit limit. These fields support debt visibility and future payoff planning without automatically creating ledger entries.

## Savings Goals

Location: `features/finance/screens/GoalsScreen.tsx`

Tracks savings target amount, current progress, target date, goal type, primary-goal status, and planned monthly contribution. Goal cards estimate the number of months needed to finish based on the current contribution pace.

## Recurring Bills

Location: `features/finance/screens/RecurringScreen.tsx`, `features/finance/services/notifications.ts`

Tracks fixed income and fixed expenses. Upcoming items are used in cashflow forecasting and local reminder scheduling.

## AI Review And Budget Planner

Location: `features/assistant/screens/AIAgentScreen.tsx`, `features/assistant/`

Builds finance context and sends it to the AI assistant service. The assistant has two modes:

- Finance review: weekly or monthly recap reports with insights and action items.
- Budget planner: monthly budget and saving-plan recommendations using cashflow, existing budgets, accounts, goals, recurring items, spending rules, credit-card debt fields, and recent spending.
- Budget scenarios: conservative, balanced, and aggressive-saving plans with category-level reasons and current-vs-suggested comparisons.

Planner output is advisory by default. The user can explicitly confirm "apply this plan" to write recommended saving plans, category budgets, and optional spending rules.

## Bill Calendar, Safe-To-Spend, And Simulator

Location: `features/finance/screens/OverviewScreen.tsx`, `features/finance/utils/finance.ts`

The overview turns recurring items into a forward-looking timeline. It also estimates how much can be safely spent after upcoming bills, the active saving plan, and the configured buffer. The simulator lets the user test a hypothetical income or expense and see the projected balance immediately.

## Reports

Location: `features/reports/utils/exportReport.ts`

Exports transaction data as CSV or PDF for weekly or monthly review.

## Local Reminders

Location: `shared/hooks/useNotificationSettings.ts`, `features/finance/services/notifications.ts`

Uses Expo local notifications for daily logging reminders, budget threshold alerts, and recurring bill reminders. Android notification-reading imports are not part of the app anymore.
