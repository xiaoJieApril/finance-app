export type Transaction = {
  id: number; // 🌟 從 string 改為 number
  user_id?: string;
  category_id?: number; // 🌟 從 string 改為 number
  amount: number;
  note: string;
  date: string;
  category?: Category;
  is_savings?: boolean;
};

export type Category = {
  id: number; // 🌟 從 string 改為 number
  name: string;
  icon: string;
  type: 'income' | 'expense';
  budget_limit?: number;
};

export type Budget = {
  id: string;
  category_id: string;
  monthly_limit: number;
  current_spending: number;
};