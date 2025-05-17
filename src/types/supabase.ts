import { Database } from "@/integrations/supabase/types";

// Export the Database type from the generated types file
export type { Database } from "@/integrations/supabase/types";

// Create types based on the generated Database type
export type CourtGroup = Database['public']['Tables']['court_groups']['Row'];
export type Court = Database['public']['Tables']['courts']['Row'];
export type Client = Database['public']['Tables']['clients']['Row'];
export type Reservation = Database['public']['Tables']['reservations']['Row'] & {
  cash?: number;
  card?: number;
  wallet?: number;
  employee_name?: string;
  created_by_role?: string;
};
export type ExpenseCategory = Database['public']['Tables']['expense_categories']['Row'];
export type Expense = Database['public']['Tables']['expenses']['Row'];
export type Transaction = Database['public']['Tables']['transactions']['Row'];
export type UserRole = Database['public']['Tables']['user_roles']['Row'];

// App role enum from the database
export type AppRole = Database['public']['Enums']['app_role'];

// Extended types with joined data
export type ReservationWithDetails = Reservation & {
  client_name?: string;
  court_name?: string;
  employee_name?: string;
  created_by_role?: string;
};

export type CourtsWithGroup = Court & {
  group_name?: string;
};

export type ExpenseWithCategory = Expense & {
  category_name?: string;
};

// Type for revenue by court group RPC function result
export interface RevenueByGroup {
  group_name: string;
  total_revenue: number;
}

export type TransactionWithDetails = Transaction & {
  reservations?: {
    id: string;
    clients?: { name?: string } | null;
    courts?: { name?: string; court_groups?: { name?: string } | null } | null;
  } | null;
};
