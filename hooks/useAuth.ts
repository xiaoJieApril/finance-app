import { useState } from 'react';
import { Alert } from 'react-native';
import { isSupabaseConfigured, supabase } from '../services/supabase';

export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(false);

  // 登入邏輯
  const signInWithEmail = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      Alert.alert('設定未完成', '缺少 Supabase 環境變數，請重新設定 EAS env 後 build。');
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsLoading(false);
    if (error) Alert.alert('登入失敗', error.message);
  };

  // 註冊邏輯
  const signUpWithEmail = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      Alert.alert('設定未完成', '缺少 Supabase 環境變數，請重新設定 EAS env 後 build。');
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setIsLoading(false);
    
    if (error) {
      Alert.alert('註冊失敗', error.message);
    } else if (data.session) {
      Alert.alert('註冊成功', '歡迎使用！');
    } else {
      Alert.alert('請檢查信箱', '我們已發送一封驗證信給您，請點擊連結完成註冊。');
    }
  };

  // 登出邏輯
  const signOut = async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
  };

  return { signInWithEmail, signUpWithEmail, signOut, isLoading };
};
