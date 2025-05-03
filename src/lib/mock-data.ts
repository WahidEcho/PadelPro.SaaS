
import { Client, Court, Expense, Reservation, Transaction } from "@/types";

// Mock Courts
export const mockCourts: Court[] = [
  { id: "1", name: "Court 1", group: "Indoor", created_at: "2025-01-01T10:00:00Z" },
  { id: "2", name: "Court 2", group: "Indoor", created_at: "2025-01-01T10:00:00Z" },
  { id: "3", name: "Court 3", group: "Outdoor", created_at: "2025-01-05T10:00:00Z" },
  { id: "4", name: "Court 4", group: "Outdoor", created_at: "2025-01-05T10:00:00Z" },
  { id: "5", name: "Court 5", group: "Premium", created_at: "2025-01-10T10:00:00Z" },
];

// Mock Clients
export const mockClients: Client[] = [
  { id: "1", name: "John Smith", phone: "123456789", client_id: "CLI001", created_at: "2025-01-02T10:00:00Z" },
  { id: "2", name: "Jane Doe", phone: "987654321", client_id: "CLI002", created_at: "2025-01-03T10:00:00Z" },
  { id: "3", name: "Mike Johnson", phone: "456789123", client_id: "CLI003", created_at: "2025-01-04T10:00:00Z" },
  { id: "4", name: "Sarah Williams", phone: "321654987", client_id: "CLI004", created_at: "2025-01-05T10:00:00Z" },
  { id: "5", name: "David Brown", phone: "789123456", client_id: "CLI005", created_at: "2025-01-06T10:00:00Z" },
];

// Generate today's date in ISO format
const today = new Date().toISOString().split('T')[0];

// Mock Reservations
export const mockReservations: Reservation[] = [
  { 
    id: "1", 
    client_id: "1", 
    court_id: "1", 
    date: today, 
    time_start: "09:00", 
    time_end: "10:00", 
    amount: 40, 
    payment_method: "cash", 
    created_at: "2025-04-30T08:30:00Z",
    client_name: "John Smith",
    court_name: "Court 1"
  },
  { 
    id: "2", 
    client_id: "2", 
    court_id: "2", 
    date: today, 
    time_start: "10:00", 
    time_end: "11:00", 
    amount: 40, 
    payment_method: "card", 
    created_at: "2025-05-01T09:30:00Z",
    client_name: "Jane Doe",
    court_name: "Court 2"
  },
  { 
    id: "3", 
    client_id: "3", 
    court_id: "3", 
    date: today, 
    time_start: "11:00", 
    time_end: "12:00", 
    amount: 35, 
    payment_method: "cash", 
    created_at: "2025-05-01T10:30:00Z",
    client_name: "Mike Johnson",
    court_name: "Court 3" 
  },
  { 
    id: "4", 
    client_id: "4", 
    court_id: "4", 
    date: "2025-05-04", 
    time_start: "16:00", 
    time_end: "17:00", 
    amount: 35, 
    payment_method: "card", 
    created_at: "2025-05-02T15:30:00Z",
    client_name: "Sarah Williams",
    court_name: "Court 4"
  },
  { 
    id: "5", 
    client_id: "5", 
    court_id: "5", 
    date: "2025-05-04", 
    time_start: "18:00", 
    time_end: "19:00", 
    amount: 50, 
    payment_method: "card", 
    created_at: "2025-05-02T17:30:00Z",
    client_name: "David Brown",
    court_name: "Court 5"
  },
];

// Mock Expenses
export const mockExpenses: Expense[] = [
  { id: "1", title: "Electricity", amount: 150, date: "2025-05-01", created_at: "2025-05-01T12:00:00Z" },
  { id: "2", title: "Water", amount: 80, date: "2025-05-01", created_at: "2025-05-01T12:05:00Z" },
  { id: "3", title: "Court maintenance", amount: 200, date: today, created_at: "2025-05-03T09:00:00Z" },
  { id: "4", title: "Staff salary", amount: 1200, date: "2025-04-30", created_at: "2025-04-30T16:00:00Z" },
  { id: "5", title: "Equipment", amount: 350, date: "2025-04-25", created_at: "2025-04-25T11:30:00Z" },
];

// Mock Transactions (derived from reservations)
export const mockTransactions: Transaction[] = mockReservations.map(res => ({
  id: res.id,
  reservation_id: res.id,
  amount: res.amount,
  payment_method: res.payment_method,
  date: res.date,
  created_at: res.created_at
}));

// Helper function to get today's revenue
export const getTodayRevenue = () => {
  return mockReservations
    .filter(res => res.date === today)
    .reduce((sum, res) => sum + res.amount, 0);
};

// Helper function to get today's expenses
export const getTodayExpenses = () => {
  return mockExpenses
    .filter(exp => exp.date === today)
    .reduce((sum, exp) => sum + exp.amount, 0);
};

// Helper function to get total revenue
export const getTotalRevenue = () => {
  return mockReservations.reduce((sum, res) => sum + res.amount, 0);
};

// Helper function to get total expenses
export const getTotalExpenses = () => {
  return mockExpenses.reduce((sum, exp) => sum + exp.amount, 0);
};

// Helper function to get net profit
export const getNetProfit = () => {
  return getTotalRevenue() - getTotalExpenses();
};
