import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import {
  NotificationSettings,
  rescheduleDailyReminder,
  requestNotificationPermissions,
} from '@/features/finance/services/notifications';

const STORAGE_KEY = '@notification_settings';

const DEFAULT_SETTINGS: NotificationSettings = {
  dailyReminderEnabled: true,
  dailyReminderHour: 21,
  dailyReminderMinute: 0,
  budgetAlertEnabled: true,
};

export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
      }
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    requestNotificationPermissions().then(() => rescheduleDailyReminder(settings));
  }, [isLoaded, settings]);

  const updateSettings = useCallback(async (patch: Partial<NotificationSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { settings, updateSettings, isLoaded };
}
