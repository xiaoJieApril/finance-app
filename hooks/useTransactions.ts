import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import {
  addLocalCategory,
  addLocalTransaction,
  archiveLocalCategory,
  deleteLocalTransaction,
  getLocalCategories,
  getLocalTransactions,
  updateLocalCategory,
  updateLocalTransaction,
  syncUser,
} from '../services/offlineStore';
import { getZeroSpendDays, getZeroSpendSettings, reconcileZeroSpendDays, setZeroSpendEnabled, syncZeroSpendUser } from '../services/zeroSpendStore';
import { Category, Transaction } from '../type';

export const useTransactions = () => {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setUserId(data.session?.user.id ?? null);
    }).catch(() => { if (active) setUserId(null); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchTransactions = useQuery({
    queryKey: ['transactions', userId],
    enabled: Boolean(userId),
    queryFn: () => getLocalTransactions(userId!),
  });

  const fetchCategories = useQuery({
    queryKey: ['categories', userId],
    enabled: Boolean(userId),
    queryFn: () => getLocalCategories(userId!),
  });

  const fetchZeroSpendSettings = useQuery({
    queryKey: ['zero-spend-settings', userId],
    enabled: Boolean(userId),
    queryFn: () => getZeroSpendSettings(userId!),
  });

  const fetchZeroSpendDays = useQuery({
    queryKey: ['zero-spend-days', userId],
    enabled: Boolean(userId),
    queryFn: () => getZeroSpendDays(userId!),
  });

  const invalidate = () => {
    if (!userId) return;
    queryClient.invalidateQueries({ queryKey: ['transactions', userId] });
    queryClient.invalidateQueries({ queryKey: ['categories', userId] });
    void reconcileZeroSpendDays(userId).then(() => {
      queryClient.invalidateQueries({ queryKey: ['zero-spend-days', userId] });
      return syncZeroSpendUser(userId);
    }).catch(() => undefined);
    void syncUser(userId);
  };

  const toggleZeroSpend = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!userId) throw new Error('请先登录后再修改设置。');
      await setZeroSpendEnabled(userId, enabled);
      if (enabled) await reconcileZeroSpendDays(userId);
    },
    onSuccess: () => {
      if (!userId) return;
      queryClient.invalidateQueries({ queryKey: ['zero-spend-settings', userId] });
      queryClient.invalidateQueries({ queryKey: ['zero-spend-days', userId] });
      void syncZeroSpendUser(userId).catch(() => undefined);
    },
  });

  const addTransaction = useMutation({
    mutationFn: async (values: Omit<Transaction, 'id' | 'user_id' | 'updated_at' | 'category'>) => {
      if (!userId) throw new Error('请先登录后再保存记录。');
      return addLocalTransaction(userId, values);
    },
    onSuccess: invalidate,
  });

  const updateTransaction = useMutation({
    mutationFn: async (values: Partial<Transaction> & { id: string }) => {
      if (!userId) throw new Error('请先登录后再修改记录。');
      const { id, amount, note, date, category_id } = values;
      return updateLocalTransaction(userId, id, { amount, note, date, category_id });
    },
    onSuccess: invalidate,
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('请先登录后再删除记录。');
      return deleteLocalTransaction(userId, id);
    },
    onSuccess: invalidate,
  });

  const addCategory = useMutation({
    mutationFn: async (values: { name: string; type: Category['type'] }) => {
      if (!userId) throw new Error('请先登录后再新增类别。');
      return addLocalCategory(userId, values.name, values.type);
    },
    onSuccess: invalidate,
  });

  const updateCategory = useMutation({
    mutationFn: async (values: { id: string; name: string }) => {
      if (!userId) throw new Error('请先登录后再修改类别。');
      return updateLocalCategory(userId, values.id, values.name);
    },
    onSuccess: invalidate,
  });

  const archiveCategory = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('请先登录后再归档类别。');
      return archiveLocalCategory(userId, id);
    },
    onSuccess: invalidate,
  });

  return { userId, fetchTransactions, fetchCategories, fetchZeroSpendSettings, fetchZeroSpendDays, toggleZeroSpend, addTransaction, updateTransaction, deleteTransaction, addCategory, updateCategory, archiveCategory };
};
