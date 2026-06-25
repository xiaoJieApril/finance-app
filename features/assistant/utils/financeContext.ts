/**
 * Converts finance data into compact context for AI review and planning.
 *
 * The assistant receives normalized summaries instead of reading raw app state
 * directly. This keeps prompt inputs stable while the finance feature evolves.
 */
import { FinanceData, TransactionEntry } from '@/features/finance/types';
import { entryBaseAmount } from '@/features/finance/utils/finance';

export type ReviewPeriod = 'week' | 'month';
export type AssistantMode = 'review' | 'planner';

type BudgetContextRow = {
  categoryId: string;
  category: string;
  currentBudget: number;
  spent: number;
  remaining: number;
  usagePercent: number;
};

type FinanceContextInput = {
  mode: AssistantMode;
  reviewType: 'weekly' | 'monthly';
  period: { startDate: string; endDate: string };
  cashflow: {
    income: number;
    expense: number;
    netCashFlow: number;
    savingsRatePercent: number | null;
  };
  budgets: {
    totalBudget: number;
    totalSpent: number;
    usagePercent: number;
    categoryBudgets: BudgetContextRow[];
  };
  accounts: {
    totalNetWorth: number;
    rows: {
      name: string;
      type: string;
      currency: string;
      balance: number;
      outstandingBalance?: number | null;
      minimumPayment?: number | null;
      paymentDueDay?: number | null;
      interestRate?: number | null;
    }[];
  };
  goals: {
    name: string;
    targetAmount: number;
    currentAmount: number;
    monthlyContribution?: number | null;
    progressPercent: number;
  }[];
  spendingRules: {
    name: string;
    category: string;
    period: string;
    limitAmount: number;
  }[];
  recurring: {
    forecastedIncome: number;
    forecastedExpense: number;
    projectedBalance: number;
    items: { name: string; type: string; amount: number; frequency: string; nextDueDate: string }[];
  };
  transactions: {
    date: string;
    category: string;
    amount: number;
    description: string;
    type: 'income' | 'expense' | 'transfer';
  }[];
  planningSafety: {
    readOnly: true;
    note: string;
  };
};

type OverviewSnapshot = {
  cashFlow: { income: number; expense: number; balance: number };
  accounts: {
    name: string;
    type: string;
    currency: string;
    current_balance?: number | null;
    outstanding_balance?: number | null;
    minimum_payment?: number | null;
    payment_due_day?: number | null;
    interest_rate?: number | null;
  }[];
  budgets: {
    category_id: string;
    monthly_limit: number;
    spent: number;
    remaining: number;
    usage: number;
    category?: { name: string } | null;
  }[];
  goals: {
    name: string;
    target_amount: number;
    current_amount: number;
    monthly_contribution?: number | null;
    progress: number;
  }[];
  totalBudget: number;
  totalBudgetSpent: number;
  budgetUsage: number;
  totalNetWorth: number;
  forecast: { recurringIncome: number; recurringExpense: number; projectedBalance: number };
};

function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getPeriodDates(period: ReviewPeriod): { startDate: string; endDate: string } {
  const now = new Date();
  now.setHours(23, 59, 59, 999);

  if (period === 'week') {
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 6);
    weekAgo.setHours(0, 0, 0, 0);
    return { startDate: toISODate(weekAgo), endDate: toISODate(now) };
  }

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { startDate: toISODate(start), endDate: toISODate(now) };
}

function filterEntriesByPeriod(entries: TransactionEntry[], period: ReviewPeriod) {
  const { startDate, endDate } = getPeriodDates(period);
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  return entries.filter((entry) => {
    const date = new Date(entry.date);
    return date >= start && date <= end;
  });
}

function toTransactionContext(entries: TransactionEntry[], period: ReviewPeriod) {
  return filterEntriesByPeriod(entries, period).map((entry) => ({
    date: toISODate(new Date(entry.date)),
    category:
      entry.type === 'transfer'
        ? `${entry.account?.name ?? '帳戶'} -> ${entry.to_account?.name ?? '帳戶'}`
        : entry.category?.name ?? '未分類',
    amount: entryBaseAmount(entry) || entry.amount,
    description: entry.note || '（無備註）',
    type: entry.type,
  }));
}

export function buildFinanceContext(params: {
  data: FinanceData;
  overview: OverviewSnapshot;
  mode: AssistantMode;
  period?: ReviewPeriod;
}): string {
  const { data, overview, mode, period = 'month' } = params;
  const { startDate, endDate } = getPeriodDates(period);
  const savingsRatePercent =
    overview.cashFlow.income > 0 ? (overview.cashFlow.balance / overview.cashFlow.income) * 100 : null;

  const input: FinanceContextInput = {
    mode,
    reviewType: period === 'week' ? 'weekly' : 'monthly',
    period: { startDate, endDate },
    cashflow: {
      income: overview.cashFlow.income,
      expense: overview.cashFlow.expense,
      netCashFlow: overview.cashFlow.balance,
      savingsRatePercent,
    },
    budgets: {
      totalBudget: overview.totalBudget,
      totalSpent: overview.totalBudgetSpent,
      usagePercent: overview.budgetUsage * 100,
      categoryBudgets: overview.budgets.map((budget) => ({
        categoryId: budget.category_id,
        category: budget.category?.name ?? '未分類',
        currentBudget: budget.monthly_limit,
        spent: budget.spent,
        remaining: budget.remaining,
        usagePercent: budget.usage * 100,
      })),
    },
    accounts: {
      totalNetWorth: overview.totalNetWorth,
      rows: overview.accounts.map((account) => ({
        name: account.name,
        type: account.type,
        currency: account.currency,
        balance: account.current_balance ?? 0,
        outstandingBalance: account.outstanding_balance,
        minimumPayment: account.minimum_payment,
        paymentDueDay: account.payment_due_day,
        interestRate: account.interest_rate,
      })),
    },
    goals: overview.goals.map((goal) => ({
      name: goal.name,
      targetAmount: goal.target_amount,
      currentAmount: goal.current_amount,
      monthlyContribution: goal.monthly_contribution,
      progressPercent: goal.progress * 100,
    })),
    spendingRules: data.spendingRules.map((rule) => ({
      name: rule.name,
      category: rule.category?.name ?? '全部支出',
      period: rule.period,
      limitAmount: rule.limit_amount,
    })),
    recurring: {
      forecastedIncome: overview.forecast.recurringIncome,
      forecastedExpense: overview.forecast.recurringExpense,
      projectedBalance: overview.forecast.projectedBalance,
      items: data.recurringItems.map((item) => ({
        name: item.name,
        type: item.type,
        amount: item.amount,
        frequency: item.frequency,
        nextDueDate: item.next_due_date,
      })),
    },
    transactions: toTransactionContext(data.entries, period),
    planningSafety: {
      readOnly: true,
      note: 'AI may propose budget changes, but the app must not apply them automatically.',
    },
  };

  return JSON.stringify(input, null, 2);
}

export const RECAP_PROMPTS: Record<ReviewPeriod, string[]> = {
  week: [
    '幫我做本週財務復盤',
    '本週哪些類別花費異常？',
    '本週有什麼值得改善的消費習慣？',
    '根據本週數據，下週預算怎麼分配？',
  ],
  month: [
    '幫我做本月財務復盤',
    '本月預算執行得如何？',
    '本月最大的支出問題是什麼？',
    '根據本月數據，下個月該怎麼調整？',
  ],
};

export const PLANNER_PROMPTS = [
  '幫我規劃下個月預算',
  '根據我的支出習慣，預算應該怎麼分配？',
  '哪些類別應該減少預算？',
  '我要提高儲蓄率，預算怎麼調整？',
];

export function getRecapPrompt(period: ReviewPeriod): string {
  return period === 'week'
    ? '請根據以上 JSON 數據，產出完整的本週財務復盤報告。'
    : '請根據以上 JSON 數據，產出完整的本月財務復盤報告。';
}

export function getPlannerPrompt(): string {
  return '請根據以上 JSON 數據，產出下個月的月度預算規劃方案。只提出建議，不要自動修改任何資料。';
}
