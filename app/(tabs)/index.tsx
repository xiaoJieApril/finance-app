import { ArrowRight, ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SyncIndicator, TransactionRow } from '../../components/ledger';
import { useTransactions } from '../../hooks/useTransactions';
import { toDateKey } from '../../services/dateUtils';

const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

export default function LedgerScreen() {
  const router = useRouter();
  const { userId, fetchTransactions } = useTransactions();
  const transactions = fetchTransactions.data ?? [];
  const [displayedMonth, setDisplayedMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12));
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const year = displayedMonth.getFullYear();
  const month = displayedMonth.getMonth();
  const calendarWeeks = useMemo(() => makeCalendarWeeks(year, month), [year, month]);
  const todayKey = toDateKey(new Date());

  const expensesByDate = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const transaction of transactions) {
      if (transaction.category?.type !== 'expense') continue;
      const key = toDateKey(new Date(transaction.date));
      totals[key] = (totals[key] ?? 0) + transaction.amount;
    }
    return totals;
  }, [transactions]);

  const selectedTransactions = useMemo(() => transactions
    .filter((transaction) => toDateKey(new Date(transaction.date)) === selectedDate)
    .sort((a, b) => b.date.localeCompare(a.date)), [transactions, selectedDate]);
  const selectedExpense = expensesByDate[selectedDate] ?? 0;
  const selectedDateValue = dateFromKey(selectedDate);
  const dateLabel = `${selectedDateValue.getMonth() + 1}月${selectedDateValue.getDate()}日 星期${weekdays[selectedDateValue.getDay()]}`;

  const moveMonth = (amount: number) => {
    const nextMonth = new Date(year, month + amount, 1, 12);
    setDisplayedMonth(nextMonth);
    setSelectedDate(toDateKey(nextMonth));
  };

  if (!userId || fetchTransactions.isLoading) {
    return <View className="flex-1 items-center justify-center bg-[#F4F7F4]"><ActivityIndicator color="#477A60" /></View>;
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F4F7F4]" edges={['top']}>
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        <View className="pt-4">
          <Text className="text-3xl font-bold tracking-tight text-[#183C32]">我的账本</Text>
          <View className="mt-2"><SyncIndicator /></View>
        </View>

        <View className="mt-6 rounded-[24px] border border-[#DCE7E0] bg-white px-3 pb-3 pt-4">
          <View className="mb-3 flex-row items-center justify-between px-1">
            <View>
              <Text className="text-base font-bold text-[#183C32]">{year}年{month + 1}月</Text>
              <Text className="mt-1 text-[10px] font-medium text-[#B65C51]">日支出金额（RM）</Text>
            </View>
            <View className="flex-row gap-2">
              <TouchableOpacity onPress={() => moveMonth(-1)} className="h-9 w-9 items-center justify-center rounded-full bg-[#F0F5F1]" accessibilityLabel="上个月">
                <ChevronLeft size={18} color="#183C32" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => moveMonth(1)} className="h-9 w-9 items-center justify-center rounded-full bg-[#F0F5F1]" accessibilityLabel="下个月">
                <ChevronRight size={18} color="#183C32" />
              </TouchableOpacity>
            </View>
          </View>

          <View className="mb-1 flex-row">
            {weekdays.map((day) => <Text key={day} className="flex-1 py-2 text-center text-xs font-semibold text-[#5D6D63]">{day}</Text>)}
          </View>
          {calendarWeeks.map((week, weekIndex) => (
            <View key={weekIndex} className="flex-row">
              {week.map((day, dayIndex) => {
                if (!day) return <View key={`empty-${dayIndex}`} className="h-[54px] flex-1" />;
                const dayKey = toDateKey(new Date(year, month, day, 12));
                const isSelected = dayKey === selectedDate;
                const isToday = dayKey === todayKey;
                const expense = expensesByDate[dayKey] ?? 0;
                return (
                  <TouchableOpacity
                    key={dayKey}
                    onPress={() => setSelectedDate(dayKey)}
                    className={`h-[54px] flex-1 items-center justify-center rounded-xl ${isSelected ? 'bg-[#183C32]' : isToday ? 'bg-[#EAF1EC]' : ''}`}
                    accessibilityRole="button"
                    accessibilityLabel={`${year}年${month + 1}月${day}日，支出 RM ${expense.toFixed(2)}`}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text className={`text-xs font-semibold ${isSelected ? 'text-white' : isToday ? 'text-[#477A60]' : 'text-[#183C32]'}`}>{day}</Text>
                    {expense > 0 ? (
                      <Text className={`mt-1 text-[9px] font-semibold ${isSelected ? 'text-[#D7E979]' : 'text-[#B65C51]'}`} numberOfLines={1}>
                        {compactAmount(expense)}
                      </Text>
                    ) : <View className="mt-1 h-[11px]" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        <View className="mb-2 mt-7 flex-row items-end justify-between">
          <View>
            <Text className="text-xs font-semibold text-[#5D6D63]">{dateLabel} · 当天消费</Text>
            <Text className="mt-1 text-2xl font-bold text-[#183C32]">RM {selectedExpense.toFixed(2)}</Text>
          </View>
          {transactions.length > 0 && (
            <TouchableOpacity onPress={() => router.push('/history')} className="mb-1 flex-row items-center">
              <Text className="mr-1 text-sm font-semibold text-[#477A60]">历史记录</Text>
              <ArrowRight size={15} color="#477A60" />
            </TouchableOpacity>
          )}
        </View>

        <View className="mb-1 mt-4 flex-row items-center justify-between">
          <Text className="text-lg font-bold text-[#183C32]">当天交易</Text>
          <Text className="text-xs text-[#5D6D63]">{selectedTransactions.length} 笔</Text>
        </View>
        {selectedTransactions.length > 0 ? selectedTransactions.map((transaction) => (
          <TransactionRow
            key={transaction.id}
            transaction={transaction}
            onPress={() => router.push({ pathname: '/add_transaction', params: { id: transaction.id } })}
          />
        )) : (
          <View className="border-y border-[#DCE7E0] py-6">
            <Text className="text-sm text-[#5D6D63]">这一天没有交易记录。</Text>
            <TouchableOpacity onPress={() => router.push('/add_transaction')} className="mt-4 flex-row items-center self-start rounded-full bg-[#D7E979] px-4 py-2.5">
              <Plus size={16} color="#183C32" />
              <Text className="ml-1.5 text-sm font-semibold text-[#183C32]">记一笔</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeCalendarWeeks(year: number, month: number) {
  const days: Array<number | null> = Array.from({ length: new Date(year, month, 1).getDay() }, () => null);
  const dayCount = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= dayCount; day += 1) days.push(day);
  while (days.length % 7 !== 0) days.push(null);
  const weeks: Array<Array<number | null>> = [];
  for (let index = 0; index < days.length; index += 7) weeks.push(days.slice(index, index + 7));
  return weeks;
}

function dateFromKey(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

function compactAmount(amount: number) {
  if (amount >= 10000) return `${(amount / 1000).toFixed(0)}k`;
  return Number(amount.toFixed(1)).toString();
}
