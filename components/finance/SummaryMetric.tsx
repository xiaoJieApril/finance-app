import React from 'react';
import { Text, View } from 'react-native';

type SummaryMetricProps = {
  label: string;
  value: string;
  tone?: 'neutral' | 'income' | 'expense' | 'warning';
};

const toneClass = {
  neutral: 'text-slate-900',
  income: 'text-emerald-600',
  expense: 'text-rose-600',
  warning: 'text-amber-600',
};

export function SummaryMetric({ label, value, tone = 'neutral' }: SummaryMetricProps) {
  return (
    <View className="flex-1 bg-white border border-slate-100 rounded-2xl px-4 py-3">
      <Text className="text-xs font-semibold text-slate-400 mb-1">{label}</Text>
      <Text className={`text-lg font-black ${toneClass[tone]}`} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
