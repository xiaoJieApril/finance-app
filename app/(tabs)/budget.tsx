import React, { useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BudgetProgressRow } from '@/components/finance/BudgetProgressRow';
import { EmptyState } from '@/components/finance/EmptyState';
import { FilterBar } from '@/components/finance/FilterBar';
import { SectionHeader } from '@/components/finance/SectionHeader';
import { AlertConfig, CustomAlert } from '@/components/ui/CustomAlert';
import { DEFAULT_CATEGORY_ICON } from '@/constants/categoryIcons';
import { useFinanceOverview } from '@/hooks/useFinanceOverview';
import { CategoryType } from '@/type';
import { formatMoney } from '@/utils/finance';

const CATEGORY_TYPE_OPTIONS = [
  { label: '支出', value: 'expense' },
  { label: '收入', value: 'income' },
] as const;

export default function BudgetScreen() {
  const { overview, financeData, saveCategory, saveBudget, isLoading } = useFinanceOverview();
  const data = financeData.data;

  const [modalVisible, setModalVisible] = useState(false);
  const [categoryType, setCategoryType] = useState<CategoryType>('expense');
  const [name, setName] = useState('');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({ visible: false, title: '', message: '', type: 'info' });

  const resetForm = () => {
    setCategoryType('expense');
    setName('');
    setBudgetLimit('');
  };

  const handleSaveCategory = async () => {
    if (!name.trim()) {
      setAlertConfig({ visible: true, title: '缺少名稱', message: '請輸入類別名稱。', type: 'warning' });
      return;
    }

    try {
      const category = await saveCategory.mutateAsync({
        name: name.trim(),
        type: categoryType,
        icon: DEFAULT_CATEGORY_ICON,
        budget_limit: categoryType === 'expense' ? Number(budgetLimit) || 0 : 0,
      });

      if (categoryType === 'expense' && Number(budgetLimit) > 0) {
        await saveBudget.mutateAsync({
          category_id: category.id,
          monthly_limit: Number(budgetLimit),
        });
      }

      setModalVisible(false);
      resetForm();
      setAlertConfig({ visible: true, title: '已建立', message: '類別與預算已儲存。', type: 'success' });
    } catch (error) {
      setAlertConfig({
        visible: true,
        title: '儲存失敗',
        message: data?.source === 'legacy' ? '請先套用 v2 Supabase migration 後再新增預算。' : error instanceof Error ? error.message : '請稍後再試。',
        type: 'error',
      });
    }
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
            onPress={() => setModalVisible(true)}
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
              <BudgetProgressRow
                key={budget.id}
                category={budget.category}
                spent={budget.spent}
                limit={budget.monthly_limit}
              />
            ))
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl p-5">
            <Text className="text-xl font-black text-slate-900 mb-4">新增類別 / 預算</Text>
            <FilterBar options={[...CATEGORY_TYPE_OPTIONS]} value={categoryType} onChange={setCategoryType} />
            <Text className="text-sm font-bold text-slate-500 mb-2">類別名稱</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="例如：餐飲、交通、薪水"
              className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4"
            />
            {categoryType === 'expense' && (
              <>
                <Text className="text-sm font-bold text-slate-500 mb-2">每月預算限額</Text>
                <TextInput
                  value={budgetLimit}
                  onChangeText={setBudgetLimit}
                  keyboardType="numeric"
                  placeholder="0.00"
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-5"
                />
              </>
            )}
            <View className="flex-row gap-3">
              <TouchableOpacity onPress={() => setModalVisible(false)} className="flex-1 bg-slate-100 rounded-2xl p-4 items-center">
                <Text className="font-black text-slate-600">取消</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveCategory} className="flex-1 bg-indigo-600 rounded-2xl p-4 items-center">
                <Text className="font-black text-white">儲存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <CustomAlert config={alertConfig} hideAlert={() => setAlertConfig((prev) => ({ ...prev, visible: false }))} />
    </SafeAreaView>
  );
}
