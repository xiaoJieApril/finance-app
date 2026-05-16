import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTransactions } from '../../hooks/useTransactions';
import { Target, TrendingUp, Landmark, ShieldCheck } from 'lucide-react-native';

export default function SavingsScreen() {
  const { fetchTransactions } = useTransactions();
  const { data: transactions } = fetchTransactions;

  // 試算參數狀態
  const [targetAmount, setTargetAmount] = useState('10000'); // 預設想存到 10k
  const [interestRate, setInterestRate] = useState(4); // 預設年報酬 4% p.a.

  // 1. 動態計算目前已存到的總儲蓄額 (從資料庫過濾 is_savings)
  const totalSavings = useMemo(() => {
    if (!transactions) return 0;
    return transactions.reduce((sum, tx) => {
      if (tx.is_savings) return sum + tx.amount;
      return sum;
    }, 0);
  }, [transactions]);

  // 2. 計算目標達成進度百分比
  const progressPercent = useMemo(() => {
    const target = parseFloat(targetAmount) || 1;
    return Math.min((totalSavings / target) * 100, 100).toFixed(0);
  }, [totalSavings, targetAmount]);

  // 3. 🌟 核心演算法：精準複利試算 (按年計算 Future Value = P * (1 + r)^t)
  const compoundProjections = useMemo(() => {
    const p = totalSavings;
    const r = interestRate / 100;
    
    return [
      { years: 1, amount: p * Math.pow(1 + r, 1) },
      { years: 3, amount: p * Math.pow(1 + r, 3) },
      { years: 5, amount: p * Math.pow(1 + r, 5) },
    ];
  }, [totalSavings, interestRate]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-5 pt-4">
        <Text className="text-3xl font-extrabold text-slate-900 tracking-tight mb-6">儲蓄與複利</Text>

        {/* 總資產回報卡片 */}
        <View className="bg-emerald-600 p-6 rounded-3xl mb-6 shadow-xl shadow-emerald-100">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-emerald-100 text-sm font-medium">目前儲蓄金庫總額</Text>
            <Landmark size={20} color="#a7f3d0" />
          </View>
          <Text className="text-white text-4xl font-extrabold tracking-tight">
            RM {totalSavings.toFixed(2)}
          </Text>
          <View className="mt-5 bg-emerald-700 h-3 rounded-full overflow-hidden">
            <View className="bg-white h-full rounded-full" style={{ width: `${Number(progressPercent)}%` }} />
          </View>
          <View className="flex-row justify-between mt-3">
            <Text className="text-emerald-100 text-xs">達成進度: {progressPercent}%</Text>
            <Text className="text-emerald-100 text-xs">目標: RM {parseFloat(targetAmount || '0').toLocaleString()}</Text>
          </View>
        </View>

        {/* 試算設定控制台 */}
        <View className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 mb-6">
          <Text className="text-base font-bold text-slate-800 mb-4">計畫參數調整</Text>
          
          <Text className="text-xs font-bold text-slate-400 mb-2">長期儲蓄目標金額 (RM)</Text>
          <TextInput
            className="bg-slate-50 p-3.5 rounded-xl text-slate-800 font-bold mb-4 border border-slate-100"
            keyboardType="numeric"
            value={targetAmount}
            onChangeText={setTargetAmount}
          />

          <Text className="text-xs font-bold text-slate-400 mb-2">預期年化報酬率 (p.a.)</Text>
          <View className="flex-row gap-2">
            {[3, 4, 5, 6].map((rate) => (
              <TouchableOpacity
                key={rate}
                onPress={() => setInterestRate(rate)}
                className={`flex-1 py-3 rounded-xl border items-center ${interestRate === rate ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200'}`}
              >
                <Text className={`font-bold ${interestRate === rate ? 'text-white' : 'text-slate-600'}`}>{rate}%</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 🌟 核心：複利時間魔法預測矩陣 */}
        <Text className="text-lg font-bold text-slate-800 mb-3 px-1">複利增長預測模型</Text>
        <View className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 mb-10">
          {compoundProjections.map((item, idx) => (
            <View key={idx} className={`flex-row items-center justify-between py-4 ${idx !== 0 ? 'border-t border-slate-50' : ''}`}>
              <View className="flex-row items-center">
                <View className="bg-indigo-50 p-2.5 rounded-xl mr-3">
                  <TrendingUp size={20} color="#4f46e5" />
                </View>
                <View>
                  <Text className="font-bold text-slate-800">放著滾存 {item.years} 年</Text>
                  <Text className="text-xs text-slate-400">利滾利效應時間</Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-lg font-black text-slate-800">RM {item.amount.toFixed(2)}</Text>
                <Text className="text-[10px] text-emerald-500 font-medium">
                  賺取利息: +RM {(item.amount - totalSavings).toFixed(2)}
                </Text>
              </View>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}