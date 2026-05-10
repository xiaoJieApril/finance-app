import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { Transaction } from '../type';

export const useTransactions = () => {
  const queryClient = useQueryClient();

  // 獲取所有交易
  const fetchTransactions = useQuery({
    queryKey: ['transactions'],
    queryFn: async (): Promise<Transaction[]> => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, category:categories(*)')
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // 新增交易
  const addTransaction = useMutation({
    mutationFn: async (newTx: Partial<Transaction>) => {
      const { data, error } = await supabase
        .from('transactions')
        .insert([newTx]);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  return { fetchTransactions, addTransaction };
};