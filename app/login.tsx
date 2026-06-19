import { Wallet } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomButton } from '../components/ui/CustomButton';
import { CustomInput } from '../components/ui/CustomInput';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signInWithEmail, signUpWithEmail, isLoading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);

  const handleSubmit = () => {
    if (isLoginMode) {
      signInWithEmail(email, password);
    } else {
      signUpWithEmail(email, password);
    }
  };

  const handleGuestLogin = async () => {
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
    } catch (error) {
      console.error(error);
      Alert.alert('錯誤', '訪客登入失敗');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 px-6 justify-center"
        style={{ paddingBottom: insets.bottom }}
      >
        <View className="items-center mb-10">
          <View className="bg-indigo-100 p-4 rounded-full mb-4">
            <Wallet size={48} color="#4f46e5" />
          </View>
          <Text className="text-3xl font-extrabold text-slate-900">
            {isLoginMode ? '歡迎回來' : '建立新帳號'}
          </Text>
          <Text className="text-slate-500 mt-2">
            開始精準掌握您的每一筆財務
          </Text>
        </View>

        <CustomInput 
          label="電子郵件" 
          placeholder="your@email.com"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        
        <CustomInput 
          label="密碼" 
          placeholder="請輸入至少 6 位數密碼"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <View className="mt-4">
          <CustomButton 
            title={isLoginMode ? '登入' : '註冊'} 
            onPress={handleSubmit}
            isLoading={isLoading}
          />
          
          <CustomButton 
            title={isLoginMode ? '還沒有帳號？點此註冊' : '已有帳號？點此登入'} 
            variant="secondary"
            className="mt-3"
            onPress={() => setIsLoginMode(!isLoginMode)}
            disabled={isLoading}
          />
          
          <TouchableOpacity 
            onPress={handleGuestLogin}
            className="mt-4 py-3 items-center border border-slate-300 rounded-2xl active:bg-slate-50"
            disabled={isLoading}
          >
            <Text className="font-bold text-slate-600">以訪客身份進入</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
