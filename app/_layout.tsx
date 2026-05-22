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

  // 🌟 核心整合：統一管理所有的 Auth 狀態變化與路由跳轉
  useEffect(() => {
    // 1. 初次載入時抓取一次當前 Session 狀態
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsInitialized(true);
    });

    // 2. 監聽後續所有的登入/登出/狀態改變動作
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      
      console.log(`🔔 Auth 事件觸發: ${event}, 是否有 Session: ${!!session}`);

      // 情境 A：用戶主動點擊「登出」
      if (event === 'SIGNED_OUT') {
        console.log('➡️ 偵測到登出，將用戶送往登入頁');
        router.replace('/login');
        return;
      }

      // 情境 B：用戶在登入頁「成功登入」帳號 (修正無法登入的關鍵 ✨)
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        // 只有在當前確實處於登入頁面時，才主動跳轉回主頁
        if (segments.includes('login')) {
          console.log('➡️ 登入成功，自動跳轉進主頁 (tabs)');
          router.replace('/(tabs)');
        }
        return;
      }

      // 情境 C：App 首次冷啟動，且後台完全沒有任何登入紀錄
      if (event === 'INITIAL_SESSION' && !session) {
        console.log('➡️ 初次開啟且無紀錄，在背景發放匿名訪客通行證');
        await supabase.auth.signInAnonymously();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [segments]); // 監聽 segments，確保能隨時抓到最新所在的頁面路徑

  return (
    <QueryClientProvider client={queryClient}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack>
    </QueryClientProvider>
  );
}