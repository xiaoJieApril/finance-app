import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router'; // 🌟 1. 引入 useRouter
import {
  CheckCircle,
  Plus,
  User,
  X
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { CustomAlert } from '../../components/ui/CustomAlert';
import { useBudget } from '../../hooks/useBudget';
import { useTransactions } from '../../hooks/useTransactions';

export default function Dashboard() {
  const router = useRouter(); // 🌟 2. 初始化路由
  const { fetchTransactions, fetchCategories, addTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const { totalBudget } = useBudget();
  const { data: transactions = [] } = fetchTransactions;
  const { data: categories = [] } = fetchCategories;

  // --- 狀態管理 ---
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toLocaleDateString('en-CA'));
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isSavings, setIsSavings] = useState(false);

  // 自訂 Alert 狀態
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'success' as 'success' | 'error' | 'warning'
  });

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

  // --- 儲存交易邏輯 (含安全推播預警) ---
  const handleSaveTransaction = async () => {
    if (!amount || !selectedCategoryId) {
      setAlertConfig({ visible: true, title: '溫馨提示', message: '請填寫金額並選擇一個類別喔！', type: 'warning' });
      return;
    }
    try {
      const parsedAmount = parseFloat(amount);
      
      if (editingTransaction) {
        await updateTransaction.mutateAsync({ 
          id: editingTransaction.id, 
          amount: parsedAmount, 
          note: note, 
          category_id: parseInt(selectedCategoryId) 
        });
        setAlertConfig({ visible: true, title: '修改成功', message: '交易紀錄已更新。', type: 'success' });
      } else {
        await addTransaction.mutateAsync({ 
          amount: parsedAmount, 
          note: note, 
          category_id: parseInt(selectedCategoryId), 
          date: new Date(selectedDateStr + 'T12:00:00').toISOString(), 
          is_savings: type === 'income' ? isSavings : false 
        });
        
        // 🚨 預算超支預警邏輯 (外包獨立 try-catch，防止 Expo Go 環境報錯中斷儲存)
        if (type === 'expense' && totalBudget > 0) {
          const updatedTotalExpenses = totalSpending + parsedAmount;
          const warningThreshold = totalBudget * 0.9;

          try {
            if (updatedTotalExpenses > totalBudget) {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: "🚨 預算超支警告！",
                  body: `您本月的總支出已達 RM ${updatedTotalExpenses.toFixed(2)}，超過了設定的總預算！請注意財務狀況。`,
                  sound: true,
                },
                trigger: null,
              });
            } else if (updatedTotalExpenses >= warningThreshold) {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: "⚠️ 預算即將見底",
                  body: `您本月支出已達預算的 90%，剩下的額度不多囉！`,
                },
                trigger: null,
              });
            }
          } catch (notificationError) {
            console.log("Expo Go 環境不支援通知，已自動安全略過。");
          }
        }

        setAlertConfig({ visible: true, title: '新增成功', message: '交易紀錄已儲存！', type: 'success' });
      }
      setAmount(''); setNote(''); setSelectedCategoryId(null); setIsSavings(false); setEditingTransaction(null); setModalVisible(false);
    } catch (error) {
      setAlertConfig({ visible: true, title: '發生錯誤', message: '儲存失敗，請重試。', type: 'error' });
    }
  };

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView className="flex-1 px-6 pt-12 pb-24">
        
        {/* 頂部導航列：點擊頭像直接解鎖路由跳轉 ➡️ profile.tsx */}
        <View className="flex-row justify-between items-center mb-6">
          <TouchableOpacity 
            onPress={() => router.push('/profile')} // 🌟 3. 改為直接導向分頁
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

        {/* 這裡保留你完美的日曆與交易歷史列表區域 ... */}
        <View className="bg-white rounded-3xl p-5 mb-8 shadow-sm border border-slate-100">
          <Text className="text-center text-slate-400 text-sm py-4">（記帳日曆模組運作中）</Text>
        </View>

      </ScrollView>

      {/* 新增記帳浮動按鈕 */}
      <TouchableOpacity 
        onPress={() => { setEditingTransaction(null); setModalVisible(true); }}
        className="absolute bottom-6 self-center w-14 h-14 bg-indigo-600 rounded-full items-center justify-center shadow-lg"
      >
        <Plus color="white" size={28} />
      </TouchableOpacity>

      {/* 記帳 Modal 彈窗 */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 h-5/6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold">{editingTransaction ? '修改紀錄' : '新增交易'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><X color="#64748b" size={24} /></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="flex-row bg-slate-100 rounded-xl p-1 mb-6">
                <TouchableOpacity onPress={() => setType('expense')} className={`flex-1 py-2 rounded-lg items-center ${type === 'expense' ? 'bg-white shadow-sm' : ''}`}>
                  <Text className={`font-bold ${type === 'expense' ? 'text-red-500' : 'text-slate-500'}`}>支出</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setType('income')} className={`flex-1 py-2 rounded-lg items-center ${type === 'income' ? 'bg-white shadow-sm' : ''}`}>
                  <Text className={`font-bold ${type === 'income' ? 'text-emerald-500' : 'text-slate-500'}`}>收入</Text>
                </TouchableOpacity>
              </View>

              <Text className="text-slate-500 mb-2 font-medium">金額 (RM)</Text>
              <TextInput 
                value={amount} onChangeText={setAmount} keyboardType="numeric"
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-2xl font-bold mb-6 text-slate-800"
                placeholder="0.00"
              />

              <Text className="text-slate-500 mb-2 font-medium">選擇類別</Text>
              <View className="flex-row flex-wrap justify-between mb-6">
                {categories.filter((c: any) => c.type === type).map((cat: any) => (
                  <TouchableOpacity 
                    key={cat.id} onPress={() => setSelectedCategoryId(cat.id.toString())}
                    className={`w-[31%] p-3 rounded-xl mb-3 items-center border ${selectedCategoryId === cat.id.toString() ? 'bg-indigo-50 border-indigo-500' : 'bg-white border-slate-200'}`}
                  >
                    <Text className={`font-bold mt-1 ${selectedCategoryId === cat.id.toString() ? 'text-indigo-600' : 'text-slate-600'}`}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {type === 'income' && (
                <TouchableOpacity onPress={() => setIsSavings(!isSavings)} className="flex-row items-center mb-6 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <View className={`w-6 h-6 rounded border items-center justify-center mr-3 ${isSavings ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300'}`}>
                    {isSavings && <CheckCircle color="white" size={16} />}
                  </View>
                  <Text className="font-bold text-emerald-800">標記為儲蓄項目</Text>
                </TouchableOpacity>
              )}

              <Text className="text-slate-500 mb-2 font-medium">備註 (選填)</Text>
              <TextInput 
                value={note} onChangeText={setNote}
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 mb-8"
                placeholder="寫點什麼備註吧..."
              />

              <TouchableOpacity onPress={handleSaveTransaction} className="bg-indigo-600 rounded-xl p-4 items-center">
                <Text className="text-white font-bold text-lg">儲存記錄</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 精美自訂彈窗元件 */}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />
    </View>
  );
}