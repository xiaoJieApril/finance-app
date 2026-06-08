import { Category, Transaction } from '../../type';

export type ReviewPeriod = 'week' | 'month';

type FinanceSummary = {
  totalBudget: number;
  totalSpending: number;
  remainingBudget: number;
  totalIncome: number;
  savingsTotal: number;
  categoryBreakdown: { name: string; amount: number; limit?: number }[];
  periodTransactions: { date: string; category: string; amount: number; note: string; type: string }[];
  periodLabel: string;
};

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

function buildSummary(
  transactions: Transaction[],
  categories: Category[],
  totalBudget: number,
  period: ReviewPeriod,
): FinanceSummary {
  const now = new Date();
  const periodTxs = filterByPeriod(transactions, period);

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

  const periodTransactions = periodTxs.map((tx) => ({
    date: new Date(tx.date).toLocaleDateString('zh-TW'),
    category: tx.category?.name ?? '未分類',
    amount: tx.amount,
    note: tx.note || '（無備註）',
    type: tx.category?.type ?? 'unknown',
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
  };
}

export function buildFinanceContext(
  transactions: Transaction[],
  categories: Category[],
  totalBudget: number,
  period: ReviewPeriod = 'month',
): string {
  const s = buildSummary(transactions, categories, totalBudget, period);

  const categoryLines = s.categoryBreakdown.length
    ? s.categoryBreakdown
        .map((c) => {
          const limitStr = c.limit ? ` / 月預算 RM ${c.limit.toFixed(2)}` : '';
          const usageStr =
            c.limit && c.limit > 0
              ? `（${((c.amount / c.limit) * 100).toFixed(0)}%）`
              : '';
          return `  - ${c.name}: RM ${c.amount.toFixed(2)}${limitStr}${usageStr}`;
        })
        .join('\n')
    : '  （此期間尚無支出紀錄）';

  const txLines = s.periodTransactions.length
    ? s.periodTransactions
        .map(
          (tx) =>
            `  - ${tx.date} | ${tx.type === 'income' ? '收入' : '支出'} | ${tx.category} | RM ${tx.amount.toFixed(2)} | ${tx.note}`,
        )
        .join('\n')
    : '  （此期間尚無交易紀錄）';

  const budgetSection =
    period === 'month' && s.totalBudget > 0
      ? `- 月預算: RM ${s.totalBudget.toFixed(2)}
- 剩餘預算: RM ${s.remainingBudget.toFixed(2)}
- 預算使用率: ${((s.totalSpending / s.totalBudget) * 100).toFixed(1)}%`
      : '- 月預算參考: 請以本月預算為基準評估本週花費節奏';

  return `
【復盤期間 — ${s.periodLabel}】
- 期間總支出: RM ${s.totalSpending.toFixed(2)}
- 期間總收入: RM ${s.totalIncome.toFixed(2)}
- 期間儲蓄: RM ${s.savingsTotal.toFixed(2)}
${budgetSection}

【各類別支出明細】
${categoryLines}

【期間內所有交易（共 ${s.periodTransactions.length} 筆）】
${txLines}
`.trim();
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
  return period === 'week' ? '請根據以上數據，幫我做一份完整的本週財務復盤報告。' : '請根據以上數據，幫我做一份完整的本月財務復盤報告。';
}
