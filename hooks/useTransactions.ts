import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { Category, Transaction } from '../type'; // 確保引入了 Category

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

  // 2. 獲取所有類別 (提供給新增表單選擇用)
  const fetchCategories = useQuery({
    queryKey: ['categories'],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase.from('categories').select('*');
      if (error) throw error;
      return data;
    },
  });

// 3. 新增交易
const addTransaction = useMutation({
  mutationFn: async (newTx: Partial<Transaction>) => {
    
    // 🌟 新增這段：向 Supabase 索取目前登入使用者的真實身分
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('尚未登入，無法新增紀錄');

    // 🌟 把拿到的真實 user.id 塞進我們要存的資料裡
    const transactionWithUser = {
      ...newTx,
      user_id: user.id, // 綁定你的帳號！
    };

    const { data, error } = await supabase
      .from('transactions')
      .insert([transactionWithUser]);
      
    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    // 成功後，自動重新抓取最新的交易紀錄，讓首頁畫面即時更新
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  },
});

  return { fetchTransactions, fetchCategories, addTransaction };
};