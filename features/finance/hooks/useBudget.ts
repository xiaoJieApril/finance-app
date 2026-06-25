import { useMemo } from 'react';
import { useTransactions } from './useTransactions';

export const useBudget = () => {
  const { fetchCategories, fetchTransactions } = useTransactions();
  const { data: categories, isLoading: isCatLoading } = fetchCategories;
  const { data: transactions, isLoading: isTxLoading } = fetchTransactions;

  // 🌟 核心修改：動態計算總預算 (所有支出類別的 budget_limit 加總)
  const totalBudget = useMemo(() => {
    if (!categories) return 0;
    
    return categories
      .filter(cat => cat.type === 'expense') // 只計算支出類別
      .reduce((sum, cat) => sum + (cat.budget_limit || 0), 0); // 累加預算，若無設定隱式為 0
  }, [categories]);

  // 💡 順便計算當月的總支出 (供首頁進度條使用)
  const totalSpending = useMemo(() => {
    if (!transactions) return 0;

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    return transactions
      .filter(tx => {
        const txDate = new Date(tx.date);
        // 篩選出：1. 支出類型  2. 當天/當月資料
        return (
          tx.category?.type === 'expense' &&
          txDate.getMonth() === currentMonth &&
          txDate.getFullYear() === currentYear
        );
      })
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [transactions]);

  // 計算剩餘預算
  const remainingBudget = useMemo(() => {
    return totalBudget - totalSpending;
  }, [totalBudget, totalSpending]);

  return {
    totalBudget,
    totalSpending,
    remainingBudget,
    isLoading: isCatLoading || isTxLoading,
  };
};