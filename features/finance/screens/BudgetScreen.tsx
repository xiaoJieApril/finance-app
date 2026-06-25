import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BudgetProgressRow } from '@/features/finance/components/BudgetProgressRow';
import { EmptyState } from '@/features/finance/components/EmptyState';
import { FilterBar } from '@/features/finance/components/FilterBar';
import { SectionHeader } from '@/features/finance/components/SectionHeader';
import { AlertConfig, CustomAlert } from '@/shared/ui/CustomAlert';
import { useFinanceOverview } from '@/features/finance/hooks/useFinanceOverview';
import { FinanceBudget, FinanceCategory } from '@/features/finance/types';
import { formatMoney } from '@/features/finance/utils/finance';

export default function BudgetScreen() {
  const { overview, financeData, saveCategory, saveBudget, removeBudget, isLoading } = useFinanceOverview();
  const data = financeData.data;

  const [modalVisible, setModalVisible] = useState(false);
  const [editingBudget, setEditingBudget] = useState<FinanceBudget | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [budgetLimit, setBudgetLimit] = useState('');
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({ visible: false, title: '', message: '', type: 'info' });

  const expenseCategories = data?.categories.filter((category) => category.type === 'expense') ?? [];

  const resetForm = (nextCategoryId = expenseCategories[0]?.id ?? null) => {
    setEditingBudget(null);
    setCategoryId(nextCategoryId);
    setBudgetLimit('');
  };

  const openAddBudget = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditBudget = (budget: FinanceBudget) => {
    setEditingBudget(budget);
    setCategoryId(budget.category_id);
    setBudgetLimit(String(budget.monthly_limit));
    setModalVisible(true);
  };

  const saveLegacyCategoryBudget = async (category: FinanceCategory, monthlyLimit: number) => {
    await saveCategory.mutateAsync({
      id: category.legacy_category_id ? undefined : category.id,
      name: category.name,
      type: category.type,
      icon: category.icon,
      budget_limit: monthlyLimit,
      legacy_category_id: category.legacy_category_id,
    });
  };

  const handleSaveBudget = async () => {
    if (!categoryId) {
      setAlertConfig({ visible: true, title: '缺少類別', message: '請先建立或選擇支出類別。', type: 'warning' });
      return;
    }

    const monthlyLimit = Number(budgetLimit);
    if (Number.isNaN(monthlyLimit) || monthlyLimit < 0) {
      setAlertConfig({ visible: true, title: '金額錯誤', message: '請輸入有效預算金額。', type: 'warning' });
      return;
    }

    try {
      const category = expenseCategories.find((item) => item.id === categoryId);
      if (data?.source === 'legacy' || editingBudget?.id.startsWith('category-budget-')) {
        if (!category) throw new Error('找不到這個類別。');
        await saveLegacyCategoryBudget(category, monthlyLimit);
      } else {
        await saveBudget.mutateAsync({
          id: editingBudget?.id,
          category_id: categoryId,
          monthly_limit: monthlyLimit,
        });
      }

      setModalVisible(false);
      resetForm();
      setAlertConfig({ visible: true, title: editingBudget ? '已更新' : '已建立', message: '預算已儲存。', type: 'success' });
    } catch (error) {
      setAlertConfig({
        visible: true,
        title: '儲存失敗',
        message: error instanceof Error ? error.message : '請稍後再試。',
        type: 'error',
      });
    }
  };

  const handleDeleteBudget = () => {
    if (!editingBudget) return;
    Alert.alert('確認刪除', `確定要刪除「${editingBudget.category?.name ?? '未分類'}」的預算嗎？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          try {
            const category = expenseCategories.find((item) => item.id === editingBudget.category_id);
            if (data?.source === 'legacy' || editingBudget.id.startsWith('category-budget-')) {
              if (!category) throw new Error('找不到這個類別。');
              await saveLegacyCategoryBudget(category, 0);
            } else {
              await removeBudget.mutateAsync(editingBudget.id);
            }
            setModalVisible(false);
            resetForm();
            setAlertConfig({ visible: true, title: '已刪除', message: '預算已刪除。', type: 'success' });
          } catch (error) {
            setAlertConfig({
              visible: true,
              title: '刪除失敗',
              message: error instanceof Error ? error.message : '請稍後再試。',
              type: 'error',
            });
          }
        },
      },
    ]);
  };

  if (isLoading || !overview || !data) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  const overBudget = overview.budgets.filter((budget) => budget.spent > budget.monthly_limit);
  const nearLimit = overview.budgets.filter((budget) => budget.usage >= 0.8 && budget.spent <= budget.monthly_limit);

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 110 }}>
        <View className="flex-row justify-between items-start mb-5">
          <View className="flex-1">
            <Text className="text-3xl font-black text-slate-900">預算</Text>
            <Text className="text-sm text-slate-400 mt-2">追蹤類別限額與超支風險。</Text>
          </View>
          <TouchableOpacity
            onPress={openAddBudget}
            className="bg-indigo-600 px-4 py-3 rounded-2xl"
          >
            <Text className="text-white font-black">新增</Text>
          </TouchableOpacity>
        </View>

        {data.source === 'legacy' && (
          <View className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-5">
            <Text className="text-amber-700 font-bold">相容模式</Text>
            <Text className="text-amber-600 text-xs mt-1">目前顯示舊類別的 budget_limit；新增 v2 預算需先套用 migration。</Text>
          </View>
        )}

        <View className="flex-row gap-3 mb-5">
          <View className="flex-1 bg-white border border-slate-100 rounded-2xl p-4">
            <Text className="text-xs text-slate-400 font-bold mb-1">總預算</Text>
            <Text className="text-2xl font-black text-slate-900">{formatMoney(overview.totalBudget)}</Text>
          </View>
          <View className="flex-1 bg-white border border-slate-100 rounded-2xl p-4">
            <Text className="text-xs text-slate-400 font-bold mb-1">已使用</Text>
            <Text className="text-2xl font-black text-indigo-600">{Math.round(overview.budgetUsage * 100)}%</Text>
          </View>
        </View>

        <SectionHeader title="風險提醒" />
        {overBudget.length === 0 && nearLimit.length === 0 ? (
          <EmptyState title="目前沒有預算風險" message="所有支出仍在健康範圍內。" />
        ) : (
          <View className="mb-5">
            {overBudget.map((budget) => (
              <View key={budget.id} className="bg-rose-50 border border-rose-100 rounded-2xl p-4 mb-3">
                <Text className="font-black text-rose-700">{budget.category?.name ?? '未分類'} 已超支</Text>
                <Text className="text-rose-600 text-sm mt-1">超出 {formatMoney(budget.spent - budget.monthly_limit)}</Text>
              </View>
            ))}
            {nearLimit.map((budget) => (
              <View key={budget.id} className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-3">
                <Text className="font-black text-amber-700">{budget.category?.name ?? '未分類'} 接近上限</Text>
                <Text className="text-amber-600 text-sm mt-1">已使用 {Math.round(budget.usage * 100)}%</Text>
              </View>
            ))}
          </View>
        )}

        <SectionHeader title="類別預算" />
        {overview.budgets.length === 0 ? (
          <EmptyState title="尚未設定預算" message="新增支出類別並設定每月限額。" />
        ) : (
          overview.budgets
            .slice()
            .sort((a, b) => b.usage - a.usage)
            .map((budget) => (
              <TouchableOpacity key={budget.id} onPress={() => openEditBudget(budget)} activeOpacity={0.75}>
                <BudgetProgressRow
                  category={budget.category}
                  spent={budget.spent}
                  limit={budget.monthly_limit}
                />
              </TouchableOpacity>
            ))
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl p-5">
            <Text className="text-xl font-black text-slate-900 mb-4">{editingBudget ? '編輯預算' : '新增預算'}</Text>
            <Text className="text-sm font-bold text-slate-500 mb-2">支出類別</Text>
            {expenseCategories.length === 0 ? (
              <EmptyState title="沒有支出類別" message="請先到類別頁建立支出類別。" />
            ) : (
              <FilterBar
                options={expenseCategories.map((category) => ({ label: category.name, value: category.id }))}
                value={categoryId ?? expenseCategories[0]?.id}
                onChange={setCategoryId}
              />
            )}
            <Text className="text-sm font-bold text-slate-500 mb-2">每月預算限額</Text>
            <TextInput
              value={budgetLimit}
              onChangeText={setBudgetLimit}
              keyboardType="numeric"
              placeholder="0.00"
              className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-5"
            />
            <View className="flex-row gap-3">
              <TouchableOpacity onPress={() => setModalVisible(false)} className="flex-1 bg-slate-100 rounded-2xl p-4 items-center">
                <Text className="font-black text-slate-600">取消</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveBudget} className="flex-1 bg-indigo-600 rounded-2xl p-4 items-center">
                <Text className="font-black text-white">{saveBudget.isPending || saveCategory.isPending ? '儲存中...' : '儲存'}</Text>
              </TouchableOpacity>
            </View>
            {editingBudget && (
              <TouchableOpacity
                onPress={handleDeleteBudget}
                disabled={removeBudget.isPending || saveCategory.isPending}
                className="bg-rose-50 border border-rose-100 rounded-2xl p-4 items-center mt-3"
              >
                <Text className="font-black text-rose-600">
                  {removeBudget.isPending ? '刪除中...' : '刪除此預算'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      <CustomAlert config={alertConfig} hideAlert={() => setAlertConfig((prev) => ({ ...prev, visible: false }))} />
    </SafeAreaView>
  );
}
