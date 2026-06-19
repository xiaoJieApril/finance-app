import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCategory,
  createTransaction,
  editCategory,
  editTransaction,
  financeQueryKeys,
  getCategories,
  getTransactions,
  removeCategory,
  removeTransaction,
} from '@/services/financeRepository';
import { Category, Transaction } from '@/type';

const invalidateTransactions = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: financeQueryKeys.transactions });
};

const invalidateCategories = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: financeQueryKeys.categories });
};

export const useTransactions = () => {
  const queryClient = useQueryClient();

  const fetchTransactions = useQuery({
    queryKey: financeQueryKeys.transactions,
    queryFn: getTransactions,
  });

  const fetchCategories = useQuery({
    queryKey: financeQueryKeys.categories,
    queryFn: getCategories,
  });

  const addCategory = useMutation({
    mutationFn: (newCategory: Partial<Category>) => createCategory(newCategory),
    onSuccess: () => {
      invalidateCategories(queryClient);
    },
  });

  const updateCategory = useMutation({
    mutationFn: (updatedCategory: Partial<Category> & { id: number }) =>
      editCategory(updatedCategory),
    onSuccess: () => {
      invalidateCategories(queryClient);
      invalidateTransactions(queryClient);
    },
  });

  const deleteCategory = useMutation({
    mutationFn: (id: number) => removeCategory(id),
    onSuccess: () => {
      invalidateCategories(queryClient);
      invalidateTransactions(queryClient);
    },
  });

  const addTransaction = useMutation({
    mutationFn: (newTransaction: Partial<Transaction>) => createTransaction(newTransaction),
    onSuccess: () => {
      invalidateTransactions(queryClient);
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: (id: number) => removeTransaction(id),
    onSuccess: () => {
      invalidateTransactions(queryClient);
    },
  });

  const updateTransaction = useMutation({
    mutationFn: (updatedTransaction: Partial<Transaction> & { id: number }) =>
      editTransaction(updatedTransaction),
    onSuccess: () => {
      invalidateTransactions(queryClient);
    },
  });

  return {
    fetchTransactions,
    fetchCategories,
    addCategory,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    updateCategory,
    deleteCategory,
  };
};
