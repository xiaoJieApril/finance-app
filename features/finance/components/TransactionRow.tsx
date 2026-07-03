import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ArrowRightLeft, MessageSquareText } from 'lucide-react-native';
import { renderCategoryIcon } from '@/features/finance/constants/categoryIcons';
import { TransactionEntry } from '@/features/finance/types';
import { formatMoney } from '@/features/finance/utils/finance';

type TransactionRowProps = {
  entry: TransactionEntry;
  onPress?: () => void;
};

export function TransactionRow({ entry, onPress }: TransactionRowProps) {
  const isIncome = entry.type === 'income';
  const isTransfer = entry.type === 'transfer';
  const amountColor = isTransfer ? 'text-slate-600' : isIncome ? 'text-emerald-600' : 'text-rose-600';
  const sign = isTransfer ? '' : isIncome ? '+' : '-';

  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center bg-white border border-slate-100 rounded-2xl p-4 mb-3 active:bg-slate-50"
    >
      <View className="w-11 h-11 rounded-xl bg-slate-50 items-center justify-center mr-3">
        {isTransfer ? (
          <ArrowRightLeft size={19} color="#64748b" />
        ) : (
          renderCategoryIcon(entry.category?.icon, 19, isIncome ? '#059669' : '#e11d48')
        )}
      </View>
      <View className="flex-1 pr-3">
        <Text className="font-bold text-slate-800" numberOfLines={1}>
          {isTransfer ? `${entry.account?.name ?? '帳戶'} → ${entry.to_account?.name ?? '帳戶'}` : entry.category?.name ?? '未分類'}
        </Text>
        <View className="flex-row items-center mt-1">
          <MessageSquareText size={12} color="#94a3b8" />
          <Text className="text-xs text-slate-400 ml-1" numberOfLines={1}>
            {entry.note || entry.account?.name || '無備註'}
          </Text>
        </View>
      </View>
      <View className="items-end">
        <Text className={`font-black ${amountColor}`}>
          {sign}
          {formatMoney(entry.base_currency_amount ?? entry.amount)}
        </Text>
        <Text className="text-[10px] text-slate-400 mt-1">
          {new Date(entry.date).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
