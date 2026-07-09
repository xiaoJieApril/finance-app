import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BudgetProgressRow } from '@/features/finance/components/BudgetProgressRow';
import { EmptyState } from '@/features/finance/components/EmptyState';
import { FilterBar } from '@/features/finance/components/FilterBar';
import { SectionHeader } from '@/features/finance/components/SectionHeader';
import { AlertConfig, CustomAlert } from '@/shared/ui/CustomAlert';
import { useFinanceOverview } from '@/features/finance/hooks/useFinanceOverview';
import { FinanceBudget, FinanceCategory, SpendingRule, SpendingRulePeriod } from '@/features/finance/types';
import { evaluateSpendingRules, formatMoney } from '@/features/finance/utils/finance';
import { developerText, showDeveloperTools } from '@/shared/config/appVariant';

export default function BudgetScreen() {
  const router = useRouter();
  const {
    overview,
    financeData,
    saveCategory,
    saveBudget,
    removeBudget,
    saveSpendingRule,
    removeSpendingRule,
    isLoading,
  } = useFinanceOverview();
  const data = financeData.data;

  const [modalVisible, setModalVisible] = useState(false);
  const [editingBudget, setEditingBudget] = useState<FinanceBudget | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [budgetLimit, setBudgetLimit] = useState('');
  const [ruleModalVisible, setRuleModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<SpendingRule | null>(null);
  const [ruleName, setRuleName] = useState('');
  const [ruleCategoryId, setRuleCategoryId] = useState<string | null>(null);
  const [rulePeriod, setRulePeriod] = useState<SpendingRulePeriod>('month');
  const [ruleLimit, setRuleLimit] = useState('');
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({ visible: false, title: '', message: '', type: 'info' });

  const expenseCategories = data?.categories.filter((category) => category.type === 'expense') ?? [];
  const ruleStatuses = data ? evaluateSpendingRules(data.spendingRules, data.entries) : [];

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

  const resetRuleForm = () => {
    setEditingRule(null);
    setRuleName('');
    setRuleCategoryId(expenseCategories[0]?.id ?? null);
    setRulePeriod('month');
    setRuleLimit('');
  };

  const openAddRule = () => {
    resetRuleForm();
    setRuleModalVisible(true);
  };

  const openEditRule = (rule: SpendingRule) => {
    setEditingRule(rule);
    setRuleName(rule.name);
    setRuleCategoryId(rule.category_id ?? expenseCategories[0]?.id ?? null);
    setRulePeriod(rule.period);
    setRuleLimit(String(rule.limit_amount));
    setRuleModalVisible(true);
  };

  const handleSaveRule = async () => {
    const limit = Number(ruleLimit);
    if (!ruleName.trim() || Number.isNaN(limit) || limit <= 0) {
      setAlertConfig({ visible: true, title: '規則資料不足', message: '請輸入規則名稱與有效上限。', type: 'warning' });
      return;
    }

    try {
      await saveSpendingRule.mutateAsync({
        id: editingRule?.id,
        name: ruleName.trim(),
        category_id: ruleCategoryId,
        period: rulePeriod,
        limit_amount: limit,
      });
      setRuleModalVisible(false);
      resetRuleForm();
      setAlertConfig({ visible: true, title: editingRule ? '已更新' : '已建立', message: '支出規則已儲存。', type: 'success' });
    } catch (error) {
      setAlertConfig({
        visible: true,
        title: '儲存失敗',
        message: data?.source === 'legacy'
          ? developerText('請先套用 feature expansion migration 後再新增支出規則。', '支出規則暫時無法使用，請稍後再試。')
          : developerText(error instanceof Error ? error.message : '請稍後再試。', '支出規則暫時無法儲存，請稍後再試。'),
        type: 'error',
      });
    }
  };

  const handleDeleteRule = () => {
    if (!editingRule) return;

    Alert.alert('確認刪除', `確定要刪除「${editingRule.name}」規則嗎？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeSpendingRule.mutateAsync(editingRule.id);
            setRuleModalVisible(false);
            resetRuleForm();
            setAlertConfig({ visible: true, title: '已刪除', message: '支出規則已刪除。', type: 'success' });
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
  const weeklyPressure = overview.pressurePoints.filter((point) => point.weeklySpent > 0);

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 110 }}>
        <View className="flex-row justify-between items-start mb-5">
          <View className="flex-1">
            <Text className="text-3xl font-black text-slate-900">預算</Text>
            <Text className="text-sm text-slate-400 mt-2">追蹤類別限額與超支風險。</Text>
          </View>
          <View className="items-end gap-2">
            <TouchableOpacity
              onPress={() => router.push('/categories')}
              className="bg-white border border-indigo-100 px-4 py-2 rounded-2xl"
            >
              <Text className="text-indigo-600 font-black">管理類別</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={openAddBudget}
              className="bg-indigo-600 px-4 py-3 rounded-2xl"
            >
              <Text className="text-white font-black">新增預算</Text>
            </TouchableOpacity>
          </View>
        </View>

        {expenseCategories.length === 0 && (
          <TouchableOpacity
            onPress={() => router.push('/categories')}
            className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-5"
          >
            <Text className="text-indigo-700 font-black">先建立支出類別</Text>
            <Text className="text-indigo-500 text-xs mt-1 leading-5">
              預算需要綁定支出類別。點這裡建立餐飲、交通、購物等類別。
            </Text>
          </TouchableOpacity>
        )}

        {data.source === 'legacy' && (
          <View className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-5">
            <Text className="text-amber-700 font-bold">相容模式</Text>
            <Text className="text-amber-600 text-xs mt-1">
              {developerText('目前顯示舊類別的 budget_limit；新增 v2 預算需先套用 migration。', '部分預算功能暫時無法使用，請稍後再試。')}
            </Text>
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

        <SectionHeader title="削減優先級" />
        {overview.pressurePoints.length === 0 ? (
          <EmptyState title="暫無壓力點" message="設定預算或支出規則後，我會指出最該削減的前三類。" />
        ) : (
          <View className="mb-5">
            {overview.pressurePoints.map((point, index) => (
              <View key={point.categoryId} className="bg-white border border-slate-100 rounded-2xl p-4 mb-3">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-[11px] font-black text-slate-400 mb-1">#{index + 1} 先削這類</Text>
                    <Text className="font-black text-slate-800">{point.category?.name ?? '未分類'}</Text>
                    <Text className="text-xs text-slate-500 mt-1">{point.reason}</Text>
                  </View>
                  <Text className={`font-black ${point.tone === 'danger' ? 'text-rose-600' : point.tone === 'tight' ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {Math.round(point.score * 100)}%
                  </Text>
                </View>
                <View className="flex-row gap-2 mt-3">
                  <View className="flex-1 bg-slate-50 rounded-xl p-3">
                    <Text className="text-[11px] text-slate-400 font-bold">本週已花</Text>
                    <Text className="font-black text-slate-800 mt-1">{formatMoney(point.weeklySpent)}</Text>
                  </View>
                  <View className="flex-1 bg-slate-50 rounded-xl p-3">
                    <Text className="text-[11px] text-slate-400 font-bold">本月剩餘</Text>
                    <Text className="font-black text-slate-800 mt-1">{formatMoney(point.remaining)}</Text>
                  </View>
                </View>
                {showDeveloperTools && (
                  <Text className="text-[11px] text-slate-400 mt-3">
                    monthlyUsage={Math.round(point.monthlyUsage * 100)}%; weeklyUsage={Math.round(point.weeklyUsage * 100)}%; ruleUsage={point.rule ? Math.round(point.rule.usage * 100) : 'none'}%
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        <SectionHeader title="本週控支" />
        {weeklyPressure.length === 0 ? (
          <EmptyState title="本週還沒有明顯支出" message="新增流水後，這裡會用週視角提醒你哪一類正在跑太快。" />
        ) : (
          <View className="mb-5">
            {weeklyPressure.map((point) => (
              <View key={`week-${point.categoryId}`} className="bg-white border border-slate-100 rounded-2xl p-4 mb-3">
                <View className="flex-row justify-between mb-2">
                  <Text className="font-black text-slate-800">{point.category?.name ?? '未分類'}</Text>
                  <Text className={point.weeklyUsage >= 1 ? 'font-black text-rose-600' : point.weeklyUsage >= 0.8 ? 'font-black text-amber-600' : 'font-black text-emerald-600'}>
                    {Math.round(point.weeklyUsage * 100)}%
                  </Text>
                </View>
                <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <View
                    className={point.weeklyUsage >= 1 ? 'h-full bg-rose-500' : point.weeklyUsage >= 0.8 ? 'h-full bg-amber-500' : 'h-full bg-emerald-500'}
                    style={{ width: `${Math.min(point.weeklyUsage * 100, 100)}%` }}
                  />
                </View>
                <Text className="text-xs text-slate-400 mt-2">
                  本週 {formatMoney(point.weeklySpent)} / 合理週額 {formatMoney(point.weeklyTarget)}
                </Text>
              </View>
            ))}
          </View>
        )}

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

        <SectionHeader title="支出規則" actionLabel="新增規則" onAction={openAddRule} />
        {ruleStatuses.length === 0 ? (
          <EmptyState title="尚未設定支出規則" message="例如餐飲每天 RM30、娛樂每週 RM100。" />
        ) : (
          ruleStatuses.map((rule) => (
            <TouchableOpacity key={rule.id} onPress={() => openEditRule(rule)} className="bg-white border border-slate-100 rounded-2xl p-4 mb-3">
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="font-black text-slate-800">{rule.name}</Text>
                  <Text className="text-xs text-slate-400 mt-1">
                    {rule.category?.name ?? '全部支出'} · {rule.period === 'day' ? '每日' : rule.period === 'week' ? '每週' : '每月'}
                  </Text>
                </View>
                <Text className={`font-black ${rule.status === 'danger' ? 'text-rose-600' : rule.status === 'tight' ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {Math.round(rule.usage * 100)}%
                </Text>
              </View>
              <View className="h-2 bg-slate-100 rounded-full overflow-hidden mt-3 mb-2">
                <View
                  className={`h-full rounded-full ${rule.status === 'danger' ? 'bg-rose-500' : rule.status === 'tight' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(rule.usage * 100, 100)}%` }}
                />
              </View>
              <Text className="text-xs text-slate-400">
                已用 {formatMoney(rule.spent)} / 上限 {formatMoney(rule.limit_amount)}
              </Text>
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

      <Modal visible={ruleModalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl p-5">
            <Text className="text-xl font-black text-slate-900 mb-4">{editingRule ? '編輯支出規則' : '新增支出規則'}</Text>
            <Text className="text-sm font-bold text-slate-500 mb-2">規則名稱</Text>
            <TextInput
              value={ruleName}
              onChangeText={setRuleName}
              placeholder="例如：餐飲每日上限"
              className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4"
            />
            <Text className="text-sm font-bold text-slate-500 mb-2">類別</Text>
            {expenseCategories.length === 0 ? (
              <EmptyState title="沒有支出類別" message="請先建立支出類別。" />
            ) : (
              <FilterBar
                options={expenseCategories.map((category) => ({ label: category.name, value: category.id }))}
                value={ruleCategoryId ?? expenseCategories[0]?.id}
                onChange={setRuleCategoryId}
              />
            )}
            <Text className="text-sm font-bold text-slate-500 mb-2">週期</Text>
            <FilterBar
              options={[
                { label: '每日', value: 'day' },
                { label: '每週', value: 'week' },
                { label: '每月', value: 'month' },
              ]}
              value={rulePeriod}
              onChange={setRulePeriod}
            />
            <Text className="text-sm font-bold text-slate-500 mb-2">支出上限</Text>
            <TextInput
              value={ruleLimit}
              onChangeText={setRuleLimit}
              keyboardType="numeric"
              placeholder="0.00"
              className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-5"
            />
            <View className="flex-row gap-3">
              <TouchableOpacity onPress={() => setRuleModalVisible(false)} className="flex-1 bg-slate-100 rounded-2xl p-4 items-center">
                <Text className="font-black text-slate-600">取消</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveRule} className="flex-1 bg-indigo-600 rounded-2xl p-4 items-center">
                <Text className="font-black text-white">{saveSpendingRule.isPending ? '儲存中...' : '儲存'}</Text>
              </TouchableOpacity>
            </View>
            {editingRule && (
              <TouchableOpacity
                onPress={handleDeleteRule}
                disabled={removeSpendingRule.isPending}
                className="bg-rose-50 border border-rose-100 rounded-2xl p-4 items-center mt-3"
              >
                <Text className="font-black text-rose-600">
                  {removeSpendingRule.isPending ? '刪除中...' : '刪除此規則'}
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
