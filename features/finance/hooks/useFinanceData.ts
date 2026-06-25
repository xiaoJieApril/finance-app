/**
 * React Query access layer for finance data.
 *
 * Exposes the main finance-data query plus mutations that invalidate the shared
 * finance cache after writes.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  archiveAccount,
  deleteBudget,
  deleteFinanceCategory,
  deleteRecurringItem,
  deleteSavingsGoal,
  deleteSpendingRule,
  deleteTransactionEntry,
  financeQueryKeys,
  getFinanceData,
  upsertAccount,
  upsertBudget,
  upsertFinanceCategory,
  upsertRecurringItem,
  upsertSavingsGoal,
  upsertSpendingRule,
  upsertTransactionEntry,
} from '@/features/finance/services/financeRepository';
import { FinanceCategory, TransactionEntry } from '@/features/finance/types';

export function useFinanceData() {
  const queryClient = useQueryClient();
  const financeData = useQuery({
    queryKey: financeQueryKeys.financeData,
    queryFn: getFinanceData,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: financeQueryKeys.financeData });
    queryClient.invalidateQueries({ queryKey: financeQueryKeys.transactions });
    queryClient.invalidateQueries({ queryKey: financeQueryKeys.categories });
    queryClient.invalidateQueries({ queryKey: financeQueryKeys.spendingRules });
  };

  const saveEntry = useMutation({
    mutationFn: upsertTransactionEntry,
    onSuccess: invalidate,
  });

  const deleteEntry = useMutation({
    mutationFn: (entry: TransactionEntry) => deleteTransactionEntry(entry),
    onSuccess: invalidate,
  });

  const saveAccount = useMutation({
    mutationFn: upsertAccount,
    onSuccess: invalidate,
  });

  const removeAccount = useMutation({
    mutationFn: archiveAccount,
    onSuccess: invalidate,
  });

  const saveCategory = useMutation({
    mutationFn: upsertFinanceCategory,
    onSuccess: invalidate,
  });

  const removeCategory = useMutation({
    mutationFn: (category: FinanceCategory) => deleteFinanceCategory(category),
    onSuccess: invalidate,
  });

  const saveBudget = useMutation({
    mutationFn: upsertBudget,
    onSuccess: invalidate,
  });

  const removeBudget = useMutation({
    mutationFn: deleteBudget,
    onSuccess: invalidate,
  });

  const saveGoal = useMutation({
    mutationFn: upsertSavingsGoal,
    onSuccess: invalidate,
  });

  const removeGoal = useMutation({
    mutationFn: deleteSavingsGoal,
    onSuccess: invalidate,
  });

  const saveRecurringItem = useMutation({
    mutationFn: upsertRecurringItem,
    onSuccess: invalidate,
  });

  const removeRecurringItem = useMutation({
    mutationFn: deleteRecurringItem,
    onSuccess: invalidate,
  });

  const saveSpendingRule = useMutation({
    mutationFn: upsertSpendingRule,
    onSuccess: invalidate,
  });

  const removeSpendingRule = useMutation({
    mutationFn: deleteSpendingRule,
    onSuccess: invalidate,
  });

  return {
    financeData,
    saveEntry,
    deleteEntry,
    saveAccount,
    removeAccount,
    saveCategory,
    removeCategory,
    saveBudget,
    removeBudget,
    saveGoal,
    removeGoal,
    saveRecurringItem,
    removeRecurringItem,
    saveSpendingRule,
    removeSpendingRule,
  };
}
