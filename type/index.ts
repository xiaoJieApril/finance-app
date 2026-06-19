export type TransactionType = 'income' | 'expense' | 'transfer';
export type CategoryType = 'income' | 'expense';
export type AccountType = 'cash' | 'bank' | 'ewallet' | 'credit_card';
export type CurrencyCode = string;

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

export type ExchangeRate = {
  id?: string;
  base_currency: CurrencyCode;
  quote_currency: CurrencyCode;
  rate: number;
  rate_date: string;
  provider: 'frankfurter';
};

export type NotificationImportStatus = 'pending' | 'confirmed' | 'ignored' | 'duplicate';

export type NotificationImport = {
  id: string;
  user_id?: string;
  source_app: string;
  source_package: string;
  notification_title?: string | null;
  notification_text_preview: string;
  notification_hash: string;
  parsed_type?: TransactionType | null;
  parsed_amount?: number | null;
  parsed_currency: CurrencyCode;
  parsed_merchant?: string | null;
  parsed_account_hint?: string | null;
  occurred_at: string;
  status: NotificationImportStatus;
  confirmed_entry_id?: string | null;
  created_at?: string;
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
};
