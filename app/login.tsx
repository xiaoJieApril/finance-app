import { Wallet } from 'lucide-react-native';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';

export default function LoginScreen() {
  const { signInWithEmail, signUpWithEmail, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);

  const handleSubmit = () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) return;
    if (isLoginMode) void signInWithEmail(normalizedEmail, password);
    else void signUpWithEmail(normalizedEmail, password);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F4F7F4]">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 }} keyboardShouldPersistTaps="handled">
          <View className="mb-9 h-14 w-14 items-center justify-center rounded-2xl bg-[#183C32]">
            <Wallet size={27} color="#D7E979" strokeWidth={1.8} />
          </View>
          <Text className="text-3xl font-bold leading-10 text-[#183C32]">{isLoginMode ? '每一笔，都有迹可循。' : '开一本新账。'}</Text>
          <Text className="mt-3 text-base leading-6 text-[#5D6D63]">{isLoginMode ? '登录后管理收支；离线时也能继续记录。' : '建立账号后，你的记录会在设备与云端之间同步。'}</Text>

          <View className="mt-9">
            <Text className="mb-2 text-sm font-semibold text-[#183C32]">电子邮箱</Text>
            <TextInput
              className="mb-5 border-b border-[#B8C9BE] py-3 text-base text-[#183C32]"
              placeholder="name@example.com"
              placeholderTextColor="#75847C"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
            />
            <Text className="mb-2 text-sm font-semibold text-[#183C32]">密码</Text>
            <TextInput
              className="border-b border-[#B8C9BE] py-3 text-base text-[#183C32]"
              placeholder="至少 6 位"
              placeholderTextColor="#75847C"
              secureTextEntry
              autoComplete={isLoginMode ? 'current-password' : 'new-password'}
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={handleSubmit}
              returnKeyType="go"
            />
          </View>

          <TouchableOpacity onPress={handleSubmit} disabled={isLoading || !email.trim() || !password} className={`mt-8 items-center rounded-full py-4 ${isLoading || !email.trim() || !password ? 'bg-[#75847C]' : 'bg-[#183C32]'}`}>
            <Text className="font-bold text-white">{isLoading ? '请稍候' : isLoginMode ? '登录' : '创建账号'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsLoginMode((value) => !value)} disabled={isLoading} className="mt-5 items-center py-2">
            <Text className="font-semibold text-[#477A60]">{isLoginMode ? '还没有账号？注册' : '已经有账号？登录'}</Text>
          </TouchableOpacity>
          <Text className="mt-8 text-center text-xs leading-5 text-[#5D6D63]">登录后会在本机保存记录；连接恢复时自动同步到 Supabase。</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
