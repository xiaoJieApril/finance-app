import '../global.css';

/**
 * Root Expo Router layout.
 *
 * Owns global providers, auth redirects, and local notification presentation
 * behavior while keeping feature logic outside the route layer.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { LogBox, Text, View } from 'react-native';
import { useAuthSession } from '@/features/auth/hooks/useAuthSession';
import { useNotificationPermissions } from '@/shared/hooks/useNotificationPermissions';
import { isSupabaseConfigured } from '@/infrastructure/supabase/client';
import { developerText, showDeveloperTools } from '@/shared/config/appVariant';

LogBox.ignoreLogs([
  '"shadow*" style props are deprecated. Use "boxShadow".',
]);

const queryClient = new QueryClient();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function AppShell() {
  const { session, isInitialized } = useAuthSession();
  const segments = useSegments();
  const router = useRouter();

  useNotificationPermissions();

  useEffect(() => {
    if (!isInitialized) return;
    const inLoginScreen = segments[0] === 'login';

    if (!session && !inLoginScreen) {
      router.replace('/login');
    } else if (session && inLoginScreen) {
      router.replace('/(tabs)');
    }
  }, [isInitialized, router, segments, session]);

  if (!isSupabaseConfigured) {
    return (
      <View className="flex-1 bg-slate-50 px-6 justify-center">
        <View className="bg-white border border-rose-100 rounded-2xl p-5">
          {showDeveloperTools && (
            <View className="self-start bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-3">
              <Text className="text-indigo-700 text-xs font-black">Developer Build</Text>
            </View>
          )}
          <Text className="text-2xl font-black text-slate-900 mb-3">
            {developerText('App 設定未完成', '資料同步暫時無法使用')}
          </Text>
          <Text className="text-slate-600 leading-6">
            {developerText(
              '這個 build 缺少 Supabase 環境變數。請在 EAS 設定 EXPO_PUBLIC_SUPABASE_URL 和 EXPO_PUBLIC_SUPABASE_ANON_KEY 後重新 build。',
              '目前無法連接資料服務。請稍後再試，或聯絡支援人員協助檢查帳號設定。',
            )}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="analytics" options={{ headerShown: false }} />
      <Stack.Screen name="ai-agent" options={{ headerShown: false }} />
      <Stack.Screen name="accounts" options={{ headerShown: false }} />
      <Stack.Screen name="recurring" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}
