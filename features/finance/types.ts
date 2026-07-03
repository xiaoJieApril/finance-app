/**
 * Shared finance-domain types.
 *
 * These types describe both legacy rows and the v2 Supabase finance schema used
 * by accounts, categories, entries, budgets, goals, recurring items, imports,
 * and exchange rates.
 */
export type TransactionType = 'income' | 'expense' | 'transfer';
export type CategoryType = 'income' | 'expense';
export type AccountType = 'cash' | 'bank' | 'ewallet' | 'credit_card';
export type CurrencyCode = string;
export type SpendingRulePeriod = 'day' | 'week' | 'month';
export type SavingPlanMode = 'rate' | 'amount';
export type SavingsGoalType = 'emergency' | 'travel' | 'car' | 'debt' | 'custom';

export type Transaction = {
  id: number;
  user_id?: string;
  category_id?: number;
  amount: number;
  note: string;
  date: string;
  category?: Category;
  is_savings?: boolean;
};

export type Category = {
  id: number;
  name: string;
  icon: string;
  type: CategoryType;
  budget_limit?: number;
};

export type Budget = {
  id: string;
  category_id: string;
  monthly_limit: number;
  current_spending: number;
};

export type FinanceAccount = {
  id: string;
  user_id?: string;
  name: string;
  type: AccountType;
  currency: CurrencyCode;
  initial_balance: number;
  current_balance?: number;
  icon?: string;
  is_archived?: boolean;
  statement_day?: number | null;
  payment_due_day?: number | null;
  minimum_payment?: number | null;
  outstanding_balance?: number | null;
  interest_rate?: number | null;
  credit_limit?: number | null;
  created_at?: string;
};

export type FinanceCategory = {
  id: string;
  user_id?: string;
  name: string;
  icon: string;
  type: CategoryType;
  budget_limit?: number;
  legacy_category_id?: number;
};

export type TransactionEntry = {
  id: string;
  user_id?: string;
  type: TransactionType;
  account_id?: string | null;
  to_account_id?: string | null;
  category_id?: string | null;
  currency: CurrencyCode;
  amount: number;
  base_currency: CurrencyCode;
  base_currency_amount?: number | null;
  exchange_rate?: number | null;
  note: string;
  date: string;
  is_savings?: boolean;
  legacy_transaction_id?: number;
  category?: FinanceCategory | null;
  account?: FinanceAccount | null;
  to_account?: FinanceAccount | null;
  exchange_status?: 'converted' | 'cached' | 'missing';
};

export type FinanceBudget = {
  id: string;
  user_id?: string;
  category_id: string;
  monthly_limit: number;
  alert_threshold?: number;
  category?: FinanceCategory | null;
};

export type SavingsGoal = {
  id: string;
  user_id?: string;
  name: string;
  target_amount: number;
  current_amount: number;
  currency: CurrencyCode;
  target_date?: string | null;
  monthly_contribution?: number | null;
  goal_type?: SavingsGoalType;
  is_primary?: boolean;
  icon?: string;
};

export type RecurringItem = {
  id: string;
  user_id?: string;
  name: string;
  type: CategoryType;
  amount: number;
  currency: CurrencyCode;
  category_id?: string | null;
  account_id?: string | null;
  next_due_date: string;
  frequency: 'weekly' | 'monthly' | 'yearly';
  is_active: boolean;
  category?: FinanceCategory | null;
  account?: FinanceAccount | null;
};

export type SpendingRule = {
  id: string;
  user_id?: string;
  name: string;
  category_id?: string | null;
  period: SpendingRulePeriod;
  limit_amount: number;
  is_active: boolean;
  created_at?: string;
  category?: FinanceCategory | null;
};

export type SavingPlan = {
  id: string;
  user_id?: string;
  mode: SavingPlanMode;
  target_rate: number;
  target_amount: number;
  buffer_amount: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ExchangeRate = {
  id?: string;
  base_currency: CurrencyCode;
  quote_currency: CurrencyCode;
  rate: number;
  rate_date: string;
  provider: 'frankfurter';
};

export type FinanceDataSource = 'v2' | 'legacy';

export type FinanceData = {
  source: FinanceDataSource;
  baseCurrency: CurrencyCode;
  accounts: FinanceAccount[];
  categories: FinanceCategory[];
  entries: TransactionEntry[];
  budgets: FinanceBudget[];
  goals: SavingsGoal[];
  recurringItems: RecurringItem[];
  spendingRules: SpendingRule[];
  savingPlan: SavingPlan | null;
};
