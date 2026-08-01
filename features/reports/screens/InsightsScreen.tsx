import { useRouter } from 'expo-router';
import { Bot, Download, Sparkles, TrendingUp } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '@/features/finance/components/EmptyState';
import { SectionHeader } from '@/features/finance/components/SectionHeader';
import { useFinanceOverview } from '@/features/finance/hooks/useFinanceOverview';
import { formatMoney, entryBaseAmount } from '@/features/finance/utils/finance';
import { exportToCSV, exportToPDF } from '@/features/reports/utils/exportReport';
import { Transaction } from '@/features/finance/types';

const CATEGORY_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function InsightsScreen() {
  const router = useRouter();
  const { overview, financeData, isLoading } = useFinanceOverview();
  const data = financeData.data;

  const pieData = useMemo(() => {
    if (!data) return [];
    const totals = new Map<string, { name: string; amount: number }>();
    data.entries
      .filter((entry) => entry.type === 'expense')
      .forEach((entry) => {
        const key = entry.category_id ?? 'uncategorized';
        const current = totals.get(key) ?? { name: entry.category?.name ?? '未分類', amount: 0 };
        current.amount += entryBaseAmount(entry);
        totals.set(key, current);
      });
    return Array.from(totals.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6)
      .map((item, index) => ({
        value: item.amount,
        name: item.name,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
        text: item.amount.toFixed(0),
      }));
  }, [data]);

  const barData = useMemo(() => {
    if (!data) return [];
    return Array.from({ length: 7 }).map((_, index) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - index));
      const key = d.toLocaleDateString('en-CA');
      const value = data.entries
        .filter((entry) => entry.type === 'expense' && new Date(entry.date).toLocaleDateString('en-CA') === key)
        .reduce((sum, entry) => sum + entryBaseAmount(entry), 0);
      return {
        value,
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        frontColor: value > 0 ? '#4f46e5' : '#e2e8f0',
      };
    });
  }, [data]);

  const assetPieData = useMemo(() => {
    if (!overview) return [];
    return overview.assetAllocation.map((item, index) => ({
      value: item.amount,
      name: item.key.replace('_', ' ').toUpperCase(),
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      text: `${Math.round(item.percentage * 100)}%`,
    }));
  }, [overview]);

  const exportTransactions = (format: 'pdf' | 'csv') => {
    if (!data || data.entries.length === 0) {
      Alert.alert('提示', '目前沒有流水可匯出。');
      return;
    }

    const legacyShape: Transaction[] = data.entries.map((entry, index) => ({
      id: entry.legacy_transaction_id ?? index,
      amount: entry.amount,
      note: entry.note,
      date: entry.date,
      category_id: entry.category?.legacy_category_id,
      is_savings: entry.is_savings,
      category: entry.category
        ? {
            id: entry.category.legacy_category_id ?? index,
            name: entry.category.name,
            icon: entry.category.icon,
            type: entry.category.type,
            budget_limit: entry.category.budget_limit,
          }
        : undefined,
    }));

    if (format === 'pdf') {
      exportToPDF(legacyShape, '財務流水');
    } else {
      exportToCSV(legacyShape, '財務流水');
    }
  };

  if (isLoading || !overview || !data) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 110 }}>
        <Text className="text-3xl font-black text-slate-900">洞察</Text>
        <Text className="text-sm text-slate-400 mt-2 mb-5">看趨勢、匯出報表，或讓 AI 幫你復盤。</Text>

        <TouchableOpacity
          onPress={() => router.push('/ai-agent')}
          className="bg-indigo-600 rounded-2xl p-5 mb-5"
        >
          <View className="flex-row items-center mb-2">
            <Sparkles size={18} color="#c7d2fe" />
            <Text className="text-indigo-100 font-bold ml-2">AI 財務復盤</Text>
          </View>
          <Text className="text-white text-xl font-black mb-1">讓金庫小助手找出你的花錢盲點</Text>
          <Text className="text-indigo-100 text-sm">支援每週 / 每月復盤與追問。</Text>
        </TouchableOpacity>

        <View className="bg-white border border-slate-100 rounded-2xl p-4 mb-5">
          <View className="flex-row items-center mb-3">
            <Bot size={18} color="#4f46e5" />
            <Text className="font-black text-slate-800 ml-2">財務健康</Text>
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="text-4xl font-black text-slate-900">{overview.health.score}</Text>
            <Text className="text-slate-400 text-sm">
              儲蓄率 {(overview.health.savingsRate * 100).toFixed(0)}%
            </Text>
          </View>
        </View>

        <SectionHeader title="匯出報表" />
        <View className="flex-row gap-3 mb-5">
          <TouchableOpacity onPress={() => exportTransactions('pdf')} className="flex-1 bg-white border border-slate-100 rounded-2xl p-4 items-center">
            <Download size={18} color="#4f46e5" />
            <Text className="font-black text-indigo-600 mt-2">PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => exportTransactions('csv')} className="flex-1 bg-white border border-slate-100 rounded-2xl p-4 items-center">
            <Download size={18} color="#059669" />
            <Text className="font-black text-emerald-600 mt-2">Excel CSV</Text>
          </TouchableOpacity>
        </View>

        <SectionHeader title="支出結構" />
        {pieData.length === 0 ? (
          <EmptyState title="沒有可分析的支出" message="新增幾筆支出後，這裡會顯示類別比例。" />
        ) : (
          <View className="bg-white border border-slate-100 rounded-2xl p-5 mb-5 items-center">
            <PieChart data={pieData} donut radius={95} innerRadius={58} textColor="white" showText />
            <View className="w-full mt-5">
              {pieData.map((item) => (
                <View key={item.name} className="flex-row items-center justify-between py-2">
                  <View className="flex-row items-center">
                    <View className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }} />
                    <Text className="font-bold text-slate-700">{item.name}</Text>
                  </View>
                  <Text className="font-black text-slate-800">{formatMoney(item.value)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <SectionHeader title="資產配置" />
        {assetPieData.length === 0 ? (
          <EmptyState title="沒有資產配置資料" message="新增現金、銀行、ETF、Crypto 等帳戶後，這裡會顯示配置。" />
        ) : (
          <View className="bg-white border border-slate-100 rounded-2xl p-5 mb-5 items-center">
            <PieChart
              data={assetPieData}
              donut
              radius={92}
              innerRadius={56}
              textColor="white"
              showText
              centerLabelComponent={() => (
                <View className="items-center">
                  <Text className="text-slate-400 text-xs">Assets</Text>
                  <Text className="text-slate-900 font-black">{formatMoney(overview.wealth.totalAssets)}</Text>
                </View>
              )}
            />
            <View className="w-full mt-5">
              {assetPieData.map((item) => (
                <View key={item.name} className="flex-row items-center justify-between py-2">
                  <View className="flex-row items-center">
                    <View className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }} />
                    <Text className="font-bold text-slate-700">{item.name}</Text>
                  </View>
                  <Text className="font-black text-slate-800">{formatMoney(item.value)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <SectionHeader title="花費偵測" />
        <View className="bg-white border border-slate-100 rounded-2xl p-5 mb-5">
          <Text className="text-sm text-slate-500 leading-6">
            最高類別：{overview.spendingInsights.mostExpensiveCategory?.name ?? '暫無'} · {formatMoney(overview.spendingInsights.mostExpensiveCategory?.amount ?? 0)}
          </Text>
          <Text className="text-sm text-slate-500 leading-6">
            最高單日：{overview.spendingInsights.highestSpendingDay?.date ?? '暫無'} · {formatMoney(overview.spendingInsights.highestSpendingDay?.amount ?? 0)}
          </Text>
          <Text className="text-sm text-slate-500 leading-6">
            平均每日支出：{formatMoney(overview.spendingInsights.averageDailySpending)}
          </Text>
          <Text className="text-sm text-slate-500 leading-6">
            週末支出：{formatMoney(overview.spendingInsights.weekendSpending)}
          </Text>
          <Text className="text-sm text-slate-500 leading-6">
            疑似訂閱 {overview.spendingInsights.possibleSubscriptions.length} 筆 · 疑似重複購買 {overview.spendingInsights.duplicatePurchases.length} 筆
          </Text>
        </View>

        <SectionHeader title="近 7 日支出" />
        <View className="bg-white border border-slate-100 rounded-2xl p-5 mb-6">
          <View className="flex-row items-center mb-5">
            <TrendingUp size={18} color="#64748b" />
            <Text className="font-bold text-slate-700 ml-2">每日支出趨勢</Text>
          </View>
          <BarChart
            data={barData}
            barWidth={24}
            spacing={20}
            roundedTop
            roundedBottom
            hideRules
            yAxisThickness={0}
            xAxisThickness={1}
            xAxisLabelTextStyle={{ color: '#64748b', fontSize: 10 }}
            yAxisTextStyle={{ color: '#94a3b8', fontSize: 10 }}
            noOfSections={4}
            maxValue={Math.max(...barData.map((item) => item.value), 100) * 1.2}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
