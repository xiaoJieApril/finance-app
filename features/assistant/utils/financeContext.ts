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

export type PromptCardConfig = {
  id: string;
  label: string;
  description: string;
  userVisibleText: string;
  internalPrompt: string;
  mode: AssistantMode;
};

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
    isPrimary?: boolean;
    projectedMonths?: number | null;
    extraMonthlyNeeded?: number | null;
  }[];
  savingCoach: {
    dailyActions: { title: string; text: string; tone: string }[];
    pressurePoints: {
      category: string;
      reason: string;
      scorePercent: number;
      weeklySpent: number;
      monthlySpent: number;
      remaining: number;
    }[];
  };
  savingPlan: {
    targetAmount: number;
    targetRatePercent: number;
    requiredSavings: number;
    shortfall: number;
    dailyAllowance: number;
    weeklyAllowance: number;
    monthlyRemainingAllowance: number;
    status: string;
    estimated: boolean;
  };
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
    is_primary?: boolean;
    projectedMonths?: number | null;
    extraMonthlyNeeded?: number | null;
  }[];
  goalProjection?: {
    name: string;
    target_amount: number;
    current_amount: number;
    monthly_contribution?: number | null;
    progress: number;
    is_primary?: boolean;
    projectedMonths?: number | null;
    extraMonthlyNeeded?: number | null;
  }[];
  dailySavingActions?: { title: string; text: string; tone: string }[];
  pressurePoints?: {
    category?: { name: string } | null;
    reason: string;
    score: number;
    weeklySpent: number;
    monthlySpent: number;
    remaining: number;
  }[];
  savingPlan: {
    targetAmount: number;
    targetRate: number;
    requiredSavings: number;
    shortfall: number;
    estimated: boolean;
  };
  spendAllowance: {
    dailyAllowance: number;
    weeklyAllowance: number;
    monthlyRemaining: number;
    status: string;
  };
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
    goals: (overview.goalProjection ?? overview.goals).map((goal) => ({
      name: goal.name,
      targetAmount: goal.target_amount,
      currentAmount: goal.current_amount,
      monthlyContribution: goal.monthly_contribution,
      progressPercent: goal.progress * 100,
      isPrimary: goal.is_primary,
      projectedMonths: goal.projectedMonths,
      extraMonthlyNeeded: goal.extraMonthlyNeeded,
    })),
    savingCoach: {
      dailyActions: overview.dailySavingActions ?? [],
      pressurePoints: (overview.pressurePoints ?? []).map((point) => ({
        category: point.category?.name ?? '未分類',
        reason: point.reason,
        scorePercent: point.score * 100,
        weeklySpent: point.weeklySpent,
        monthlySpent: point.monthlySpent,
        remaining: point.remaining,
      })),
    },
    savingPlan: {
      targetAmount: overview.savingPlan.targetAmount,
      targetRatePercent: overview.savingPlan.targetRate * 100,
      requiredSavings: overview.savingPlan.requiredSavings,
      shortfall: overview.savingPlan.shortfall,
      dailyAllowance: overview.spendAllowance.dailyAllowance,
      weeklyAllowance: overview.spendAllowance.weeklyAllowance,
      monthlyRemainingAllowance: overview.spendAllowance.monthlyRemaining,
      status: overview.spendAllowance.status,
      estimated: overview.savingPlan.estimated,
    },
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
      note: 'AI may propose saving plan, budget, and spending rule changes. The app applies them only after explicit user confirmation.',
    },
  };

  return JSON.stringify(input, null, 2);
}

export const RECAP_PROMPTS: Record<ReviewPeriod, PromptCardConfig[]> = {
  week: [
    {
      id: 'week-overspend',
      label: '我這週哪裡花太多？',
      description: '分析本週支出壓力類別、異常交易和最該停手的地方。',
      userVisibleText: '我這週哪裡花太多？',
      internalPrompt: '請做本週存錢教練復盤：先指出本週花太多的類別與原因，再列出今天到週末最該控制的 3 個行動。若資料不足，請明確說需要哪些資料。',
      mode: 'review',
    },
    {
      id: 'week-saving-target',
      label: '我有沒有偏離存錢目標？',
      description: '檢查本週消費是否壓到本月應存金額和安全可花額。',
      userVisibleText: '我有沒有偏離存錢目標？',
      internalPrompt: '請檢查本週行為是否讓我偏離本月存錢目標：使用 savingPlan、savingCoach.dailyActions、pressurePoints 和最近交易，回答缺口、風險和下一步。',
      mode: 'review',
    },
    {
      id: 'week-next-actions',
      label: '下週我應該怎麼控支？',
      description: '產生下週可執行的控支清單，不做空泛建議。',
      userVisibleText: '下週我應該怎麼控支？',
      internalPrompt: '請根據本週資料產生下週控支計劃：列出 3 個具體行動、每個行動對應的類別或金額，語氣嚴格但不羞辱。',
      mode: 'review',
    },
    {
      id: 'week-full-review',
      label: '生成本週完整復盤',
      description: '整理收入、支出、異常、做得好的地方和行動建議。',
      userVisibleText: '幫我生成本週完整復盤',
      internalPrompt: '請產出完整本週財務復盤報告，優先回答：發生了什麼、風險在哪、接下來做什麼才能存到錢。',
      mode: 'review',
    },
  ],
  month: [
    {
      id: 'month-stop-spending',
      label: '本月最該停手的支出是什麼？',
      description: '找出前三個壓力類別，告訴你哪裡要立刻收緊。',
      userVisibleText: '本月最該停手的支出是什麼？',
      internalPrompt: '請找出本月最該停手或收緊的支出：優先使用 savingCoach.pressurePoints、budgets、spendingRules 和 transactions，輸出原因與今日可執行行動。',
      mode: 'review',
    },
    {
      id: 'month-saving-gap',
      label: '我有沒有偏離存錢目標？',
      description: '檢查本月應存、已存、差額和安全可花額。',
      userVisibleText: '我有沒有偏離存錢目標？',
      internalPrompt: '請檢查我本月是否偏離存錢目標：說明 requiredSavings、shortfall、dailyAllowance、monthlyRemainingAllowance，並給出補救行動。',
      mode: 'review',
    },
    {
      id: 'month-budget-review',
      label: '本月預算執行得如何？',
      description: '看預算使用率、超支類別和下半月控支重點。',
      userVisibleText: '本月預算執行得如何？',
      internalPrompt: '請分析本月預算執行情況：總預算使用率、超支或接近上限類別、支出規則狀態，最後給 3 個控支行動。',
      mode: 'review',
    },
    {
      id: 'month-full-review',
      label: '生成本月完整復盤',
      description: '整理本月現金流、壓力類別、存錢進度和下一步。',
      userVisibleText: '幫我生成本月完整復盤',
      internalPrompt: '請產出完整本月財務復盤報告，優先回答：本月是否能存到錢、最大風險、最該控制的類別、下一步行動。',
      mode: 'review',
    },
  ],
};

export const PLANNER_PROMPTS: PromptCardConfig[] = [
  {
    id: 'next-month-saving-plan',
    label: '幫我做下月存錢方案',
    description: '產生保守、平衡、積極三套預算，並估算能多存多少。',
    userVisibleText: '幫我做下月存錢方案',
    internalPrompt: '請產出下個月存錢導向預算方案：必須包含保守、平衡、積極儲蓄三套方案、savingPlanRecommendation、applyableBudgetChanges、expectedMonthlySavings，且只提出建議，不得說已修改資料。',
    mode: 'planner',
  },
  {
    id: 'save-extra-300',
    label: '我要多存 RM300，預算怎麼調？',
    description: '找出可以削減的類別和每週/每日限制。',
    userVisibleText: '我要多存 RM300，預算怎麼調？',
    internalPrompt: '請規劃如何在下個月多存 RM300：指出要降低哪些類別預算、可新增哪些 spending rules、預期每月多存多少，並保留必要支出。',
    mode: 'planner',
  },
  {
    id: 'top-cuts',
    label: '幫我找前三個可以削減的類別',
    description: '根據壓力點、預算和近期支出找最有效的削減位置。',
    userVisibleText: '幫我找前三個可以削減的類別',
    internalPrompt: '請找出下個月最適合削減預算的前三個類別：每個類別要有目前支出或壓力依據、建議新預算、削減金額與理由。',
    mode: 'planner',
  },
  {
    id: 'three-scenarios',
    label: '產生保守/平衡/積極三套方案',
    description: '比較三種儲蓄力度，讓我選一個再套用。',
    userVisibleText: '產生保守、平衡、積極三套方案',
    internalPrompt: '請專注產生三套下月預算方案：保守、平衡、積極儲蓄。每套都要有總預算、預期儲蓄、儲蓄率、適合情境與主要風險。',
    mode: 'planner',
  },
];

export function getRecapPrompt(period: ReviewPeriod): string {
  return period === 'week'
    ? '請產出完整本週財務復盤報告。先回答本週哪裡壓力最大、是否影響存錢目標、接下來 3 個具體行動。'
    : '請產出完整本月財務復盤報告。先回答本月是否能存到錢、最大支出風險、最該停手的類別、接下來 3 個具體行動。';
}

export function getPlannerPrompt(): string {
  return '請產出下個月的存錢導向預算方案。必須包含保守、平衡、積極儲蓄三套方案、可套用預算變更、存錢目標建議和預計多存多少；只提出建議，不要自動修改任何資料。';
}
