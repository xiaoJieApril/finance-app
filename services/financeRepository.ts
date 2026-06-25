import {
  AccountType,
  Category,
  CategoryType,
  CurrencyCode,
  FinanceAccount,
  FinanceBudget,
  FinanceCategory,
  FinanceData,
  RecurringItem,
  SavingsGoal,
  Transaction,
  TransactionEntry,
  TransactionType,
} from '@/type';
import { convertToBaseCurrency } from './exchangeRates';
import { supabase } from './supabase';

export const BASE_CURRENCY: CurrencyCode = 'MYR';
export const DEFAULT_ACCOUNT_ID = 'default-wallet';

export const financeQueryKeys = {
  transactions: ['transactions'] as const,
  categories: ['categories'] as const,
  financeData: ['finance-data'] as const,
  accounts: ['finance-accounts'] as const,
  entries: ['transaction-entries'] as const,
  budgets: ['finance-budgets'] as const,
  goals: ['savings-goals'] as const,
  recurring: ['recurring-items'] as const,
};

const DEFAULT_ACCOUNT: FinanceAccount = {
  id: DEFAULT_ACCOUNT_ID,
  name: 'Default Wallet',
  type: 'cash',
  currency: BASE_CURRENCY,
  initial_balance: 0,
  current_balance: 0,
  icon: 'wallet',
};

function isDefaultAccountId(accountId?: string | null) {
  return accountId === DEFAULT_ACCOUNT_ID;
}

function isMissingSchemaError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    message.includes('relation') ||
    message.includes('does not exist') ||
    message.includes('schema cache') ||
    message.includes('Could not find the table')
  );
}

function toError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}

export function mapLegacyCategory(category: Category): FinanceCategory {
  return {
    id: `legacy-${category.id}`,
    name: category.name,
    icon: category.icon || 'wallet',
    type: category.type,
    budget_limit: category.budget_limit ?? 0,
    legacy_category_id: category.id,
  };
}

export function mapLegacyTransaction(transaction: Transaction): TransactionEntry {
  const category = transaction.category ? mapLegacyCategory(transaction.category) : null;
  const type: TransactionType = category?.type === 'income' ? 'income' : 'expense';

  return {
    id: `legacy-${transaction.id}`,
    type,
    account_id: DEFAULT_ACCOUNT_ID,
    category_id: category?.id ?? null,
    currency: BASE_CURRENCY,
    amount: transaction.amount,
    base_currency: BASE_CURRENCY,
    base_currency_amount: transaction.amount,
    exchange_rate: 1,
    note: transaction.note,
    date: transaction.date,
    is_savings: transaction.is_savings,
    legacy_transaction_id: transaction.id,
    category,
    account: DEFAULT_ACCOUNT,
    exchange_status: 'converted',
  };
}

function mapLegacyBudget(category: FinanceCategory): FinanceBudget | null {
  if (category.type !== 'expense' || !category.budget_limit) return null;

  return {
    id: `legacy-budget-${category.id}`,
    category_id: category.id,
    monthly_limit: category.budget_limit,
    alert_threshold: 0.8,
    category,
  };
}

function attachRelations(
  entries: TransactionEntry[],
  accounts: FinanceAccount[],
  categories: FinanceCategory[],
): TransactionEntry[] {
  return entries.map((entry) => ({
    ...entry,
    account: accounts.find((account) => account.id === entry.account_id) ?? null,
    to_account: accounts.find((account) => account.id === entry.to_account_id) ?? null,
    category: categories.find((category) => category.id === entry.category_id) ?? null,
  }));
}

async function getLegacyTransactionsSafely() {
  try {
    return await getTransactions();
  } catch (error) {
    if (isMissingSchemaError(error)) return [];
    throw error;
  }
}

async function getLegacyCategoriesSafely() {
  try {
    return await getCategories();
  } catch (error) {
    if (isMissingSchemaError(error)) return [];
    throw error;
  }
}

async function getCurrentUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) throw new Error('尚未登入，無法儲存資料');
  return user.id;
}

async function ensureDefaultAccount(): Promise<FinanceAccount> {
  const user_id = await getCurrentUserId();
  const { data: existing, error: existingError } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', user_id)
    .eq('name', DEFAULT_ACCOUNT.name)
    .maybeSingle();

  if (existingError && !isMissingSchemaError(existingError)) throw existingError;
  if (existing) return existing as FinanceAccount;

  const { data, error } = await supabase
    .from('accounts')
    .insert([{ ...DEFAULT_ACCOUNT, id: undefined, user_id }])
    .select()
    .single();

  if (error) throw error;
  return data as FinanceAccount;
}

async function ensureLegacyCategoryMapping(
  legacyCategories: Category[],
  financeCategories: FinanceCategory[],
  userId: string,
) {
  const nextCategories = [...financeCategories];
  const byLegacyId = new Map(
    nextCategories
      .filter((category) => category.legacy_category_id)
      .map((category) => [category.legacy_category_id, category]),
  );

  for (const legacyCategory of legacyCategories) {
    if (byLegacyId.has(legacyCategory.id)) continue;

    const payload = {
      user_id: userId,
      name: legacyCategory.name,
      icon: legacyCategory.icon || 'wallet',
      type: legacyCategory.type,
      budget_limit: legacyCategory.budget_limit ?? 0,
      legacy_category_id: legacyCategory.id,
    };

    const { data, error } = await supabase
      .from('finance_categories')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    const created = data as FinanceCategory;
    nextCategories.push(created);
    byLegacyId.set(legacyCategory.id, created);
  }

  return nextCategories;
}

async function migrateLegacyTransactionsToV2(params: {
  accounts: FinanceAccount[];
  categories: FinanceCategory[];
  entries: TransactionEntry[];
}) {
  const [legacyTransactions, legacyCategories] = await Promise.all([
    getLegacyTransactionsSafely(),
    getLegacyCategoriesSafely(),
  ]);

  if (legacyTransactions.length === 0) return params;

  const userId = await getCurrentUserId();
  const accounts = params.accounts.length > 0 ? [...params.accounts] : [await ensureDefaultAccount()];
  const defaultAccount = accounts[0] ?? (await ensureDefaultAccount());
  const categories = await ensureLegacyCategoryMapping(legacyCategories, params.categories, userId);
  const financeCategoryByLegacyId = new Map(
    categories
      .filter((category) => category.legacy_category_id)
      .map((category) => [category.legacy_category_id, category]),
  );
  const legacyCategoryById = new Map(legacyCategories.map((category) => [category.id, category]));
  const existingLegacyIds = new Set(
    params.entries
      .map((entry) => entry.legacy_transaction_id)
      .filter((id): id is number => typeof id === 'number'),
  );
  const rows = legacyTransactions
    .filter((transaction) => !existingLegacyIds.has(transaction.id))
    .map((transaction) => {
      const legacyCategory =
        transaction.category ?? legacyCategoryById.get(Number(transaction.category_id));
      const financeCategory = legacyCategory
        ? financeCategoryByLegacyId.get(legacyCategory.id)
        : null;
      const type: TransactionType = legacyCategory?.type === 'income' ? 'income' : 'expense';

      return {
        user_id: userId,
        type,
        account_id: defaultAccount.id,
        category_id: financeCategory?.id ?? null,
        currency: BASE_CURRENCY,
        amount: transaction.amount,
        base_currency: BASE_CURRENCY,
        base_currency_amount: transaction.amount,
        exchange_rate: 1,
        note: transaction.note ?? '',
        date: transaction.date,
        is_savings: transaction.is_savings ?? false,
        legacy_transaction_id: transaction.id,
      };
    });

  if (rows.length === 0) {
    return { accounts, categories, entries: attachRelations(params.entries, accounts, categories) };
  }

  const { data, error } = await supabase
    .from('transaction_entries')
    .insert(rows)
    .select();

  if (error) throw error;

  return {
    accounts,
    categories,
    entries: attachRelations(
      [...((data ?? []) as TransactionEntry[]), ...params.entries],
      accounts,
      categories,
    ),
  };
}

export async function getTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*, category:categories(*)')
    .order('date', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('*');

  if (error) throw error;
  return data ?? [];
}

export async function getLegacyFinanceData(): Promise<FinanceData> {
  const [transactions, categories] = await Promise.all([getTransactions(), getCategories()]);
  const financeCategories = categories.map(mapLegacyCategory);
  const entries = transactions.map(mapLegacyTransaction);
  const budgets = financeCategories
    .map(mapLegacyBudget)
    .filter((budget): budget is FinanceBudget => Boolean(budget));

  return {
    source: 'legacy',
    baseCurrency: BASE_CURRENCY,
    accounts: [DEFAULT_ACCOUNT],
    categories: financeCategories,
    entries,
    budgets,
    goals: [],
    recurringItems: [],
  };
}

export async function getFinanceData(): Promise<FinanceData> {
  try {
    const [accountsResult, categoriesResult, entriesResult, budgetsResult, goalsResult, recurringResult] =
      await Promise.all([
        supabase.from('accounts').select('*').order('created_at', { ascending: true }),
        supabase.from('finance_categories').select('*').order('name', { ascending: true }),
        supabase.from('transaction_entries').select('*').order('date', { ascending: false }),
        supabase.from('budgets').select('*'),
        supabase.from('savings_goals').select('*').order('created_at', { ascending: true }),
        supabase.from('recurring_items').select('*').eq('is_active', true).order('next_due_date', { ascending: true }),
      ]);

    const error = [
      accountsResult.error,
      categoriesResult.error,
      entriesResult.error,
      budgetsResult.error,
      goalsResult.error,
      recurringResult.error,
    ].find(Boolean);

    if (error) throw error;

    let allAccounts = (accountsResult.data ?? []) as FinanceAccount[];
    let accounts = allAccounts.filter((account) => !account.is_archived);
    if (accounts.length === 0) {
      const defaultAccount = await ensureDefaultAccount();
      accounts = [defaultAccount];
      allAccounts = [
        ...allAccounts.filter((account) => account.id !== defaultAccount.id),
        defaultAccount,
      ];
    }
    let categories = (categoriesResult.data ?? []) as FinanceCategory[];
    let entries = attachRelations(
      (entriesResult.data ?? []) as TransactionEntry[],
      allAccounts,
      categories,
    );
    const migrated = await migrateLegacyTransactionsToV2({ accounts, categories, entries });
    accounts = migrated.accounts;
    allAccounts = [
      ...allAccounts.filter((account) => !accounts.some((activeAccount) => activeAccount.id === account.id)),
      ...accounts,
    ];
    categories = migrated.categories;
    entries = attachRelations(migrated.entries, allAccounts, categories);
    const budgets = ((budgetsResult.data ?? []) as FinanceBudget[]).map((budget) => ({
      ...budget,
      category: categories.find((category) => category.id === budget.category_id) ?? null,
    }));
    const recurringItems = ((recurringResult.data ?? []) as RecurringItem[]).map((item) => ({
      ...item,
      category: categories.find((category) => category.id === item.category_id) ?? null,
      account: allAccounts.find((account) => account.id === item.account_id) ?? null,
    }));

    return {
      source: 'v2',
      baseCurrency: BASE_CURRENCY,
      accounts,
      categories,
      entries,
      budgets,
      goals: (goalsResult.data ?? []) as SavingsGoal[],
      recurringItems,
    };
  } catch (error) {
    if (isMissingSchemaError(error)) return getLegacyFinanceData();
    throw toError(error);
  }
}

export async function createCategory(newCategory: Partial<Category>) {
  const { data, error } = await supabase.from('categories').insert([newCategory]);

  if (error) throw error;
  return data;
}

export async function editCategory(updatedCategory: Partial<Category> & { id: number }) {
  const { id, ...fields } = updatedCategory;
  const { data, error } = await supabase.from('categories').update(fields).eq('id', id);

  if (error) throw error;
  return data;
}

export async function removeCategory(id: number) {
  const { error } = await supabase.from('categories').delete().eq('id', id);

  if (error) throw error;
}

export async function createTransaction(newTransaction: Partial<Transaction>) {
  const user_id = await getCurrentUserId();
  const { data, error } = await supabase
    .from('transactions')
    .insert([{ ...newTransaction, user_id }]);

  if (error) {
    const message = error.message ?? '';
    if (
      message.includes('user_id') &&
      (message.includes('schema cache') ||
        message.includes('Could not find') ||
        message.includes('column'))
    ) {
      const retry = await supabase.from('transactions').insert([newTransaction]);
      if (retry.error) throw retry.error;
      return retry.data;
    }

    throw error;
  }
  return data;
}

export async function editTransaction(updatedTransaction: Partial<Transaction> & { id: number }) {
  const { id, ...fields } = updatedTransaction;
  const { data, error } = await supabase.from('transactions').update(fields).eq('id', id);

  if (error) throw error;
  return data;
}

export async function removeTransaction(id: number) {
  const { error } = await supabase.from('transactions').delete().eq('id', id);

  if (error) throw error;
}

export type UpsertAccountInput = {
  id?: string;
  name: string;
  type: AccountType;
  currency: CurrencyCode;
  initial_balance: number;
  icon?: string;
};

export async function upsertAccount(input: UpsertAccountInput) {
  const user_id = await getCurrentUserId();
  const payload = { ...input, user_id };
  const query = supabase.from('accounts');
  const { data, error } = input.id
    ? await query.update(payload).eq('id', input.id).select().single()
    : await query.insert([payload]).select().single();

  if (error) throw error;
  return data as FinanceAccount;
}

export async function archiveAccount(id: string) {
  const { error } = await supabase.from('accounts').update({ is_archived: true }).eq('id', id);
  if (error) throw error;
}

export type UpsertFinanceCategoryInput = {
  id?: string;
  name: string;
  icon: string;
  type: CategoryType;
  budget_limit?: number;
  legacy_category_id?: number;
};

export async function upsertFinanceCategory(input: UpsertFinanceCategoryInput) {
  const user_id = await getCurrentUserId();
  const payload = { ...input, user_id };
  const query = supabase.from('finance_categories');

  try {
    const { data, error } = input.id
      ? await query.update(payload).eq('id', input.id).select().single()
      : await query.insert([payload]).select().single();

    if (error) throw error;
    return data as FinanceCategory;
  } catch (error) {
    if (!isMissingSchemaError(error)) throw toError(error);

    const legacyPayload = {
      name: input.name,
      icon: input.icon,
      type: input.type,
      budget_limit: input.budget_limit,
    };
    if (input.legacy_category_id) {
      const updated = await editCategory({ id: input.legacy_category_id, ...legacyPayload });
      const row = Array.isArray(updated) ? updated[0] : null;
      return mapLegacyCategory((row ?? { id: input.legacy_category_id, ...legacyPayload }) as Category);
    }

    const created = await createCategory(legacyPayload);
    const row = Array.isArray(created) ? created[0] : null;
    if (!row) return mapLegacyCategory({ id: Date.now(), ...legacyPayload } as Category);
    return mapLegacyCategory(row as Category);
  }
}

export async function deleteFinanceCategory(category: FinanceCategory) {
  if (category.legacy_category_id) {
    return removeCategory(category.legacy_category_id);
  }

  const { error } = await supabase.from('finance_categories').delete().eq('id', category.id);
  if (error) throw error;
}

export type UpsertEntryInput = {
  id?: string;
  type: TransactionType;
  account_id?: string | null;
  to_account_id?: string | null;
  category_id?: string | null;
  currency: CurrencyCode;
  amount: number;
  note: string;
  date: string;
  is_savings?: boolean;
};

export async function upsertTransactionEntry(input: UpsertEntryInput) {
  const user_id = await getCurrentUserId();
  const conversion = await convertToBaseCurrency(input.amount, input.currency, BASE_CURRENCY);
  const account_id = isDefaultAccountId(input.account_id) ? null : input.account_id;
  const to_account_id = isDefaultAccountId(input.to_account_id) ? null : input.to_account_id;

  if (input.type === 'transfer' && (!account_id || !to_account_id)) {
    throw new Error('請先建立兩個真實帳戶，再新增轉帳紀錄。');
  }

  const payload = {
    ...input,
    account_id,
    to_account_id,
    user_id,
    base_currency: BASE_CURRENCY,
    base_currency_amount: conversion.amount,
    exchange_rate: conversion.rate,
  };

  try {
    const query = supabase.from('transaction_entries');
    const { data, error } = input.id
      ? await query.update(payload).eq('id', input.id).select().single()
      : await query.insert([payload]).select().single();

    if (error) throw error;
    return data as TransactionEntry;
  } catch (error) {
    if (!isMissingSchemaError(error)) throw toError(error);
    if (input.type === 'transfer') {
      throw new Error('轉帳功能需要先套用 v2 Supabase migration。');
    }

    const legacyCategoryId = input.category_id?.startsWith('legacy-')
      ? Number(input.category_id.replace('legacy-', ''))
      : undefined;

    if (input.id?.startsWith('legacy-')) {
      return editTransaction({
        id: Number(input.id.replace('legacy-', '')),
        amount: input.amount,
        note: input.note,
        date: input.date,
        category_id: legacyCategoryId,
        is_savings: input.is_savings,
      });
    }

    return createTransaction({
      amount: input.amount,
      note: input.note,
      date: input.date,
      category_id: legacyCategoryId,
      is_savings: input.is_savings,
    });
  }
}

export async function deleteTransactionEntry(entry: TransactionEntry) {
  if (entry.legacy_transaction_id) {
    return removeTransaction(entry.legacy_transaction_id);
  }

  const { error } = await supabase.from('transaction_entries').delete().eq('id', entry.id);
  if (error) throw error;
}

export async function upsertBudget(input: { id?: string; category_id: string; monthly_limit: number }) {
  const user_id = await getCurrentUserId();
  const query = supabase.from('budgets');
  const { data, error } = input.id
    ? await query.update({ category_id: input.category_id, monthly_limit: input.monthly_limit, user_id }).eq('id', input.id).select().single()
    : await query
        .upsert(
          [{ category_id: input.category_id, monthly_limit: input.monthly_limit, user_id }],
          { onConflict: 'user_id,category_id' },
        )
        .select()
        .single();

  if (error) throw error;
  return data as FinanceBudget;
}

export async function deleteBudget(id: string) {
  const { error } = await supabase.from('budgets').delete().eq('id', id);
  if (error) throw error;
}

export async function upsertSavingsGoal(input: Partial<SavingsGoal> & { name: string }) {
  const user_id = await getCurrentUserId();
  const payload = { currency: BASE_CURRENCY, current_amount: 0, target_amount: 0, ...input, user_id };
  const query = supabase.from('savings_goals');
  const { data, error } = input.id
    ? await query.update(payload).eq('id', input.id).select().single()
    : await query.insert([payload]).select().single();

  if (error) throw error;
  return data as SavingsGoal;
}

export async function deleteSavingsGoal(id: string) {
  const { error } = await supabase.from('savings_goals').delete().eq('id', id);
  if (error) throw error;
}

export async function upsertRecurringItem(input: Partial<RecurringItem> & { name: string }) {
  const user_id = await getCurrentUserId();
  const payload = { currency: BASE_CURRENCY, frequency: 'monthly', is_active: true, ...input, user_id };
  const query = supabase.from('recurring_items');
  const { data, error } = input.id
    ? await query.update(payload).eq('id', input.id).select().single()
    : await query.insert([payload]).select().single();

  if (error) throw error;
  return data as RecurringItem;
}

export async function deleteRecurringItem(id: string) {
  const { error } = await supabase.from('recurring_items').delete().eq('id', id);
  if (error) throw error;
}
