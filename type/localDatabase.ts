import type { Category, Transaction } from './index';

export type PendingChange = {
  entity: 'transactions' | 'categories';
  id: string;
  operation: 'upsert' | 'delete';
  revision: string;
};

/** Stable v1 JSON snapshot stored under finance-local-v1:<userId>. */
export type LocalDatabaseV1 = {
  version: 1;
  userId: string;
  transactions: Transaction[];
  categories: Category[];
  pending: PendingChange[];
  pulledRemote: boolean;
};
