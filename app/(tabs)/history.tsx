import { useRouter } from 'expo-router';
import { Search, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, SectionList, Text, TextInput, TouchableOpacity, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SyncIndicator, TransactionRow } from '../../components/ledger';
import { useTransactions } from '../../hooks/useTransactions';
import { toDateKey } from '../../services/dateUtils';
import { Category, Transaction } from '../../type';

type MonthSection = { title: string; data: Transaction[] };
type TypeFilter = 'all' | Category['type'];

export default function HistoryScreen() {
  const router = useRouter();
  const { userId, fetchTransactions, fetchCategories } = useTransactions();
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const categories = fetchCategories.data ?? [];

  const filteredTransactions = useMemo(() => {
    const term = searchText.trim().toLocaleLowerCase();
    return (fetchTransactions.data ?? []).filter((transaction) => {
      if (typeFilter !== 'all' && transaction.category?.type !== typeFilter) return false;
      if (categoryFilter && transaction.category_id !== categoryFilter) return false;
      if (!term) return true;
      const date = new Date(transaction.date);
      const searchable = [
        transaction.category?.name ?? '',
        transaction.note ?? '',
        transaction.amount.toFixed(2),
        String(transaction.amount),
        toDateKey(date),
        `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`,
      ].join(' ').toLocaleLowerCase();
      return searchable.includes(term);
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [fetchTransactions.data, typeFilter, categoryFilter, searchText]);

  const sections = useMemo<MonthSection[]>(() => {
    const groups = new Map<string, Transaction[]>();
    for (const transaction of filteredTransactions) {
      const date = new Date(transaction.date);
      const key = `${date.getFullYear()}年${date.getMonth() + 1}月`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(transaction);
    }
    return [...groups.entries()].map(([title, data]) => ({ title, data }));
  }, [filteredTransactions]);

  const clearFilters = () => {
    setSearchText('');
    setTypeFilter('all');
    setCategoryFilter(null);
  };

  if (!userId || fetchTransactions.isLoading) {
    return <View className="flex-1 items-center justify-center bg-[#F4F7F4]"><ActivityIndicator color="#477A60" /></View>;
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F4F7F4]" edges={['top']}>
      <View className="flex-1 px-5 pt-5">
        <Text className="text-3xl font-bold tracking-tight text-[#183C32]">历史记录</Text>
        <View className="mt-2"><SyncIndicator /></View>
        <SectionList
          className="mt-3"
          sections={sections}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 32, flexGrow: sections.length ? 0 : 1 }}
          ListHeaderComponent={(
            <View className="pb-2 pt-3">
              <View className="flex-row items-center border-b border-[#B8C9BE] px-1 py-2">
                <Search size={18} color="#5D6D63" />
                <TextInput
                  className="ml-2 flex-1 py-1 text-[15px] text-[#183C32]"
                  placeholder="搜索类别、备注、金额或日期"
                  placeholderTextColor="#75847C"
                  value={searchText}
                  onChangeText={setSearchText}
                  returnKeyType="search"
                  accessibilityLabel="搜索交易记录"
                />
                {searchText.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchText('')} className="p-1" accessibilityLabel="清除搜索">
                    <X size={17} color="#5D6D63" />
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4">
                <View className="flex-row gap-2">
                  {([
                    ['all', '全部'], ['expense', '支出'], ['income', '收入'],
                  ] as Array<[TypeFilter, string]>).map(([value, label]) => (
                    <FilterChip key={value} label={label} selected={typeFilter === value} onPress={() => { setTypeFilter(value); setCategoryFilter(null); }} />
                  ))}
                </View>
              </ScrollView>

              {categories.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
                  <View className="flex-row gap-2">
                    <FilterChip label="所有类别" selected={!categoryFilter} onPress={() => setCategoryFilter(null)} />
                    {categories.map((category) => (
                      <FilterChip key={category.id} label={category.name} selected={categoryFilter === category.id} onPress={() => setCategoryFilter(category.id)} />
                    ))}
                  </View>
                </ScrollView>
              )}

              {(searchText.length > 0 || typeFilter !== 'all' || categoryFilter) && (
                <View className="mt-3 flex-row items-center justify-between">
                  <Text className="text-xs text-[#5D6D63]">找到 {filteredTransactions.length} 笔</Text>
                  <TouchableOpacity onPress={clearFilters}>
                    <Text className="text-xs font-semibold text-[#477A60]">清除筛选</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
          renderSectionHeader={({ section }) => (
            <View className="border-b border-[#DCE7E0] bg-[#F4F7F4] pb-2 pt-5">
              <Text className="text-base font-bold text-[#477A60]">{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TransactionRow transaction={item} showDate onPress={() => router.push({ pathname: '/add_transaction', params: { id: item.id } })} />
          )}
          ListEmptyComponent={(
            <View className="flex-1 items-center justify-center py-16">
              <Text className="text-lg font-semibold text-[#183C32]">{searchText || typeFilter !== 'all' || categoryFilter ? '没有符合条件的记录' : '还没有记录'}</Text>
              <Text className="mt-2 text-sm text-[#5D6D63]">{searchText || typeFilter !== 'all' || categoryFilter ? '试试更换关键词或清除筛选。' : '新增的收支会出现在这里。'}</Text>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} className={`rounded-full border px-3.5 py-2 ${selected ? 'border-[#183C32] bg-[#183C32]' : 'border-[#DCE7E0] bg-white'}`}>
      <Text className={`text-xs font-semibold ${selected ? 'text-white' : 'text-[#5D6D63]'}`}>{label}</Text>
    </TouchableOpacity>
  );
}
