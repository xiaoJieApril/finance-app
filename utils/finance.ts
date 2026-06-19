import {
  FinanceAccount,
  FinanceBudget,
  FinanceCategory,
  RecurringItem,
  SavingsGoal,
  TransactionEntry,
} from '@/type';
import { isSameMonth } from './date';

export function entryBaseAmount(entry: TransactionEntry) {
  return entry.base_currency_amount ?? 0;
}

export function isCurrentMonthEntry(entry: TransactionEntry, month = new Date()) {
  return isSameMonth(entry.date, month);
}

export function getMonthlyEntries(entries: TransactionEntry[], month = new Date()) {
  return entries.filter((entry) => isCurrentMonthEntry(entry, month));
}

export function calculateCashFlow(entries: TransactionEntry[], month = new Date()) {
  const currentMonthEntries = getMonthlyEntries(entries, month);
  const income = currentMonthEntries
    .filter((entry) => entry.type === 'income')
    .reduce((sum, entry) => sum + entryBaseAmount(entry), 0);
  const expense = currentMonthEntries
    .filter((entry) => entry.type === 'expense')
    .reduce((sum, entry) => sum + entryBaseAmount(entry), 0);

  return {
    income,
    expense,
    balance: income - expense,
  };
}

export function calculateBudgetUsage(
  budgets: FinanceBudget[],
  entries: TransactionEntry[],
  categories: FinanceCategory[],
  month = new Date(),
) {
  const expenseEntries = getMonthlyEntries(entries, month).filter((entry) => entry.type === 'expense');
  const budgetRows = budgets.length
    ? budgets
    : categories
        .filter((category) => category.type === 'expense' && (category.budget_limit ?? 0) > 0)
        .map((category) => ({
          id: `category-budget-${category.id}`,
          category_id: category.id,
          monthly_limit: category.budget_limit ?? 0,
          category,
        }));

  return budgetRows.map((budget) => {
    const spent = expenseEntries
      .filter((entry) => entry.category_id === budget.category_id)
      .reduce((sum, entry) => sum + entryBaseAmount(entry), 0);
    const limit = budget.monthly_limit;
    const usage = limit > 0 ? spent / limit : 0;

    return {
      ...budget,
      category: budget.category ?? categories.find((category) => category.id === budget.category_id) ?? null,
      spent,
      remaining: limit - spent,
      usage,
    };
  });
}

export function calculateAccountBalances(accounts: FinanceAccount[], entries: TransactionEntry[]) {
  return accounts.map((account) => {
    const movement = entries.reduce((sum, entry) => {
      if (entry.type === 'income' && entry.account_id === account.id) return sum + entryBaseAmount(entry);
      if (entry.type === 'expense' && entry.account_id === account.id) return sum - entryBaseAmount(entry);
      if (entry.type === 'transfer' && entry.account_id === account.id) return sum - entryBaseAmount(entry);
      if (entry.type === 'transfer' && entry.to_account_id === account.id) return sum + entryBaseAmount(entry);
      return sum;
    }, 0);

    return {
      ...account,
      current_balance: account.current_balance ?? account.initial_balance + movement,
    };
  });
}

export function getUpcomingRecurringItems(items: RecurringItem[], days = 14) {
  const now = new Date();
  const end = new Date();
  end.setDate(now.getDate() + days);
  now.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return items.filter((item) => {
    const due = new Date(item.next_due_date);
    return item.is_active && due >= now && due <= end;
  });
}

export function calculateGoalProgress(goals: SavingsGoal[]) {
  return goals.map((goal) => ({
    ...goal,
    progress: goal.target_amount > 0 ? Math.min(goal.current_amount / goal.target_amount, 1) : 0,
    remaining: Math.max(goal.target_amount - goal.current_amount, 0),
  }));
}

export function formatMoney(amount: number | null | undefined, currency = 'RM') {
  return `${currency} ${(amount ?? 0).toFixed(2)}`;
}
