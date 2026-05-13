export type Transaction = {
  id: string;
  user_id?: string;       // 新增：對應 Supabase 的使用者 ID 欄位
  category_id?: string;   // 新增：對應 Supabase 的類別 ID 欄位
  amount: number;
  note: string;
  date: string;
  category?: Category;    // 加上問號 (?) 變為可選，因為我們新增資料時還沒有完整的類別物件
};

export type Category = {
  id: string;
  name: string;
  icon: string;
  type: 'income' | 'expense';
};

export type Budget = {
  id: string;
  category_id: string;
  monthly_limit: number;
  current_spending: number;
};