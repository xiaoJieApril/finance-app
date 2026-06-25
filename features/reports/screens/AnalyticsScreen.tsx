import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, ChevronLeft, ChevronRight, PieChart as PieChartIcon, TrendingUp } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTransactions } from '@/features/finance/hooks/useTransactions';
import { exportToCSV, exportToPDF } from '@/features/reports/utils/exportReport';

const CATEGORY_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function AnalyticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { fetchTransactions, fetchCategories } = useTransactions();
  const { data: transactions, isLoading: isTxLoading } = fetchTransactions;
  const { data: categories, isLoading: isCatLoading } = fetchCategories;

  const [currentMonth, setCurrentMonth] = useState(new Date());

  // ==========================================
  // 🌟 匯出功能邏輯區塊
  // ==========================================
  const filterTransactions = (period: 'week' | 'month') => {
    const now = new Date();
    const txs = transactions || [];
    return txs.filter(tx => {
      const txDate = new Date(tx.date);
      if (period === 'month') {
        return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
      } else if (period === 'week') {
        const diffTime = Math.abs(now.getTime() - txDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      }
      return false;
    });
  };

  const handleExport = (format: 'pdf' | 'csv', period: 'week' | 'month') => {
    const filteredData = filterTransactions(period);
    
    if (filteredData.length === 0) {
      Alert.alert('提示', '這個區間沒有任何交易紀錄可以匯出喔！');
      return;
    }

    const title = period === 'week' ? '近一週' : '本月';

    if (format === 'pdf') {
      exportToPDF(filteredData, title);
    } else {
      exportToCSV(filteredData, title);
    }
  };

  // ==========================================
  // 🌟 統計圖表邏輯區塊
  // ==========================================
  const currentMonthExpenses = useMemo(() => {
    if (!transactions) return [];
    return transactions.filter(tx => {
      const d = new Date(tx.date);
      return (
        d.getMonth() === currentMonth.getMonth() &&
        d.getFullYear() === currentMonth.getFullYear() &&
        tx.category?.type === 'expense'
      );
    });
  }, [transactions, currentMonth]);

  const pieChartData = useMemo(() => {
    if (currentMonthExpenses.length === 0 || !categories) return [];
    const categoryTotals: Record<number, number> = {};
    let totalExpense = 0;

    currentMonthExpenses.forEach(tx => {
      const catId = tx.category_id;
      if (catId) {
        categoryTotals[catId] = (categoryTotals[catId] || 0) + tx.amount;
        totalExpense += tx.amount;
      }
    });

    return Object.entries(categoryTotals)
      .map(([catId, amount], index) => {
        const category = categories.find(c => c.id.toString() === catId);
        const percentage = ((amount / totalExpense) * 100).toFixed(1);
        return {
          value: amount,
          color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
          text: `${percentage}%`,
          name: category?.name || '未知',
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [currentMonthExpenses, categories]);

  const barChartData = useMemo(() => {
    if (!transactions) return [];
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toLocaleDateString('en-CA');
      const displayLabel = `${d.getMonth() + 1}/${d.getDate()}`;
      
      const dailyTotal = transactions
        .filter(tx => tx.category?.type === 'expense' && new Date(tx.date).toLocaleDateString('en-CA') === dateString)
        .reduce((sum, tx) => sum + tx.amount, 0);

      data.push({
        value: dailyTotal,
        label: displayLabel,
        frontColor: dailyTotal > 0 ? '#4f46e5' : '#e2e8f0',
        topLabelComponent: () => (
          dailyTotal > 0 ? <Text className="text-[9px] text-slate-500 font-bold mb-1">{dailyTotal.toFixed(0)}</Text> : null
        )
      });
    }
    return data;
  }, [transactions]);

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  if (isTxLoading || isCatLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  const totalMonthExpense = pieChartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <View className="flex-1 bg-slate-50">
      <Stack.Screen options={{ headerShown: false }} />

      {/* 🌟 頂部導航 */}
      <View style={{ paddingTop: insets.top }} className="bg-white flex-row items-center px-5 py-4 border-b border-slate-100 shadow-sm z-10">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 mr-3 active:bg-slate-100 rounded-full">
          <ArrowLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <View className="bg-indigo-100 p-2 rounded-full mr-3"><TrendingUp size={20} color="#4f46e5" /></View>
        <Text className="text-xl font-black text-slate-900 tracking-tight">統計與匯出</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-5 pt-6">
        
        {/* ========================================== */}
        {/* 區塊零：匯出報表按鈕區塊 */}
        {/* ========================================== */}
        <View className="bg-white p-5 rounded-3xl mb-6 shadow-sm border border-slate-100">
          <Text className="text-lg font-bold text-slate-800 mb-4">匯出報表</Text>
          
          <View className="flex-row justify-between mb-3">
            <TouchableOpacity onPress={() => handleExport('pdf', 'week')} className="bg-indigo-50 flex-1 p-3 rounded-xl mr-2 items-center border border-indigo-100">
              <Text className="text-indigo-600 font-bold text-sm">近一週 (PDF)</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleExport('csv', 'week')} className="bg-emerald-50 flex-1 p-3 rounded-xl ml-2 items-center border border-emerald-100">
              <Text className="text-emerald-600 font-bold text-sm">近一週 (Excel)</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-between">
            <TouchableOpacity onPress={() => handleExport('pdf', 'month')} className="bg-indigo-50 flex-1 p-3 rounded-xl mr-2 items-center border border-indigo-100">
              <Text className="text-indigo-600 font-bold text-sm">本月 (PDF)</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleExport('csv', 'month')} className="bg-emerald-50 flex-1 p-3 rounded-xl ml-2 items-center border border-emerald-100">
              <Text className="text-emerald-600 font-bold text-sm">本月 (Excel)</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ========================================== */}
        {/* 區塊一：月份切換 */}
        {/* ========================================== */}
        <View className="flex-row justify-between items-center bg-white p-2 rounded-2xl mb-6 shadow-sm border border-slate-100">
          <TouchableOpacity onPress={prevMonth} className="p-3 bg-slate-50 rounded-xl active:bg-slate-100">
            <ChevronLeft size={20} color="#64748b" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-slate-800">
            {currentMonth.getFullYear()} 年 {currentMonth.getMonth() + 1} 月
          </Text>
          <TouchableOpacity onPress={nextMonth} className="p-3 bg-slate-50 rounded-xl active:bg-slate-100">
            <ChevronRight size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* ========================================== */}
        {/* 區塊二：消費結構圓餅圖 */}
        {/* ========================================== */}
        <View className="bg-white p-6 rounded-3xl mb-6 shadow-sm border border-slate-100">
          <View className="flex-row items-center mb-6">
            <PieChartIcon size={20} color="#64748b" />
            <Text className="text-lg font-bold text-slate-800 ml-2">當月消費結構</Text>
          </View>
          
          {pieChartData.length > 0 ? (
            <View className="items-center">
              <PieChart
                data={pieChartData}
                donut
                showText
                textColor="white"
                radius={110}
                innerRadius={65}
                textSize={12}
                fontWeight="bold"
                centerLabelComponent={() => (
                  <View className="items-center justify-center">
                    <Text className="text-slate-400 text-xs font-medium">總支出</Text>
                    <Text className="text-slate-800 text-xl font-black mt-1">RM {totalMonthExpense.toFixed(0)}</Text>
                  </View>
                )}
              />
              <View className="flex-row flex-wrap justify-center mt-6">
                {pieChartData.map((item, index) => (
                  <View key={index} className="flex-row items-center w-[45%] mb-3">
                    <View className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }} />
                    <View>
                      <Text className="text-slate-700 font-bold text-sm">{item.name}</Text>
                      <Text className="text-slate-400 text-xs">RM {item.value.toFixed(0)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View className="py-10 items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl">
              <Text className="text-slate-400 font-medium">這個月還沒有任何支出喔！</Text>
            </View>
          )}
        </View>

        {/* ========================================== */}
        {/* 區塊三：近期 7 天花費趨勢長條圖 */}
        {/* ========================================== */}
        <View className="bg-white p-6 rounded-3xl mb-10 shadow-sm border border-slate-100">
          <View className="flex-row items-center mb-8">
            <TrendingUp size={20} color="#64748b" />
            <Text className="text-lg font-bold text-slate-800 ml-2">近 7 日花費趨勢</Text>
          </View>
          <View className="items-center pr-4">
            <BarChart
              data={barChartData}
              barWidth={24}
              spacing={20}
              roundedTop
              roundedBottom
              hideRules
              xAxisThickness={1}
              yAxisThickness={0}
              yAxisTextStyle={{ color: '#94a3b8', fontSize: 11 }}
              noOfSections={4}
              maxValue={Math.max(...barChartData.map(d => d.value), 100) * 1.2}
              labelWidth={30}
              xAxisLabelTextStyle={{ color: '#64748b', fontSize: 10, textAlign: 'center' }}
            />
          </View>
        </View>

      </ScrollView>
    </View>
  );
}
