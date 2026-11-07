import type { Database } from './database';

export type Category = Database['public']['Tables']['categories']['Row'];
export type TransactionRecord = Database['public']['Tables']['transactions']['Row'];
export type Transaction = Omit<TransactionRecord, 'deleted_at'> & {
  deleted_at?: TransactionRecord['deleted_at'];
  category?: Category | null;
};
