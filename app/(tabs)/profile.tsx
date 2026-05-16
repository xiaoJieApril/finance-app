import React, { useState, useEffect } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomButton } from '../../components/ui/CustomButton';
import { CustomInput } from '../../components/ui/CustomInput';
import { useAuth } from '../../hooks/useAuth';
import { useBudget } from '../../hooks/useBudget';
import { CustomAlert, AlertConfig } from '../../components/ui/CustomAlert';

export default function ProfileScreen() {
  const { signOut, isLoading: isSignOutLoading } = useAuth();
  const { budget, updateBudget } = useBudget();
  const [budgetInput, setBudgetInput] = useState('');

  // 彈跳視窗狀態
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false, title: '', message: '', type: 'info'
  });
  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  // 當雲端資料庫的預算加載完成時，自動填入輸入框
  useEffect(() => {
    if (budget) {
      setBudgetInput(budget.toString());
    }
  }, [budget]);

  // 儲存預算邏輯
  const handleSaveBudget = async () => {
    const amount = parseFloat(budgetInput);
    if (isNaN(amount) || amount <= 0) {
      setAlertConfig({ visible: true, title: '格式錯誤', message: '請輸入有效的預算金額喔！', type: 'warning' });
      return;
    }

    try {
      await updateBudget.mutateAsync(amount);
      setAlertConfig({ visible: true, title: '設定成功', message: '您的每月目標預算已成功更新！', type: 'success' });
    } catch (error) {
      console.error(error);
      setAlertConfig({ visible: true, title: '更新失敗', message: '雲端儲存失敗，請稍後再試。', type: 'error' });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-6 pt-4">
          <Text className="text-3xl font-extrabold text-slate-900 tracking-tight mb-8">個人設定</Text>

          {/* 個人資訊卡片 */}
          <View className="bg-white p-6 rounded-3xl items-center shadow-sm border border-slate-100 mb-6">
            <View className="w-20 h-20 bg-indigo-100 rounded-full items-center justify-center mb-4">
              <Text className="text-2xl font-bold text-indigo-600">T</Text>
            </View>
            <Text className="text-xl font-bold text-slate-900">Tan Jun Jie</Text>
            <Text className="text-slate-400 text-sm mt-1">軟體開發實实习生</Text>
          </View>

          {/* 🌟 核心：預算設定區塊 */}
          <View className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-8">
            <Text className="text-lg font-bold text-slate-800 mb-4">財務目標管理</Text>
            
            <CustomInput
              label="每月目標預算 (RM)"
              placeholder="例如：3500"
              keyboardType="numeric"
              value={budgetInput}
              onChangeText={setBudgetInput}
            />

            <CustomButton
              title="儲存預算設定"
              onPress={handleSaveBudget}
              isLoading={updateBudget.isPending}
              className="mt-2"
            />
          </View>

          {/* 系統操作 */}
          <CustomButton 
            title="登出帳號" 
            variant="secondary" 
            onPress={signOut} 
            disabled={isSignOutLoading} 
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 複用自訂 Alert */}
      <CustomAlert config={alertConfig} hideAlert={hideAlert} />
    </SafeAreaView>
  );
}