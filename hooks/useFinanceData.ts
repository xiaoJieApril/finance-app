import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  archiveAccount,
  deleteTransactionEntry,
  financeQueryKeys,
  getFinanceData,
  upsertAccount,
  upsertBudget,
  upsertFinanceCategory,
  upsertRecurringItem,
  upsertSavingsGoal,
  upsertTransactionEntry,
} from '@/services/financeRepository';
import { TransactionEntry } from '@/type';

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

  const saveBudget = useMutation({
    mutationFn: upsertBudget,
    onSuccess: invalidate,
  });

  const saveGoal = useMutation({
    mutationFn: upsertSavingsGoal,
    onSuccess: invalidate,
  });

  const saveRecurringItem = useMutation({
    mutationFn: upsertRecurringItem,
    onSuccess: invalidate,
  });

  return {
    financeData,
    saveEntry,
    deleteEntry,
    saveAccount,
    removeAccount,
    saveCategory,
    saveBudget,
    saveGoal,
    saveRecurringItem,
  };
}
