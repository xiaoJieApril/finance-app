/**
 * Ledger database contract v1. Keep the existing table definitions and
 * relationship names stable; future features should add tables alongside these.
 */
export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          icon: string;
          type: 'income' | 'expense';
          updated_at: string;
          archived_at: string | null;
        };
        Insert: {
          id: string;
          user_id: string;
          name: string;
          icon: string;
          type: 'income' | 'expense';
          updated_at?: string;
          archived_at?: string | null;
        };
        Update: {
          name?: string;
          icon?: string;
          updated_at?: string;
          archived_at?: string | null;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          category_id: string;
          amount: number;
          note: string;
          date: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          user_id: string;
          category_id: string;
          amount: number;
          note: string;
          date: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          category_id?: string;
          amount?: number;
          note?: string;
          date?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'transactions_category_user_id_fkey';
            columns: ['category_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id', 'user_id'];
          },
        ];
      };
      zero_spend_settings: {
        Row: { user_id: string; enabled: boolean; enabled_from_local_date: string | null; updated_at: string };
        Insert: { user_id: string; enabled?: boolean; enabled_from_local_date?: string | null; updated_at?: string };
        Update: { enabled?: boolean; enabled_from_local_date?: string | null; updated_at?: string };
        Relationships: [];
      };
      zero_spend_days: {
        Row: { id: string; user_id: string; local_date: string; created_at: string; deleted_at: string | null };
        Insert: { id: string; user_id: string; local_date: string; created_at?: string; deleted_at?: string | null };
        Update: { id?: string; local_date?: string; created_at?: string; deleted_at?: string | null };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
