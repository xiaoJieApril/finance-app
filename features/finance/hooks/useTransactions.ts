import { useMemo } from 'react';
import { Category, Transaction } from '@/features/finance/types';
import { entryBaseAmount } from '@/features/finance/utils/finance';
import { useFinanceData } from './useFinanceData';

function stableNumberId(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const legacyNumber = Number(value.replace('legacy-', ''));
  if (Number.isFinite(legacyNumber)) return legacyNumber;

  return Array.from(value).reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0);
}

export const useTransactions = () => {
  const finance = useFinanceData();
  const { data, isLoading, error, refetch } = finance.financeData;

  const categories = useMemo<Category[]>(
    () =>
      data?.categories.map((category, index) => ({
        id: category.legacy_category_id ?? stableNumberId(category.id, index),
        name: category.name,
        icon: category.icon,
        type: category.type,
        budget_limit: category.budget_limit,
      })) ?? [],
    [data?.categories],
  );

  const categoryById = useMemo(
    () => new Map(data?.categories.map((category, index) => [category.id, categories[index]]) ?? []),
    [categories, data?.categories],
  );

  const transactions = useMemo<Transaction[]>(
    () =>
      data?.entries.map((entry, index) => {
        const category = entry.category_id ? categoryById.get(entry.category_id) : undefined;

        return {
          id: entry.legacy_transaction_id ?? stableNumberId(entry.id, index),
          user_id: entry.user_id,
          category_id: category?.id,
          amount: entryBaseAmount(entry) || entry.amount,
          note: entry.note,
          date: entry.date,
          category,
          is_savings: entry.is_savings,
        };
      }) ?? [],
    [categoryById, data?.entries],
  );

  const unsupportedMutation = {
    mutate: () => undefined,
    mutateAsync: async () => {
      throw new Error('Legacy transaction mutations are no longer supported. Use v2 finance mutations instead.');
    },
    isPending: false,
  };

  return {
    fetchTransactions: { data: transactions, isLoading, error, refetch },
    fetchCategories: { data: categories, isLoading, error, refetch },
    addCategory: unsupportedMutation,
    addTransaction: unsupportedMutation,
    deleteTransaction: unsupportedMutation,
    updateTransaction: unsupportedMutation,
    updateCategory: unsupportedMutation,
    deleteCategory: unsupportedMutation,
  };
};
