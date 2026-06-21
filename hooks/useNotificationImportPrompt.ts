import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { Alert, AppState, Platform } from 'react-native';
import {
  drainNativeNotificationImports,
  isNativeNotificationImportEnabled,
  isNotificationListenerEnabled,
} from '@/services/notificationImports';
import { NotificationImport } from '@/type';
import { formatMoney } from '@/utils/finance';

function describeImport(item: NotificationImport) {
  const merchant = item.parsed_merchant || item.source_app;
  const amount = item.parsed_amount
    ? formatMoney(item.parsed_amount, item.parsed_currency)
    : '一筆交易';

  if (item.parsed_type === 'income') return `${merchant} 收入 ${amount}`;
  if (item.parsed_type === 'transfer') return `${merchant} 轉帳 ${amount}`;
  return `${merchant} 消費 ${amount}`;
}

export function useNotificationImportPrompt(enabled: boolean) {
  const router = useRouter();
  const isCheckingRef = useRef(false);
  const lastPromptedHashRef = useRef<string | null>(null);

  const checkForImports = useCallback(async () => {
    if (!enabled || Platform.OS !== 'android' || !isNativeNotificationImportEnabled()) return;
    if (isCheckingRef.current) return;

    isCheckingRef.current = true;
    try {
      const hasAccess = await isNotificationListenerEnabled();
      if (!hasAccess) return;

      const imported = await drainNativeNotificationImports();
      if (imported.length === 0) return;

      const first = imported[0];
      if (first.notification_hash === lastPromptedHashRef.current) return;
      lastPromptedHashRef.current = first.notification_hash;

      const title = imported.length > 1 ? `偵測到 ${imported.length} 筆交易通知` : '偵測到交易通知';
      const message =
        imported.length > 1
          ? '要查看並確認是否記錄到流水嗎？'
          : `${describeImport(first)}。要把這筆記錄加入流水嗎？`;

      Alert.alert(title, message, [
        { text: '稍後', style: 'cancel' },
        {
          text: '查看',
          onPress: () => router.push('/notification-imports'),
        },
      ]);
    } finally {
      isCheckingRef.current = false;
    }
  }, [enabled, router]);

  useEffect(() => {
    checkForImports();

    const interval = setInterval(checkForImports, 20000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkForImports();
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [checkForImports]);
}
