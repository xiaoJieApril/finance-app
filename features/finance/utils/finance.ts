/**
 * Pure finance calculations used by dashboards and summaries.
 *
 * Keep this file side-effect free so it can be reused by screens, hooks, and
 * future tests without needing Supabase or React Native.
 */
import {
  FinanceAccount,
  FinanceBudget,
  FinanceCategory,
  RecurringItem,
  SavingPlan,
  SavingsGoal,
  SpendingRule,
  TransactionEntry,
} from '@/features/finance/types';
import { isSameMonth } from './date';

type SavingCoachTone = 'safe' | 'tight' | 'danger';

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
      current_balance: account.initial_balance + movement,
    };
  });
}

export function calculateAvailableCashFlowExcludingSavings(
  accounts: FinanceAccount[],
  entries: TransactionEntry[],
) {
  const netWorth = accounts.reduce((sum, account) => sum + (account.current_balance ?? 0), 0);
  const markedSavings = entries
    .filter((entry) => entry.type === 'income' && entry.is_savings)
    .reduce((sum, entry) => sum + entryBaseAmount(entry), 0);

  return Math.max(netWorth - markedSavings, 0);
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

export function getRemainingMonthRecurringItems(items: RecurringItem[], month = new Date()) {
  const now = new Date();
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);
  now.setHours(0, 0, 0, 0);

  return items.filter((item) => {
    const due = new Date(item.next_due_date);
    return item.is_active && due >= now && due <= end;
  });
}

export function calculateCashFlowForecast(
  netWorth: number,
  recurringItems: RecurringItem[],
  month = new Date(),
) {
  const remainingRecurringItems = getRemainingMonthRecurringItems(recurringItems, month);
  const recurringIncome = remainingRecurringItems
    .filter((item) => item.type === 'income')
    .reduce((sum, item) => sum + item.amount, 0);
  const recurringExpense = remainingRecurringItems
    .filter((item) => item.type === 'expense')
    .reduce((sum, item) => sum + item.amount, 0);
  const projectedBalance = netWorth + recurringIncome - recurringExpense;
  const status =
    projectedBalance < 0
      ? 'danger'
      : projectedBalance < Math.max(recurringExpense * 0.2, 300)
        ? 'tight'
        : 'safe';

  return {
    recurringIncome,
    recurringExpense,
    projectedBalance,
    status,
    remainingRecurringItems,
  };
}

export function calculateFinancialHealth(params: {
  income: number;
  expense: number;
  budgetUsage: number;
  recurringExpense: number;
  netWorth: number;
  projectedBalance: number;
}) {
  const { income, expense, budgetUsage, recurringExpense, netWorth, projectedBalance } = params;
  const savingsRate = income > 0 ? Math.max((income - expense) / income, 0) : 0;
  const billPressure = netWorth > 0 ? recurringExpense / netWorth : recurringExpense > 0 ? 1 : 0;

  const budgetScore = Math.max(0, 35 - Math.max(budgetUsage - 0.75, 0) * 100);
  const savingsScore = Math.min(30, savingsRate * 100);
  const cashFlowScore = projectedBalance >= 0 ? 25 : 0;
  const billScore = Math.max(0, 10 - billPressure * 20);
  const score = Math.round(Math.min(100, budgetScore + savingsScore + cashFlowScore + billScore));
  const status = score >= 80 ? 'healthy' : score >= 55 ? 'watch' : 'risk';

  return {
    score,
    status,
    savingsRate,
    billPressure,
  };
}

export function calculateGoalProgress(goals: SavingsGoal[]) {
  return goals.map((goal) => {
    const remaining = Math.max(goal.target_amount - goal.current_amount, 0);
    const monthlyContribution = goal.monthly_contribution ?? 0;

    return {
      ...goal,
      progress: goal.target_amount > 0 ? Math.min(goal.current_amount / goal.target_amount, 1) : 0,
      remaining,
      projectedMonths: monthlyContribution > 0 ? Math.ceil(remaining / monthlyContribution) : null,
    };
  });
}

export type CashflowTimelineItem = {
  id: string;
  label: string;
  date: string;
  amount: number;
  type: 'income' | 'expense';
  balanceAfter: number;
  status: 'safe' | 'tight' | 'danger';
};

function timelineStatus(balance: number) {
  if (balance < 0) return 'danger';
  if (balance < 300) return 'tight';
  return 'safe';
}

export function buildCashflowTimeline(
  startingBalance: number,
  recurringItems: RecurringItem[],
  days = 30,
): CashflowTimelineItem[] {
  const now = new Date();
  const end = new Date();
  end.setDate(now.getDate() + days);
  now.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  const recurring = recurringItems
    .filter((item) => item.is_active)
    .map((item) => ({
      id: `recurring-${item.id}`,
      label: item.name,
      date: item.next_due_date,
      amount: item.type === 'income' ? item.amount : -item.amount,
      type: item.type,
    }));

  let runningBalance = startingBalance;

  return recurring
    .filter((item) => {
      const due = new Date(item.date);
      return due >= now && due <= end;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((item) => {
      runningBalance += item.amount;
      return {
        ...item,
        balanceAfter: runningBalance,
        status: timelineStatus(runningBalance),
      };
    });
}

export function calculateSafeToSpend(startingBalance: number, recurringItems: RecurringItem[], days = 14) {
  const upcoming = getUpcomingRecurringItems(recurringItems, days);
  const upcomingIncome = upcoming
    .filter((item) => item.type === 'income')
    .reduce((sum, item) => sum + item.amount, 0);
  const upcomingExpense = upcoming
    .filter((item) => item.type === 'expense')
    .reduce((sum, item) => sum + item.amount, 0);
  const safetyBuffer = Math.max(upcomingExpense * 0.2, 300);
  const safeAmount = Math.max(startingBalance + upcomingIncome - upcomingExpense - safetyBuffer, 0);

  return {
    safeAmount,
    dailySafeAmount: safeAmount / Math.max(days, 1),
    upcomingIncome,
    upcomingExpense,
    safetyBuffer,
    days,
  };
}

export function daysRemainingInMonth(date = new Date()) {
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return Math.max(end.getDate() - date.getDate() + 1, 1);
}

export function daysRemainingInWeek(date = new Date()) {
  return Math.max(7 - date.getDay(), 1);
}

function startOfWeek(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function getWeekEntries(entries: TransactionEntry[], date = new Date()) {
  const start = startOfWeek(date);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return entries.filter((entry) => {
    const entryDate = new Date(entry.date);
    return entryDate >= start && entryDate <= end;
  });
}

export function calculateMonthlySavingPlan(params: {
  cashFlow: { income: number; expense: number; balance: number };
  goals: ReturnType<typeof calculateGoalProgress>;
  recurringItems: RecurringItem[];
  savingPlan?: SavingPlan | null;
  date?: Date;
}) {
  const { cashFlow, goals, recurringItems, savingPlan, date = new Date() } = params;
  const remainingRecurring = getRemainingMonthRecurringItems(recurringItems, date);
  const remainingFixedIncome = remainingRecurring
    .filter((item) => item.type === 'income')
    .reduce((sum, item) => sum + item.amount, 0);
  const remainingFixedExpense = remainingRecurring
    .filter((item) => item.type === 'expense')
    .reduce((sum, item) => sum + item.amount, 0);
  const projectedIncome = cashFlow.income > 0 ? cashFlow.income + remainingFixedIncome : remainingFixedIncome;
  const plannedGoalContribution = goals.reduce((sum, goal) => sum + (goal.monthly_contribution ?? 0), 0);
  const targetRate = savingPlan?.target_rate ?? 0.2;
  const targetAmount =
    savingPlan?.mode === 'amount'
      ? savingPlan.target_amount
      : projectedIncome > 0
        ? projectedIncome * targetRate
        : savingPlan?.target_amount ?? 300;
  const requiredSavings = Math.max(targetAmount, plannedGoalContribution);
  const markedSavings = Math.max(
    cashFlow.income -
      cashFlow.expense -
      Math.max(cashFlow.balance - requiredSavings, 0),
    0,
  );
  const availableAfterCommitments = Math.max(
    cashFlow.income + remainingFixedIncome - cashFlow.expense - remainingFixedExpense - requiredSavings,
    0,
  );
  const shortfall = Math.max(requiredSavings - Math.max(cashFlow.balance, 0), 0);

  return {
    targetRate,
    targetAmount,
    requiredSavings,
    markedSavings: Math.min(markedSavings, requiredSavings),
    shortfall,
    remainingFixedIncome,
    remainingFixedExpense,
    availableAfterCommitments,
    estimated: cashFlow.income <= 0,
  };
}

export function calculateSpendAllowance(params: {
  netWorth: number;
  cashFlow: { income: number; expense: number; balance: number };
  recurringItems: RecurringItem[];
  savingPlanResult: ReturnType<typeof calculateMonthlySavingPlan>;
  bufferAmount?: number;
  date?: Date;
}) {
  const { netWorth, recurringItems, savingPlanResult, bufferAmount = 300, date = new Date() } = params;
  const remainingRecurring = getRemainingMonthRecurringItems(recurringItems, date);
  const remainingFixedIncome = remainingRecurring
    .filter((item) => item.type === 'income')
    .reduce((sum, item) => sum + item.amount, 0);
  const remainingFixedExpense = remainingRecurring
    .filter((item) => item.type === 'expense')
    .reduce((sum, item) => sum + item.amount, 0);
  const monthlyRemaining = Math.max(
    netWorth + remainingFixedIncome - remainingFixedExpense - savingPlanResult.requiredSavings - bufferAmount,
    0,
  );
  const monthDaysLeft = daysRemainingInMonth(date);
  const weekDaysLeft = daysRemainingInWeek(date);
  const dailyAllowance = monthlyRemaining / monthDaysLeft;
  const weeklyAllowance = Math.min(monthlyRemaining, dailyAllowance * weekDaysLeft);
  const status: SavingCoachTone = monthlyRemaining <= 0 ? 'danger' : dailyAllowance < 20 ? 'tight' : 'safe';

  return {
    dailyAllowance,
    weeklyAllowance,
    monthlyRemaining,
    bufferAmount,
    remainingFixedIncome,
    remainingFixedExpense,
    daysRemainingInMonth: monthDaysLeft,
    daysRemainingInWeek: weekDaysLeft,
    status,
  };
}

export function calculateGoalCompletionProjection(params: {
  goals: ReturnType<typeof calculateGoalProgress>;
  savingPlanResult: ReturnType<typeof calculateMonthlySavingPlan>;
  date?: Date;
}) {
  const { goals, savingPlanResult, date = new Date() } = params;
  const availableSavings = Math.max(savingPlanResult.markedSavings, 0);
  const activeGoals = goals.length || availableSavings <= 0 ? goals : goals;
  const sharedSavingsBoost = activeGoals.length > 0 ? availableSavings / activeGoals.length : 0;

  return activeGoals.map((goal) => {
    const monthlyContribution = goal.monthly_contribution ?? 0;
    const effectiveMonthlyContribution = monthlyContribution + sharedSavingsBoost;
    const projectedMonths = effectiveMonthlyContribution > 0
      ? Math.ceil(goal.remaining / effectiveMonthlyContribution)
      : null;
    const targetDate = goal.target_date ? new Date(goal.target_date) : null;
    const monthsToTarget = targetDate
      ? Math.max(
          (targetDate.getFullYear() - date.getFullYear()) * 12 +
            targetDate.getMonth() -
            date.getMonth() +
            (targetDate.getDate() >= date.getDate() ? 1 : 0),
          1,
        )
      : null;
    const requiredMonthlyToHitTarget = monthsToTarget ? goal.remaining / monthsToTarget : null;
    const extraMonthlyNeeded = requiredMonthlyToHitTarget != null
      ? Math.max(requiredMonthlyToHitTarget - monthlyContribution, 0)
      : null;

    return {
      ...goal,
      effectiveMonthlyContribution,
      projectedMonths,
      monthsToTarget,
      requiredMonthlyToHitTarget,
      extraMonthlyNeeded,
      calculationSource: {
        monthlyContribution,
        sharedSavingsBoost,
        markedSavings: savingPlanResult.markedSavings,
        remainingAmount: goal.remaining,
      },
    };
  });
}

export function calculateSpendPressurePoints(params: {
  budgets: ReturnType<typeof calculateBudgetUsage>;
  spendingRules: SpendingRule[];
  entries: TransactionEntry[];
  date?: Date;
}) {
  const { budgets, spendingRules, entries, date = new Date() } = params;
  const weekExpenseEntries = getWeekEntries(entries, date).filter((entry) => entry.type === 'expense');
  const ruleStatuses = evaluateSpendingRules(spendingRules, entries, date);

  return budgets
    .map((budget) => {
      const categoryRules = ruleStatuses.filter((rule) => rule.category_id === budget.category_id);
      const strongestRule = categoryRules.sort((a, b) => b.usage - a.usage)[0] ?? null;
      const weeklySpent = weekExpenseEntries
        .filter((entry) => entry.category_id === budget.category_id)
        .reduce((sum, entry) => sum + entryBaseAmount(entry), 0);
      const weeklyBudgetTarget = budget.monthly_limit > 0 ? budget.monthly_limit / 4.3 : 0;
      const weeklyUsage = weeklyBudgetTarget > 0 ? weeklySpent / weeklyBudgetTarget : 0;
      const score = Math.max(budget.usage, strongestRule?.usage ?? 0, weeklyUsage);
      const tone: SavingCoachTone = score >= 1 ? 'danger' : score >= 0.8 ? 'tight' : 'safe';
      const remaining = Math.min(budget.remaining, strongestRule?.remaining ?? budget.remaining);
      const reason = strongestRule && strongestRule.usage >= budget.usage
        ? `${strongestRule.period === 'day' ? '每日' : strongestRule.period === 'week' ? '每週' : '每月'}規則已用 ${Math.round(strongestRule.usage * 100)}%`
        : weeklyUsage > budget.usage
          ? `本週已用 ${Math.round(weeklyUsage * 100)}% 的合理週額`
          : `本月預算已用 ${Math.round(budget.usage * 100)}%`;

      return {
        category: budget.category,
        categoryId: budget.category_id,
        monthlySpent: budget.spent,
        monthlyLimit: budget.monthly_limit,
        monthlyUsage: budget.usage,
        weeklySpent,
        weeklyTarget: weeklyBudgetTarget,
        weeklyUsage,
        rule: strongestRule,
        remaining,
        score,
        tone,
        reason,
      };
    })
    .filter((point) => point.score >= 0.5 || point.weeklySpent > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

export function generateDailySavingActions(params: {
  allowance: ReturnType<typeof calculateSpendAllowance>;
  savingPlanResult: ReturnType<typeof calculateMonthlySavingPlan>;
  pressurePoints: ReturnType<typeof calculateSpendPressurePoints>;
}) {
  const { allowance, savingPlanResult, pressurePoints } = params;
  const actions: { tone: SavingCoachTone; title: string; text: string }[] = [];

  if (allowance.status === 'danger') {
    actions.push({
      tone: 'danger',
      title: '今天先停手',
      text: '固定支出、緩衝和本月應存扣完後，已沒有安全可花空間。只保留必要支出。',
    });
  } else {
    actions.push({
      tone: allowance.status,
      title: allowance.status === 'tight' ? '今天按上限走' : '今天可正常花',
      text: `今天控制在 ${formatMoney(allowance.dailyAllowance)} 內，本週最多 ${formatMoney(allowance.weeklyAllowance)}。`,
    });
  }

  const topPressure = pressurePoints[0];
  if (topPressure) {
    const categoryName = topPressure.category?.name ?? '高壓類別';
    actions.push({
      tone: topPressure.tone,
      title: `先管住${categoryName}`,
      text: `${topPressure.reason}，本月剩 ${formatMoney(topPressure.remaining)}。今天能不花就先不花。`,
    });
  }

  if (savingPlanResult.shortfall > 0) {
    actions.push({
      tone: 'tight',
      title: '補回存錢缺口',
      text: `本月還差 ${formatMoney(savingPlanResult.shortfall)} 才達標。先從非必要支出砍，不需要責怪自己。`,
    });
  }

  return actions.slice(0, 3);
}

export function generateSavingCoachSignals(params: {
  allowance: ReturnType<typeof calculateSpendAllowance>;
  savingPlanResult: ReturnType<typeof calculateMonthlySavingPlan>;
  budgets: ReturnType<typeof calculateBudgetUsage>;
}) {
  const { allowance, savingPlanResult, budgets } = params;
  const signals: { tone: 'safe' | 'tight' | 'danger'; text: string }[] = [];

  if (allowance.status === 'danger') {
    signals.push({ tone: 'danger', text: '今天先停手。固定支出和本月應存金額扣除後，已沒有安全可花空間。' });
  } else if (allowance.status === 'tight') {
    signals.push({ tone: 'tight', text: `今天建議控制在 ${formatMoney(allowance.dailyAllowance)} 內，避免壓到本月存錢目標。` });
  } else {
    signals.push({ tone: 'safe', text: `今天可花約 ${formatMoney(allowance.dailyAllowance)}，本週上限約 ${formatMoney(allowance.weeklyAllowance)}。` });
  }

  if (savingPlanResult.shortfall > 0) {
    signals.push({ tone: 'tight', text: `本月存錢目標還差 ${formatMoney(savingPlanResult.shortfall)}。先砍彈性支出，不需要責怪自己。` });
  }

  budgets
    .filter((budget) => budget.usage >= 0.8)
    .sort((a, b) => b.usage - a.usage)
    .slice(0, 1)
    .forEach((budget) => {
      signals.push({
        tone: budget.usage >= 1 ? 'danger' : 'tight',
        text: `${budget.category?.name ?? '某個類別'}已用 ${Math.round(budget.usage * 100)}%，接下來先減少這類支出。`,
      });
    });

  return signals.slice(0, 3);
}

function startOfRulePeriod(period: SpendingRule['period'], date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  if (period === 'month') return new Date(start.getFullYear(), start.getMonth(), 1);
  if (period === 'week') {
    const day = start.getDay();
    start.setDate(start.getDate() - day);
  }
  return start;
}

export function evaluateSpendingRules(rules: SpendingRule[], entries: TransactionEntry[], date = new Date()) {
  return rules.map((rule) => {
    const start = startOfRulePeriod(rule.period, date);
    const spent = entries
      .filter((entry) => entry.type === 'expense')
      .filter((entry) => !rule.category_id || entry.category_id === rule.category_id)
      .filter((entry) => new Date(entry.date) >= start && new Date(entry.date) <= date)
      .reduce((sum, entry) => sum + entryBaseAmount(entry), 0);
    const usage = rule.limit_amount > 0 ? spent / rule.limit_amount : 0;

    return {
      ...rule,
      spent,
      remaining: rule.limit_amount - spent,
      usage,
      status: usage >= 1 ? 'danger' : usage >= 0.8 ? 'tight' : 'safe',
    };
  });
}

export function simulateCashflowScenario(currentBalance: number, amount: number, type: 'income' | 'expense') {
  const signedAmount = type === 'income' ? amount : -amount;
  const projectedBalance = currentBalance + signedAmount;

  return {
    projectedBalance,
    status: timelineStatus(projectedBalance),
  };
}

export function formatMoney(amount: number | null | undefined, currency = 'RM') {
  return `${currency} ${(amount ?? 0).toFixed(2)}`;
}
