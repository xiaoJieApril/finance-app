import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import React from 'react';

// 1. 建立一個 QueryClient 實例（總指揮中心）
const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    // 2. 用 QueryClientProvider 包覆整個 App
    <QueryClientProvider client={queryClient}>
      
      {/* 這是 Expo Router 的導航系統 */}
      <Stack>
        {/* 配置首頁 (index.tsx) 的屬性，我們先把頂部預設的標題列隱藏 */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>

    </QueryClientProvider>
  );
}