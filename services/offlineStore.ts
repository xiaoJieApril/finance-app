import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { Category, Transaction } from '../type';
import { useSyncStore } from '../store/useSyncStore';

type PendingChange = {
  entity: 'transactions' | 'categories';
  id: string;
  operation: 'upsert' | 'delete';
  revision: string;
};

type LocalDatabase = {
  version: 1;
  userId: string;
  transactions: Transaction[];
  categories: Category[];
  pending: PendingChange[];
  pulledRemote: boolean;
};

const keyFor = (userId: string) => `finance-local-v1:${userId}`;
let writeChain: Promise<unknown> = Promise.resolve();
const syncs = new Map<string, Promise<void>>();

const serialized = <T,>(task: () => Promise<T>): Promise<T> => {
  const result = writeChain.then(task, task);
  writeChain = result.catch(() => undefined);
  return result;
};

const emptyDatabase = (userId: string): LocalDatabase => ({
  version: 1,
  userId,
  transactions: [],
  categories: [],
  pending: [],
  pulledRemote: false,
});

const readDatabase = async (userId: string): Promise<LocalDatabase> => {
  const raw = await AsyncStorage.getItem(keyFor(userId));
  if (!raw) return emptyDatabase(userId);
  let parsed: LocalDatabase;
  try {
    parsed = JSON.parse(raw) as LocalDatabase;
  } catch {
    throw new Error('本机账本数据无法读取。为避免覆盖原记录，请先保留应用数据并联系支持。');
  }
  if (parsed.version !== 1 || parsed.userId !== userId) throw new Error('本机账本数据版本不受支持，暂时无法修改记录。');
  return {
    ...emptyDatabase(userId),
    ...parsed,
    transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
    categories: Array.isArray(parsed.categories) ? parsed.categories : [],
    pending: Array.isArray(parsed.pending) ? parsed.pending : [],
  };
};

const writeDatabase = async (db: LocalDatabase) => {
  await AsyncStorage.setItem(keyFor(db.userId), JSON.stringify(db));
  useSyncStore.getState().setPendingCount(db.pending.length);
};

const makeUuid = () => {
  const bytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

// Stable IDs keep starter categories idempotent across devices signed into one account.
const stableUuid = (value: string) => {
  let a = 0x811c9dc5;
  let b = 0x01000193;
  for (let index = 0; index < value.length; index += 1) {
    a = Math.imul(a ^ value.charCodeAt(index), 0x01000193);
    b = Math.imul(b ^ value.charCodeAt(index), 0x85ebca6b);
  }
  const hex = `${(a >>> 0).toString(16).padStart(8, '0')}${(b >>> 0).toString(16).padStart(8, '0')}`
    .repeat(2)
    .slice(0, 32)
    .split('');
  hex[12] = '5';
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const id = hex.join('');
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
};

const markPending = (db: LocalDatabase, entity: PendingChange['entity'], id: string, operation: PendingChange['operation']) => {
  const change: PendingChange = { entity, id, operation, revision: makeUuid() };
  db.pending = db.pending.filter((item) => !(item.entity === entity && item.id === id));
  db.pending.push(change);
};

const mutateDatabase = (userId: string, mutator: (db: LocalDatabase) => void) => serialized(async () => {
  const db = await readDatabase(userId);
  mutator(db);
  await writeDatabase(db);
  return db;
});

const withCategories = (db: LocalDatabase): Transaction[] => {
  const categories = new Map(db.categories.map((category) => [category.id, category]));
  return db.transactions
    .filter((transaction) => !transaction.deleted_at)
    .map((transaction) => ({ ...transaction, category: categories.get(transaction.category_id) }));
};

export const getLocalTransactions = async (userId: string) => withCategories(await readDatabase(userId));
export const getLocalCategories = async (userId: string) => (await readDatabase(userId)).categories;
export const getPendingCount = async (userId: string) => (await readDatabase(userId)).pending.length;

export const addLocalTransaction = (userId: string, values: Omit<Transaction, 'id' | 'user_id' | 'updated_at' | 'category'>) =>
  mutateDatabase(userId, (db) => {
    const transaction: Transaction = { ...values, id: makeUuid(), user_id: userId, updated_at: new Date().toISOString() };
    db.transactions.unshift(transaction);
    markPending(db, 'transactions', transaction.id, 'upsert');
  });

export const updateLocalTransaction = (userId: string, id: string, values: Partial<Pick<Transaction, 'amount' | 'note' | 'date' | 'category_id'>>) =>
  mutateDatabase(userId, (db) => {
    const transaction = db.transactions.find((item) => item.id === id && !item.deleted_at);
    if (!transaction) throw new Error('找不到这笔交易记录。');
    Object.assign(transaction, values, { updated_at: new Date().toISOString() });
    markPending(db, 'transactions', id, 'upsert');
  });

export const deleteLocalTransaction = (userId: string, id: string) =>
  mutateDatabase(userId, (db) => {
    const transaction = db.transactions.find((item) => item.id === id);
    if (!transaction) return;
    transaction.deleted_at = new Date().toISOString();
    transaction.updated_at = transaction.deleted_at;
    markPending(db, 'transactions', id, 'delete');
  });

export const addLocalCategory = (userId: string, name: string, type: Category['type']) =>
  mutateDatabase(userId, (db) => {
    const category: Category = {
      id: makeUuid(), user_id: userId, name: name.trim(), type, icon: type === 'income' ? 'wallet' : 'circle',
      updated_at: new Date().toISOString(), archived_at: null,
    };
    db.categories.push(category);
    markPending(db, 'categories', category.id, 'upsert');
  });

export const updateLocalCategory = (userId: string, id: string, name: string, type: Category['type']) =>
  mutateDatabase(userId, (db) => {
    const category = db.categories.find((item) => item.id === id);
    if (!category) throw new Error('找不到这个类别。');
    Object.assign(category, { name: name.trim(), type, updated_at: new Date().toISOString() });
    markPending(db, 'categories', id, 'upsert');
  });

export const archiveLocalCategory = (userId: string, id: string) =>
  mutateDatabase(userId, (db) => {
    const category = db.categories.find((item) => item.id === id);
    if (!category) return;
    category.archived_at = new Date().toISOString();
    category.updated_at = category.archived_at;
    markPending(db, 'categories', id, 'upsert');
  });

const starterCategories = (userId: string): Category[] => {
  const rows: Array<[string, Category['type'], string]> = [
    ['餐饮', 'expense', 'utensils'], ['交通', 'expense', 'car'], ['日用品', 'expense', 'shopping-bag'],
    ['住房', 'expense', 'home'], ['娱乐', 'expense', 'sparkles'], ['医疗', 'expense', 'heart-pulse'],
    ['其他', 'expense', 'circle'], ['薪资', 'income', 'wallet'], ['兼职', 'income', 'briefcase'], ['其他', 'income', 'circle'],
  ];
  const timestamp = new Date().toISOString();
  return rows.map(([name, type, icon]) => ({
    id: stableUuid(`${userId}:${type}:${name}`), user_id: userId, name, type, icon, updated_at: timestamp, archived_at: null,
  }));
};

const transactionPayload = (row: Transaction) => ({
  id: row.id, user_id: row.user_id, category_id: row.category_id, amount: row.amount,
  note: row.note, date: row.date, updated_at: row.updated_at, deleted_at: row.deleted_at ?? null,
});

const syncOnce = async (userId: string) => {
  useSyncStore.getState().setStatus('syncing');
  let db = await readDatabase(userId);

  for (const pending of [...db.pending]) {
    const original = db.pending.find((item) => item.entity === pending.entity && item.id === pending.id);
    if (!original || original.revision !== pending.revision) continue;
    let error: { message: string } | null = null;
    if (pending.entity === 'transactions') {
      const row = db.transactions.find((item) => item.id === pending.id);
      if (row) {
        const result = await supabase.from('transactions').upsert(transactionPayload(row), { onConflict: 'id' });
        error = result.error;
      }
    } else {
      const row = db.categories.find((item) => item.id === pending.id);
      if (row) {
        const result = await supabase.from('categories').upsert(row, { onConflict: 'id' });
        error = result.error;
      }
    }
    if (error) throw error;
    db = await serialized(async () => {
      const latest = await readDatabase(userId);
      latest.pending = latest.pending.filter((item) => !(item.entity === pending.entity && item.id === pending.id && item.revision === pending.revision));
      await writeDatabase(latest);
      return latest;
    });
  }

  const [remoteCategories, remoteTransactions] = await Promise.all([
    supabase.from('categories').select('*').eq('user_id', userId),
    supabase.from('transactions').select('*, category:categories(*)').eq('user_id', userId),
  ]);
  if (remoteCategories.error) throw remoteCategories.error;
  if (remoteTransactions.error) throw remoteTransactions.error;

  db = await serialized(async () => {
    const latest = await readDatabase(userId);
    const pendingKeys = new Set(latest.pending.map((change) => `${change.entity}:${change.id}`));
    const categories = new Map(latest.categories.map((category) => [category.id, category]));
    for (const row of (remoteCategories.data ?? []) as Category[]) {
      if (!pendingKeys.has(`categories:${row.id}`)) categories.set(row.id, row);
    }
    const transactions = new Map(latest.transactions.map((transaction) => [transaction.id, transaction]));
    for (const row of (remoteTransactions.data ?? []) as Transaction[]) {
      if (!pendingKeys.has(`transactions:${row.id}`)) transactions.set(row.id, row);
    }
    latest.categories = [...categories.values()];
    latest.transactions = [...transactions.values()];
    latest.pulledRemote = true;

    if (latest.categories.length === 0) {
      for (const category of starterCategories(userId)) {
        latest.categories.push(category);
        markPending(latest, 'categories', category.id, 'upsert');
      }
    }
    await writeDatabase(latest);
    return latest;
  });

  // Push seeded starter categories during the same pass.
  for (const pending of db.pending.filter((item) => item.entity === 'categories')) {
    const category = db.categories.find((item) => item.id === pending.id);
    if (!category) continue;
    const { error } = await supabase.from('categories').upsert(category, { onConflict: 'id' });
    if (error) throw error;
    db = await serialized(async () => {
      const latest = await readDatabase(userId);
      latest.pending = latest.pending.filter((item) => !(item.entity === 'categories' && item.id === pending.id && item.revision === pending.revision));
      await writeDatabase(latest);
      return latest;
    });
  }
  useSyncStore.getState().setPendingCount(db.pending.length);
  useSyncStore.getState().setStatus('synced');
};

export const syncUser = (userId: string) => {
  const existing = syncs.get(userId);
  if (existing) return existing;
  const task = syncOnce(userId)
    .catch(async () => {
      const pending = await getPendingCount(userId).catch(() => 0);
      useSyncStore.getState().setPendingCount(pending);
      useSyncStore.getState().setStatus('offline');
    })
    .finally(() => syncs.delete(userId));
  syncs.set(userId, task);
  return task;
};
