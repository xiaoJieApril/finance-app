import '../global.css'; // <--- 救回所有 UI 的關鍵！

import { Session } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { AppState, LogBox, Platform } from 'react-native';
import { supabase } from '../services/supabase';
import { getPendingCount, syncUser } from '../services/offlineStore';
import { useSyncStore } from '../store/useSyncStore';

// 隱藏不必要的樣式警告
LogBox.ignoreLogs([
  '"shadow*" style props are deprecated. Use "boxShadow".',
]);

const queryClient = new QueryClient();

function SyncCoordinator({ userId }: { userId: string | null }) {
  const client = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    let active = true;
    const synchronize = async () => {
      await syncUser(userId);
      if (active) {
        client.invalidateQueries({ queryKey: ['transactions', userId] });
        client.invalidateQueries({ queryKey: ['categories', userId] });
      }
    };

    getPendingCount(userId)
      .then((count) => { if (active) useSyncStore.getState().setPendingCount(count); })
      .catch(() => undefined);
    void synchronize();
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void synchronize();
    });
    const browser = Platform.OS === 'web' && typeof window !== 'undefined' ? window : null;
    browser?.addEventListener('online', synchronize);
    const retryTimer = setInterval(async () => {
      if ((await getPendingCount(userId).catch(() => 0)) > 0) void synchronize();
    }, 15000);

    return () => {
      active = false;
      clearInterval(retryTimer);
      appStateSubscription.remove();
      browser?.removeEventListener('online', synchronize);
    };
  }, [userId, client]);

  return null;
}

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();
  const segments = useSegments(); // 用來獲取當前的路由層級

  // 1. 初始化與監聽登入狀態
  useEffect(() => {
    // 初次載入時抓取 Session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsInitialized(true);
    }).catch(() => setIsInitialized(true));

    // 監聽後續的登入/登出動作
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. 路由守衛核心邏輯
  useEffect(() => {
    if (!isInitialized) return;

    // 檢查使用者目前是否正在登入頁面
    const inAuthGroup = segments[0] === 'login';

    if (session && inAuthGroup) {
      // 狀況 A：已經登入，但卡在登入頁面 ➡️ 強制帶回首頁
      router.replace('/');
    } else if (!session && !inAuthGroup) {
      // 狀況 B：還沒登入，卻想偷看其他頁面 ➡️ 強制帶去登入頁
      router.replace('/login');
    }
  }, [session, isInitialized, segments]);

  return (
    <QueryClientProvider client={queryClient}>
      <SyncCoordinator userId={session?.user.id ?? null} />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack>
    </QueryClientProvider>
  );
}
