import '../global.css';

import { Session } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { LogBox, Platform } from 'react-native';
import { supabase } from '../services/supabase';

LogBox.ignoreLogs([
  '"shadow*" style props are deprecated. Use "boxShadow".',
]);

const queryClient = new QueryClient();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [isInitialized, setIsInitialized] = useState(false); // 確保我們已經拿到第一次的狀態
  const segments = useSegments(); 
  const router = useRouter();

  // 🌟 1. 處理推播通知權限 (保持不變)
  useEffect(() => {
    async function requestPermissions() {
      if (Platform.OS !== 'web') {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          console.log('未取得推播通知權限');
        }
      }
    }
    requestPermissions();
  }, []);

  // 🌟 2. 狀態管理區：單純只負責更新 Session 狀態，【絕對不要】在這裡做路由跳轉
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsInitialized(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 🌟 3. 路由守衛區 (Auth Guard)：只要狀態改變，就自動判斷該去哪裡
  useEffect(() => {
    if (!isInitialized) return; // 如果還沒確認好 Session，先不要動作

    // 判斷目前用戶是不是正在需要登入的主頁區塊內
    const inAuthGroup = segments[0] === '(tabs)';

    if (!session && inAuthGroup) {
      // 情境 A：【沒有登入】卻在【主頁】 -> 把他踢回登入頁
      console.log('➡️ 無 Session，踢回登入頁');
      router.replace('/login');
    } else if (session && !inAuthGroup) {
      // 情境 B：【已經登入】卻在【登入頁】 -> 把他送進主頁
      console.log('➡️ 有 Session，送進主頁');
      router.replace('/(tabs)');
    }
  }, [session, isInitialized, segments]); // 只要這三個變數有任何改變，就會自動執行判斷

  return (
    <QueryClientProvider client={queryClient}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack>
    </QueryClientProvider>
  );
}