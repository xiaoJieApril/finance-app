import React from 'react';
import { Text, View } from 'react-native';
import { CreditCard, Landmark, Wallet } from 'lucide-react-native';
import { FinanceAccount } from '@/type';
import { formatMoney } from '@/utils/finance';

function AccountIcon({ type }: { type: FinanceAccount['type'] }) {
  const color = '#4f46e5';
  if (type === 'bank') return <Landmark size={18} color={color} />;
  if (type === 'credit_card') return <CreditCard size={18} color={color} />;
  return <Wallet size={18} color={color} />;
}

export function AccountBalanceCard({ account }: { account: FinanceAccount }) {
  return (
    <View className="bg-white border border-slate-100 rounded-2xl p-4 mr-3 min-w-[170px]">
      <View className="flex-row items-center mb-3">
        <View className="w-9 h-9 rounded-xl bg-indigo-50 items-center justify-center mr-3">
          <AccountIcon type={account.type} />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold text-slate-800" numberOfLines={1}>
            {account.name}
          </Text>
          <Text className="text-xs text-slate-400">{account.currency}</Text>
        </View>
      </View>
      <Text className="text-xl font-black text-slate-900">
        {formatMoney(account.current_balance ?? account.initial_balance)}
      </Text>
    </View>
  );
}
