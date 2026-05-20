import '../global.css'; // <--- 救回所有 UI 的關鍵！

import { Session } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { LogBox, Platform } from 'react-native';
import { supabase } from '../services/supabase';

// 隱藏不必要的樣式警告
LogBox.ignoreLogs([
  '"shadow*" style props are deprecated. Use "boxShadow".',
]);

const queryClient = new QueryClient();

// 🌟 告訴系統當 App 在前景運作時，收到通知該怎麼處理
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();
  const segments = useSegments(); // 用來獲取當前的路由層級

  // 🌟 請求用戶的通知權限
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
          return;
        }
      }
    }
    requestPermissions();
  }, []);

  // 1. 初始化與監聽登入狀態
  useEffect(() => {
    // 初次載入時抓取 Session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsInitialized(true);
    });

    // 監聽後續的登入/登出動作
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // 監聽登入狀態
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // 🌟 核心修改：當發現用戶完全沒登入時，默默在背景幫他建立一個「匿名訪客通行證」
      // 這樣他一打開 App 就會直接看到主頁，而且背後已經有了一個 UUID 可以直接記帳！
      if (!session) {
        await supabase.auth.signInAnonymously();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack>
    </QueryClientProvider>
  );
}