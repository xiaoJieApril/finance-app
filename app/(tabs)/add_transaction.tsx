import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { CheckCircle, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
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

export default function AddTransactionScreen() {
  const router = useRouter();
  const { fetchCategories, fetchTransactions, addTransaction } = useTransactions();
  const { totalBudget } = useBudget();
  
  const { data: categories = [] } = fetchCategories;
  const { data: transactions = [] } = fetchTransactions;

  // --- 狀態管理 ---
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isSavings, setIsSavings] = useState(false);
  const [selectedDateStr] = useState(new Date().toLocaleDateString('en-CA'));

  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'success' as 'success' | 'error' | 'warning'
  });

  // 取得本月總支出 (為了計算推播預警)
  const totalSpending = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return transactions
      .filter((t: any) => new Date(t.date).getMonth() === currentMonth && new Date(t.date).getFullYear() === currentYear && t.category?.type === 'expense')
      .reduce((sum: number, t: any) => sum + t.amount, 0);
  }, [transactions]);

  // --- 儲存邏輯 ---
  const handleSaveTransaction = async () => {
    if (!amount || !selectedCategoryId) {
      setAlertConfig({ visible: true, title: '溫馨提示', message: '請填寫金額並選擇一個類別喔！', type: 'warning' });
      return;
    }
    try {
      const parsedAmount = parseFloat(amount);
      
      await addTransaction.mutateAsync({ 
        amount: parsedAmount, 
        note: note, 
        category_id: parseInt(selectedCategoryId), 
        date: new Date(selectedDateStr + 'T12:00:00').toISOString(), 
        is_savings: type === 'income' ? isSavings : false 
      });
      
      // 🚨 預算超支預警邏輯
      if (type === 'expense' && totalBudget > 0) {
        const updatedTotalExpenses = totalSpending + parsedAmount;
        const warningThreshold = totalBudget * 0.9;
        try {
          if (updatedTotalExpenses > totalBudget) {
            await Notifications.scheduleNotificationAsync({
              content: { title: "🚨 預算超支警告！", body: `您本月的總支出已超過設定的總預算！`, sound: true }, trigger: null,
            });
          } else if (updatedTotalExpenses >= warningThreshold) {
            await Notifications.scheduleNotificationAsync({
              content: { title: "⚠️ 預算即將見底", body: `您本月支出已達預算的 90%！` }, trigger: null,
            });
          }
        } catch (error) {
          console.log("Expo Go 環境略過推播");
        }
      }

      setAlertConfig({ visible: true, title: '新增成功', message: '交易紀錄已儲存！', type: 'success' });
      
      // 成功後，延遲 1.5 秒自動返回首頁
      setTimeout(() => {
        setAmount(''); setNote(''); setSelectedCategoryId(null); setIsSavings(false);
        router.push('/(tabs)');
      }, 1500);

    } catch (error) {
      setAlertConfig({ visible: true, title: '發生錯誤', message: '儲存失敗，請重試。', type: 'error' });
    }
  };

  return (
    <>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 bg-slate-50">
      <View className="flex-1 p-6 pt-12">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-2xl font-black text-slate-800">新增交易</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)')} className="w-10 h-10 bg-slate-200 rounded-full items-center justify-center">
            <X color="#64748b" size={20} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* 收支切換 */}
          <View className="flex-row bg-slate-200 rounded-xl p-1 mb-6">
            <TouchableOpacity onPress={() => setType('expense')} className={`flex-1 py-3 rounded-lg items-center ${type === 'expense' ? 'bg-white shadow-sm' : ''}`}>
              <Text className={`font-bold text-lg ${type === 'expense' ? 'text-red-500' : 'text-slate-500'}`}>支出</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setType('income')} className={`flex-1 py-3 rounded-lg items-center ${type === 'income' ? 'bg-white shadow-sm' : ''}`}>
              <Text className={`font-bold text-lg ${type === 'income' ? 'text-emerald-500' : 'text-slate-500'}`}>收入</Text>
            </TouchableOpacity>
          </View>

          <Text className="text-slate-500 mb-2 font-medium">金額 (RM)</Text>
          <TextInput 
            value={amount} onChangeText={setAmount} keyboardType="numeric"
            className="bg-white border border-slate-200 rounded-xl p-4 text-3xl font-bold mb-6 text-slate-800 shadow-sm"
            placeholder="0.00"
          />

          <Text className="text-slate-500 mb-2 font-medium">選擇類別</Text>
          <View className="flex-row flex-wrap justify-between mb-6">
            {categories.filter((c: any) => c.type === type).map((cat: any) => (
              <TouchableOpacity 
                key={cat.id} onPress={() => setSelectedCategoryId(cat.id.toString())}
                className={`w-[31%] p-3 rounded-xl mb-3 items-center border shadow-sm ${selectedCategoryId === cat.id.toString() ? 'bg-indigo-50 border-indigo-500' : 'bg-white border-slate-200'}`}
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
            className="bg-white border border-slate-200 rounded-xl p-4 text-slate-800 mb-8 shadow-sm"
            placeholder="寫點什麼備註吧..."
          />

          <TouchableOpacity onPress={handleSaveTransaction} className="bg-indigo-600 rounded-xl p-4 items-center shadow-lg mb-8">
            <Text className="text-white font-bold text-lg">儲存記錄</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
    
    {alertConfig.visible && (
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />
    )}
    </>
  );
}