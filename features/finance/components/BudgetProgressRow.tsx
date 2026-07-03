import React from 'react';
import { Text, View } from 'react-native';
import { FinanceCategory } from '@/features/finance/types';
import { formatMoney } from '@/features/finance/utils/finance';

type BudgetProgressRowProps = {
  category?: FinanceCategory | null;
  spent: number;
  limit: number;
};

export function BudgetProgressRow({ category, spent, limit }: BudgetProgressRowProps) {
  const usage = limit > 0 ? Math.min(spent / limit, 1) : 0;
  const overBudget = spent > limit && limit > 0;

  return (
    <View className="bg-white border border-slate-100 rounded-2xl p-4 mb-3">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="font-bold text-slate-800">{category?.name ?? '未分類'}</Text>
        <Text className={`font-black ${overBudget ? 'text-rose-600' : 'text-slate-700'}`}>
          {Math.round(usage * 100)}%
        </Text>
      </View>
      <View className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
        <View
          className={`h-full rounded-full ${overBudget ? 'bg-rose-500' : 'bg-indigo-600'}`}
          style={{ width: `${Math.min(usage * 100, 100)}%` }}
        />
      </View>
      <Text className="text-xs text-slate-400">
        {formatMoney(spent)} / {formatMoney(limit)}
      </Text>
    </View>
  );
}
