import { useLocalSearchParams } from 'expo-router';
import { BookOpen, Car, ChartLine, ChevronLeft, ChevronRight, Coffee, Edit3, Gamepad2, Heart, LayoutGrid, MessageSquareText, Monitor, Plane, Plus, ShoppingBag, Trash2, Utensils, Wallet, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertConfig, CustomAlert } from '../../components/ui/CustomAlert';
import { useBudget } from '../../hooks/useBudget';
import { useTransactions } from '../../hooks/useTransactions';
import { Transaction } from '../../type';

// 🌟 統一圖示渲染引擎：同步你自訂的類別圖示
const renderCategoryIcon = (iconId: string, size = 22, color = '#64748b') => {
  switch (iconId) {
    case 'utensils': return <Utensils size={size} color={color} />;
    case 'heart': return <Heart size={size} color={color} />;
    case 'book': return <BookOpen size={size} color={color} />;
    case 'car': return <Car size={size} color={color} />;
    case 'wallet': return <Wallet size={size} color={color} />;
    case 'gamepad': return <Gamepad2 size={size} color={color} />;
    case 'shopping': return <ShoppingBag size={size} color={color} />;
    case 'coffee': return <Coffee size={size} color={color} />;
    case 'plane': return <Plane size={size} color={color} />;
    case 'monitor': return <Monitor size={size} color={color} />;
    default: return <LayoutGrid size={size} color={color} />;
  }
};

const Dashboard = () => {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  
  const { fetchTransactions, fetchCategories, addTransaction, deleteTransaction, updateTransaction } = useTransactions();
  const { data: transactions, isLoading } = fetchTransactions;
  const { data: categories } = fetchCategories;
  const { budget: TARGET_BUDGET, isLoading: isBudgetLoading } = useBudget();
  
  // --- 狀態管理 ---
  const [isModalVisible, setModalVisible] = useState(false);
  const [isAnalyticsVisible, setAnalyticsVisible] = useState(false); // 🌟 新增：統計圖表 Modal 狀態

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [isSavings, setIsSavings] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const [calendarDate, setCalendarDate] = useState(new Date());
  const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), []);
  const [selectedDateStr, setSelectedDateStr] = useState(todayStr);

  const [alertConfig, setAlertConfig] = useState<AlertConfig>({ visible: false, title: '', message: '', type: 'info' });
  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  useEffect(() => {
    if (params.openModal) {
      setEditingTransaction(null);
      setAmount('');
      setNote('');
      setSelectedCategoryId(null);
      setIsSavings(false);
      setModalVisible(true);
    }
  }, [params.openModal]);

  // ==========================================
  // 🌟 數據計算與動態過濾
  // ==========================================
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

  // 🌟 核心新增：本月類別消費佔比計算引擎 (供圖表使用)
  const categoryBreakdown = useMemo(() => {
    if (!transactions || currentMonthExpenses === 0) return [];
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    const breakdown: Record<string, { name: string, icon: string, amount: number, color: string }> = {};
    const chartColors = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899'];
    let colorIndex = 0;

    transactions.forEach(tx => {
      const d = new Date(tx.date);
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth && tx.category?.type === 'expense') {
        const catId = tx.category_id || 'unknown';
        if (!breakdown[catId]) {
          breakdown[catId] = {
            name: tx.category?.name || '未分類',
            icon: tx.category?.icon || 'dollar',
            amount: 0,
            color: chartColors[colorIndex % chartColors.length] // 動態分配漂亮顏色
          };
          colorIndex++;
        }
        breakdown[catId].amount += tx.amount;
      }
    });

    // 轉換為陣列、計算百分比，並由高到低排序
    return Object.values(breakdown)
      .map(item => ({ ...item, percentage: ((item.amount / currentMonthExpenses) * 100).toFixed(1) }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, currentMonthExpenses]);

  // --- 日曆邏輯 ---
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

  // --- 操作邏輯 ---
  const handleTransactionPress = (tx: Transaction) => {
    setSelectedTx(tx);
    setOptionsModalVisible(true);
  };

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
          is_savings: type === 'income' ? isSavings : false,
        });
        setAlertConfig({ visible: true, title: '修改成功', message: '您的交易紀錄已更新。', type: 'success' });
      } else {
        await addTransaction.mutateAsync({
          amount: parseFloat(amount),
          note: note,
          category_id: selectedCategoryId,
          date: new Date(selectedDateStr + 'T12:00:00').toISOString(),
          is_savings: type === 'income' ? isSavings : false,
        });
        setAlertConfig({ visible: true, title: '新增成功', message: '一筆新的交易紀錄已儲存！', type: 'success' });
      }

      setAmount('');
      setNote('');
      setSelectedCategoryId(null);
      setIsSavings(false);
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

  if (isLoading || isBudgetLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-5">
        
        <View style={{ paddingTop: insets.top }} className="flex-row justify-between items-center py-4 mb-1">
          <Text className="text-3xl font-extrabold text-slate-900 tracking-tight">財務概覽</Text>
          {/* 🌟 修改：綁定統計分析 Modal 打開事件 */}
          <TouchableOpacity onPress={() => setAnalyticsVisible(true)} className="bg-slate-200 p-3 rounded-full active:bg-slate-300">
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
                {/* 🌟 修改：應用最新的自訂圖示渲染器 */}
                <View className={`p-3.5 rounded-full mr-4 ${item.category?.type === 'income' ? 'bg-emerald-50' : 'bg-slate-100'}`}>
                  {renderCategoryIcon(item.category?.icon || '', 22, item.category?.type === 'income' ? '#10b981' : '#64748b')}
                </View>
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

      {/* ===== 🌟 1. 統計分析面板 (Analytics Modal) ===== */}
      <Modal visible={isAnalyticsVisible} animationType="slide" transparent={true} onRequestClose={() => setAnalyticsVisible(false)}>
        <View className="flex-1 bg-slate-50 mt-12 rounded-t-[32px] shadow-2xl overflow-hidden">
          <View className="flex-row justify-between items-center p-6 bg-white border-b border-slate-100">
            <Text className="text-2xl font-extrabold text-slate-900">本月支出分析</Text>
            <TouchableOpacity onPress={() => setAnalyticsVisible(false)} className="bg-slate-100 p-2 rounded-full active:bg-slate-200">
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-6 pt-6">
            <View className="items-center mb-8">
              <Text className="text-slate-500 font-medium mb-1">本月累計支出</Text>
              <Text className="text-4xl font-black text-slate-800">RM {currentMonthExpenses.toFixed(2)}</Text>
            </View>

            <Text className="text-lg font-bold text-slate-800 mb-4">各類別消費佔比</Text>

            {categoryBreakdown.length === 0 ? (
              <View className="items-center py-10">
                <Text className="text-slate-400">本月還沒有任何支出記錄喔！</Text>
              </View>
            ) : (
              <View className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 mb-10">
                {categoryBreakdown.map((item, index) => (
                  <View key={index} className={`py-4 ${index !== 0 ? 'border-t border-slate-50' : ''}`}>
                    <View className="flex-row justify-between items-center mb-2">
                      <View className="flex-row items-center">
                        <View className="p-2 rounded-full mr-3" style={{ backgroundColor: `${item.color}15` }}>
                          {renderCategoryIcon(item.icon, 20, item.color)}
                        </View>
                        <Text className="text-base font-bold text-slate-700">{item.name}</Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-base font-black text-slate-800">RM {item.amount.toFixed(2)}</Text>
                        <Text className="text-xs font-bold mt-0.5" style={{ color: item.color }}>{item.percentage}%</Text>
                      </View>
                    </View>
                    {/* 動態進度條橫向統計 */}
                    <View className="h-2 bg-slate-100 rounded-full w-full overflow-hidden mt-1">
                      <View className="h-full rounded-full" style={{ width: `${Number(item.percentage)}%`, backgroundColor: item.color }} />
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* ===== 2. 新增/修改 交易表單 ===== */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity className="flex-1 bg-black/40 justify-end" activeOpacity={1} onPress={() => setModalVisible(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <TouchableOpacity activeOpacity={1} className="bg-white rounded-t-[32px] p-6 pb-10">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-2xl font-bold text-slate-900">{editingTransaction ? '修改記錄' : '新增記錄'}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} className="bg-slate-100 p-2 rounded-full"><X size={24} color="#64748b" /></TouchableOpacity>
              </View>
              
              <View className="flex-row bg-slate-100 rounded-xl p-1 mb-6">
                <TouchableOpacity className={`flex-1 py-3 rounded-lg items-center ${type === 'expense' ? 'bg-white shadow-sm border border-slate-200' : ''}`} onPress={() => setType('expense')}><Text className={`font-bold ${type === 'expense' ? 'text-slate-900' : 'text-slate-400'}`}>支出</Text></TouchableOpacity>
                <TouchableOpacity className={`flex-1 py-3 rounded-lg items-center ${type === 'income' ? 'bg-white shadow-sm border border-slate-200' : ''}`} onPress={() => setType('income')}><Text className={`font-bold ${type === 'income' ? 'text-slate-900' : 'text-slate-400'}`}>收入</Text></TouchableOpacity>
              </View>

              <Text className="text-sm font-semibold text-slate-500 mb-2">金額</Text>
              <View className="flex-row items-center border-b-2 border-indigo-100 pb-2 mb-6">
                <Text className="text-3xl font-bold text-slate-800 mr-2">RM</Text>
                <TextInput className="flex-1 text-4xl font-extrabold text-indigo-600" placeholder="0.00" placeholderTextColor="#cbd5e1" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} autoFocus />
              </View>

              <Text className="text-sm font-semibold text-slate-500 mb-3">選擇類別</Text>
              <View className="flex-row flex-wrap gap-2 mb-6">
                {(categories || []).filter(c => c.type === type).map((cat) => (
                  <TouchableOpacity key={cat.id} onPress={() => setSelectedCategoryId(cat.id)} className={`px-4 py-2 rounded-full border ${selectedCategoryId === cat.id ? 'bg-indigo-50 border-indigo-600' : 'bg-white border-slate-200'}`}>
                    <Text className={`font-medium ${selectedCategoryId === cat.id ? 'text-indigo-600' : 'text-slate-600'}`}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text className="text-sm font-semibold text-slate-500 mb-2">備註 (選填)</Text>
              <TextInput className="bg-slate-50 p-4 rounded-xl text-slate-800 mb-4" placeholder="例如：午餐..." placeholderTextColor="#94a3b8" value={note} onChangeText={setNote} />

              {type === 'income' && (
                <TouchableOpacity onPress={() => setIsSavings(!isSavings)} className={`flex-row items-center p-4 rounded-xl mb-4 border ${isSavings ? 'bg-emerald-50/60 border-emerald-500' : 'bg-slate-50 border-slate-200'}`}>
                  <View className={`w-6 h-6 rounded-md items-center justify-center border-2 mr-3 ${isSavings ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                    {isSavings && <Plus size={16} color="white" strokeWidth={4} />}
                  </View>
                  <Text className={`font-bold text-base ${isSavings ? 'text-emerald-700' : 'text-slate-600'}`}>將此筆收入標記為「儲蓄項目」</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity className={`py-4 rounded-2xl items-center ${amount && selectedCategoryId ? 'bg-indigo-600' : 'bg-slate-300'}`} disabled={!amount || !selectedCategoryId} onPress={handleSaveTransaction}>
                <Text className="text-white font-bold text-lg">{editingTransaction ? '儲存更新' : '儲存記錄'}</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* ===== 3. 底部操作選單 (Action Sheet) ===== */}
      <Modal visible={optionsModalVisible} animationType="fade" transparent={true} onRequestClose={() => setOptionsModalVisible(false)}>
        <TouchableOpacity className="flex-1 bg-black/40 justify-end" activeOpacity={1} onPress={() => setOptionsModalVisible(false)}>
          <View className="bg-white rounded-t-[32px] p-6 pb-10">
            <View className="items-center mb-4"><View className="w-12 h-1.5 bg-slate-200 rounded-full" /></View>
            <Text className="text-xl font-bold text-slate-900 mb-1">選擇操作</Text>
            <Text className="text-slate-500 mb-6 font-medium">{selectedTx?.category?.name} • RM {selectedTx?.amount.toFixed(2)}</Text>

            <TouchableOpacity className="flex-row items-center bg-indigo-50 p-4 rounded-2xl mb-3 active:bg-indigo-100" onPress={() => {
              setOptionsModalVisible(false);
              if (selectedTx) {
                setEditingTransaction(selectedTx);
                setAmount(selectedTx.amount.toString());
                setNote(selectedTx.note);
                setSelectedCategoryId(selectedTx.category_id || null);
                setType(selectedTx.category?.type || 'expense');
                setIsSavings(selectedTx.is_savings || false);
                setTimeout(() => setModalVisible(true), 150); 
              }
            }}>
              <Edit3 size={22} color="#4f46e5" />
              <Text className="text-indigo-600 font-bold text-lg ml-3">修改這筆記錄</Text>
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center bg-rose-50 p-4 rounded-2xl mb-3 active:bg-rose-100" onPress={() => {
              setOptionsModalVisible(false);
              setTimeout(() => {
                setAlertConfig({
                  visible: true, title: '確認刪除', message: '您確定要刪除這筆交易記錄嗎？此操作將無法還原。', type: 'warning', showCancel: true, confirmText: '確認刪除',
                  onConfirm: () => { if (selectedTx) deleteTransaction.mutate(selectedTx.id); }
                });
              }, 300);
            }}>
              <Trash2 size={22} color="#f43f5e" />
              <Text className="text-rose-600 font-bold text-lg ml-3">刪除這筆記錄</Text>
            </TouchableOpacity>
            <TouchableOpacity className="py-4 items-center mt-2" onPress={() => setOptionsModalVisible(false)}><Text className="text-slate-400 font-bold text-lg">取消</Text></TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <CustomAlert config={alertConfig} hideAlert={hideAlert} />
    </SafeAreaView>
  );
};

export default Dashboard;