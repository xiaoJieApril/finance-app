import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign // 預設的類別圖標
  ,

  MessageSquareText,
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
  const router = useRouter();
  const { fetchTransactions, fetchCategories, addTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const { totalBudget } = useBudget();
  const { data: transactions = [] } = fetchTransactions;
  const { data: categories = [] } = fetchCategories;

  // --- 狀態管理 ---
  const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), []);
  const [selectedDateStr, setSelectedDateStr] = useState(todayStr);
  
  // 📅 月曆的當前顯示月份
  const [calendarDate, setCalendarDate] = useState(new Date());

  const [modalVisible, setModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isSavings, setIsSavings] = useState(false);

  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'success' as 'success' | 'error' | 'warning' });

  // --- 📅 月曆與數據邏輯 ---

  // 1. 切換月份
  const handlePrevMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));

  // 2. 計算月曆網格 (產生二維陣列，代表每週的日期，空白填 null)
  const calendarWeeks = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const weeks = [];
    let currentWeek: (number | null)[] = Array(firstDayOfMonth).fill(null);

    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null);
      weeks.push(currentWeek);
    }
    return weeks;
  }, [calendarDate]);

  // 3. 計算每一天的總收入與總支出 (給月曆格子顯示用)
  const dailyAggregates = useMemo(() => {
    const aggregates: Record<string, { income: number; expense: number }> = {};
    transactions.forEach((t: any) => {
      if (!t.date) return;
      const dateKey = new Date(t.date).toLocaleDateString('en-CA');
      if (!aggregates[dateKey]) aggregates[dateKey] = { income: 0, expense: 0 };
      
      if (t.category?.type === 'expense') aggregates[dateKey].expense += t.amount;
      else if (t.category?.type === 'income') aggregates[dateKey].income += t.amount;
    });
    return aggregates;
  }, [transactions]);

  // 4. 篩選當前選中日期的交易紀錄
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t: any) => new Date(t.date).toLocaleDateString('en-CA') === selectedDateStr);
  }, [transactions, selectedDateStr]);

  // 5. 格式化選中的日期標題 (例如：10 月 25 日)
  const formattedSectionTitle = useMemo(() => {
    const [y, m, d] = selectedDateStr.split('-');
    return `${parseInt(m)} 月 ${parseInt(d)} 日 明細`;
  }, [selectedDateStr]);

  // 6. 點擊清單項目進行編輯
  const handleTransactionPress = (item: any) => {
    setEditingTransaction(item);
    setAmount(item.amount.toString());
    setNote(item.note || '');
    setSelectedCategoryId(item.category_id?.toString());
    setType(item.category?.type || 'expense');
    setModalVisible(true);
  };

  // 7. 簡單的圖標輔助函式
  const getCategoryIcon = (name: string) => {
    return <CircleDollarSign size={20} color="#64748b" />;
  };

  // --- 預算與進度計算 ---
  const totalSpending = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return transactions
      .filter((t: any) => new Date(t.date).getMonth() === currentMonth && new Date(t.date).getFullYear() === currentYear && t.category?.type === 'expense')
      .reduce((sum: number, t: any) => sum + t.amount, 0);
  }, [transactions]);

  const progressPercentage = totalBudget > 0 ? Math.min((totalSpending / totalBudget) * 100, 100) : 0;

  // --- 儲存交易邏輯 ---
  const handleSaveTransaction = async () => {
    if (!amount || !selectedCategoryId) {
      setAlertConfig({ visible: true, title: '提示', message: '請填寫金額並選擇類別。', type: 'warning' }); return;
    }
    try {
      const parsedAmount = parseFloat(amount);
      if (editingTransaction) {
        await updateTransaction.mutateAsync({ id: editingTransaction.id, amount: parsedAmount, note, category_id: parseInt(selectedCategoryId) });
        setAlertConfig({ visible: true, title: '成功', message: '交易已更新。', type: 'success' });
      } else {
        await addTransaction.mutateAsync({ 
          amount: parsedAmount, note, category_id: parseInt(selectedCategoryId), 
          date: new Date(selectedDateStr + 'T12:00:00').toISOString(), 
          is_savings: type === 'income' ? isSavings : false 
        });
        
        if (type === 'expense' && totalBudget > 0) {
          const updatedTotalExpenses = totalSpending + parsedAmount;
          try {
            if (updatedTotalExpenses > totalBudget) {
              await Notifications.scheduleNotificationAsync({ content: { title: "🚨 預算超支！", body: `本月支出已超過預算！`, sound: true }, trigger: null });
            } else if (updatedTotalExpenses >= totalBudget * 0.9) {
              await Notifications.scheduleNotificationAsync({ content: { title: "⚠️ 預算警告", body: `本月支出已達預算 90%！` }, trigger: null });
            }
          } catch (e) { console.log("略過推播"); }
        }
        setAlertConfig({ visible: true, title: '成功', message: '交易已儲存！', type: 'success' });
      }
      setAmount(''); setNote(''); setSelectedCategoryId(null); setIsSavings(false); setEditingTransaction(null); setModalVisible(false);
    } catch (error) {
      setAlertConfig({ visible: true, title: '錯誤', message: '儲存失敗。', type: 'error' });
    }
  };

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView className="flex-1 px-6 pt-12 pb-24" showsVerticalScrollIndicator={false}>
        
        {/* 頂部導航列 */}
        <View className="flex-row justify-between items-center mb-6">
          <TouchableOpacity onPress={() => router.push('/profile')} className="w-10 h-10 bg-indigo-100 rounded-full items-center justify-center border border-indigo-200">
            <User color="#4F46E5" size={20} />
          </TouchableOpacity>
          <Text className="text-xl font-black text-slate-800">我的金庫</Text>
          <View className="w-10 h-10" />
        </View>

        {/* 預算卡片 */}
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

        {/* 📅 月曆模組 */}
        <View className="bg-white p-4 rounded-3xl mb-6 shadow-sm border border-slate-100">
          <View className="flex-row justify-between items-center mb-4 px-2">
            <Text className="text-lg font-bold text-slate-800">{calendarDate.getFullYear()} 年 {calendarDate.getMonth() + 1} 月</Text>
            <View className="flex-row gap-2">
              <TouchableOpacity onPress={handlePrevMonth} className="bg-slate-50 p-2 rounded-full border border-slate-100 active:bg-slate-100"><ChevronLeft size={18} color="#475569" /></TouchableOpacity>
              <TouchableOpacity onPress={handleNextMonth} className="bg-slate-50 p-2 rounded-full border border-slate-100 active:bg-slate-100"><ChevronRight size={18} color="#475569" /></TouchableOpacity>
            </View>
          </View>
          <View className="flex-row mb-2">
            {['日', '一', '二', '三', '四', '五', '六'].map((day, idx) => (
              <Text key={idx} className={`flex-1 text-center text-xs font-bold ${idx === 0 || idx === 6 ? 'text-slate-400' : 'text-slate-500'}`}>{day}</Text>
            ))}
          </View>
          {calendarWeeks.map((week, weekIdx) => (
            <View key={weekIdx} className="flex-row border-t border-slate-50 py-1.5 min-h-[48px]">
              {week.map((day, dayIdx) => {
                if (day === null) return <View key={dayIdx} className="flex-1" />;
                const currentGridDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day);
                const dateKey = currentGridDate.toLocaleDateString('en-CA');
                const hasData = dailyAggregates[dateKey];
                const isSelected = dateKey === selectedDateStr;
                const isToday = dateKey === todayStr;

                return (
                  <TouchableOpacity key={dayIdx} onPress={() => setSelectedDateStr(dateKey)} className={`flex-1 items-center justify-between rounded-xl py-0.5 border ${isSelected ? 'bg-indigo-600 border-indigo-600' : isToday ? 'bg-indigo-50 border-indigo-200' : 'border-transparent'}`}>
                    <Text className={`text-xs font-bold ${isSelected ? 'text-white' : isToday ? 'text-indigo-600' : 'text-slate-700'}`}>{day}</Text>
                    <View className="w-full px-0.5 items-center mt-0.5">
                      {hasData?.income > 0 && <Text className={`text-[9px] font-bold text-center scale-90 ${isSelected ? 'text-indigo-100' : 'text-emerald-500'}`} numberOfLines={1}>+{hasData.income.toFixed(0)}</Text>}
                      {hasData?.expense > 0 && <Text className={`text-[9px] font-bold text-center scale-90 ${isSelected ? 'text-indigo-200' : 'text-rose-400'}`} numberOfLines={1}>-{hasData.expense.toFixed(0)}</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* --- 交易記錄列表 --- */}
        <View className="flex-row justify-between items-center mb-4 px-1">
          <Text className="text-xl font-bold text-slate-900">{formattedSectionTitle}</Text>
          <Text className="text-xs text-slate-400 font-medium">共 {filteredTransactions.length} 筆</Text>
        </View>
        
        {filteredTransactions.length === 0 ? (
          <View className="bg-white rounded-2xl p-8 items-center border border-dashed border-slate-200 mb-10">
            <Text className="text-slate-400 text-sm">此日期沒有任何記帳資料喔！</Text>
          </View>
        ) : (
          <View className="mb-10">
            {filteredTransactions.map((item: any) => (
              <TouchableOpacity key={item.id} onPress={() => handleTransactionPress(item)} className="flex-row items-center bg-white p-4 rounded-2xl mb-3 shadow-sm border border-slate-100 active:bg-slate-50">
                <View className="bg-slate-100 p-3.5 rounded-full mr-4">{getCategoryIcon(item.category?.name || '')}</View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-slate-800">{item.category?.name}</Text>
                  <View className="flex-row items-center mt-1">
                    <MessageSquareText size={12} color="#94a3b8" />
                    <Text className="text-xs text-slate-400 ml-1.5" numberOfLines={1}>{item.note || '無備註'}</Text>
                  </View>
                </View>
                <Text className={`text-lg font-bold ${item.category?.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {item.category?.type === 'income' ? '+' : '-'}RM {item.amount.toFixed(2)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* 記帳 Modal 彈窗 (維持原樣) */}
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

      <CustomAlert visible={alertConfig?.visible || false} title={alertConfig.title} message={alertConfig.message} type={alertConfig.type} onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))} />
    </View>
  );
}