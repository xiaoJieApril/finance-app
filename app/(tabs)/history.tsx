import { BookOpen, Car, DollarSign, Heart, MessageSquareText, Trash2, Utensils, Wallet } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { ActivityIndicator, Alert, SectionList, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTransactions } from '../../hooks/useTransactions';
import { Transaction } from '../../type';

// 沿用我們熟悉的類別圖標邏輯
const getCategoryIcon = (categoryName: string) => {
  if (!categoryName) return <DollarSign size={22} color="#64748b" />;
  if (categoryName.includes('211')) return <Utensils size={22} color="#f59e0b" />;
  if (categoryName.includes('Hololive')) return <Heart size={22} color="#f43f5e" />;
  if (categoryName.includes('JLPT')) return <BookOpen size={22} color="#0ea5e9" />;
  if (categoryName.includes('交通')) return <Car size={22} color="#8b5cf6" />;
  if (categoryName.includes('薪資')) return <Wallet size={22} color="#10b981" />;
  return <DollarSign size={22} color="#64748b" />;
};

export default function HistoryScreen() {
  const { fetchTransactions, deleteTransaction } = useTransactions();
  const { data: transactions, isLoading } = fetchTransactions;

  // ==========================================
  // 🌟 將資料依「年份與月份」進行分組
  // ==========================================
  const groupedTransactions = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    
    // 建立一個字典來存放每個月的資料
    const groups: { [key: string]: Transaction[] } = {};
    
    transactions.forEach(tx => {
      const d = new Date(tx.date);
      // 產出例如 "2026年 5月" 的標題
      const monthKey = `${d.getFullYear()}年 ${d.getMonth() + 1}月`;
      
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(tx);
    });

    // 將字典轉換成 SectionList 需要的陣列格式
    return Object.keys(groups).map(key => ({
      title: key,
      data: groups[key]
    }));
  }, [transactions]);

  // 刪除按鈕的確認邏輯
  const handleDelete = (id: string) => {
    Alert.alert('刪除記錄', '確定要刪除這筆交易嗎？刪除後無法恢復。', [
      { text: '取消', style: 'cancel' },
      { 
        text: '刪除', 
        style: 'destructive', 
        onPress: () => deleteTransaction.mutate(id) 
      }
    ]);
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-1 px-5 pt-4">
        <Text className="text-3xl font-extrabold text-slate-900 tracking-tight mb-6">歷史記錄</Text>

        {groupedTransactions.length === 0 ? (
          <View className="flex-1 justify-center items-center pb-20">
            <Text className="text-slate-400 font-medium">目前還沒有任何記錄喔！</Text>
          </View>
        ) : (
          <SectionList
            sections={groupedTransactions}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }} // 為 Footer 預留空間
            // 🌟 渲染月份標題
            renderSectionHeader={({ section: { title } }) => (
              <View className="bg-slate-50 py-2 mb-2 mt-4">
                <Text className="text-sm font-bold text-slate-500">{title}</Text>
              </View>
            )}
            // 🌟 渲染每一筆交易卡片
            renderItem={({ item }) => (
              <View className="flex-row items-center bg-white p-4 rounded-2xl mb-3 shadow-sm border border-slate-100">
                {/* 類別圖標 */}
                <View className="bg-slate-100 p-3.5 rounded-full mr-4">
                  {getCategoryIcon(item.category?.name || '')}
                </View>
                
                {/* 文字區塊 */}
                <View className="flex-1 pr-2">
                  <Text className="text-base font-semibold text-slate-800">{item.category?.name}</Text>
                  <View className="flex-row items-center mt-1">
                    <MessageSquareText size={12} color="#94a3b8" />
                    <Text className="text-xs text-slate-400 ml-1.5" numberOfLines={1}>
                      {item.note || '無備註'}
                    </Text>
                  </View>
                </View>
                
                {/* 金額區塊 */}
                <View className="items-end mr-3">
                  <Text className={`text-lg font-bold ${item.category?.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {item.category?.type === 'income' ? '+' : '-'}RM {item.amount.toFixed(2)}
                  </Text>
                  <Text className="text-[10px] text-slate-400 mt-1">
                    {new Date(item.date).toLocaleDateString()}
                  </Text>
                </View>

                {/* 🌟 刪除按鈕 */}
                <TouchableOpacity 
                  onPress={() => handleDelete(item.id)}
                  className="bg-rose-50 p-2.5 rounded-full border border-rose-100 active:bg-rose-100"
                >
                  <Trash2 size={18} color="#f43f5e" />
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}