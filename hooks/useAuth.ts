import { useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../services/supabase';

export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(false);

  const signInWithEmail = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) Alert.alert('登录失败', error.message);
    } catch {
      Alert.alert('登录失败', '当前无法连接服务，请检查网络后重试。');
    } finally {
      setIsLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) Alert.alert('注册失败', error.message);
      else if (data.session) Alert.alert('注册成功', '欢迎使用！');
      else Alert.alert('请检查邮箱', '我们已发送验证邮件，请点击邮件中的链接完成注册。');
    } catch {
      Alert.alert('注册失败', '当前无法连接服务，请检查网络后重试。');
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('退出登录失败', error.message);
  };

  return { signInWithEmail, signUpWithEmail, signOut, isLoading };
};
