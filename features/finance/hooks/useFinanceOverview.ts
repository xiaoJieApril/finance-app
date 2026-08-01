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
  calculateAvailableCashFlowExcludingSavings,
  calculateBudgetUsage,
  calculateCashFlowForecast,
  calculateCashFlow,
  calculateFinancialHealth,
  calculateGoalProgress,
  calculateAssetAllocation,
  calculateMonthlySavingPlan,
  calculateSpendAllowance,
  calculateSpendPressurePoints,
  calculateWealthSnapshot,
  getUpcomingRecurringItems,
  calculateGoalCompletionProjection,
  generateSpendingInsights,
  generateDailySavingActions,
  generateSavingCoachSignals,
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
    const availableCashFlowExcludingSavings = calculateAvailableCashFlowExcludingSavings(accounts, data.entries);
    const goals = calculateGoalProgress(data.goals);
    const wealth = calculateWealthSnapshot({ accounts, entries: data.entries, goals: data.goals });
    const assetAllocation = calculateAssetAllocation(accounts);
    const spendingInsights = generateSpendingInsights(data.entries);
    const upcomingRecurringItems = getUpcomingRecurringItems(data.recurringItems);
    const totalNetWorth = wealth.netWorth;
    const forecast = calculateCashFlowForecast(totalNetWorth, data.recurringItems);
    const savingPlan = calculateMonthlySavingPlan({
      cashFlow,
      goals,
      recurringItems: data.recurringItems,
      savingPlan: data.savingPlan,
    });
    const spendAllowance = calculateSpendAllowance({
      netWorth: totalNetWorth,
      cashFlow,
      recurringItems: data.recurringItems,
      savingPlanResult: savingPlan,
      bufferAmount: data.savingPlan?.buffer_amount,
    });
    const pressurePoints = calculateSpendPressurePoints({
      budgets,
      spendingRules: data.spendingRules,
      entries: data.entries,
    });
    const goalProjection = calculateGoalCompletionProjection({
      goals,
      savingPlanResult: savingPlan,
    });
    const dailySavingActions = generateDailySavingActions({
      allowance: spendAllowance,
      savingPlanResult: savingPlan,
      pressurePoints,
    });
    const savingCoachSignals = generateSavingCoachSignals({
      allowance: spendAllowance,
      savingPlanResult: savingPlan,
      budgets,
    });
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
      wealth,
      assetAllocation,
      spendingInsights,
      availableCashFlowExcludingSavings,
      budgets,
      goals,
      upcomingRecurringItems,
      totalBudget,
      totalBudgetSpent: totalSpent,
      budgetUsage: totalBudget > 0 ? totalSpent / totalBudget : 0,
      totalNetWorth,
      forecast,
      health,
      savingPlan,
      spendAllowance,
      pressurePoints,
      goalProjection,
      dailySavingActions,
      savingCoachSignals,
    };
  }, [data]);

  return {
    ...finance,
    overview,
    isLoading,
    error,
  };
}
