import { useRouter } from 'expo-router';
import { User } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useBudget } from '../../hooks/useBudget';
import { useTransactions } from '../../hooks/useTransactions';

export default function Dashboard() {
  const router = useRouter(); 
  const { fetchTransactions } = useTransactions();
  const { totalBudget } = useBudget();
  const { data: transactions = [] } = fetchTransactions;

  // --- 數據計算邏輯 ---
  const totalSpending = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return transactions
      .filter((t: any) => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.category?.type === 'expense';
      })
      .reduce((sum: number, t: any) => sum + t.amount, 0);
  }, [transactions]);

  const progressPercentage = totalBudget > 0 
    ? Math.min((totalSpending / totalBudget) * 100, 100) 
    : 0;

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView className="flex-1 px-6 pt-12 pb-24">
        
        {/* 頂部導航列 */}
        <View className="flex-row justify-between items-center mb-6">
          <TouchableOpacity 
            onPress={() => router.push('/profile')} 
            className="w-10 h-10 bg-indigo-100 rounded-full items-center justify-center border border-indigo-200"
          >
            <User color="#4F46E5" size={20} />
          </TouchableOpacity>
          <Text className="text-xl font-black text-slate-800">我的金庫</Text>
          <View className="w-10 h-10" />
        </View>

        {/* 預算進度總覽卡片 */}
        <View className="bg-indigo-600 rounded-3xl p-6 mb-8 shadow-sm">
          <Text className="text-indigo-100 text-sm mb-1">本月總支出</Text>
          <Text className="text-white text-4xl font-bold mb-6">RM {totalSpending.toFixed(2)}</Text>
          <View className="h-2 bg-indigo-900/50 rounded-full mb-2 overflow-hidden">
            <View className="h-full bg-white rounded-full" style={{ width: `${progressPercentage}%` }} />
          </View>
          <View className="flex-row justify-between">
            <Text className="text-indigo-200 text-xs">已使用 {progressPercentage.toFixed(0)}%</Text>
            <Text className="text-indigo-200 text-xs">動態預算 RM {totalBudget.toFixed(2)}</Text>
          </View>
        </View>

        {/* 日曆與交易歷史列表區域 */}
        <View className="bg-white rounded-3xl p-5 mb-8 shadow-sm border border-slate-100">
          <Text className="text-center text-slate-400 text-sm py-4">（記帳日曆模組運作中）</Text>
        </View>

      </ScrollView>
    </View>
  );
}