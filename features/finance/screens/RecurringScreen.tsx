import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, Plus } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '@/features/finance/components/EmptyState';
import { FilterBar } from '@/features/finance/components/FilterBar';
import { AlertConfig, CustomAlert } from '@/shared/ui/CustomAlert';
import { useFinanceOverview } from '@/features/finance/hooks/useFinanceOverview';
import { CategoryType, CurrencyCode, RecurringItem } from '@/features/finance/types';
import { formatMoney } from '@/features/finance/utils/finance';
import { developerText } from '@/shared/config/appVariant';

/**
 * Recurring income and bill management route.
 *
 * Fixed items feed the cashflow forecast and local reminder scheduling.
 */
const TYPE_OPTIONS = [
  { label: '支出', value: 'expense' },
  { label: '收入', value: 'income' },
] as const;

const FREQUENCY_OPTIONS = [
  { label: '每週', value: 'weekly' },
  { label: '每月', value: 'monthly' },
  { label: '每年', value: 'yearly' },
] as const;

const CURRENCY_OPTIONS = [
  { label: 'MYR', value: 'MYR' },
  { label: 'SGD', value: 'SGD' },
  { label: 'USD', value: 'USD' },
  { label: 'EUR', value: 'EUR' },
] as const;

export default function RecurringScreen() {
  const router = useRouter();
  const { overview, financeData, saveRecurringItem, removeRecurringItem, isLoading } = useFinanceOverview();
  const data = financeData.data;
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringItem | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('expense');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('MYR');
  const [frequency, setFrequency] = useState<RecurringItem['frequency']>('monthly');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [nextDueDate, setNextDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({ visible: false, title: '', message: '', type: 'info' });

  const categories = useMemo(() => data?.categories.filter((category) => category.type === type) ?? [], [data?.categories, type]);

  const handleTypeChange = (nextType: CategoryType) => {
    setType(nextType);
    const nextCategories = data?.categories.filter((category) => category.type === nextType) ?? [];
    setCategoryId(nextCategories[0]?.id ?? null);
  };

  const resetForm = () => {
    setEditingItem(null);
    setName('');
    setType('expense');
    setAmount('');
    setCurrency('MYR');
    setFrequency('monthly');
    setAccountId(data?.accounts[0]?.id ?? null);
    setCategoryId(data?.categories.find((category) => category.type === 'expense')?.id ?? null);
    setNextDueDate(new Date());
  };

  const openModal = (item?: RecurringItem) => {
    if (item) {
      setEditingItem(item);
      setName(item.name);
      setType(item.type);
      setAmount(String(item.amount));
      setCurrency(item.currency);
      setFrequency(item.frequency);
      setAccountId(item.account_id ?? data?.accounts[0]?.id ?? null);
      setCategoryId(item.category_id ?? null);
      setNextDueDate(new Date(item.next_due_date));
    } else {
      resetForm();
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !Number(amount)) {
      setAlertConfig({ visible: true, title: '資料不足', message: '請輸入名稱與金額。', type: 'warning' });
      return;
    }

    try {
      await saveRecurringItem.mutateAsync({
        id: editingItem?.id,
        name: name.trim(),
        type,
        amount: Number(amount),
        currency,
        frequency,
        account_id: accountId,
        category_id: categoryId,
        next_due_date: nextDueDate.toISOString().split('T')[0],
        is_active: true,
      });
      setModalVisible(false);
      resetForm();
      setAlertConfig({ visible: true, title: editingItem ? '已更新' : '已建立', message: '固定項目已儲存。', type: 'success' });
    } catch (error) {
      setAlertConfig({
        visible: true,
        title: '儲存失敗',
        message: data?.source === 'legacy'
          ? developerText('請先套用 v2 Supabase migration 後再新增固定項目。', '固定收入與帳單暫時無法使用，請稍後再試。')
          : developerText(error instanceof Error ? error.message : '請稍後再試。', '固定項目暫時無法儲存，請稍後再試。'),
        type: 'error',
      });
    }
  };

  const handleDelete = () => {
    if (!editingItem) return;

    Alert.alert('確認刪除', `確定要刪除「${editingItem.name}」固定項目嗎？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeRecurringItem.mutateAsync(editingItem.id);
            setModalVisible(false);
            resetForm();
            setAlertConfig({ visible: true, title: '已刪除', message: '固定項目已刪除。', type: 'success' });
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

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 90 }}>
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-white rounded-2xl items-center justify-center border border-slate-100">
            <ArrowLeft size={20} color="#475569" />
          </TouchableOpacity>
          <Text className="text-xl font-black text-slate-900">固定帳單</Text>
          <TouchableOpacity onPress={() => openModal()} className="w-10 h-10 bg-indigo-600 rounded-2xl items-center justify-center">
            <Plus size={20} color="white" />
          </TouchableOpacity>
        </View>

        <View className="bg-white border border-slate-100 rounded-2xl p-5 mb-5">
          <Text className="text-xs font-bold text-slate-400 mb-1">月底固定項目影響</Text>
          <Text className={overview.forecast.projectedBalance < 0 ? 'text-3xl font-black text-rose-600' : 'text-3xl font-black text-slate-900'}>
            {formatMoney(overview.forecast.projectedBalance)}
          </Text>
          <Text className="text-xs text-slate-400 mt-2">已扣除本月剩餘固定支出並加入固定收入。</Text>
        </View>

        {data.recurringItems.length === 0 ? (
          <EmptyState title="還沒有固定項目" message="新增房租、訂閱、薪水等固定收支。" />
        ) : (
          data.recurringItems.map((item) => (
            <TouchableOpacity key={item.id} onPress={() => openModal(item)} className="bg-white border border-slate-100 rounded-2xl p-4 mb-3">
              <View className="flex-row justify-between items-center">
                <View className="flex-1">
                  <Text className="font-black text-slate-800">{item.name}</Text>
                  <Text className="text-xs text-slate-400 mt-1">
                    {item.frequency === 'weekly' ? '每週' : item.frequency === 'yearly' ? '每年' : '每月'} · {new Date(item.next_due_date).toLocaleDateString()}
                  </Text>
                </View>
                <Text className={item.type === 'income' ? 'font-black text-emerald-600' : 'font-black text-rose-600'}>
                  {formatMoney(item.amount)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/40">
          <ScrollView className="bg-white rounded-t-3xl p-5 max-h-[88%]" contentContainerStyle={{ paddingBottom: 28 }}>
            <Text className="text-xl font-black text-slate-900 mb-4">{editingItem ? '編輯固定項目' : '新增固定項目'}</Text>
            <FilterBar options={[...TYPE_OPTIONS]} value={type} onChange={handleTypeChange} />
            <Text className="text-sm font-bold text-slate-500 mb-2">名稱</Text>
            <TextInput value={name} onChangeText={setName} placeholder="例如：房租、薪水、Netflix" className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4" />
            <Text className="text-sm font-bold text-slate-500 mb-2">金額</Text>
            <TextInput value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0.00" className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4" />
            <Text className="text-sm font-bold text-slate-500 mb-2">幣別</Text>
            <FilterBar options={[...CURRENCY_OPTIONS]} value={currency} onChange={setCurrency} />
            <Text className="text-sm font-bold text-slate-500 mb-2">頻率</Text>
            <FilterBar options={[...FREQUENCY_OPTIONS]} value={frequency} onChange={setFrequency} />
            <Text className="text-sm font-bold text-slate-500 mb-2">帳戶</Text>
            <FilterBar options={data.accounts.map((account) => ({ label: account.name, value: account.id }))} value={accountId ?? data.accounts[0]?.id} onChange={setAccountId} />
            <Text className="text-sm font-bold text-slate-500 mb-2">類別</Text>
            {categories.length > 0 && (
              <FilterBar options={categories.map((category) => ({ label: category.name, value: category.id }))} value={categoryId ?? categories[0]?.id} onChange={setCategoryId} />
            )}
            <Text className="text-sm font-bold text-slate-500 mb-2">下次到期日</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4">
              <Text className="font-bold text-slate-700">{nextDueDate.toLocaleDateString('zh-TW')}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={nextDueDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, selected) => {
                  if (Platform.OS === 'android') setShowDatePicker(false);
                  if (selected) setNextDueDate(selected);
                }}
              />
            )}
            <View className="flex-row gap-3">
              <TouchableOpacity onPress={() => setModalVisible(false)} className="flex-1 bg-slate-100 rounded-2xl p-4 items-center">
                <Text className="font-black text-slate-600">取消</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} className="flex-1 bg-indigo-600 rounded-2xl p-4 items-center">
                <Text className="font-black text-white">{saveRecurringItem.isPending ? '儲存中...' : '儲存'}</Text>
              </TouchableOpacity>
            </View>
            {editingItem && (
              <TouchableOpacity
                onPress={handleDelete}
                disabled={removeRecurringItem.isPending}
                className="bg-rose-50 border border-rose-100 rounded-2xl p-4 items-center mt-3"
              >
                <Text className="font-black text-rose-600">
                  {removeRecurringItem.isPending ? '刪除中...' : '刪除此固定項目'}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </Modal>

      <CustomAlert config={alertConfig} hideAlert={() => setAlertConfig((prev) => ({ ...prev, visible: false }))} />
    </SafeAreaView>
  );
}
