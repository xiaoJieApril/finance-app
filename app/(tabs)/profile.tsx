import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertConfig, CustomAlert } from '../../components/ui/CustomAlert';
import { CustomButton } from '../../components/ui/CustomButton';
import { useAuth } from '../../hooks/useAuth';
import { useBudget } from '../../hooks/useBudget';

export default function ProfileScreen() {
  const { totalBudget } = useBudget();
  const { signOut, isLoading: isSignOutLoading } = useAuth();
  const [budgetInput, setBudgetInput] = useState('');

  // 彈跳視窗狀態
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false, title: '', message: '', type: 'info'
  });
  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-6 pt-4">
          <Text className="text-3xl font-extrabold text-slate-900 tracking-tight mb-8">個人設定</Text>

          {/* 🌟 替代原本的預算設定區：改為 Friendly 的唯讀資訊卡 */}
      <View className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm mb-6">
        <Text className="text-base font-bold text-slate-800 mb-2">每月預算配置</Text>
        <Text className="text-sm text-slate-500 mb-4 leading-5">
          目前的每月總預算已調整為「根據您在交易類別中所設定的個別支出限額自動加總」。若想調整總額，請至類別分頁修改。
        </Text>
        
        <View className="bg-slate-50 p-4 rounded-2xl flex-row justify-between items-center">
          <Text className="font-semibold text-slate-600">目前類別總預算</Text>
          <Text className="font-black text-xl text-indigo-600">RM {totalBudget.toFixed(2)}</Text>
        </View>
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