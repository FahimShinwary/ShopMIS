export type Language = 'en' | 'ps' | 'dr';
export type Currency = 'AFN' | 'USD' | 'EUR' | 'PKR';

export interface RoznamchaEntry {
  id: number;
  date: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  bill_number?: string;
  customer_id?: number;
  currency?: Currency;
}

export interface KataTransaction {
  id: number;
  customer_id: number;
  date: string;
  type: 'purchase' | 'payment';
  amount: number;
  bill_number?: string;
  description?: string;
  roznamcha_id?: number;
  currency?: Currency;
}

export interface KataSummary {
  customer_id: number;
  currency?: Currency;
  total_purchase: number;
  total_paid: number;
  remaining_balance: number;
  customer_name?: string; // Joined from customers table
}

export interface Customer {
  id: number;
  name: string;
  address: string;
  contact: string;
}

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'cashier' | 'developer';
  language: Language;
}

export interface StockEntry {
  id: number;
  item_name: string;
  date: string;
  type: 'in' | 'out';
  quantity: number;
  description: string;
  bill_number?: string;
}

export interface Stats {
  totalIncome: number;
  totalExpense: number;
  totalStockIn: number;
  totalStockOut: number;
  balance: number;
}

declare global {
  interface Window {
    electronAPI: {
      getStats: () => Promise<Stats>;
      getRoznamcha: () => Promise<RoznamchaEntry[]>;
      createRoznamcha: (entry: Omit<RoznamchaEntry, 'id'>) => Promise<{ id: number }>;
      updateRoznamcha: (id: number, entry: Omit<RoznamchaEntry, 'id'>) => Promise<{ success: boolean }>;
      deleteRoznamcha: (id: number) => Promise<{ success: boolean }>;
      
      getKataTransactions: (customerId?: number) => Promise<KataTransaction[]>;
      getKataSummaries: () => Promise<KataSummary[]>;
      createKataTransaction: (entry: Omit<KataTransaction, 'id'>) => Promise<{ id: number }>;
      updateKataTransaction: (id: number, entry: Omit<KataTransaction, 'id'>) => Promise<{ success: boolean }>;
      deleteKataTransaction: (id: number) => Promise<{ success: boolean }>;
      
      getStock: () => Promise<StockEntry[]>;
      createStock: (entry: Omit<StockEntry, 'id'>) => Promise<{ id: number }>;
      updateStock: (id: number, entry: Omit<StockEntry, 'id'>) => Promise<{ success: boolean }>;
      deleteStock: (id: number) => Promise<{ success: boolean }>;
      getSettings: () => Promise<{ key: string; value: any }[]>;
      setSetting: (key: string, value: any) => Promise<{ success: boolean }>;
      getDbLocation: () => Promise<{ dbPath: string; customFolder: string }>;
      setDbFolder: (folderPath: string) => Promise<{ success: boolean; error?: string; dbPath?: string; customFolder?: string }>;
      backup: () => Promise<{ success: boolean }>;
      restore: () => Promise<{ success: boolean; error?: string; canceled?: boolean }>;
      selectDirectory: () => Promise<string | null>;
      triggerAutoBackup: (folderPath?: string) => Promise<{ success: boolean; error?: string; filePath?: string }>;
      
      // License
      getLicenseStatus: () => Promise<{ activated: boolean }>;
      activateLicense: (key: string) => Promise<{ success: boolean }>;
      
      // Customers
      getCustomers: () => Promise<Customer[]>;
      createCustomer: (customer: Omit<Customer, 'id'>) => Promise<{ id: number }>;
      updateCustomer: (id: number, customer: Omit<Customer, 'id'>) => Promise<{ success: boolean }>;
      deleteCustomer: (id: number) => Promise<{ success: boolean }>;
      
      // Users & Auth
      getUsers: () => Promise<any[]>;
      getAdminUser: () => Promise<any>;
      createUser: (user: any) => Promise<{ id: number }>;
      updateUser: (id: number, user: any) => Promise<{ success: boolean }>;
      deleteUser: (id: number) => Promise<{ success: boolean }>;
      authenticate: (credentials: any) => Promise<User | null>;
      
      // Logs & Dev
      getLogs: () => Promise<any[]>;
      executeRaw: (query: string) => Promise<any>;
      exportJson: () => Promise<any>;
    };
  }
}
