import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';

export const useBudget = () => {
  const queryClient = useQueryClient();

  // 1. 獲取目前登入用戶的每月預算
  const fetchBudget = useQuery({
    queryKey: ['monthly_budget'],
    queryFn: async (): Promise<number> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 3500.00; // 沒登入時的安全預設值

      const { data, error } = await supabase
        .from('monthly_budgets')
        .select('amount')
        .eq('user_id', user.id)
        .single();

      // 如果資料庫裡還沒有這名用戶的預算紀錄 (錯誤代碼 PGRST116)，就回傳預設值 3500
      if (error && error.code === 'PGRST116') {
        return 3500.00;
      }
      if (error) throw error;
      return data ? Number(data.amount) : 3500.00;
    },
  });

  // 2. 更新或新增預算 (使用 upsert：有資料就更新，沒資料就新增)
  const updateBudget = useMutation({
    mutationFn: async (amount: number) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('尚未登入，無法設定預算');

      const { error } = await supabase
        .from('monthly_budgets')
        .upsert({ user_id: user.id, amount: amount });

      if (error) throw error;
    },
    onSuccess: () => {
      // 成功後，自動刷新預算緩存，讓首頁進度條即時連動
      queryClient.invalidateQueries({ queryKey: ['monthly_budget'] });
    },
  });

  return { 
    budget: fetchBudget.data ?? 3500.00, 
    isLoading: fetchBudget.isLoading, 
    updateBudget 
  };
};