import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export type PlannedExpense = { id: string; user_id: string; month: string; title: string; amount: number; category_id: string; updated_at: string; deleted_at: string | null };
export type PlannedExpenseLink = { id: string; user_id: string; planned_expense_id: string; transaction_id: string; updated_at: string; deleted_at: string | null };
export type FinancialGoal = { user_id: string; kind: 'investment' | 'emergency_fund'; balance: number; target: number | null; updated_at: string };
type Entity = 'planned_expenses' | 'planned_expense_transactions' | 'financial_goals';
type Pending = { entity: Entity; id: string; revision: string };
type Snapshot = { version: 1; userId: string; plans: PlannedExpense[]; links: PlannedExpenseLink[]; goals: FinancialGoal[]; pending: Pending[]; pulledRemote: boolean };
const keyFor = (userId: string) => `finance-planning-v1:${userId}`;
let chain: Promise<unknown> = Promise.resolve();
const serialize = <T,>(task: () => Promise<T>) => { const result = chain.then(task, task); chain = result.catch(() => undefined); return result; };
const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
const now = () => new Date().toISOString();
const empty = (userId: string): Snapshot => ({ version: 1, userId, plans: [], links: [], goals: [], pending: [], pulledRemote: false });
async function read(userId: string): Promise<Snapshot> {
  const raw = await AsyncStorage.getItem(keyFor(userId));
  if (!raw) return empty(userId);
  const value = JSON.parse(raw) as Snapshot;
  if (value.version !== 1 || value.userId !== userId) throw new Error('计划数据版本不受支持。');
  return { ...empty(userId), ...value, plans: value.plans ?? [], links: value.links ?? [], goals: value.goals ?? [], pending: value.pending ?? [] };
}
async function write(db: Snapshot) { await AsyncStorage.setItem(keyFor(db.userId), JSON.stringify(db)); }
const mark = (db: Snapshot, entity: Entity, id: string) => { db.pending = db.pending.filter((p) => !(p.entity === entity && p.id === id)); db.pending.push({ entity, id, revision: uuid() }); };
const mutate = (userId: string, task: (db: Snapshot) => void) => serialize(async () => { const db = await read(userId); task(db); await write(db); });

export const getPlanningData = async (userId: string) => serialize(async () => {
  const db = await read(userId);
  if (db.goals.length === 0 && !db.pulledRemote) {
    for (const kind of ['investment', 'emergency_fund'] as const) {
      const goal: FinancialGoal = { user_id: userId, kind, balance: 0, target: null, updated_at: now() };
      db.goals.push(goal); mark(db, 'financial_goals', kind);
    }
    await write(db);
  }
  return { plans: db.plans.filter((plan) => !plan.deleted_at), links: db.links.filter((link) => !link.deleted_at), goals: db.goals };
});

export const savePlannedExpense = (userId: string, values: { id?: string; month: string; title: string; amount: number; category_id: string }) => mutate(userId, (db) => {
  const id = values.id ?? uuid(); const timestamp = now();
  const current = db.plans.find((item) => item.id === id);
  const item: PlannedExpense = { ...current, ...values, id, user_id: userId, title: values.title.trim(), updated_at: timestamp, deleted_at: null };
  db.plans = [item, ...db.plans.filter((entry) => entry.id !== id)]; mark(db, 'planned_expenses', id);
});
export const deletePlannedExpense = (userId: string, id: string) => mutate(userId, (db) => {
  const timestamp = now(); const plan = db.plans.find((item) => item.id === id); if (!plan) return;
  plan.deleted_at = timestamp; plan.updated_at = timestamp; mark(db, 'planned_expenses', id);
  for (const link of db.links.filter((item) => item.planned_expense_id === id && !item.deleted_at)) { link.deleted_at = timestamp; link.updated_at = timestamp; mark(db, 'planned_expense_transactions', link.id); }
});
export const linkExpenseToPlan = (userId: string, planId: string, transactionId: string) => mutate(userId, (db) => {
  const plan = db.plans.find((item) => item.id === planId && !item.deleted_at); if (!plan) throw new Error('找不到这个计划。');
  const prior = db.links.find((item) => item.transaction_id === transactionId && !item.deleted_at);
  if (prior?.planned_expense_id === planId) return;
  const timestamp = now();
  if (prior) { prior.deleted_at = timestamp; prior.updated_at = timestamp; mark(db, 'planned_expense_transactions', prior.id); }
  const link: PlannedExpenseLink = { id: uuid(), user_id: userId, planned_expense_id: planId, transaction_id: transactionId, updated_at: timestamp, deleted_at: null };
  db.links.unshift(link); mark(db, 'planned_expense_transactions', link.id);
});
export const unlinkExpenseFromPlan = (userId: string, linkId: string) => mutate(userId, (db) => { const link = db.links.find((item) => item.id === linkId); if (link && !link.deleted_at) { link.deleted_at = now(); link.updated_at = link.deleted_at; mark(db, 'planned_expense_transactions', link.id); } });
export const updateFinancialGoal = (userId: string, kind: FinancialGoal['kind'], balance: number, target: number | null) => mutate(userId, (db) => {
  const timestamp = now();
  const goal: FinancialGoal = { user_id: userId, kind, balance, target, updated_at: timestamp };
  db.goals = [goal, ...db.goals.filter((item) => item.kind !== kind)]; mark(db, 'financial_goals', kind);
});

export const getPlanningPendingCount = async (userId: string) => (await read(userId)).pending.length;
let syncing: Promise<void> | null = null;
export const syncPlanningUser = (userId: string) => {
  if (syncing) return syncing;
  syncing = (async () => {
    let db = await read(userId);
    for (const pending of [...db.pending]) {
      const current = db.pending.find((item) => item.entity === pending.entity && item.id === pending.id);
      if (!current || current.revision !== pending.revision) continue;
      const row = pending.entity === 'planned_expenses' ? db.plans.find((item) => item.id === pending.id)
        : pending.entity === 'planned_expense_transactions' ? db.links.find((item) => item.id === pending.id)
          : db.goals.find((item) => item.kind === pending.id);
      if (row) {
        const { error } = await supabase.from(pending.entity).upsert(row as never, { onConflict: pending.entity === 'financial_goals' ? 'user_id,kind' : 'id' });
        if (error) throw error;
      }
      db = await serialize(async () => { const latest = await read(userId); latest.pending = latest.pending.filter((item) => !(item.entity === pending.entity && item.id === pending.id && item.revision === pending.revision)); await write(latest); return latest; });
    }
    const [plans, links, goals] = await Promise.all([
      supabase.from('planned_expenses').select('*').eq('user_id', userId),
      supabase.from('planned_expense_transactions').select('*').eq('user_id', userId),
      supabase.from('financial_goals').select('*').eq('user_id', userId),
    ]);
    if (plans.error) throw plans.error; if (links.error) throw links.error; if (goals.error) throw goals.error;
    await serialize(async () => {
      const latest = await read(userId); const pendingKeys = new Set(latest.pending.map((item) => `${item.entity}:${item.id}`));
      const merge = <T,>(local: T[], remote: T[], entity: Entity, id: (row: T) => string) => {
        const rows = new Map(local.map((row) => [id(row), row]));
        for (const row of remote) if (!pendingKeys.has(`${entity}:${id(row)}`)) rows.set(id(row), row);
        return [...rows.values()];
      };
      latest.plans = merge(latest.plans, (plans.data ?? []) as PlannedExpense[], 'planned_expenses', (row) => row.id);
      latest.links = merge(latest.links, (links.data ?? []) as PlannedExpenseLink[], 'planned_expense_transactions', (row) => row.id);
      latest.goals = merge(latest.goals, (goals.data ?? []) as FinancialGoal[], 'financial_goals', (row) => row.kind);
      for (const kind of ['investment', 'emergency_fund'] as const) if (!latest.goals.some((goal) => goal.kind === kind)) {
        const goal: FinancialGoal = { user_id: userId, kind, balance: 0, target: null, updated_at: now() }; latest.goals.push(goal); mark(latest, 'financial_goals', kind);
      }
      latest.pulledRemote = true; await write(latest);
    });
  })().catch(() => undefined).finally(() => { syncing = null; });
  return syncing;
};
