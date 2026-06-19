import { useMemo } from 'react';
import {
  calculateAccountBalances,
  calculateBudgetUsage,
  calculateCashFlow,
  calculateGoalProgress,
  getUpcomingRecurringItems,
} from '@/utils/finance';
import { useFinanceData } from './useFinanceData';

export function useFinanceOverview() {
  const finance = useFinanceData();
  const { data, isLoading, error } = finance.financeData;

  const overview = useMemo(() => {
    if (!data) return null;

    const cashFlow = calculateCashFlow(data.entries);
    const budgets = calculateBudgetUsage(data.budgets, data.entries, data.categories);
    const totalBudget = budgets.reduce((sum, budget) => sum + budget.monthly_limit, 0);
    const totalSpent = budgets.reduce((sum, budget) => sum + budget.spent, 0);
    const accounts = calculateAccountBalances(data.accounts, data.entries);
    const goals = calculateGoalProgress(data.goals);
    const upcomingRecurringItems = getUpcomingRecurringItems(data.recurringItems);

    return {
      data,
      cashFlow,
      accounts,
      budgets,
      goals,
      upcomingRecurringItems,
      totalBudget,
      totalBudgetSpent: totalSpent,
      budgetUsage: totalBudget > 0 ? totalSpent / totalBudget : 0,
      totalNetWorth: accounts.reduce((sum, account) => sum + (account.current_balance ?? 0), 0),
    };
  }, [data]);

  return {
    ...finance,
    overview,
    isLoading,
    error,
  };
}
