import { Category, Transaction } from '../../type';

export type ReviewPeriod = 'week' | 'month';

export type FinanceInput = {
  reviewType: 'weekly' | 'monthly';
  period: { startDate: string; endDate: string };
  income: number;
  expense: number;
  budget: number;
  transactions: {
    date: string;
    category: string;
    amount: number;
    description: string;
    type: 'income' | 'expense';
  }[];
};

type FinanceSummary = {
  totalBudget: number;
  totalSpending: number;
  remainingBudget: number;
  totalIncome: number;
  savingsTotal: number;
  categoryBreakdown: { name: string; amount: number; limit?: number }[];
  periodTransactions: FinanceInput['transactions'];
  periodLabel: string;
  startDate: string;
  endDate: string;
};

function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function filterByPeriod(transactions: Transaction[], period: ReviewPeriod): Transaction[] {
  const now = new Date();
  now.setHours(23, 59, 59, 999);

  if (period === 'week') {
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 6);
    weekAgo.setHours(0, 0, 0, 0);
    return transactions.filter((tx) => {
      const d = new Date(tx.date);
      return d >= weekAgo && d <= now;
    });
  }

  const month = now.getMonth();
  const year = now.getFullYear();
  return transactions.filter((tx) => {
    const d = new Date(tx.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
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

function buildSummary(
  transactions: Transaction[],
  categories: Category[],
  totalBudget: number,
  period: ReviewPeriod,
): FinanceSummary {
  const now = new Date();
  const periodTxs = filterByPeriod(transactions, period);
  const { startDate, endDate } = getPeriodDates(period);

  const periodLabel =
    period === 'week'
      ? `近 7 天（${new Date(now.getTime() - 6 * 86400000).toLocaleDateString('zh-TW')} ~ ${now.toLocaleDateString('zh-TW')}）`
      : `${now.getFullYear()} 年 ${now.getMonth() + 1} 月`;

  const totalSpending = periodTxs
    .filter((tx) => tx.category?.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalIncome = periodTxs
    .filter((tx) => tx.category?.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const savingsTotal = periodTxs
    .filter((tx) => tx.is_savings)
    .reduce((sum, tx) => sum + tx.amount, 0);

  const categoryMap = new Map<string, number>();
  periodTxs
    .filter((tx) => tx.category?.type === 'expense')
    .forEach((tx) => {
      const name = tx.category?.name ?? '未分類';
      categoryMap.set(name, (categoryMap.get(name) ?? 0) + tx.amount);
    });

  const categoryBreakdown = Array.from(categoryMap.entries())
    .map(([name, amount]) => {
      const cat = categories.find((c) => c.name === name && c.type === 'expense');
      return { name, amount, limit: cat?.budget_limit };
    })
    .sort((a, b) => b.amount - a.amount);

  const periodTransactions: FinanceInput['transactions'] = periodTxs.map((tx) => ({
    date: toISODate(new Date(tx.date)),
    category: tx.category?.name ?? '未分類',
    amount: tx.amount,
    description: tx.note || '（無備註）',
    type: (tx.category?.type === 'income' ? 'income' : 'expense') as 'income' | 'expense',
  }));

  const remainingBudget = period === 'month' ? totalBudget - totalSpending : totalBudget;

  return {
    totalBudget,
    totalSpending,
    remainingBudget,
    totalIncome,
    savingsTotal,
    categoryBreakdown,
    periodTransactions,
    periodLabel,
    startDate,
    endDate,
  };
}

export function buildFinanceInput(
  transactions: Transaction[],
  categories: Category[],
  totalBudget: number,
  period: ReviewPeriod = 'month',
): FinanceInput {
  const s = buildSummary(transactions, categories, totalBudget, period);

  return {
    reviewType: period === 'week' ? 'weekly' : 'monthly',
    period: { startDate: s.startDate, endDate: s.endDate },
    income: s.totalIncome,
    expense: s.totalSpending,
    budget: s.totalBudget,
    transactions: s.periodTransactions,
  };
}

export function buildFinanceContext(
  transactions: Transaction[],
  categories: Category[],
  totalBudget: number,
  period: ReviewPeriod = 'month',
): string {
  return JSON.stringify(buildFinanceInput(transactions, categories, totalBudget, period), null, 2);
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

export function getRecapPrompt(period: ReviewPeriod): string {
  return period === 'week'
    ? '請根據以上 JSON 數據，產出完整的本週財務復盤報告。'
    : '請根據以上 JSON 數據，產出完整的本月財務復盤報告。';
}
