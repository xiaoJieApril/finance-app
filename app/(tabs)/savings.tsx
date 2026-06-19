import { Landmark } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { renderCategoryIcon } from '../../constants/categoryIcons';
import { useTransactions } from '../../hooks/useTransactions';

export default function SavingsScreen() {
  const { fetchTransactions } = useTransactions();
  const { data: transactions, isLoading } = fetchTransactions;

  const [targetAmount, setTargetAmount] = useState('10000');
  const [interestRate, setInterestRate] = useState(4);

  const totalSavings = useMemo(() => {
    if (!transactions) return 0;
    return transactions.reduce((sum, tx) => tx.is_savings ? sum + tx.amount : sum, 0);
  }, [transactions]);

  const progressPercent = useMemo(() => {
    const target = parseFloat(targetAmount) || 1;
    return Math.min((totalSavings / target) * 100, 100).toFixed(0);
  }, [totalSavings, targetAmount]);

  const currentMonthExpenses = useMemo(() => {
    if (!transactions) return 0;
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    return transactions.reduce((total, tx) => {
      const d = new Date(tx.date);
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth && tx.category?.type === 'expense') return total + tx.amount;
      return total;
    }, 0);
  }, [transactions]);

  const categoryBreakdown = useMemo(() => {
    if (!transactions || currentMonthExpenses === 0) return [];
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const breakdown: Record<string, { name: string, icon: string, amount: number, color: string }> = {};
    const chartColors = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899'];
    let colorIndex = 0;

    transactions.forEach(tx => {
      const d = new Date(tx.date);
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth && tx.category?.type === 'expense') {
        const catId = tx.category_id?.toString() || 'unknown';
        if (!breakdown[catId]) {
          breakdown[catId] = { name: tx.category?.name || '未分類', icon: tx.category?.icon || 'layout', amount: 0, color: chartColors[colorIndex % chartColors.length] };
          colorIndex++;
        }
        breakdown[catId].amount += tx.amount;
      }
    });
    return Object.values(breakdown).map(item => ({ ...item, percentage: ((item.amount / currentMonthExpenses) * 100).toFixed(1) })).sort((a, b) => b.amount - a.amount);
  }, [transactions, currentMonthExpenses]);

  const compoundProjections = useMemo(() => {
    const p = totalSavings;
    const r = interestRate / 100;
    return [
      { years: 1, amount: p * Math.pow(1 + r, 1) },
      { years: 3, amount: p * Math.pow(1 + r, 3) },
      { years: 5, amount: p * Math.pow(1 + r, 5) },
    ];
  }, [totalSavings, interestRate]);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 100 }}>
        <Text className="text-3xl font-extrabold text-slate-900 tracking-tight mb-6">儲蓄與分析</Text>

        <Text className="text-lg font-bold text-slate-800 mb-3 px-1">本月支出結構分析</Text>
        {categoryBreakdown.length === 0 ? (
          <View className="items-center py-6 bg-white rounded-3xl border border-slate-100 mb-6"><Text className="text-slate-400">本月尚無任何支出數據</Text></View>
        ) : (
          <View className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 mb-6">
            <View className="items-center mb-4">
              <Text className="text-slate-400 text-xs font-medium mb-0.5">本月累計支出總額</Text>
              <Text className="text-2xl font-black text-slate-800">RM {currentMonthExpenses.toFixed(2)}</Text>
            </View>
            {categoryBreakdown.map((item, index) => (
              <View key={index} className={`py-3 ${index !== 0 ? 'border-t border-slate-50' : ''}`}>
                <View className="flex-row justify-between items-center mb-1">
                  <View className="flex-row items-center">
                    <View className="p-1.5 rounded-full mr-2.5" style={{ backgroundColor: `${item.color}15` }}>{renderCategoryIcon(item.icon, 16, item.color)}</View>
                    <Text className="text-sm font-bold text-slate-700">{item.name}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-sm font-black text-slate-800">RM {item.amount.toFixed(2)}</Text>
                    <Text className="text-[11px] font-bold" style={{ color: item.color }}>{item.percentage}%</Text>
                  </View>
                </View>
                <View className="h-1.5 bg-slate-100 rounded-full w-full overflow-hidden">
                  <View className="h-full rounded-full" style={{ width: `${Number(item.percentage)}%`, backgroundColor: item.color }} />
                </View>
              </View>
            ))}
          </View>
        )}

        <Text className="text-lg font-bold text-slate-800 mb-3 px-1">長期儲蓄複利模型</Text>
        <View className="bg-emerald-600 p-6 rounded-3xl mb-6 shadow-xl shadow-emerald-100">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-emerald-100 text-sm font-medium">儲蓄金庫資產淨額</Text>
            <Landmark size={20} color="#a7f3d0" />
          </View>
          <Text className="text-white text-4xl font-extrabold tracking-tight">RM {totalSavings.toFixed(2)}</Text>
          <View className="mt-5 bg-emerald-700 h-3 rounded-full overflow-hidden">
            <View className="bg-white h-full rounded-full" style={{ width: `${Number(progressPercent)}%` }} />
          </View>
          <View className="flex-row justify-between mt-3">
            <Text className="text-emerald-100 text-xs">達成率: {progressPercent}%</Text>
            <Text className="text-emerald-100 text-xs">目標金額: RM {parseFloat(targetAmount || '0').toLocaleString()}</Text>
          </View>
        </View>

        <View className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 mb-6">
          <Text className="text-sm font-bold text-slate-400 mb-2">調整長線儲蓄目標 (RM)</Text>
          <TextInput className="bg-slate-50 p-3.5 rounded-xl text-slate-800 font-bold mb-4 border border-slate-100" keyboardType="numeric" value={targetAmount} onChangeText={setTargetAmount} />
          <Text className="text-sm font-bold text-slate-400 mb-2">選擇預期年回報率 (p.a.)</Text>
          <View className="flex-row gap-2">
            {[3, 4, 5, 6].map((rate) => (
              <TouchableOpacity key={rate} onPress={() => setInterestRate(rate)} className={`flex-1 py-3 rounded-xl border items-center ${interestRate === rate ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200'}`}>
                <Text className={`font-bold ${interestRate === rate ? 'text-white' : 'text-slate-600'}`}>{rate}%</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100">
          {compoundProjections.map((item, idx) => (
            <View key={idx} className={`flex-row items-center justify-between py-3.5 ${idx !== 0 ? 'border-t border-slate-50' : ''}`}>
              <Text className="font-bold text-slate-700">資產滾存 {item.years} 年</Text>
              <View className="items-end">
                <Text className="text-base font-black text-slate-800">RM {item.amount.toFixed(2)}</Text>
                <Text className="text-[10px] text-emerald-500 font-medium">+RM {(item.amount - totalSavings).toFixed(2)}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
