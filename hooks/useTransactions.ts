import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { Category, Transaction } from '../type';

export const useTransactions = () => {
  const queryClient = useQueryClient();

  // 1. 獲取所有交易
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

  // 2. 獲取所有類別
  const fetchCategories = useQuery({
    queryKey: ['categories'],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase.from('categories').select('*');
      if (error) throw error;
      return data;
    },
  });

  // ==========================================
  // 🌟 新增：自訂類別功能
  // ==========================================
  const addCategory = useMutation({
    mutationFn: async (newCat: Partial<Category>) => {
      const { data, error } = await supabase.from('categories').insert([newCat]);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // 新增類別後，立刻刷新快取，讓下拉選單與列表即時更新
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  // ==========================================
  // 🌟 新增：修改類別 (updateCategory)
  // ==========================================
  const updateCategory = useMutation({
    mutationFn: async (updatedCat: Partial<Category> & { id: number }) => {
      const { id, ...fields } = updatedCat;
      const { data, error } = await supabase
        .from('categories')
        .update(fields)
        .eq('id', id);
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      // 如果類別的名稱或圖示改了，交易列表的 UI 也應該要刷新
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  // ==========================================
  // 🌟 新增：刪除類別 (deleteCategory)
  // ==========================================
  const deleteCategory = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  // 3. 新增交易
  const addTransaction = useMutation({
    mutationFn: async (newTx: Partial<Transaction>) => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('尚未登入，無法新增紀錄');

      const transactionWithUser = { ...newTx, user_id: user.id };
      const { data, error } = await supabase.from('transactions').insert([transactionWithUser]);
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  // 4. 刪除交易
  const deleteTransaction = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  // ==========================================
  // 🌟 5. 新增：修改交易
  // ==========================================
  const updateTransaction = useMutation({
    mutationFn: async (updatedTx: Partial<Transaction> & { id: number }) => {
      const { id, ...fields } = updatedTx;
      const { data, error } = await supabase
        .from('transactions')
        .update(fields)
        .eq('id', id);
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  return { fetchTransactions, 
            fetchCategories, 
            addCategory, 
            addTransaction, 
            deleteTransaction, 
            updateTransaction,
            updateCategory,
            deleteCategory };
};