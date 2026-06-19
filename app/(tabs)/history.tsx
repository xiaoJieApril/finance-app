import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/finance/EmptyState';
import { FilterBar } from '@/components/finance/FilterBar';
import { SectionHeader } from '@/components/finance/SectionHeader';
import { TransactionRow } from '@/components/finance/TransactionRow';
import { AlertConfig, CustomAlert } from '@/components/ui/CustomAlert';
import { useFinanceOverview } from '@/hooks/useFinanceOverview';
import { TransactionEntry, TransactionType } from '@/type';
import { entryBaseAmount, formatMoney } from '@/utils/finance';

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

function monthKey(date: string) {
  const d = new Date(date);
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`;
}

export default function HistoryScreen() {
  const { overview, financeData, deleteEntry, isLoading } = useFinanceOverview();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedEntry, setSelectedEntry] = useState<TransactionEntry | null>(null);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({ visible: false, title: '', message: '', type: 'info' });

  const entries = financeData.data?.entries ?? [];
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
    } catch {
      setAlertConfig({ visible: true, title: '刪除失敗', message: '請稍後再試。', type: 'error' });
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

      <CustomAlert config={alertConfig} hideAlert={() => setAlertConfig((prev) => ({ ...prev, visible: false }))} />
    </SafeAreaView>
  );
}
