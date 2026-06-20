import '../global.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { LogBox, Text, View } from 'react-native';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useNotificationPermissions } from '@/hooks/useNotificationPermissions';
import { isSupabaseConfigured } from '@/services/supabase';

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

export default function RootLayout() {
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
      <QueryClientProvider client={queryClient}>
        <View className="flex-1 bg-slate-50 px-6 justify-center">
          <View className="bg-white border border-rose-100 rounded-2xl p-5">
            <Text className="text-2xl font-black text-slate-900 mb-3">App 設定未完成</Text>
            <Text className="text-slate-600 leading-6">
              這個 build 缺少 Supabase 環境變數。請在 EAS 設定
              EXPO_PUBLIC_SUPABASE_URL 和 EXPO_PUBLIC_SUPABASE_ANON_KEY 後重新 build。
            </Text>
          </View>
        </View>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="analytics" options={{ headerShown: false }} />
        <Stack.Screen name="ai-agent" options={{ headerShown: false }} />
        <Stack.Screen name="accounts" options={{ headerShown: false }} />
        <Stack.Screen name="recurring" options={{ headerShown: false }} />
      </Stack>
    </QueryClientProvider>
  );
}
