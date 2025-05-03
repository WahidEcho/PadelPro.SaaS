
export interface Court {
  id: string;
  name: string;
  group: string;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  client_id: string;
  created_at: string;
}

export interface Reservation {
  id: string;
  client_id: string;
  court_id: string;
  date: string;
  time_start: string;
  time_end: string;
  amount: number;
  payment_method: "cash" | "card";
  created_at: string;
  
  // Joined fields
  client_name?: string;
  court_name?: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  date: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  reservation_id: string;
  amount: number;
  payment_method: "cash" | "card";
  date: string;
  created_at: string;
}

export interface DashboardStats {
  todayRevenue: number;
  todayExpenses: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
}

export type ReservationStatus = "past" | "today" | "future";

export interface User {
  id: string;
  email: string;
  created_at: string;
}
