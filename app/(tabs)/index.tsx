import { useLocalSearchParams } from 'expo-router';
import { BookOpen, Car, ChartLine, ChevronLeft, ChevronRight, DollarSign, Edit3, Heart, MessageSquareText, Trash2, Utensils, Wallet, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTransactions } from '../../hooks/useTransactions';
import { Transaction } from '../../type';
// 🌟 引入我們剛剛寫好的美化版 Alert
import { AlertConfig, CustomAlert } from '../../components/ui/CustomAlert';

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
  
  const { fetchTransactions, fetchCategories, addTransaction, deleteTransaction, updateTransaction } = useTransactions();
  const { data: transactions, isLoading } = fetchTransactions;
  const { data: categories } = fetchCategories;
  
  // --- 表單與日曆狀態 ---
  const [isModalVisible, setModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const [calendarDate, setCalendarDate] = useState(new Date());
  const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), []);
  const [selectedDateStr, setSelectedDateStr] = useState(todayStr);

  // ==========================================
  // 🌟 替換原生 Alert：自訂 Alert 與底部選單狀態
  // ==========================================
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false, title: '', message: '', type: 'info'
  });
  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  useEffect(() => {
    if (params.openModal) {
      setEditingTransaction(null);
      setAmount('');
      setNote('');
      setSelectedCategoryId(null);
      setModalVisible(true);
    }
  }, [params.openModal]);

  // --- 數據計算邏輯保持不變 ---
  const TARGET_BUDGET = 3500.00; 

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    return transactions.filter(tx => new Date(tx.date).toLocaleDateString('en-CA') === selectedDateStr);
  }, [transactions, selectedDateStr]);

  const currentMonthExpenses = useMemo(() => {
    if (!transactions) return 0;
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    return transactions.reduce((total, tx) => {
      const d = new Date(tx.date);
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth && tx.category?.type === 'expense') {
        return total + tx.amount;
      }
      return total;
    }, 0);
  }, [transactions]);

  const progressPercentage = Math.min((currentMonthExpenses / TARGET_BUDGET) * 100, 100).toFixed(0);

  const dailyAggregates = useMemo(() => {
    const aggregates: Record<string, { income: number; expense: number }> = {};
    if (!transactions) return aggregates;
    transactions.forEach(tx => {
      const dateKey = new Date(tx.date).toLocaleDateString('en-CA');
      if (!aggregates[dateKey]) aggregates[dateKey] = { income: 0, expense: 0 };
      if (tx.category?.type === 'income') aggregates[dateKey].income += tx.amount;
      else aggregates[dateKey].expense += tx.amount;
    });
    return aggregates;
  }, [transactions]);

  // --- 日曆切換保持不變 ---
  const handlePrevMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));

  const calendarWeeks = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const daysArray = [];
    for (let i = 0; i < firstDayIndex; i++) daysArray.push(null);
    for (let day = 1; day <= totalDays; day++) daysArray.push(day);
    
    const remainder = daysArray.length % 7;
    if (remainder !== 0) {
      const paddingEnd = 7 - remainder;
      for (let i = 0; i < paddingEnd; i++) daysArray.push(null);
    }
    
    const weeks = [];
    while (daysArray.length > 0) weeks.push(daysArray.splice(0, 7));
    return weeks;
  }, [calendarDate]);

  // ==========================================
  // 🌟 點擊記錄：彈出漂亮的底部操作選單
  // ==========================================
  const handleTransactionPress = (tx: Transaction) => {
    setSelectedTx(tx);
    setOptionsModalVisible(true);
  };

  // ==========================================
  // 🌟 儲存交易：呼叫美化版 Alert
  // ==========================================
  const handleSaveTransaction = async () => {
    if (!amount || !selectedCategoryId) {
      setAlertConfig({ visible: true, title: '溫馨提示', message: '請填寫金額並選擇一個類別喔！', type: 'warning' });
      return;
    }

    try {
      if (editingTransaction) {
        await updateTransaction.mutateAsync({
          id: editingTransaction.id,
          amount: parseFloat(amount),
          note: note,
          category_id: selectedCategoryId,
        });
        setAlertConfig({ visible: true, title: '修改成功', message: '您的交易紀錄已更新。', type: 'success' });
      } else {
        await addTransaction.mutateAsync({
          amount: parseFloat(amount),
          note: note,
          category_id: selectedCategoryId,
          date: new Date(selectedDateStr + 'T12:00:00').toISOString(),
        });
        setAlertConfig({ visible: true, title: '新增成功', message: '一筆新的交易紀錄已儲存！', type: 'success' });
      }

      setAmount('');
      setNote('');
      setSelectedCategoryId(null);
      setEditingTransaction(null);
      setModalVisible(false);
    } catch (error) {
      console.error(error);
      setAlertConfig({ visible: true, title: '發生錯誤', message: '儲存失敗，請稍後再試。', type: 'error' });
    }
  };

  const formattedSectionTitle = useMemo(() => {
    if (selectedDateStr === todayStr) return '今日記錄';
    const [_, m, d] = selectedDateStr.split('-');
    return `${parseInt(m)}月${parseInt(d)}日 記錄`;
  }, [selectedDateStr, todayStr]);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-5">
        
        {/* --- 頁面標題與卡片 --- */}
        <View style={{ paddingTop: insets.top }} className="flex-row justify-between items-center py-4 mb-1">
          <Text className="text-3xl font-extrabold text-slate-900 tracking-tight">財務概覽</Text>
          <TouchableOpacity className="bg-slate-100 p-3 rounded-full">
            <ChartLine size={20} color="#475569" />
          </TouchableOpacity>
        </View>
        
        <View className="bg-indigo-600 p-6 rounded-3xl mb-6 shadow-xl shadow-indigo-100">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-indigo-100 text-sm font-medium">本月總支出</Text>
            <View className="bg-indigo-500/50 px-3 py-1 rounded-full">
              <Text className="text-white text-xs font-bold">已使用 {progressPercentage}%</Text>
            </View>
          </View>
          <Text className="text-white text-4xl font-extrabold mt-1 tracking-tight">RM {currentMonthExpenses.toFixed(2)}</Text>
          <View className="mt-5 bg-indigo-300 h-3 rounded-full overflow-hidden">
            <View className="bg-white h-full rounded-full" style={{ width: `${Number(progressPercentage)}%` }} />
          </View>
          <Text className="text-indigo-100 text-xs mt-3 font-normal">目標預算: RM {TARGET_BUDGET.toFixed(2)}</Text>
        </View>

        {/* --- 日曆區塊 --- */}
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
            {filteredTransactions.map((item) => (
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

      {/* ===== 交易表單彈窗 ===== */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity className="flex-1 bg-black/40 justify-end" activeOpacity={1} onPress={() => setModalVisible(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <TouchableOpacity activeOpacity={1} className="bg-white rounded-t-[32px] p-6 pb-10">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-2xl font-bold text-slate-900">{editingTransaction ? '修改記錄' : '新增記錄'}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} className="bg-slate-100 p-2 rounded-full"><X size={24} color="#64748b" /></TouchableOpacity>
              </View>
              {/* ===== 支出/收入 切換 ===== */}
              <View className="flex-row bg-slate-100 rounded-xl p-1 mb-6">
                <TouchableOpacity 
                  className={`flex-1 py-3 rounded-lg items-center ${type === 'expense' ? 'bg-white border border-slate-200' : ''}`} 
                  onPress={() => {
                    setType('expense');
                    setSelectedCategoryId(null); // 🌟 修正 2：切換時立刻清空舊的類別選擇
                  }}
                >
                  <Text className={`font-bold ${type === 'expense' ? 'text-slate-900' : 'text-slate-400'}`}>支出</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className={`flex-1 py-3 rounded-lg items-center ${type === 'income' ? 'bg-white border border-slate-200' : ''}`} 
                  onPress={() => {
                    setType('income');
                    setSelectedCategoryId(null); // 🌟 修正 2：切換時立刻清空舊的類別選擇
                  }}
                >
                  <Text className={`font-bold ${type === 'income' ? 'text-slate-900' : 'text-slate-400'}`}>收入</Text>
                </TouchableOpacity>
              </View>

              {/* 金額輸入 */}
              <Text className="text-sm font-semibold text-slate-500 mb-2">金額</Text>
              <View className="flex-row items-center border-b-2 border-indigo-100 pb-2 mb-6">
                <Text className="text-3xl font-bold text-slate-800 mr-2">RM</Text>
                <TextInput className="flex-1 text-4xl font-extrabold text-indigo-600" placeholder="0.00" placeholderTextColor="#cbd5e1" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} autoFocus />
              </View>

              {/* ===== 類別選擇 ===== */}
              <Text className="text-sm font-semibold text-slate-500 mb-3">選擇類別</Text>
              <View className="flex-row flex-wrap gap-2 mb-6">
                {/* 🌟 修正 3：加入 (categories || []) 安全防護，確保不管載入多慢都不會發生 undefined.map 的閃退錯誤 */}
                {(categories || []).filter(c => c.type === type).map((cat) => (
                  <TouchableOpacity 
                    key={cat.id} 
                    onPress={() => setSelectedCategoryId(cat.id)} 
                    className={`px-4 py-2 rounded-full border ${selectedCategoryId === cat.id ? 'bg-indigo-50 border-indigo-600' : 'bg-white border-slate-200'}`}
                  >
                    <Text className={`font-medium ${selectedCategoryId === cat.id ? 'text-indigo-600' : 'text-slate-600'}`}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text className="text-sm font-semibold text-slate-500 mb-2">備註 (選填)</Text>
              <TextInput className="bg-slate-50 p-4 rounded-xl text-slate-800 mb-8" placeholder="例如：午餐..." placeholderTextColor="#94a3b8" value={note} onChangeText={setNote} />
              <TouchableOpacity className={`py-4 rounded-2xl items-center ${amount && selectedCategoryId ? 'bg-indigo-600' : 'bg-slate-300'}`} disabled={!amount || !selectedCategoryId} onPress={handleSaveTransaction}>
                <Text className="text-white font-bold text-lg">{editingTransaction ? '儲存更新' : '儲存記錄'}</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* ===== 🌟 新增：底部操作選單 (Action Sheet) ===== */}
      <Modal visible={optionsModalVisible} animationType="fade" transparent={true} onRequestClose={() => setOptionsModalVisible(false)}>
        <TouchableOpacity className="flex-1 bg-black/40 justify-end" activeOpacity={1} onPress={() => setOptionsModalVisible(false)}>
          <View className="bg-white rounded-t-[32px] p-6 pb-10">
            {/* 頂部拖曳條視覺提示 */}
            <View className="items-center mb-4">
              <View className="w-12 h-1.5 bg-slate-200 rounded-full" />
            </View>
            
            <Text className="text-xl font-bold text-slate-900 mb-1">選擇操作</Text>
            <Text className="text-slate-500 mb-6 font-medium">
              {selectedTx?.category?.name} • RM {selectedTx?.amount.toFixed(2)}
            </Text>

            <TouchableOpacity
              className="flex-row items-center bg-indigo-50 p-4 rounded-2xl mb-3 active:bg-indigo-100"
              onPress={() => {
                setOptionsModalVisible(false);
                if (selectedTx) {
                  setEditingTransaction(selectedTx);
                  setAmount(selectedTx.amount.toString());
                  setNote(selectedTx.note);
                  setSelectedCategoryId(selectedTx.category_id || null);
                  setType(selectedTx.category?.type || 'expense');
                  setTimeout(() => setModalVisible(true), 150); // 微延遲讓 Modal 動畫不衝突
                }
              }}
            >
              <Edit3 size={22} color="#4f46e5" />
              <Text className="text-indigo-600 font-bold text-lg ml-3">修改這筆記錄</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center bg-rose-50 p-4 rounded-2xl mb-3 active:bg-rose-100"
              onPress={() => {
                setOptionsModalVisible(false);
                setTimeout(() => {
                  setAlertConfig({
                    visible: true,
                    title: '確認刪除',
                    message: '您確定要刪除這筆交易記錄嗎？此操作將無法還原。',
                    type: 'warning',
                    showCancel: true,
                    confirmText: '確認刪除',
                    onConfirm: () => { if (selectedTx) deleteTransaction.mutate(selectedTx.id); }
                  });
                }, 300);
              }}
            >
              <Trash2 size={22} color="#f43f5e" />
              <Text className="text-rose-600 font-bold text-lg ml-3">刪除這筆記錄</Text>
            </TouchableOpacity>

            <TouchableOpacity className="py-4 items-center mt-2" onPress={() => setOptionsModalVisible(false)}>
              <Text className="text-slate-400 font-bold text-lg">取消</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ===== 🌟 引入自訂 Alert 元件 ===== */}
      <CustomAlert config={alertConfig} hideAlert={hideAlert} />

    </SafeAreaView>
  );
};

export default Dashboard;