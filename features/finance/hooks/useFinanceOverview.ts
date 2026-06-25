/**
 * Builds dashboard-ready finance summaries from raw repository data.
 *
 * Screens use this hook when they need balances, budget progress, forecasts,
 * health score, goals, and upcoming recurring items in one place.
 */
import { useEffect, useMemo } from 'react';
import { rescheduleRecurringReminders } from '@/features/finance/services/notifications';
import {
  calculateAccountBalances,
  calculateBudgetUsage,
  calculateCashFlowForecast,
  calculateCashFlow,
  calculateFinancialHealth,
  calculateGoalProgress,
  getUpcomingRecurringItems,
} from '@/features/finance/utils/finance';
import { useFinanceData } from './useFinanceData';

export function useFinanceOverview() {
  const finance = useFinanceData();
  const { data, isLoading, error } = finance.financeData;

  useEffect(() => {
    if (data?.source === 'v2') {
      rescheduleRecurringReminders(data.recurringItems);
    }
  }, [data]);

  const overview = useMemo(() => {
    if (!data) return null;

    const cashFlow = calculateCashFlow(data.entries);
    const budgets = calculateBudgetUsage(data.budgets, data.entries, data.categories);
    const totalBudget = budgets.reduce((sum, budget) => sum + budget.monthly_limit, 0);
    const totalSpent = budgets.reduce((sum, budget) => sum + budget.spent, 0);
    const accounts = calculateAccountBalances(data.accounts, data.entries);
    const goals = calculateGoalProgress(data.goals);
    const upcomingRecurringItems = getUpcomingRecurringItems(data.recurringItems);
    const totalNetWorth = accounts.reduce((sum, account) => sum + (account.current_balance ?? 0), 0);
    const forecast = calculateCashFlowForecast(totalNetWorth, data.recurringItems);
    const health = calculateFinancialHealth({
      income: cashFlow.income,
      expense: cashFlow.expense,
      budgetUsage: totalBudget > 0 ? totalSpent / totalBudget : 0,
      recurringExpense: forecast.recurringExpense,
      netWorth: totalNetWorth,
      projectedBalance: forecast.projectedBalance,
    });

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
      totalNetWorth,
      forecast,
      health,
    };
  }, [data]);

  return {
    ...finance,
    overview,
    isLoading,
    error,
  };
}
