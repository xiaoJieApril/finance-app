import { useLocalSearchParams } from 'expo-router';
import { BookOpen, Car, ChevronLeft, ChevronRight, Coffee, Edit3, Gamepad2, Heart, LayoutGrid, MessageSquareText, Monitor, Plane, Plus, ShoppingBag, Trash2, User, Utensils, Wallet, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertConfig, CustomAlert } from '../../components/ui/CustomAlert';
import { CustomButton } from '../../components/ui/CustomButton';
import { useAuth } from '../../hooks/useAuth';
import { useBudget } from '../../hooks/useBudget';
import { useTransactions } from '../../hooks/useTransactions';
import { supabase } from '../../services/supabase';
import { Transaction } from '../../type';

const ICON_OPTIONS = ['utensils', 'heart', 'book', 'car', 'wallet', 'gamepad', 'shopping', 'coffee', 'plane', 'monitor'];

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
  
  const { signOut } = useAuth();
  // 🌟 確保解構出 addCategory 功能
  const { fetchTransactions, fetchCategories, addTransaction, deleteTransaction, updateTransaction, addCategory } = useTransactions();
  const { data: transactions, isLoading } = fetchTransactions;
  const { data: categories } = fetchCategories;
  const { totalBudget, totalSpending, remainingBudget } = useBudget();
  
  const [isModalVisible, setModalVisible] = useState(false);
  const [isProfileVisible, setProfileVisible] = useState(false);
  const [isAuthModalVisible, setAuthModalVisible] = useState(false); 

  const [isAnonymous, setIsAnonymous] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // 🌟 行內新增類別專用狀態
  const [isInlineCategoryMode, setIsInlineCategoryMode] = useState(false);
  const [inlineCatName, setInlineCatName] = useState('');
  const [inlineCatIcon, setInlineCatIcon] = useState('layout');

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [isSavings, setIsSavings] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [budgetInput, setBudgetInput] = useState('');

  const [calendarDate, setCalendarDate] = useState(new Date());
  const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), []);
  const [selectedDateStr, setSelectedDateStr] = useState(todayStr);

  const [alertConfig, setAlertConfig] = useState<AlertConfig>({ visible: false, title: '', message: '', type: 'info' });
  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  useEffect(() => {
    if (params.openModal) {
      setEditingTransaction(null); setAmount(''); setNote(''); setSelectedCategoryId(null); setIsSavings(false);
      setIsInlineCategoryMode(false); // 確保打開時是記帳模式
      setModalVisible(true);
    }
  }, [params.openModal]);

  useEffect(() => {
    const checkUserStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsAnonymous(user.is_anonymous ?? false);
        setUserEmail(user.email || '');
      }
    };
    if (isProfileVisible) {
      checkUserStatus();
    }
  }, [isProfileVisible]);

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
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth && tx.category?.type === 'expense') return total + tx.amount;
      return total;
    }, 0);
  }, [transactions]);

  const formattedSectionTitle = useMemo(() => {
    if (selectedDateStr === todayStr) return '今日記錄';
    const [_, m, d] = selectedDateStr.split('-');
    return `${parseInt(m)}月${parseInt(d)}日 記錄`;
  }, [selectedDateStr, todayStr]);

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
    const year = calendarDate.getFullYear(); const month = calendarDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const daysArray = [];
    for (let i = 0; i < firstDayIndex; i++) daysArray.push(null);
    for (let day = 1; day <= totalDays; day++) daysArray.push(day);
    const remainder = daysArray.length % 7;
    if (remainder !== 0) { const paddingEnd = 7 - remainder; for (let i = 0; i < paddingEnd; i++) daysArray.push(null); }
    const weeks = []; while (daysArray.length > 0) weeks.push(daysArray.splice(0, 7));
    return weeks;
  }, [calendarDate]);

  const handleTransactionPress = (tx: Transaction) => {
    setSelectedTx(tx);
    setOptionsModalVisible(true);
  };


  // 🌟 新增：行內保存類別的函數
  const handleSaveInlineCategory = async () => {
    if (!inlineCatName.trim()) {
      Alert.alert('提示', '請輸入類別名稱！');
      return;
    }
    try {
      const newCat = await addCategory.mutateAsync({
        name: inlineCatName.trim(),
        type: type, // 跟隨表單目前的收支類型
        icon: inlineCatIcon,
        budget_limit: 0
      });
      // 成功後，清空狀態並回到記帳模式
      setInlineCatName('');
      setInlineCatIcon('layout');
      setIsInlineCategoryMode(false);
      // 貼心小設計：如果 API 有回傳新建的資料，自動幫用戶選取剛建好的類別
      if (newCat && newCat.length > 0) {
        setSelectedCategoryId(newCat[0].id.toString());
      }
    } catch (error) {
      Alert.alert('錯誤', '新增類別失敗。');
    }
  };

  const handleSaveTransaction = async () => {
    if (!amount || !selectedCategoryId) {
      setAlertConfig({ visible: true, title: '溫馨提示', message: '請填寫金額並選擇一個類別喔！', type: 'warning' });
      return;
    }
    try {
      if (editingTransaction) {
        await updateTransaction.mutateAsync({ id: editingTransaction.id, amount: parseFloat(amount), note: note, category_id: parseInt(selectedCategoryId) });
        setAlertConfig({ visible: true, title: '修改成功', message: '交易紀錄已更新。', type: 'success' });
      } else {
        await addTransaction.mutateAsync({ amount: parseFloat(amount), note: note, category_id: parseInt(selectedCategoryId), date: new Date(selectedDateStr + 'T12:00:00').toISOString(), is_savings: type === 'income' ? isSavings : false });
        setAlertConfig({ visible: true, title: '新增成功', message: '交易紀錄已儲存！', type: 'success' });
      }
      setAmount(''); setNote(''); setSelectedCategoryId(null); setIsSavings(false); setEditingTransaction(null); setModalVisible(false);
    } catch {
      setAlertConfig({ visible: true, title: '發生錯誤', message: '儲存失敗。', type: 'error' });
    }
  };

  const handleAuthSubmit = async () => {
    if (!authEmail.trim() || !authPassword) {
      Alert.alert('提示', '請完整填寫帳號與密碼');
      return;
    }
    try {
      if (isRegisterMode) {
        const { error } = await supabase.auth.updateUser({ email: authEmail.trim(), password: authPassword });
        if (error) throw error;
        setAlertConfig({ visible: true, title: '升級成功', message: '正式會員建立完成，您的所有記帳數據已完美繼承！', type: 'success' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword });
        if (error) throw error;
        setAlertConfig({ visible: true, title: '登入成功', message: '歡迎回來！', type: 'success' });
      }
      setAuthEmail(''); setAuthPassword(''); setAuthModalVisible(false); setProfileVisible(false);
    } catch (err: any) {
      const errorMsg = err.message.includes('Password should be') ? '密碼長度必須至少 6 個字元喔！' : err.message;
      Alert.alert('認證失敗', errorMsg);
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
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-5">
        <View style={{ paddingTop: insets.top }} className="flex-row justify-between items-center py-4 mb-1">
          <TouchableOpacity onPress={() => setProfileVisible(true)} className="bg-indigo-100 w-11 h-11 rounded-full items-center justify-center border-2 border-indigo-200 active:opacity-80">
            <User size={20} color="#4f46e5" strokeWidth={2.5} />
          </TouchableOpacity>
          <Text className="text-2xl font-black text-slate-900 tracking-tight">錢包主頁</Text>
          <View className="w-11" />
        </View>
        
        <View className="bg-indigo-600 p-6 rounded-3xl shadow-sm mb-6">
          <Text className="text-indigo-100 font-semibold text-sm mb-1">本月動態總預算</Text>
          {/* 如果各類別都沒設預算，會顯示 RM 0 */}
          <Text className="text-white text-3xl font-black mb-4">
            RM {totalBudget.toFixed(2)}
          </Text>

          <View className="flex-row justify-between border-t border-indigo-500/40 pt-4">
            <View>
              <Text className="text-indigo-200 text-xs mb-1">已支出</Text>
              <Text className="text-white font-bold text-base">RM {totalSpending.toFixed(2)}</Text>
            </View>
            <View className="items-end">
              <Text className="text-indigo-200 text-xs mb-1">剩餘預算</Text>
              <Text className={`font-bold text-base ${remainingBudget < 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
                RM {remainingBudget.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

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
                <View className={`p-3.5 rounded-full mr-4 ${item.category?.type === 'income' ? 'bg-emerald-50' : 'bg-slate-100'}`}>{renderCategoryIcon(item.category?.icon || '', 22, item.category?.type === 'income' ? '#10b981' : '#64748b')}</View>
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

      {/* ===== 🌟 升級版：支援行內新增類別的記帳表單 ===== */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity className="flex-1 bg-black/40 justify-end" activeOpacity={1} onPress={() => setModalVisible(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <TouchableOpacity activeOpacity={1} className="bg-white rounded-t-[32px] p-6 pb-10">
              
              {/* 根據模式動態切換 UI 內容 */}
              {isInlineCategoryMode ? (
                /* 🚀 模式 A：行內建立新類別表單 */
                <View>
                  <View className="flex-row justify-between items-center mb-6">
                    <TouchableOpacity onPress={() => setIsInlineCategoryMode(false)} className="bg-slate-100 p-2 rounded-full">
                      <ChevronLeft size={24} color="#64748b" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-slate-900">快速建立專屬類別</Text>
                    <View className="w-10" />
                  </View>

                  <Text className="text-sm font-semibold text-slate-500 mb-2">類別名稱</Text>
                  <TextInput className="bg-slate-50 p-4 rounded-xl text-slate-800 font-bold text-lg mb-6 border border-slate-200" placeholder={`例如：遊戲課金 (${type === 'expense' ? '支出' : '收入'})`} placeholderTextColor="#94a3b8" value={inlineCatName} onChangeText={setInlineCatName} autoFocus />

                  <Text className="text-sm font-semibold text-slate-500 mb-3">選擇專屬圖示</Text>
                  <View className="flex-row flex-wrap gap-3 mb-8">
                    {ICON_OPTIONS.map((item) => (
                      <TouchableOpacity key={item} onPress={() => setInlineCatIcon(item)} className={`p-3 rounded-2xl border ${inlineCatIcon === item ? 'bg-indigo-50 border-indigo-600' : 'bg-white border-slate-200'}`}>
                        {renderCategoryIcon(item, 24, inlineCatIcon === item ? '#4f46e5' : '#64748b')}
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity className={`py-4 rounded-2xl items-center ${inlineCatName.trim() ? 'bg-indigo-600' : 'bg-slate-300'}`} disabled={!inlineCatName.trim()} onPress={handleSaveInlineCategory}>
                    <Text className="text-white font-bold text-lg">儲存並繼續記帳</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* 💰 模式 B：原始記帳表單 */
                <View>
                  <View className="flex-row justify-between items-center mb-6">
                    <Text className="text-2xl font-bold text-slate-900">{editingTransaction ? '修改記錄' : '新增記錄'}</Text>
                    <TouchableOpacity onPress={() => setModalVisible(false)} className="bg-slate-100 p-2 rounded-full"><X size={24} color="#64748b" /></TouchableOpacity>
                  </View>
                  <View className="flex-row bg-slate-100 rounded-xl p-1 mb-6">
                    <TouchableOpacity className={`flex-1 py-3 rounded-lg items-center ${type === 'expense' ? 'bg-white border border-slate-200' : ''}`} onPress={() => setType('expense')}><Text className={`font-bold ${type === 'expense' ? 'text-slate-900' : 'text-slate-400'}`}>支出</Text></TouchableOpacity>
                    <TouchableOpacity className={`flex-1 py-3 rounded-lg items-center ${type === 'income' ? 'bg-white border border-slate-200' : ''}`} onPress={() => setType('income')}><Text className={`font-bold ${type === 'income' ? 'text-slate-900' : 'text-slate-400'}`}>收入</Text></TouchableOpacity>
                  </View>
                  <Text className="text-sm font-semibold text-slate-500 mb-2">金額</Text>
                  <View className="flex-row items-center border-b-2 border-indigo-100 pb-2 mb-6">
                    <Text className="text-3xl font-bold text-slate-800 mr-2">RM</Text>
                    <TextInput className="flex-1 text-4xl font-extrabold text-indigo-600" placeholder="0.00" placeholderTextColor="#cbd5e1" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} autoFocus />
                  </View>
                  
                  <Text className="text-sm font-semibold text-slate-500 mb-3">選擇類別</Text>
                  <View className="flex-row flex-wrap gap-2 mb-6">
                    {(categories || []).filter(c => c.type === type).map((cat) => (
                      <TouchableOpacity key={cat.id} onPress={() => setSelectedCategoryId(cat.id.toString())} className={`px-4 py-2 rounded-full border ${selectedCategoryId === cat.id.toString() ? 'bg-indigo-50 border-indigo-600' : 'bg-white border-slate-200'}`}>
                        <Text className={`font-medium ${selectedCategoryId === cat.id.toString() ? 'text-indigo-600' : 'text-slate-600'}`}>{cat.name}</Text>
                      </TouchableOpacity>
                    ))}
                    {/* 🌟 行內新增按鈕 */}
                    <TouchableOpacity onPress={() => setIsInlineCategoryMode(true)} className="px-3 py-2 rounded-full border border-dashed border-slate-400 bg-slate-50 flex-row items-center active:bg-slate-200">
                      <Plus size={16} color="#64748b" />
                      <Text className="font-bold text-slate-500 ml-1">新增</Text>
                    </TouchableOpacity>
                  </View>

                  <Text className="text-sm font-semibold text-slate-500 mb-2">備註 (選填)</Text>
                  <TextInput className="bg-slate-50 p-4 rounded-xl text-slate-800 mb-4" placeholder="例如：午餐..." placeholderTextColor="#94a3b8" value={note} onChangeText={setNote} />
                  {type === 'income' && (
                    <TouchableOpacity onPress={() => setIsSavings(!isSavings)} className={`flex-row items-center p-4 rounded-xl mb-4 border ${isSavings ? 'bg-emerald-50/60 border-emerald-500' : 'bg-slate-50 border-slate-200'}`}>
                      <View className={`w-6 h-6 rounded-md items-center justify-center border-2 mr-3 ${isSavings ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}><Plus size={16} color="white" strokeWidth={4} /></View>
                      <Text className={`font-bold text-base ${isSavings ? 'text-emerald-700' : 'text-slate-600'}`}>將此筆收入標記為「儲蓄項目」</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity className={`py-4 rounded-2xl items-center ${amount && selectedCategoryId ? 'bg-indigo-600' : 'bg-slate-300'}`} disabled={!amount || !selectedCategoryId} onPress={handleSaveTransaction}><Text className="text-white font-bold text-lg">儲存記錄</Text></TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      <Modal visible={isProfileVisible} animationType="slide" transparent={true}>
        <View className="flex-1 bg-slate-50 mt-16 rounded-t-[32px] shadow-2xl p-6">
          <View className="flex-row justify-between items-center mb-8">
            <Text className="text-2xl font-extrabold text-slate-900">個人設定</Text>
            <TouchableOpacity onPress={() => setProfileVisible(false)} className="bg-slate-100 p-2 rounded-full"><X size={24} color="#64748b" /></TouchableOpacity>
          </View>
          
          {isAnonymous ? (
            <View className="bg-white p-6 rounded-3xl items-center shadow-sm border border-slate-100 mb-6">
              <View className="w-16 h-16 bg-slate-100 border border-slate-200 rounded-full items-center justify-center mb-3">
                <User size={28} color="#94a3b8" />
              </View>
              <Text className="text-lg font-black text-slate-800">訪客體驗中</Text>
              <Text className="text-slate-400 text-xs font-medium mt-0.5">註冊正式帳號，即可永久雲端同步數據</Text>
            </View>
          ) : (
            <View className="bg-white p-6 rounded-3xl items-center shadow-sm border border-slate-100 mb-6">
              <View className="w-16 h-16 bg-indigo-50 border border-indigo-100 rounded-full items-center justify-center mb-3">
                <User size={28} color="#4f46e5" />
              </View>
              <Text className="text-lg font-black text-slate-900">Tan Jun Jie</Text>
              <Text className="text-slate-400 text-xs font-medium mt-0.5">{userEmail}</Text>
            </View>
          )}

          {isAnonymous ? (
            <CustomButton title="登入 / 建立正式帳號" onPress={() => setAuthModalVisible(true)} />
          ) : (
            <CustomButton title="安全登出帳號" variant="secondary" onPress={() => { setProfileVisible(false); signOut(); }} />
          )}
        </View>
      </Modal>

      <Modal visible={isAuthModalVisible} animationType="slide" transparent={true}>
        <TouchableOpacity className="flex-1 bg-black/40 justify-end" activeOpacity={1} onPress={() => setAuthModalVisible(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <TouchableOpacity activeOpacity={1} className="bg-white rounded-t-[32px] p-6 pb-10">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-2xl font-bold text-slate-900">{isRegisterMode ? '建立正式帳號' : '會員登入'}</Text>
                <TouchableOpacity onPress={() => setAuthModalVisible(false)} className="bg-slate-100 p-2 rounded-full"><X size={24} color="#64748b" /></TouchableOpacity>
              </View>

              <View className="bg-slate-100 rounded-xl p-1 mb-6 flex-row">
                <TouchableOpacity className={`flex-1 py-2.5 rounded-lg items-center ${!isRegisterMode ? 'bg-white border border-slate-200' : ''}`} onPress={() => setIsRegisterMode(false)}><Text className="font-bold text-slate-800">已有帳號登入</Text></TouchableOpacity>
                <TouchableOpacity className={`flex-1 py-2.5 rounded-lg items-center ${isRegisterMode ? 'bg-white border border-slate-200' : ''}`} onPress={() => setIsRegisterMode(true)}><Text className="font-bold text-slate-800">將訪客升級成新帳號</Text></TouchableOpacity>
              </View>

              <Text className="text-sm font-semibold text-slate-500 mb-2">電子信箱</Text>
              <TextInput className="bg-slate-50 p-4 rounded-xl text-slate-800 mb-4 border border-slate-200" placeholder="example@mail.com" keyboardType="email-address" autoCapitalize="none" value={authEmail} onChangeText={setAuthEmail} />

              <Text className="text-sm font-semibold text-slate-500 mb-2">密碼</Text>
              <TextInput className="bg-slate-50 p-4 rounded-xl text-slate-800 mb-6 border border-slate-200" placeholder="輸入密碼 (至少 6 位)" secureTextEntry autoCapitalize="none" value={authPassword} onChangeText={setAuthPassword} />

              <TouchableOpacity className="bg-indigo-600 py-4 rounded-2xl items-center mb-4 active:opacity-90" onPress={handleAuthSubmit}>
                <Text className="text-white font-bold text-lg">{isRegisterMode ? '確認綁定並升級' : '安全登入'}</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      <Modal visible={optionsModalVisible} animationType="fade" transparent={true}>
        <TouchableOpacity className="flex-1 bg-black/40 justify-end" activeOpacity={1} onPress={() => setOptionsModalVisible(false)}>
          <View className="bg-white rounded-t-[32px] p-6 pb-10">
            <View className="items-center mb-4"><View className="w-12 h-1.5 bg-slate-200 rounded-full" /></View>
            <Text className="text-xl font-bold text-slate-900 mb-1">選擇操作</Text>
            <Text className="text-slate-500 mb-6 font-medium">{selectedTx?.category?.name} • RM {selectedTx?.amount.toFixed(2)}</Text>
            <TouchableOpacity className="flex-row items-center bg-indigo-50 p-4 rounded-2xl mb-3" onPress={() => { setOptionsModalVisible(false); if (selectedTx) { setEditingTransaction(selectedTx); setAmount(selectedTx.amount.toString()); setNote(selectedTx.note); setSelectedCategoryId(selectedTx.category_id?.toString() || null); setType(selectedTx.category?.type || 'expense'); setIsSavings(selectedTx.is_savings || false); setTimeout(() => setModalVisible(true), 150); } }}>
              <Edit3 size={22} color="#4f46e5" /><Text className="text-indigo-600 font-bold text-lg ml-3">修改這筆記錄</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center bg-rose-50 p-4 rounded-2xl mb-3" onPress={() => { setOptionsModalVisible(false); setTimeout(() => { setAlertConfig({ visible: true, title: '確認刪除', message: '您確定要刪除這筆交易記錄嗎？', type: 'warning', showCancel: true, confirmText: '確認刪除', onConfirm: () => { if (selectedTx) deleteTransaction.mutate(selectedTx.id); } }); }, 300); }}>
              <Trash2 size={22} color="#f43f5e" /><Text className="text-rose-600 font-bold text-lg ml-3">刪除這筆記錄</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <CustomAlert config={alertConfig} hideAlert={hideAlert} />
    </SafeAreaView>
  );
};

export default Dashboard;