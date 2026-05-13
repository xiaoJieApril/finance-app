import { BookOpen, Car, ChartLine, DollarSign, Heart, MessageSquareText, Utensils, Wallet, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, SafeAreaView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTransactions } from '../../hooks/useTransactions';
// 在 Dashboard 元件內部加入這個 useEffect
import { useLocalSearchParams } from 'expo-router';

const getCategoryIcon = (categoryName: string) => {
  if (!categoryName) return <DollarSign size={22} color="#64748b" />;
  if (categoryName.includes('211')) return <Utensils size={22} color="#f59e0b" />;
  if (categoryName.includes('Hololive')) return <Heart size={22} color="#f43f5e" />;
  if (categoryName.includes('JLPT')) return <BookOpen size={22} color="#0ea5e9" />;
  if (categoryName.includes('交通')) return <Car size={22} color="#8b5cf6" />;
  if (categoryName.includes('薪資')) return <Wallet size={22} color="#10b981" />;
  return <DollarSign size={22} color="#64748b" />;
};

const Dashboard = () => {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  
  useEffect(() => {
    if (params.openModal) {
      setModalVisible(true);
    }
  }, [params.openModal]);

  // 引入我們寫好的 Hooks
  const { fetchTransactions, fetchCategories, addTransaction } = useTransactions();
  const { data: transactions, isLoading, isError } = fetchTransactions;
  const { data: categories } = fetchCategories; // 拿取類別資料
  // --- 表單狀態管理 ---
  const [isModalVisible, setModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [type, setType] = useState<'expense' | 'income'>('expense');


  // ==========================================
  // 🌟 新增：動態計算預算邏輯
  // ==========================================
  const TARGET_BUDGET = 3500.00; // 你的每月目標預算

  // 計算總支出 (使用 useMemo 確保只有當 transactions 改變時才重新計算)
  const currentMonthExpenses = useMemo(() => {
    if (!transactions) return 0;

    return transactions.reduce((total, tx) => {
      // 確保只加總「支出 (expense)」類別的金額
      if (tx.category?.type === 'expense') {
        return total + tx.amount;
      }
      return total;
    }, 0);
  }, [transactions]);

  // 計算進度條百分比 (最高不超過 100%)
  const progressPercentage = Math.min((currentMonthExpenses / TARGET_BUDGET) * 100, 100).toFixed(0);

  // --- 送出表單邏輯 ---
  const handleSaveTransaction = async () => {
    if (!amount || !selectedCategoryId) {
      Alert.alert('提示', '請填寫金額並選擇一個類別');
      return;
    }

    try {
      await addTransaction.mutateAsync({
        amount: parseFloat(amount),
        note: note,
        category_id: selectedCategoryId,
        date: new Date().toISOString(), // 🌟 新增這行：記錄當下的時間
      });

      // 成功後清空表單
      setAmount('');
      setNote('');
      setSelectedCategoryId(null);
      setModalVisible(false);
      Alert.alert('成功', '交易紀錄已新增！');
    } catch (error) {
      console.error(error);
      Alert.alert('錯誤', '新增失敗，請稍後再試。');
    }
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
      {/* ===== 背景主畫面 ===== */}
      <View style={{ paddingTop: insets.top }} className="flex-1 px-5">
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
              {/* 🌟 替換為動態百分比 */}
              <Text className="text-white text-xs font-bold">已使用 {progressPercentage}%</Text>
            </View>
          </View>
          
          {/* 🌟 替換為動態總額 (顯示到小數點後兩位) */}
          <Text className="text-white text-4xl font-extrabold mt-1 tracking-tight">
            RM {currentMonthExpenses.toFixed(2)}
          </Text>
          
          <View className="mt-5 bg-indigo-300 h-3 rounded-full overflow-hidden">
            {/* 🌟 這裡最關鍵：使用 inline style 動態控制白色條的寬度！ */}
            <View 
              className="bg-white h-full rounded-full" 
              style={{ width: parseInt(progressPercentage) }} 
            />
          </View>
          
          <Text className="text-indigo-100 text-xs mt-3 font-normal">
            目標預算: RM {TARGET_BUDGET.toFixed(2)}
          </Text>
        </View>

        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-xl font-bold text-slate-900">最近記錄</Text>
        </View>
        
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          className="flex-1"
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          renderItem={({ item }) => (
            <TouchableOpacity className="flex-row items-center bg-white p-4 rounded-2xl mb-3 shadow-sm shadow-slate-100 active:bg-slate-50">
              <View className="bg-slate-100 p-3.5 rounded-full mr-4">
                {getCategoryIcon(item.category?.name || '')}
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-slate-800">{item.category?.name}</Text>
                <View className="flex-row items-center mt-1">
                  <MessageSquareText size={12} color="#94a3b8" />
                  <Text className="text-xs text-slate-400 ml-1.5" numberOfLines={1}>{item.note || '無備註'}</Text>
                </View>
              </View>
              <Text className="text-xl font-bold text-red-500">-RM {item.amount.toFixed(2)}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* ===== 新增交易的彈跳視窗 (Modal) ===== */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        {/* 半透明黑色背景 (點擊背景也可關閉) */}
        <TouchableOpacity 
          className="flex-1 bg-black/40 justify-end" 
          activeOpacity={1} 
          onPress={() => setModalVisible(false)}
        >
          {/* 避免鍵盤擋住輸入框 */}
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            {/* 底部白色表單卡片 */}
            <TouchableOpacity 
              activeOpacity={1} 
              className="bg-white rounded-t-[32px] p-6 pb-10"
            >
              {/* 頂部控制列 */}
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-2xl font-bold text-slate-900">新增記錄</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} className="bg-slate-100 p-2 rounded-full">
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* 支出/收入 切換 */}
              <View className="flex-row bg-slate-100 rounded-xl p-1 mb-6">
                <TouchableOpacity 
                  className={`flex-1 py-3 rounded-lg items-center ${type === 'expense' ? 'bg-white shadow-sm' : ''}`}
                  onPress={() => setType('expense')}
                >
                  <Text className={`font-bold ${type === 'expense' ? 'text-slate-900' : 'text-slate-400'}`}>支出</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className={`flex-1 py-3 rounded-lg items-center ${type === 'income' ? 'bg-white shadow-sm' : ''}`}
                  onPress={() => setType('income')}
                >
                  <Text className={`font-bold ${type === 'income' ? 'text-slate-900' : 'text-slate-400'}`}>收入</Text>
                </TouchableOpacity>
              </View>

              {/* 金額輸入 */}
              <Text className="text-sm font-semibold text-slate-500 mb-2">金額</Text>
              <View className="flex-row items-center border-b-2 border-indigo-100 pb-2 mb-6">
                <Text className="text-3xl font-bold text-slate-800 mr-2">RM</Text>
                <TextInput
                  className="flex-1 text-4xl font-extrabold text-indigo-600"
                  placeholder="0.00"
                  placeholderTextColor="#cbd5e1"
                  keyboardType="decimal-pad"
                  value={amount}
                  onChangeText={setAmount}
                  autoFocus
                />
              </View>

              {/* 類別選擇 */}
              <Text className="text-sm font-semibold text-slate-500 mb-3">選擇類別</Text>
              <View className="flex-row flex-wrap gap-2 mb-6">
                {categories?.filter(c => c.type === type).map((cat) => (
                  <TouchableOpacity 
                    key={cat.id}
                    onPress={() => setSelectedCategoryId(cat.id)}
                    className={`px-4 py-2 rounded-full border ${selectedCategoryId === cat.id ? 'bg-indigo-50 border-indigo-600' : 'bg-white border-slate-200'}`}
                  >
                    <Text className={`font-medium ${selectedCategoryId === cat.id ? 'text-indigo-600' : 'text-slate-600'}`}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 備註 */}
              <Text className="text-sm font-semibold text-slate-500 mb-2">備註 (選填)</Text>
              <TextInput
                className="bg-slate-50 p-4 rounded-xl text-slate-800 mb-8"
                placeholder="例如：午餐雞飯、買了Suisei的周邊..."
                placeholderTextColor="#94a3b8"
                value={note}
                onChangeText={setNote}
              />

              {/* 儲存按鈕 */}
              <TouchableOpacity 
                className={`py-4 rounded-2xl items-center ${amount && selectedCategoryId ? 'bg-indigo-600' : 'bg-slate-300'}`}
                disabled={!amount || !selectedCategoryId}
                onPress={handleSaveTransaction}
              >
                <Text className="text-white font-bold text-lg">儲存記錄</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

export default Dashboard;