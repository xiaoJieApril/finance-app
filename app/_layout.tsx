import '../global.css'; // <--- 救回所有 UI 的關鍵！

import { Session } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as Updates from 'expo-updates';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, LogBox, Platform, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../services/supabase';
import { getPendingCount, syncUser } from '../services/offlineStore';
import { useSyncStore } from '../store/useSyncStore';
import { getZeroSpendPendingCount, reconcileZeroSpendDays, syncZeroSpendUser } from '../services/zeroSpendStore';
import { registerZeroSpendBackgroundTask } from '../services/zeroSpendBackground';
import { getPlanningPendingCount, syncPlanningUser } from '../services/planningStore';

// 隱藏不必要的樣式警告
LogBox.ignoreLogs([
  '"shadow*" style props are deprecated. Use "boxShadow".',
]);

const queryClient = new QueryClient();

function AutoUpdateReloader() {
  const { isChecking, isDownloading, isUpdateAvailable, isUpdatePending, downloadProgress, checkError, downloadError } = Updates.useUpdates();
  const [retrying, setRetrying] = useState(false);
  const [reloadFailed, setReloadFailed] = useState(false);
  const reloadStarted = React.useRef(false);
  const hasError = Boolean(checkError || downloadError || reloadFailed);
  const visible = Platform.OS !== 'web' && Updates.isEnabled && (isChecking || isUpdateAvailable || isDownloading || isUpdatePending || hasError);
  const progress = typeof downloadProgress === 'number' ? Math.max(0, Math.min(downloadProgress, 1)) : null;

  useEffect(() => {
    if (Platform.OS === 'web' || __DEV__ || !Updates.isEnabled || !isUpdatePending || reloadStarted.current) return;
    reloadStarted.current = true;
    const timer = setTimeout(() => {
      void Updates.reloadAsync().catch(() => {
        reloadStarted.current = false;
        setReloadFailed(true);
      });
    }, 1400);
    return () => clearTimeout(timer);
  }, [isUpdatePending]);

  const retry = async () => {
    setRetrying(true);
    setReloadFailed(false);
    try {
      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) {
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      }
      else setRetrying(false);
    } catch {
      setReloadFailed(true);
      setRetrying(false);
    }
  };

  if (!visible) return null;
  const title = hasError
    ? '更新暂时无法完成'
    : isUpdatePending
      ? '更新已下载，正在切换到新版…'
      : isDownloading
        ? '发现新版本，正在下载…'
        : isUpdateAvailable
          ? '发现新版本，准备下载…'
          : '正在检查更新…';
  const subtitle = hasError
    ? '请检查网络后重试。'
    : isUpdatePending
      ? '应用即将重新启动，请稍候。'
      : isDownloading && progress !== null
        ? `下载进度 ${Math.round(progress * 100)}%`
        : isDownloading
          ? '正在下载更新文件…'
          : isUpdateAvailable
            ? '正在准备更新文件…'
            : '有可用更新时会自动下载。';

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: 54, alignItems: 'center', zIndex: 1000, elevation: 20 }}>
      <View className="mx-4 w-[92%] rounded-2xl border border-[#DCE7E0] bg-white px-4 py-3 shadow-lg">
        <View className="flex-row items-center">
          <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-[#EAF1EC]">
            {hasError ? <Text className="text-base font-bold text-[#B65C51]">!</Text> : isUpdatePending ? <Text className="text-sm font-bold text-[#477A60]">✓</Text> : <ActivityIndicator size="small" color="#477A60" />}
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-[#183C32]">{title}</Text>
            <Text className="mt-0.5 text-xs text-[#5D6D63]">{subtitle}</Text>
          </View>
          {hasError && <TouchableOpacity onPress={() => void retry()} disabled={retrying} className="ml-2 rounded-full bg-[#183C32] px-3 py-2"><Text className="text-xs font-bold text-white">{retrying ? '检查中' : '重试'}</Text></TouchableOpacity>}
        </View>
        {isDownloading && !hasError && <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#EAF1EC]">{progress !== null ? <View style={{ width: `${Math.max(progress * 100, 3)}%` }} className="h-full rounded-full bg-[#8CAE73]" /> : <View className="h-full w-1/3 rounded-full bg-[#8CAE73]" />}</View>}
      </View>
    </View>
  );
}

function SyncCoordinator({ userId }: { userId: string | null }) {
  const client = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void registerZeroSpendBackgroundTask().catch(() => undefined);
    const synchronize = async () => {
      await syncUser(userId);
      await syncPlanningUser(userId);
      await reconcileZeroSpendDays(userId).catch(() => undefined);
      try {
        await syncZeroSpendUser(userId);
        await reconcileZeroSpendDays(userId);
        await syncZeroSpendUser(userId);
      } catch {
        // Keep local marker generation available while offline; pending changes sync later.
      }
      if (active) {
        client.invalidateQueries({ queryKey: ['transactions', userId] });
        client.invalidateQueries({ queryKey: ['categories', userId] });
        client.invalidateQueries({ queryKey: ['zero-spend-settings', userId] });
        client.invalidateQueries({ queryKey: ['zero-spend-days', userId] });
        client.invalidateQueries({ queryKey: ['planning', userId] });
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
      const pending = await Promise.all([getPendingCount(userId).catch(() => 0), getZeroSpendPendingCount(userId).catch(() => 0), getPlanningPendingCount(userId).catch(() => 0)]);
      if (pending.some((count) => count > 0)) void synchronize();
    }, 15000);
    let midnightTimer: ReturnType<typeof setTimeout>;
    const scheduleMidnightCheck = () => {
      clearTimeout(midnightTimer);
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      midnightTimer = setTimeout(() => {
        void synchronize();
        scheduleMidnightCheck();
      }, Math.max(1000, nextMidnight.getTime() - now.getTime() + 1000));
    };
    scheduleMidnightCheck();

    return () => {
      active = false;
      clearInterval(retryTimer);
      clearTimeout(midnightTimer);
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
      <AutoUpdateReloader />
      <SyncCoordinator userId={session?.user.id ?? null} />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
      </Stack>
    </QueryClientProvider>
  );
}
