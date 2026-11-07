export type Transaction = {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  note: string;
  date: string;
  updated_at: string;
  deleted_at?: string | null;
  category?: Category;
};

export type Category = {
  id: string;
  name: string;
  icon: string;
  type: 'income' | 'expense';
  user_id: string;
  updated_at: string;
  archived_at?: string | null;
};
