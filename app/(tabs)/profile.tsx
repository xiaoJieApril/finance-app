import { useRouter } from 'expo-router';
import { ChevronRight, PieChart } from 'lucide-react-native';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertConfig, CustomAlert } from '../../components/ui/CustomAlert';
import { CustomButton } from '../../components/ui/CustomButton';
import { useAuth } from '../../hooks/useAuth';
import { useBudget } from '../../hooks/useBudget';

export default function ProfileScreen() {
  const router = useRouter();
  const { totalBudget } = useBudget();
  const { signOut, isLoading: isSignOutLoading } = useAuth();

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

        {/* 🌟 數據統計與分析 入口按鈕 */}
      <TouchableOpacity 
        onPress={() => router.push('/analytics')}
        className="flex-row items-center bg-white p-4 rounded-2xl mb-4 shadow-sm border border-slate-100"
      >
        <View className="w-10 h-10 bg-indigo-50 rounded-full items-center justify-center mr-4">
          <PieChart color="#4f46e5" size={20} />
        </View>
        <Text className="flex-1 text-slate-800 font-bold text-lg">數據統計與分析</Text>
        <ChevronRight color="#cbd5e1" size={20} />
      </TouchableOpacity>

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