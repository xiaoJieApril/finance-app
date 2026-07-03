/**
 * Authentication mutations for login, sign-up, and sign-out flows.
 */
import { useState } from 'react';
import { Alert } from 'react-native';
import { isSupabaseConfigured, supabase } from '@/infrastructure/supabase/client';
import { developerText } from '@/shared/config/appVariant';

function validateEmailPassword(email: string, password: string) {
  const trimmedEmail = email.trim();
  if (!trimmedEmail || !password) {
    return '請輸入電子郵件和密碼。';
  }
  if (!trimmedEmail.includes('@')) {
    return '請輸入有效的電子郵件。';
  }
  if (password.length < 6) {
    return '密碼至少需要 6 位數。';
  }
  return null;
}

export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(false);

  // 登入邏輯
  const signInWithEmail = async (email: string, password: string) => {
    const validationError = validateEmailPassword(email, password);
    if (validationError) {
      Alert.alert('資料有誤', validationError);
      return { error: new Error(validationError) };
    }
    if (!isSupabaseConfigured) {
      Alert.alert('設定未完成', developerText('缺少 Supabase 環境變數，請重新設定 EAS env 後 build。', '資料同步服務暫時無法使用，請稍後再試。'));
      return { error: new Error('Supabase is not configured') };
    }

    setIsLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setIsLoading(false);
    if (error) Alert.alert('登入失敗', error.message);
    return { data, error };
  };

  // 註冊邏輯
  const signUpWithEmail = async (email: string, password: string) => {
    const validationError = validateEmailPassword(email, password);
    if (validationError) {
      Alert.alert('資料有誤', validationError);
      return { error: new Error(validationError) };
    }
    if (!isSupabaseConfigured) {
      Alert.alert('設定未完成', developerText('缺少 Supabase 環境變數，請重新設定 EAS env 後 build。', '資料同步服務暫時無法使用，請稍後再試。'));
      return { error: new Error('Supabase is not configured') };
    }

    setIsLoading(true);
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    setIsLoading(false);
    
    if (error) {
      Alert.alert('註冊失敗', error.message);
    } else if (data.session) {
      Alert.alert('註冊成功', '歡迎使用！');
    } else {
      Alert.alert('請檢查信箱', '我們已發送一封驗證信給您，請點擊連結完成註冊。');
    }
    return { data, error };
  };

  const signInAsGuest = async () => {
    if (!isSupabaseConfigured) {
      Alert.alert('設定未完成', developerText('缺少 Supabase 環境變數，請重新設定 EAS env 後 build。', '資料同步服務暫時無法使用，請稍後再試。'));
      return { error: new Error('Supabase is not configured') };
    }

    setIsLoading(true);
    const { data, error } = await supabase.auth.signInAnonymously();
    setIsLoading(false);
    if (error) Alert.alert('訪客登入失敗', error.message);
    return { data, error };
  };

  const upgradeAnonymousUser = async (email: string, password: string) => {
    const validationError = validateEmailPassword(email, password);
    if (validationError) {
      Alert.alert('資料有誤', validationError);
      return { error: new Error(validationError) };
    }
    if (!isSupabaseConfigured) {
      Alert.alert('設定未完成', developerText('缺少 Supabase 環境變數，請重新設定 EAS env 後 build。', '資料同步服務暫時無法使用，請稍後再試。'));
      return { error: new Error('Supabase is not configured') };
    }

    setIsLoading(true);
    const { data, error } = await supabase.auth.updateUser({ email: email.trim(), password });
    setIsLoading(false);
    if (error) {
      Alert.alert('註冊失敗', error.message);
    } else {
      Alert.alert('已建立帳號', '你的訪客資料會保留在這個帳號下。');
    }
    return { data, error };
  };

  // 登出邏輯
  const signOut = async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
  };

  return { signInWithEmail, signUpWithEmail, signInAsGuest, upgradeAnonymousUser, signOut, isLoading };
};
