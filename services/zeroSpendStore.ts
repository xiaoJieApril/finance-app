import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { getLocalTransactions } from './offlineStore';
import { toDateKey } from './dateUtils';

export type ZeroSpendSettings = {
  user_id: string;
  enabled: boolean;
  enabled_from_local_date: string | null;
  updated_at: string;
};

export type ZeroSpendDay = {
  id: string;
  user_id: string;
  local_date: string;
  created_at: string;
  deleted_at: string | null;
};

type PendingChange = { entity: 'settings' | 'day'; id: string; revision: string };
type Snapshot = { settings: ZeroSpendSettings | null; days: ZeroSpendDay[]; pending: PendingChange[] };
const storageKey = (userId: string) => `finance-zero-spend-v1:${userId}`;
let writeQueue: Promise<unknown> = Promise.resolve();
const serialize = <T,>(task: () => Promise<T>) => {
  const result = writeQueue.then(task, task);
  writeQueue = result.catch(() => undefined);
  return result;
};
const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
  const random = Math.floor(Math.random() * 16);
  return (char === 'x' ? random : ((random & 0x3) | 0x8)).toString(16);
});
const revision = () => uuid();

const read = async (userId: string): Promise<Snapshot> => {
  const raw = await AsyncStorage.getItem(storageKey(userId));
  if (!raw) return { settings: null, days: [], pending: [] };
  try {
    const snapshot = JSON.parse(raw) as Snapshot;
    return {
      settings: snapshot.settings ?? null,
      days: Array.isArray(snapshot.days) ? snapshot.days : [],
      pending: Array.isArray(snapshot.pending) ? snapshot.pending : [],
    };
  } catch {
    throw new Error('零消费日数据无法读取。');
  }
};
const write = async (userId: string, snapshot: Snapshot) => AsyncStorage.setItem(storageKey(userId), JSON.stringify(snapshot));
const markPending = (snapshot: Snapshot, entity: PendingChange['entity'], id: string) => {
  snapshot.pending = snapshot.pending.filter((item) => !(item.entity === entity && item.id === id));
  snapshot.pending.push({ entity, id, revision: revision() });
};

export const getZeroSpendSettings = async (userId: string) => (await read(userId)).settings ?? {
  user_id: userId, enabled: false, enabled_from_local_date: null, updated_at: new Date().toISOString(),
};
export const getZeroSpendDays = async (userId: string) => (await read(userId)).days.filter((day) => !day.deleted_at);
export const getZeroSpendPendingCount = async (userId: string) => (await read(userId)).pending.length;

export const setZeroSpendEnabled = (userId: string, enabled: boolean) => serialize(async () => {
  const snapshot = await read(userId);
  const prior = snapshot.settings;
  snapshot.settings = {
    user_id: userId,
    enabled,
    enabled_from_local_date: enabled ? (prior?.enabled && prior.enabled_from_local_date ? prior.enabled_from_local_date : toDateKey(new Date())) : prior?.enabled_from_local_date ?? null,
    updated_at: new Date().toISOString(),
  };
  markPending(snapshot, 'settings', userId);
  await write(userId, snapshot);
  return snapshot.settings;
});

const nextDate = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1, 12));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
};

export const reconcileZeroSpendDays = async (userId: string) => {
  const [settings, transactions] = await Promise.all([getZeroSpendSettings(userId), getLocalTransactions(userId)]);
  const today = toDateKey(new Date());
  const transactionDates = new Set(transactions.map((transaction) => toDateKey(new Date(transaction.date))));
  await serialize(async () => {
    const snapshot = await read(userId);
    const currentSettings = snapshot.settings ?? settings;
    for (const existing of snapshot.days) {
      if (!existing.deleted_at && transactionDates.has(existing.local_date)) {
        existing.deleted_at = new Date().toISOString();
        markPending(snapshot, 'day', existing.id);
      }
    }
    if (!currentSettings.enabled || !currentSettings.enabled_from_local_date) {
      await write(userId, snapshot);
      return;
    }
    let date = currentSettings.enabled_from_local_date;
    while (date < today) {
      const existing = snapshot.days.find((day) => day.local_date === date);
      const hasTransactions = transactionDates.has(date);
      if (existing && hasTransactions && !existing.deleted_at) {
        existing.deleted_at = new Date().toISOString();
        markPending(snapshot, 'day', existing.id);
      } else if (existing && !hasTransactions && existing.deleted_at) {
        existing.deleted_at = null;
        existing.created_at = new Date().toISOString();
        markPending(snapshot, 'day', existing.id);
      } else if (!existing && !hasTransactions) {
        const day: ZeroSpendDay = { id: uuid(), user_id: userId, local_date: date, created_at: new Date().toISOString(), deleted_at: null };
        snapshot.days.push(day);
        markPending(snapshot, 'day', day.id);
      }
      date = nextDate(date);
    }
    await write(userId, snapshot);
  });
};

export const syncZeroSpendUser = async (userId: string) => {
  let snapshot = await read(userId);
  for (const item of [...snapshot.pending]) {
    const current = snapshot.pending.find((pending) => pending.entity === item.entity && pending.id === item.id);
    if (!current || current.revision !== item.revision) continue;
    let error;
    if (item.entity === 'settings') {
      if (!snapshot.settings) continue;
      ({ error } = await supabase.from('zero_spend_settings').upsert(snapshot.settings, { onConflict: 'user_id' }));
    } else {
      const day = snapshot.days.find((row) => row.id === item.id);
      if (!day) continue;
      ({ error } = await supabase.from('zero_spend_days').upsert(day, { onConflict: 'user_id,local_date' }));
    }
    if (error) throw error;
    snapshot = await serialize(async () => {
      const latest = await read(userId);
      latest.pending = latest.pending.filter((pending) => !(pending.entity === item.entity && pending.id === item.id && pending.revision === item.revision));
      await write(userId, latest);
      return latest;
    });
  }

  const [remoteSettings, remoteDays] = await Promise.all([
    supabase.from('zero_spend_settings').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('zero_spend_days').select('*').eq('user_id', userId),
  ]);
  if (remoteSettings.error) throw remoteSettings.error;
  if (remoteDays.error) throw remoteDays.error;
  await serialize(async () => {
    const latest = await read(userId);
    if (!latest.pending.some((item) => item.entity === 'settings') && remoteSettings.data) latest.settings = remoteSettings.data;
    const pendingDayIds = new Set(latest.pending.filter((item) => item.entity === 'day').map((item) => item.id));
    const days = new Map(latest.days.map((day) => [day.local_date, day]));
    for (const remote of (remoteDays.data ?? []) as ZeroSpendDay[]) {
      const local = days.get(remote.local_date);
      if (!local || (!pendingDayIds.has(local.id) && !pendingDayIds.has(remote.id))) days.set(remote.local_date, remote);
    }
    latest.days = [...days.values()];
    await write(userId, latest);
  });
};
