import React from 'react';
import { ActivityIndicator, FlatList, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
// 引入數據邏輯 Hook
import { useTransactions } from '../hooks/useTransactions';
// 引入 UI 狀態管理 Hook (控制 Dark Mode)
import { useUIStore } from '../store/useUIStore';
// 引入 Lucide 圖標庫
import { BookOpen, Car, ChartLine, DollarSign, Heart, MessageSquareText, Plus, Utensils, Wallet } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// 客製化：根據類別名稱動態顯示圖標
const getCategoryIcon = (categoryName: string) => {
  if (categoryName.includes('211')) return <Utensils size={22} color="#f59e0b" />; // 橘色 (Amber)
  if (categoryName.includes('Hololive')) return <Heart size={22} color="#f43f5e" />; // 粉紅 (Rose)
  if (categoryName.includes('JLPT')) return <BookOpen size={22} color="#0ea5e9" />; // 淺藍 (Sky)
  if (categoryName.includes('交通')) return <Car size={22} color="#8b5cf6" />; // 紫色 (Violet)
  if (categoryName.includes('薪資')) return <Wallet size={22} color="#10b981" />; // 綠色 (Emerald)
  return <DollarSign size={22} color="#64748b" />; // 預設：灰色 (Slate)
};

const Dashboard = () => {
  const insets = useSafeAreaInsets();
  const { fetchTransactions } = useTransactions();
  const { data, isLoading, isError } = fetchTransactions;
  const { isDarkMode } = useUIStore();

  // 1. 處理載入中狀態
  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  // 2. 處理錯誤狀態
  if (isError) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50 p-6">
        <Text className="text-lg text-red-600 font-medium">資料抓取失敗</Text>
        <Text className="text-slate-500 mt-2">請檢查 Supabase 設定檔是否正確。</Text>
      </View>
    );
  }

  return (
    // 總容器：使用 SafeAreaView 避開劉海屏
    <SafeAreaView className="flex-1 bg-slate-50">
      <View style={{ paddingTop: insets.top }} className="flex-1 px-5">
        
        {/* --- 頁面標題 --- */}
        <View className="flex-row justify-between items-center py-4 mb-3">
          <Text className="text-3xl font-extrabold text-slate-900 tracking-tight">財務概覽</Text>
          <TouchableOpacity className="bg-slate-100 p-3 rounded-full">
            <ChartLine size={20} color="#475569" />
          </TouchableOpacity>
        </View>
        
        {/* --- 主核心：預算進度卡片 (Hero Card) --- */}
        <View className="bg-indigo-600 p-6 rounded-3xl mb-7 shadow-xl shadow-indigo-100">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-indigo-100 text-sm font-medium">本月總支出</Text>
            <View className="bg-indigo-500/50 px-3 py-1 rounded-full">
              <Text className="text-white text-xs font-bold">已使用 70%</Text>
            </View>
          </View>
          
          <Text className="text-white text-4xl font-extrabold mt-1 tracking-tight">RM 2,450.00</Text>
          
          {/* 進度條 (使用 View 實作) */}
          <View className="mt-5 bg-indigo-300 h-3 rounded-full overflow-hidden">
            <View className="bg-white h-full w-[70%] rounded-full" />
          </View>
          
          <Text className="text-indigo-100 text-xs mt-3 font-normal">目標預算: RM 3,500.00</Text>
        </View>

        {/* --- 最近記錄標題 --- */}
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-xl font-bold text-slate-900">最近記錄</Text>
          <TouchableOpacity>
            <Text className="text-indigo-600 text-sm font-semibold">查看更多</Text>
          </TouchableOpacity>
        </View>
        
        {/* --- 交易記錄列表 --- */}
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          className="flex-1"
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }} // 為 Floating Button 留白
          renderItem={({ item }) => (
            // 列表卡片
            <TouchableOpacity className="flex-row items-center bg-white p-4 rounded-2xl mb-3 shadow-sm shadow-slate-100 active:bg-slate-50">
              
              {/* 圖標區域 */}
              <View className="bg-slate-100 p-3.5 rounded-full mr-4">
                {getCategoryIcon(item.category?.name || '')}
              </View>
              
              {/* 資料區域 */}
              <View className="flex-1">
                <Text className="text-base font-semibold text-slate-800">{item.category?.name}</Text>
                
                {/* 備註與日期 */}
                <View className="flex-row items-center mt-1">
                  <MessageSquareText size={12} color="#94a3b8" />
                  <Text className="text-xs text-slate-400 ml-1.5" numberOfLines={1}>{item.note || '無備註'}</Text>
                </View>
              </View>
              
              {/* 金額區域：支出統一顯示紅字，並加上負號 */}
              <Text className="text-xl font-bold text-red-500">-RM {item.amount.toFixed(2)}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* --- 右下角 Floating Add Button --- */}
      <TouchableOpacity 
        className="absolute bottom-8 right-8 bg-indigo-600 w-16 h-16 rounded-full flex justify-center items-center shadow-2xl shadow-indigo-200 active:bg-indigo-700"
        onPress={() => console.log('打開新增交易視窗')}
      >
        <Plus size={32} color="white" strokeWidth={3} />
      </TouchableOpacity>

    </SafeAreaView>
  );
};

export default Dashboard;