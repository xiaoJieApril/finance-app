import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Category, RecurringItem, Transaction } from '../type';

export type NotificationSettings = {
  dailyReminderEnabled: boolean;
  dailyReminderHour: number;
  dailyReminderMinute: number;
  budgetAlertEnabled: boolean;
};

const DAILY_REMINDER_ID = 'daily-log-reminder';
const RECURRING_REMINDER_PREFIX = 'recurring-reminder';
const BUDGET_ALERTS_KEY = '@budget_alerts_sent';

type BudgetThreshold = 80 | 90 | 100;

function monthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth()}`;
}

async function getSentAlerts(): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(BUDGET_ALERTS_KEY);
  if (!raw) return new Set();
  const parsed = JSON.parse(raw) as Record<string, string[]>;
  const key = monthKey();
  return new Set(parsed[key] ?? []);
}

async function markAlertSent(alertKey: string) {
  const raw = await AsyncStorage.getItem(BUDGET_ALERTS_KEY);
  const parsed: Record<string, string[]> = raw ? JSON.parse(raw) : {};
  const key = monthKey();
  const set = new Set(parsed[key] ?? []);
  set.add(alertKey);
  parsed[key] = Array.from(set);
  await AsyncStorage.setItem(BUDGET_ALERTS_KEY, JSON.stringify(parsed));
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: '理財提醒',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function rescheduleDailyReminder(settings: NotificationSettings) {
  if (Platform.OS === 'web') return;

  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});

  if (!settings.dailyReminderEnabled) return;

  const granted = await requestNotificationPermissions();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: '📝 記帳提醒',
      body: '今天還沒記帳嗎？花 1 分鐘記錄今天的收支吧！',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: settings.dailyReminderHour,
      minute: settings.dailyReminderMinute,
    },
  });
}

export async function rescheduleRecurringReminders(items: RecurringItem[]) {
  if (Platform.OS === 'web') return;

  const granted = await requestNotificationPermissions();
  if (!granted) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => item.identifier.startsWith(RECURRING_REMINDER_PREFIX))
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier).catch(() => {})),
  );

  const now = new Date();
  const end = new Date();
  end.setDate(now.getDate() + 14);

  await Promise.all(
    items
      .filter((item) => {
        const due = new Date(item.next_due_date);
        return item.is_active && due >= now && due <= end;
      })
      .map((item) => {
        const due = new Date(item.next_due_date);
        due.setHours(9, 0, 0, 0);
        return Notifications.scheduleNotificationAsync({
          identifier: `${RECURRING_REMINDER_PREFIX}-${item.id}`,
          content: {
            title: item.type === 'income' ? '固定收入提醒' : '固定帳單提醒',
            body: `${item.name} 即將到期：RM ${item.amount.toFixed(2)}`,
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: due,
          },
        }).catch(() => {});
      }),
  );
}

function getMonthCategorySpending(
  transactions: Transaction[],
  categoryId: number,
  extraAmount = 0,
): number {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  const spent = transactions
    .filter((tx) => {
      const d = new Date(tx.date);
      return (
        tx.category_id === categoryId &&
        tx.category?.type === 'expense' &&
        d.getMonth() === month &&
        d.getFullYear() === year
      );
    })
    .reduce((sum, tx) => sum + tx.amount, 0);

  return spent + extraAmount;
}

function getMonthTotalSpending(transactions: Transaction[], extraAmount = 0): number {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  const spent = transactions
    .filter((tx) => {
      const d = new Date(tx.date);
      return tx.category?.type === 'expense' && d.getMonth() === month && d.getFullYear() === year;
    })
    .reduce((sum, tx) => sum + tx.amount, 0);

  return spent + extraAmount;
}

async function sendImmediateNotification(title: string, body: string) {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null,
    });
  } catch {
    // 權限未開啟時略過
  }
}

async function checkThresholdAlerts(
  id: string,
  name: string,
  spent: number,
  limit: number,
  prefix: 'category' | 'total',
) {
  if (limit <= 0) return;

  const ratio = spent / limit;
  const thresholds: { threshold: BudgetThreshold; title: string; body: string }[] = [
    {
      threshold: 100,
      title: prefix === 'category' ? `🚨 ${name} 預算超支！` : '🚨 總預算超支！',
      body:
        prefix === 'category'
          ? `「${name}」本月已花 RM ${spent.toFixed(2)}，超過預算 RM ${limit.toFixed(2)}`
          : `本月總支出 RM ${spent.toFixed(2)} 已超過總預算 RM ${limit.toFixed(2)}`,
    },
    {
      threshold: 90,
      title: prefix === 'category' ? `⚠️ ${name} 預算警告` : '⚠️ 總預算警告',
      body:
        prefix === 'category'
          ? `「${name}」本月已用掉 90% 預算（RM ${spent.toFixed(2)} / RM ${limit.toFixed(2)}）`
          : `本月總支出已達總預算 90%（RM ${spent.toFixed(2)} / RM ${limit.toFixed(2)}）`,
    },
    {
      threshold: 80,
      title: prefix === 'category' ? `📊 ${name} 預算提醒` : '📊 總預算提醒',
      body:
        prefix === 'category'
          ? `「${name}」本月已用掉 80% 預算（RM ${spent.toFixed(2)} / RM ${limit.toFixed(2)}）`
          : `本月總支出已達總預算 80%（RM ${spent.toFixed(2)} / RM ${limit.toFixed(2)}）`,
    },
  ];

  const sent = await getSentAlerts();

  for (const { threshold, title, body } of thresholds) {
    const alertKey = `${prefix}-${id}-${threshold}`;
    if (ratio * 100 >= threshold && !sent.has(alertKey)) {
      await sendImmediateNotification(title, body);
      await markAlertSent(alertKey);
      break;
    }
  }
}

type BudgetCheckParams = {
  transactions: Transaction[];
  categories: Category[];
  categoryId: number;
  addedAmount: number;
  totalBudget: number;
};

export async function checkBudgetAlerts({
  transactions,
  categories,
  categoryId,
  addedAmount,
  totalBudget,
}: BudgetCheckParams) {
  const category = categories.find((c) => c.id === categoryId);
  if (!category) return;

  if (category.budget_limit && category.budget_limit > 0) {
    const categorySpent = getMonthCategorySpending(transactions, categoryId, addedAmount);
    await checkThresholdAlerts(
      String(categoryId),
      category.name,
      categorySpent,
      category.budget_limit,
      'category',
    );
  }

  if (totalBudget > 0) {
    const totalSpent = getMonthTotalSpending(transactions, addedAmount);
    await checkThresholdAlerts('all', '總預算', totalSpent, totalBudget, 'total');
  }
}
