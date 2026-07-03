import DateTimePicker from '@react-native-community/datetimepicker';
import { Pencil } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '@/features/finance/components/EmptyState';
import { FilterBar } from '@/features/finance/components/FilterBar';
import { SectionHeader } from '@/features/finance/components/SectionHeader';
import { TransactionRow } from '@/features/finance/components/TransactionRow';
import { AlertConfig, CustomAlert } from '@/shared/ui/CustomAlert';
import { useFinanceOverview } from '@/features/finance/hooks/useFinanceOverview';
import { CurrencyCode, TransactionEntry, TransactionType } from '@/features/finance/types';
import { entryBaseAmount, formatMoney } from '@/features/finance/utils/finance';
import { developerText } from '@/shared/config/appVariant';

type TypeFilter = 'all' | TransactionType;
type ViewMode = 'list' | 'calendar';

const TYPE_FILTERS = [
  { label: '全部', value: 'all' },
  { label: '收入', value: 'income' },
  { label: '支出', value: 'expense' },
  { label: '轉帳', value: 'transfer' },
] as const;

const VIEW_FILTERS = [
  { label: '列表', value: 'list' },
  { label: '月曆', value: 'calendar' },
] as const;

const TYPE_OPTIONS = [
  { label: '支出', value: 'expense' },
  { label: '收入', value: 'income' },
  { label: '轉帳', value: 'transfer' },
] as const;

const CURRENCY_OPTIONS = [
  { label: 'MYR', value: 'MYR' },
  { label: 'SGD', value: 'SGD' },
  { label: 'USD', value: 'USD' },
  { label: 'EUR', value: 'EUR' },
] as const;

function monthKey(date: string) {
  const d = new Date(date);
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`;
}

export default function HistoryScreen() {
  const { overview, financeData, saveEntry, deleteEntry, isLoading } = useFinanceOverview();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedEntry, setSelectedEntry] = useState<TransactionEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<TransactionEntry | null>(null);
  const [editType, setEditType] = useState<TransactionType>('expense');
  const [editAccountId, setEditAccountId] = useState<string | null>(null);
  const [editToAccountId, setEditToAccountId] = useState<string | null>(null);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [editCurrency, setEditCurrency] = useState<CurrencyCode>('MYR');
  const [editAmount, setEditAmount] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editDate, setEditDate] = useState(new Date());
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({ visible: false, title: '', message: '', type: 'info' });

  const entries = useMemo(() => financeData.data?.entries ?? [], [financeData.data?.entries]);
  const accounts = financeData.data?.accounts ?? [];
  const editCategories = useMemo(
    () => financeData.data?.categories.filter((category) => category.type === editType) ?? [],
    [financeData.data?.categories, editType],
  );
  const filteredEntries = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return entries.filter((entry) => {
      const typeMatched = typeFilter === 'all' || entry.type === typeFilter;
      const textMatched =
        !normalized ||
        entry.note?.toLowerCase().includes(normalized) ||
        entry.category?.name?.toLowerCase().includes(normalized) ||
        entry.account?.name?.toLowerCase().includes(normalized);
      return typeMatched && textMatched;
    });
  }, [entries, query, typeFilter]);

  const groupedEntries = useMemo(() => {
    const groups = new Map<string, TransactionEntry[]>();
    filteredEntries.forEach((entry) => {
      const key = monthKey(entry.date);
      groups.set(key, [...(groups.get(key) ?? []), entry]);
    });
    return Array.from(groups.entries()).map(([title, data]) => ({ title, data }));
  }, [filteredEntries]);

  const dailyTotals = useMemo(() => {
    const totals = new Map<string, { income: number; expense: number }>();
    filteredEntries.forEach((entry) => {
      const key = new Date(entry.date).toLocaleDateString('en-CA');
      const current = totals.get(key) ?? { income: 0, expense: 0 };
      if (entry.type === 'income') current.income += entryBaseAmount(entry);
      if (entry.type === 'expense') current.expense += entryBaseAmount(entry);
      totals.set(key, current);
    });
    return Array.from(totals.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredEntries]);

  const handleDelete = async () => {
    if (!selectedEntry) return;

    try {
      await deleteEntry.mutateAsync(selectedEntry);
      setSelectedEntry(null);
      setAlertConfig({ visible: true, title: '已刪除', message: '流水已刪除。', type: 'success' });
    } catch (error) {
      setAlertConfig({
        visible: true,
        title: '刪除失敗',
        message: developerText(error instanceof Error ? error.message : '請重新整理後再試。', '刪除失敗，請重新整理後再試。'),
        type: 'error',
      });
    }
  };

  const openEditModal = (entry: TransactionEntry) => {
    const nextType = entry.type;
    const typeCategories = financeData.data?.categories.filter((category) => category.type === nextType) ?? [];
    setEditingEntry(entry);
    setSelectedEntry(null);
    setEditType(nextType);
    setEditAccountId(entry.account_id ?? accounts[0]?.id ?? null);
    setEditToAccountId(entry.to_account_id ?? accounts.find((account) => account.id !== entry.account_id)?.id ?? null);
    setEditCategoryId(entry.category_id ?? typeCategories[0]?.id ?? null);
    setEditCurrency(entry.currency ?? 'MYR');
    setEditAmount(String(entry.amount));
    setEditNote(entry.note ?? '');
    setEditDate(new Date(entry.date));
  };

  const handleEditTypeChange = (nextType: TransactionType) => {
    setEditType(nextType);
    if (nextType === 'transfer') {
      setEditCategoryId(null);
      setEditToAccountId((current) => current ?? accounts.find((account) => account.id !== editAccountId)?.id ?? null);
      return;
    }

    const nextCategories = financeData.data?.categories.filter((category) => category.type === nextType) ?? [];
    setEditCategoryId(nextCategories[0]?.id ?? null);
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;
    const parsedAmount = Number(editAmount);

    if (!editAccountId) {
      setAlertConfig({ visible: true, title: '缺少帳戶', message: '請選擇帳戶。', type: 'warning' });
      return;
    }
    if (!parsedAmount || parsedAmount <= 0) {
      setAlertConfig({ visible: true, title: '金額錯誤', message: '請輸入有效金額。', type: 'warning' });
      return;
    }
    if (editType !== 'transfer' && !editCategoryId) {
      setAlertConfig({ visible: true, title: '缺少類別', message: '請選擇類別。', type: 'warning' });
      return;
    }
    if (editType === 'transfer' && (!editToAccountId || editToAccountId === editAccountId)) {
      setAlertConfig({ visible: true, title: '轉帳帳戶錯誤', message: '請選擇不同的轉入帳戶。', type: 'warning' });
      return;
    }

    try {
      await saveEntry.mutateAsync({
        id: editingEntry.id,
        type: editType,
        account_id: editAccountId,
        to_account_id: editType === 'transfer' ? editToAccountId : null,
        category_id: editType === 'transfer' ? null : editCategoryId,
        currency: editCurrency,
        amount: parsedAmount,
        note: editNote,
        date: editDate.toISOString(),
        is_savings: editingEntry.is_savings,
      });
      setEditingEntry(null);
      setAlertConfig({ visible: true, title: '已更新', message: '流水已儲存修改。', type: 'success' });
    } catch (error) {
      setAlertConfig({
        visible: true,
        title: '更新失敗',
        message: error instanceof Error ? error.message : '請稍後再試。',
        type: 'error',
      });
    }
  };

  if (isLoading || !overview) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 110 }}>
        <Text className="text-3xl font-black text-slate-900 mb-2">流水</Text>
        <Text className="text-sm text-slate-400 mb-5">搜尋、篩選和回顧所有現金流。</Text>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="搜尋備註、類別或帳戶"
          className="bg-white border border-slate-100 rounded-2xl px-4 py-3 text-slate-800 mb-4"
        />
        <FilterBar options={[...TYPE_FILTERS]} value={typeFilter} onChange={setTypeFilter} />
        <FilterBar options={[...VIEW_FILTERS]} value={viewMode} onChange={setViewMode} />

        <View className="flex-row gap-3 mb-5">
          <View className="flex-1 bg-white rounded-2xl border border-slate-100 p-4">
            <Text className="text-xs text-slate-400 font-bold mb-1">篩選筆數</Text>
            <Text className="text-2xl font-black text-slate-900">{filteredEntries.length}</Text>
          </View>
          <View className="flex-1 bg-white rounded-2xl border border-slate-100 p-4">
            <Text className="text-xs text-slate-400 font-bold mb-1">支出總額</Text>
            <Text className="text-2xl font-black text-rose-600">
              {formatMoney(filteredEntries.filter((entry) => entry.type === 'expense').reduce((sum, entry) => sum + entryBaseAmount(entry), 0))}
            </Text>
          </View>
        </View>

        {filteredEntries.length === 0 ? (
          <EmptyState title="沒有符合條件的流水" message="調整搜尋或篩選條件看看。" />
        ) : viewMode === 'calendar' ? (
          <>
            <SectionHeader title="月曆摘要" />
            {dailyTotals.map(([date, total]) => (
              <View key={date} className="bg-white border border-slate-100 rounded-2xl p-4 mb-3">
                <Text className="font-black text-slate-800 mb-2">{date}</Text>
                <View className="flex-row justify-between">
                  <Text className="text-emerald-600 font-bold">收入 {formatMoney(total.income)}</Text>
                  <Text className="text-rose-600 font-bold">支出 {formatMoney(total.expense)}</Text>
                </View>
              </View>
            ))}
          </>
        ) : (
          groupedEntries.map((group) => (
            <View key={group.title} className="mb-3">
              <SectionHeader title={group.title} />
              {group.data.map((entry) => (
                <TransactionRow key={entry.id} entry={entry} onPress={() => setSelectedEntry(entry)} />
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={Boolean(selectedEntry)} transparent animationType="fade">
        <TouchableOpacity className="flex-1 bg-black/40 justify-end" activeOpacity={1} onPress={() => setSelectedEntry(null)}>
          <View className="bg-white rounded-t-3xl p-6">
            <Text className="text-xl font-black text-slate-900 mb-1">流水操作</Text>
            <Text className="text-slate-400 mb-5">{selectedEntry?.note || selectedEntry?.category?.name || '未分類'}</Text>
            <TouchableOpacity
              className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 items-center mb-3 flex-row justify-center"
              onPress={() => selectedEntry && openEditModal(selectedEntry)}
            >
              <Pencil size={18} color="#4f46e5" />
              <Text className="text-indigo-600 font-black ml-2">修改流水</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-rose-50 border border-rose-100 rounded-2xl p-4 items-center mb-3"
              onPress={() =>
                Alert.alert('確認刪除', '確定要刪除這筆流水嗎？', [
                  { text: '取消', style: 'cancel' },
                  { text: '刪除', style: 'destructive', onPress: handleDelete },
                ])
              }
            >
              <Text className="text-rose-600 font-black">刪除流水</Text>
            </TouchableOpacity>
            <TouchableOpacity className="p-4 items-center" onPress={() => setSelectedEntry(null)}>
              <Text className="text-slate-400 font-bold">取消</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={Boolean(editingEntry)} transparent animationType="slide" onRequestClose={() => setEditingEntry(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl p-5 max-h-[90%]">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-black text-slate-900">修改流水</Text>
              <TouchableOpacity onPress={() => setEditingEntry(null)} className="w-9 h-9 items-center justify-center">
                <Text className="text-2xl text-slate-400">×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              <FilterBar options={[...TYPE_OPTIONS]} value={editType} onChange={handleEditTypeChange} />

              <Text className="text-sm font-bold text-slate-500 mb-2">帳戶</Text>
              <FilterBar
                options={accounts.map((account) => ({ label: account.name, value: account.id }))}
                value={editAccountId ?? accounts[0]?.id ?? ''}
                onChange={(value) => {
                  setEditAccountId(value);
                  if (editToAccountId === value) {
                    setEditToAccountId(accounts.find((account) => account.id !== value)?.id ?? null);
                  }
                }}
              />

              {editType === 'transfer' && (
                <>
                  <Text className="text-sm font-bold text-slate-500 mb-2">轉入帳戶</Text>
                  <FilterBar
                    options={accounts.map((account) => ({ label: account.name, value: account.id }))}
                    value={editToAccountId ?? accounts.find((account) => account.id !== editAccountId)?.id ?? ''}
                    onChange={setEditToAccountId}
                  />
                </>
              )}

              <Text className="text-sm font-bold text-slate-500 mb-2">幣別</Text>
              <FilterBar options={[...CURRENCY_OPTIONS]} value={editCurrency} onChange={setEditCurrency} />

              <Text className="text-sm font-bold text-slate-500 mb-2">金額</Text>
              <TextInput
                value={editAmount}
                onChangeText={setEditAmount}
                keyboardType="numeric"
                placeholder="0.00"
                className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-2xl font-black text-slate-900 mb-4"
              />

              {editType !== 'transfer' && (
                <>
                  <Text className="text-sm font-bold text-slate-500 mb-2">類別</Text>
                  {editCategories.length === 0 ? (
                    <EmptyState title="沒有可用類別" message="請先建立收入/支出類別。" />
                  ) : (
                    <View className="flex-row flex-wrap gap-2 mb-4">
                      {editCategories.map((category) => {
                        const selected = editCategoryId === category.id;
                        return (
                          <TouchableOpacity
                            key={category.id}
                            onPress={() => setEditCategoryId(category.id)}
                            className={`px-4 py-3 rounded-2xl border ${
                              selected ? 'bg-indigo-50 border-indigo-500' : 'bg-white border-slate-200'
                            }`}
                          >
                            <Text className={`font-bold ${selected ? 'text-indigo-600' : 'text-slate-600'}`}>
                              {category.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </>
              )}

              <Text className="text-sm font-bold text-slate-500 mb-2">日期</Text>
              <TouchableOpacity
                onPress={() => setShowEditDatePicker(true)}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4"
              >
                <Text className="font-bold text-slate-700">{editDate.toLocaleDateString('zh-TW')}</Text>
              </TouchableOpacity>
              {showEditDatePicker && (
                <DateTimePicker
                  value={editDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, selected) => {
                    if (Platform.OS === 'android') setShowEditDatePicker(false);
                    if (selected) setEditDate(selected);
                  }}
                />
              )}

              <Text className="text-sm font-bold text-slate-500 mb-2">備註</Text>
              <TextInput
                value={editNote}
                onChangeText={setEditNote}
                placeholder="寫點備註..."
                className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 mb-5"
              />

              <TouchableOpacity
                onPress={handleSaveEdit}
                disabled={saveEntry.isPending}
                className="bg-indigo-600 rounded-2xl p-4 items-center"
              >
                <Text className="text-white font-black text-base">
                  {saveEntry.isPending ? '儲存中...' : '儲存修改'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <CustomAlert config={alertConfig} hideAlert={() => setAlertConfig((prev) => ({ ...prev, visible: false }))} />
    </SafeAreaView>
  );
}
