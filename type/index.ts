export type Transaction = {
  id: string;
  user_id?: string;
  category_id?: string;
  amount: number;
  note: string;
  date: string;
  category?: Category;
  is_savings?: boolean; // 🌟 新增：是否為儲蓄項目
};

export type Category = {
  id: string;
  name: string;
  icon: string;
  type: 'income' | 'expense';
  budget_limit?: number; // 🌟 新增：該類別的專屬預算上限
};

export type Budget = {
  id: string;
  category_id: string;
  monthly_limit: number;
  current_spending: number;
};