export type Transaction = {
    id: string;
    amount: number;
    note: string;
    date: string;
    category: Category;
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