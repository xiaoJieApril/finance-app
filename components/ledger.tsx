import { BriefcaseBusiness, CarFront, Circle, Coffee, HeartPulse, House, ShoppingBag, Sparkles, Wallet } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSyncStore } from '../store/useSyncStore';
import { Category, Transaction } from '../type';

const palette = {
  ink: '#183C32',
  moss: '#477A60',
  lime: '#D7E979',
  coral: '#B65C51',
  mist: '#DCE7E0',
  muted: '#5D6D63',
};

const CategoryMark = ({ category }: { category?: Category }) => {
  const props = { size: 18, color: palette.moss, strokeWidth: 1.8 };
  switch (category?.icon) {
    case 'utensils': return <Coffee {...props} />;
    case 'car': return <CarFront {...props} />;
    case 'shopping-bag': return <ShoppingBag {...props} />;
    case 'home': return <House {...props} />;
    case 'sparkles': return <Sparkles {...props} />;
    case 'heart-pulse': return <HeartPulse {...props} />;
    case 'wallet': return <Wallet {...props} />;
    case 'briefcase': return <BriefcaseBusiness {...props} />;
    default: return <Circle {...props} />;
  }
};

export function SyncIndicator() {
  const status = useSyncStore((state) => state.status);
  const pendingCount = useSyncStore((state) => state.pendingCount);
  if (status === 'syncing') return <Text className="text-xs text-[#477A60]">正在同步</Text>;
  if (status === 'offline') return <Text className="text-xs text-[#B65C51]">{pendingCount > 0 ? `云端暂不可用 · ${pendingCount} 项待同步` : '云端暂不可用'}</Text>;
  if (pendingCount > 0) return <Text className="text-xs text-[#5D6D63]">{pendingCount} 项待同步</Text>;
  return <Text className="text-xs text-[#5D6D63]">已同步</Text>;
}

export function TransactionRow({ transaction, onPress, showDate = false }: {
  transaction: Transaction;
  onPress?: () => void;
  showDate?: boolean;
}) {
  const hasCategory = Boolean(transaction.category);
  const isIncome = transaction.category?.type === 'income';
  const date = new Date(transaction.date);
  const dateLabel = `${date.getMonth() + 1}月${date.getDate()}日`;
  const subtitle = showDate ? `${dateLabel}${transaction.note ? ` · ${transaction.note}` : ''}` : transaction.note || '无备注';
  const Contents = (
    <View className="flex-row items-center py-3.5">
      <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#EAF1EC]">
        <CategoryMark category={transaction.category} />
      </View>
      <View className="min-w-0 flex-1 pr-2">
        <Text className="text-[15px] font-semibold text-[#183C32]" numberOfLines={1}>{transaction.category?.name ?? '未分类'}</Text>
        <Text className="mt-1 text-xs text-[#5D6D63]" numberOfLines={1}>{subtitle}</Text>
      </View>
      <Text className={`text-[15px] font-semibold ${!hasCategory ? 'text-[#183C32]' : isIncome ? 'text-[#477A60]' : 'text-[#B65C51]'}`}>
        {hasCategory ? `${isIncome ? '+' : '−'}RM ` : 'RM '}{transaction.amount.toFixed(2)}
      </Text>
    </View>
  );

  return (
    <View className="ml-2 border-l border-[#DCE7E0] pl-4">
      <View className="absolute -left-[4px] top-[29px] h-2 w-2 rounded-full bg-[#477A60]" />
      {onPress ? <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{Contents}</TouchableOpacity> : Contents}
      <View className="h-px bg-[#E7EEE9]" />
    </View>
  );
}

