import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '@/features/finance/components/EmptyState';
import { FilterBar } from '@/features/finance/components/FilterBar';
import { SectionHeader } from '@/features/finance/components/SectionHeader';
import { AlertConfig, CustomAlert } from '@/shared/ui/CustomAlert';
import { useFinanceOverview } from '@/features/finance/hooks/useFinanceOverview';
import { SavingsGoal, SavingsGoalType } from '@/features/finance/types';
import { formatMoney } from '@/features/finance/utils/finance';
import { developerText, showDeveloperTools } from '@/shared/config/appVariant';

const GOAL_TYPE_OPTIONS = [
  { label: '緊急金', value: 'emergency' },
  { label: '旅行', value: 'travel' },
  { label: '買車', value: 'car' },
  { label: '還債', value: 'debt' },
  { label: '其他', value: 'custom' },
] as const;

const GOAL_TYPE_LABELS: Record<SavingsGoalType, string> = {
  emergency: '緊急預備金',
  travel: '旅行基金',
  car: '買車基金',
  debt: '還債計劃',
  custom: '自訂目標',
};

export default function GoalsScreen() {
  const { overview, financeData, saveGoal, removeGoal, isLoading } = useFinanceOverview();
  const data = financeData.data;
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [goalType, setGoalType] = useState<SavingsGoalType>('emergency');
  const [isPrimary, setIsPrimary] = useState(false);
  const [targetDate, setTargetDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({ visible: false, title: '', message: '', type: 'info' });

  const resetForm = () => {
    setEditingGoal(null);
    setName('');
    setTargetAmount('');
    setCurrentAmount('');
    setMonthlyContribution('');
    setGoalType('emergency');
    setIsPrimary(false);
    setTargetDate(new Date());
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setName(goal.name);
    setTargetAmount(String(goal.target_amount));
    setCurrentAmount(String(goal.current_amount));
    setMonthlyContribution(String(goal.monthly_contribution ?? ''));
    setGoalType(goal.goal_type ?? 'custom');
    setIsPrimary(Boolean(goal.is_primary));
    setTargetDate(goal.target_date ? new Date(goal.target_date) : new Date());
    setModalVisible(true);
  };

  const handleSaveGoal = async () => {
    if (!name.trim() || !Number(targetAmount)) {
      setAlertConfig({ visible: true, title: '資料不足', message: '請輸入目標名稱與金額。', type: 'warning' });
      return;
    }

    try {
      await saveGoal.mutateAsync({
        id: editingGoal?.id,
        name: name.trim(),
        target_amount: Number(targetAmount),
        current_amount: Number(currentAmount) || 0,
        monthly_contribution: Number(monthlyContribution) || 0,
        goal_type: goalType,
        is_primary: isPrimary,
        currency: 'MYR',
        target_date: targetDate.toISOString().split('T')[0],
      });
      setModalVisible(false);
      resetForm();
      setAlertConfig({ visible: true, title: editingGoal ? '已更新' : '已建立', message: '儲蓄目標已儲存。', type: 'success' });
    } catch (error) {
      setAlertConfig({
        visible: true,
        title: '儲存失敗',
        message: data?.source === 'legacy'
          ? developerText('請先套用 v2 Supabase migration 後再新增目標。', '存錢目標暫時無法使用，請稍後再試。')
          : developerText(error instanceof Error ? error.message : '請稍後再試。', '存錢目標暫時無法儲存，請稍後再試。'),
        type: 'error',
      });
    }
  };

  const handleDeleteGoal = () => {
    if (!editingGoal) return;

    Alert.alert('確認刪除', `確定要刪除「${editingGoal.name}」目標嗎？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeGoal.mutateAsync(editingGoal.id);
            setModalVisible(false);
            resetForm();
            setAlertConfig({ visible: true, title: '已刪除', message: '儲蓄目標已刪除。', type: 'success' });
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

  const savingsIncome = data.entries
    .filter((entry) => entry.type === 'income' && entry.is_savings)
    .reduce((sum, entry) => sum + (entry.base_currency_amount ?? 0), 0);
  const primaryProjection = overview.goalProjection.find((goal) => goal.is_primary) ?? overview.goalProjection[0];

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 110 }}>
        <View className="flex-row justify-between items-start mb-5">
          <View className="flex-1">
            <Text className="text-3xl font-black text-slate-900">目標</Text>
            <Text className="text-sm text-slate-400 mt-2">追蹤儲蓄進度與長期資金目標。</Text>
          </View>
          <TouchableOpacity onPress={openAddModal} className="bg-indigo-600 px-4 py-3 rounded-2xl">
            <Text className="text-white font-black">新增</Text>
          </TouchableOpacity>
        </View>

        <View className="bg-white border border-slate-100 rounded-2xl p-5 mb-5">
          <Text className="text-xs font-bold text-slate-400 mb-1">已標記儲蓄收入</Text>
          <Text className="text-3xl font-black text-emerald-600">{formatMoney(savingsIncome)}</Text>
          <Text className="text-xs text-slate-400 mt-2">從收入交易中標記為儲蓄的金額。</Text>
        </View>

        {primaryProjection && (
          <View className="bg-indigo-600 rounded-2xl p-5 mb-5">
            <Text className="text-indigo-100 text-xs font-bold mb-1">主要存錢目標</Text>
            <Text className="text-white text-2xl font-black">{primaryProjection.name}</Text>
            <Text className="text-indigo-100 text-xs mt-2">
              {primaryProjection.projectedMonths
                ? `照目前速度約 ${primaryProjection.projectedMonths} 個月完成。`
                : '先設定每月投入，才能估算完成速度。'}
            </Text>
            <Text className="text-indigo-100 text-xs mt-2">
              {primaryProjection.extraMonthlyNeeded && primaryProjection.extraMonthlyNeeded > 0
                ? `若要按目標日期完成，每月還要多存 ${formatMoney(primaryProjection.extraMonthlyNeeded)}。`
                : '目前投入節奏沒有明顯缺口。'}
            </Text>
          </View>
        )}

        <SectionHeader title="儲蓄目標" />
        {overview.goals.length === 0 ? (
          <EmptyState title="尚未建立目標" message="例如緊急預備金、旅行基金、買房頭期款。" />
        ) : (
          overview.goalProjection.map((goal) => (
            <TouchableOpacity key={goal.id} onPress={() => openEditModal(goal)} className="bg-white border border-slate-100 rounded-2xl p-4 mb-3">
              <View className="flex-row justify-between items-center mb-2">
                <View className="flex-1 pr-3">
                  <Text className="font-black text-slate-800">{goal.name}</Text>
                  <Text className="text-[11px] text-slate-400 mt-1">
                    {GOAL_TYPE_LABELS[goal.goal_type ?? 'custom']}{goal.is_primary ? ' · 主要目標' : ''}
                  </Text>
                </View>
                <Text className="font-black text-indigo-600">{Math.round(goal.progress * 100)}%</Text>
              </View>
              <View className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                <View className="h-full bg-emerald-500 rounded-full" style={{ width: `${goal.progress * 100}%` }} />
              </View>
              <View className="flex-row justify-between">
                <Text className="text-xs text-slate-400">
                  {formatMoney(goal.current_amount)} / {formatMoney(goal.target_amount)}
                </Text>
                <Text className="text-xs text-slate-400">剩餘 {formatMoney(goal.remaining)}</Text>
              </View>
              <Text className="text-xs text-indigo-500 mt-2">
                每月投入 {formatMoney(goal.monthly_contribution ?? 0)}
                {goal.projectedMonths ? ` · 約 ${goal.projectedMonths} 個月完成` : ' · 尚未設定完成速度'}
              </Text>
              {goal.requiredMonthlyToHitTarget != null && (
                <Text className="text-xs text-slate-500 mt-1">
                  目標日期所需每月 {formatMoney(goal.requiredMonthlyToHitTarget)}
                  {goal.extraMonthlyNeeded && goal.extraMonthlyNeeded > 0
                    ? ` · 還要多存 ${formatMoney(goal.extraMonthlyNeeded)}`
                    : ' · 節奏足夠'}
                </Text>
              )}
              {showDeveloperTools && (
                <View className="bg-slate-50 rounded-xl p-3 mt-3">
                  <Text className="text-[11px] font-black text-slate-500">Developer calculation</Text>
                  <Text className="text-[11px] text-slate-500 mt-1 leading-5">
                    monthly={formatMoney(goal.calculationSource.monthlyContribution)};
                    sharedBoost={formatMoney(goal.calculationSource.sharedSavingsBoost)};
                    markedSavings={formatMoney(goal.calculationSource.markedSavings)};
                    remaining={formatMoney(goal.calculationSource.remainingAmount)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl p-5">
            <Text className="text-xl font-black text-slate-900 mb-4">{editingGoal ? '編輯儲蓄目標' : '新增儲蓄目標'}</Text>
            <Text className="text-sm font-bold text-slate-500 mb-2">目標名稱</Text>
            <TextInput value={name} onChangeText={setName} placeholder="例如：緊急預備金" className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4" />
            <Text className="text-sm font-bold text-slate-500 mb-2">目標類型</Text>
            <FilterBar options={[...GOAL_TYPE_OPTIONS]} value={goalType} onChange={setGoalType} />
            <Text className="text-sm font-bold text-slate-500 mb-2">目標金額</Text>
            <TextInput value={targetAmount} onChangeText={setTargetAmount} keyboardType="numeric" placeholder="0.00" className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4" />
            <Text className="text-sm font-bold text-slate-500 mb-2">目前已存</Text>
            <TextInput value={currentAmount} onChangeText={setCurrentAmount} keyboardType="numeric" placeholder="0.00" className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4" />
            <Text className="text-sm font-bold text-slate-500 mb-2">每月預計投入</Text>
            <TextInput value={monthlyContribution} onChangeText={setMonthlyContribution} keyboardType="numeric" placeholder="0.00" className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4" />
            <Text className="text-sm font-bold text-slate-500 mb-2">目標日期</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4">
              <Text className="font-bold text-slate-700">{targetDate.toLocaleDateString('zh-TW')}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={targetDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, selected) => {
                  if (Platform.OS === 'android') setShowDatePicker(false);
                  if (selected) setTargetDate(selected);
                }}
              />
            )}
            <TouchableOpacity
              onPress={() => setIsPrimary((current) => !current)}
              className={`border rounded-2xl p-4 mb-4 ${isPrimary ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'}`}
            >
              <Text className={`font-bold ${isPrimary ? 'text-indigo-700' : 'text-slate-600'}`}>
                {isPrimary ? '已設為主要目標' : '設為主要目標'}
              </Text>
            </TouchableOpacity>
            <View className="flex-row gap-3">
              <TouchableOpacity onPress={() => setModalVisible(false)} className="flex-1 bg-slate-100 rounded-2xl p-4 items-center">
                <Text className="font-black text-slate-600">取消</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveGoal} className="flex-1 bg-indigo-600 rounded-2xl p-4 items-center">
                <Text className="font-black text-white">{saveGoal.isPending ? '儲存中...' : '儲存'}</Text>
              </TouchableOpacity>
            </View>
            {editingGoal && (
              <TouchableOpacity
                onPress={handleDeleteGoal}
                disabled={removeGoal.isPending}
                className="bg-rose-50 border border-rose-100 rounded-2xl p-4 items-center mt-3"
              >
                <Text className="font-black text-rose-600">
                  {removeGoal.isPending ? '刪除中...' : '刪除此目標'}
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
