import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, convertPersianDigits } from './lib/utils';
import { translations } from './lib/translations';
import { RoznamchaEntry, KataTransaction, KataSummary, StockEntry, Stats, Language, Customer } from './types';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Roznamcha from './pages/Roznamcha';
import Kata from './pages/Kata';
import Stock from './pages/Stock';
import Settings from './pages/Settings';
import Customers from './pages/Customers';
import Backup from './pages/Backup';
import Reports from './pages/Reports';
import Login from './pages/Login';
import DeveloperDashboard from './pages/DeveloperDashboard';
import LicenseGuard from './components/LicenseGuard';
import CustomerSelect from './components/CustomerSelect';
import NumericInput from './components/NumericInput';
import SmartInput from './components/SmartInput';
import { ShamsiDatePicker } from './components/ShamsiDatePicker';
import { formatShamsi } from './lib/shamsi';
import { User as UserType } from './types';

export default function App() {
  return (
    <LicenseGuard>
      <AppContent />
    </LicenseGuard>
  );
}

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      localStorage.removeItem('shop_mis_user_session');
      const saved = sessionStorage.getItem('shop_mis_user_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        return !!(parsed && parsed.username);
      }
    } catch (e) {
      return false;
    }
    return false;
  });
  const [user, setUser] = useState<UserType | null>(() => {
    try {
      const saved = sessionStorage.getItem('shop_mis_user_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.username) return parsed;
      }
    } catch (e) {
      return null;
    }
    return null;
  });
  const [shopInfo, setShopInfo] = useState({
    name: 'Kabul Electronics',
    address: 'Jade-e-Maiwand, Kabul, Afghanistan'
  });
  const [adminSettings, setAdminSettings] = useState({
    username: 'admin',
    password: 'NewCode@ShopMIS'
  });
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const saved = sessionStorage.getItem('shop_mis_user_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.role === 'developer') return 'developer';
      }
    } catch (e) {}
    return 'dashboard';
  });
  const [language, setLanguage] = useState<Language>('en');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [stats, setStats] = useState<Stats>({ totalIncome: 0, totalExpense: 0, totalStockIn: 0, totalStockOut: 0, balance: 0 });
  const [roznamcha, setRoznamcha] = useState<RoznamchaEntry[]>([]);
  const [kataTransactions, setKataTransactions] = useState<KataTransaction[]>([]);
  const [kataSummaries, setKataSummaries] = useState<KataSummary[]>([]);
  const [stock, setStock] = useState<StockEntry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | undefined>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<number | null>(null);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [entryDateValue, setEntryDateValue] = useState<string>(new Date().toISOString().split('T')[0]);
  const [modalErrors, setModalErrors] = useState<Record<string, string>>({});
  const [customerModalError, setCustomerModalError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [billFilter, setBillFilter] = useState('');
  const [isTabLoading, setIsTabLoading] = useState(false);
  const isTabLoadingRef = React.useRef(false);
  const currentAbortController = React.useRef<AbortController | null>(null);
  const isSubmittingRef = React.useRef(false);
  const recentSubmissionsRef = React.useRef<{ key: string; timestamp: number }[]>([]);

  const t = translations[language];
  const isRTL = language === 'ps' || language === 'dr';

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    fetchInitialData();
  }, [language, isRTL, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTabData(activeTab);
    }
    return () => {
      if (currentAbortController.current) {
        currentAbortController.current.abort();
      }
    };
  }, [isAuthenticated, activeTab]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleLogin = (user: UserType) => {
    setIsAuthenticated(true);
    setUser(user);
    try {
      sessionStorage.setItem('shop_mis_user_session', JSON.stringify(user));
      localStorage.removeItem('shop_mis_user_session');
    } catch (e) {}
    if (user.role === 'developer') {
      setActiveTab('developer');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    try {
      sessionStorage.removeItem('shop_mis_user_session');
      localStorage.removeItem('shop_mis_user_session');
    } catch (e) {}
    setActiveTab('dashboard');
  };

  const fetchInitialData = async () => {
    try {
      if (window.electronAPI) {
        const [shopInfoData, adminUserData, customersData] = await Promise.all([
          window.electronAPI.getSettings(),
          window.electronAPI.getAdminUser ? window.electronAPI.getAdminUser() : Promise.resolve(null),
          window.electronAPI.getCustomers()
        ]);
        const shopInfoRow = shopInfoData?.find((s: any) => s.key === 'shop_info');
        if (shopInfoRow) {
          try {
            const parsed = typeof shopInfoRow.value === 'string' ? JSON.parse(shopInfoRow.value) : shopInfoRow.value;
            if (parsed && (parsed.name || parsed.address)) setShopInfo(parsed);
          } catch (e) {
            console.error('Failed to parse shop_info:', e);
          }
        }
        if (adminUserData && adminUserData.username) {
          setAdminSettings({
            username: adminUserData.username,
            password: adminUserData.password || ''
          });
        }
        if (Array.isArray(customersData)) setCustomers(customersData);
      } else {
        const timestamp = Date.now();
        const [shopRes, adminRes, custRes] = await Promise.all([
          fetch(`/api/settings/shop_info?t=${timestamp}`),
          fetch(`/api/users/admin?t=${timestamp}`),
          fetch(`/api/customers?t=${timestamp}`)
        ]);

        if (shopRes.ok) {
          const shopData = await shopRes.json();
          if (shopData && (shopData.name || shopData.address)) setShopInfo(shopData);
        }
        if (adminRes.ok) {
          const adminData = await adminRes.json();
          if (adminData && adminData.username) {
            setAdminSettings({ username: adminData.username, password: adminData.password || '' });
          }
        }
        if (custRes.ok) {
          const custData = await custRes.json();
          if (Array.isArray(custData)) setCustomers(custData);
        }
      }
    } catch (err) {
      console.error('Error fetching initial data:', err);
    }
  };

  const fetchTabData = async (tab: string) => {
    if (currentAbortController.current) {
      currentAbortController.current.abort();
    }
    const controller = new AbortController();
    currentAbortController.current = controller;
    const signal = controller.signal;

    setIsTabLoading(true);
    const timestamp = Date.now();

    try {
      if (window.electronAPI) {
        if (tab === 'dashboard') {
          const [statsData, rozData] = await Promise.all([
            window.electronAPI.getStats(),
            window.electronAPI.getRoznamcha()
          ]);
          if (!signal.aborted) {
            setStats(statsData);
            setRoznamcha(rozData || []);
          }
        } else if (tab === 'roznamcha') {
          const rozData = await window.electronAPI.getRoznamcha();
          if (!signal.aborted) setRoznamcha(rozData || []);
        } else if (tab === 'kata') {
          const [kataTransData, kataSumData] = await Promise.all([
            window.electronAPI.getKataTransactions(),
            window.electronAPI.getKataSummaries()
          ]);
          if (!signal.aborted) {
            setKataTransactions(kataTransData || []);
            setKataSummaries(kataSumData || []);
          }
        } else if (tab === 'stock') {
          const stockData = await window.electronAPI.getStock();
          if (!signal.aborted) setStock(stockData || []);
        } else if (tab === 'customers') {
          const customersData = await window.electronAPI.getCustomers();
          if (!signal.aborted) setCustomers(customersData || []);
        } else if (tab === 'settings') {
          const [shopInfoData, adminUserData] = await Promise.all([
            window.electronAPI.getSettings(),
            window.electronAPI.getAdminUser ? window.electronAPI.getAdminUser() : Promise.resolve(null)
          ]);
          if (!signal.aborted) {
            const shopInfo = shopInfoData?.find((s: any) => s.key === 'shop_info');
            if (shopInfo) setShopInfo(JSON.parse(shopInfo.value));
            if (adminUserData && adminUserData.username) {
              setAdminSettings({ username: adminUserData.username, password: adminUserData.password || '' });
            }
          }
        } else if (tab === 'backup' || tab === 'reports') {
          const [rozData, kataTransData, kataSumData, stockData, customersData] = await Promise.all([
            window.electronAPI.getRoznamcha(),
            window.electronAPI.getKataTransactions(),
            window.electronAPI.getKataSummaries ? window.electronAPI.getKataSummaries() : Promise.resolve([]),
            window.electronAPI.getStock(),
            window.electronAPI.getCustomers()
          ]);
          if (!signal.aborted) {
            setRoznamcha(rozData || []);
            setKataTransactions(kataTransData || []);
            setKataSummaries(kataSumData || []);
            setStock(stockData || []);
            setCustomers(customersData || []);
          }
        }
      } else {
        if (tab === 'dashboard') {
          const [statsRes, rozRes] = await Promise.all([
            fetch(`/api/stats?t=${timestamp}`, { signal }),
            fetch(`/api/roznamcha?t=${timestamp}`, { signal })
          ]);
          if (!signal.aborted) {
            if (statsRes.ok) {
              const statsData = await statsRes.json();
              setStats(statsData || {});
            }
            if (rozRes.ok) {
              const rozData = await rozRes.json();
              setRoznamcha(Array.isArray(rozData) ? rozData : []);
            }
          }
        } else if (tab === 'roznamcha') {
          const res = await fetch(`/api/roznamcha?t=${timestamp}`, { signal });
          if (res.ok) {
            const rozData = await res.json();
            if (!signal.aborted) setRoznamcha(Array.isArray(rozData) ? rozData : []);
          }
        } else if (tab === 'kata') {
          const [transRes, sumRes] = await Promise.all([
            fetch(`/api/kata/transactions?t=${timestamp}`, { signal }),
            fetch(`/api/kata/summaries?t=${timestamp}`, { signal })
          ]);
          if (!signal.aborted) {
            if (transRes.ok) {
              const transData = await transRes.json();
              setKataTransactions(Array.isArray(transData) ? transData : []);
            }
            if (sumRes.ok) {
              const sumData = await sumRes.json();
              setKataSummaries(Array.isArray(sumData) ? sumData : []);
            }
          }
        } else if (tab === 'stock') {
          const res = await fetch(`/api/stock?t=${timestamp}`, { signal });
          if (res.ok) {
            const stockData = await res.json();
            if (!signal.aborted) setStock(Array.isArray(stockData) ? stockData : []);
          }
        } else if (tab === 'customers') {
          const res = await fetch(`/api/customers?t=${timestamp}`, { signal });
          if (res.ok) {
            const customersData = await res.json();
            if (!signal.aborted) setCustomers(Array.isArray(customersData) ? customersData : []);
          }
        } else if (tab === 'settings') {
          const [shopRes, adminRes] = await Promise.all([
            fetch(`/api/settings/shop_info?t=${timestamp}`, { signal }),
            fetch(`/api/users/admin?t=${timestamp}`, { signal })
          ]);
          if (!signal.aborted) {
            if (shopRes.ok) {
              const shopData = await shopRes.json();
              if (shopData) setShopInfo(shopData);
            }
            if (adminRes.ok) {
              const adminData = await adminRes.json();
              if (adminData && adminData.username) {
                setAdminSettings({ username: adminData.username, password: adminData.password || '' });
              }
            }
          }
        } else if (tab === 'backup' || tab === 'reports') {
          const [rozRes, kataRes, sumRes, stockRes, custRes] = await Promise.all([
            fetch(`/api/roznamcha?t=${timestamp}`, { signal }),
            fetch(`/api/kata/transactions?t=${timestamp}`, { signal }),
            fetch(`/api/kata/summaries?t=${timestamp}`, { signal }),
            fetch(`/api/stock?t=${timestamp}`, { signal }),
            fetch(`/api/customers?t=${timestamp}`, { signal })
          ]);
          if (!signal.aborted) {
            if (rozRes.ok) setRoznamcha(await rozRes.json());
            if (kataRes.ok) setKataTransactions(await kataRes.json());
            if (sumRes.ok) setKataSummaries(await sumRes.json());
            if (stockRes.ok) setStock(await stockRes.json());
            if (custRes.ok) setCustomers(await custRes.json());
          }
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error(`Error fetching tab ${tab}:`, error);
      }
    } finally {
      if (!signal.aborted) {
        setIsTabLoading(false);
      }
    }
  };

  const handleUpdateShopInfo = async (newShopInfo: typeof shopInfo) => {
    setShopInfo(newShopInfo);
    try {
      if (window.electronAPI) {
        await window.electronAPI.setSetting('shop_info', newShopInfo);
      } else {
        await fetch('/api/settings/shop_info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newShopInfo)
        });
      }
    } catch (e) {
      console.error('Failed to update shop info in DB:', e);
    }
  };

  const handleUpdateAdminSettings = async (newSettings: typeof adminSettings) => {
    const trimmedUsername = newSettings.username.trim();
    const trimmedPassword = newSettings.password.trim();

    if (!trimmedUsername || !trimmedPassword) {
      setNotification({ message: 'Username and password cannot be empty', type: 'error' });
      return;
    }

    setAdminSettings({ username: trimmedUsername, password: trimmedPassword });

    try {
      let targetUserId = (user && user.id > 0) ? user.id : 0;
      if (!targetUserId) {
        if (window.electronAPI?.getAdminUser) {
          const adminUserData = await window.electronAPI.getAdminUser();
          if (adminUserData?.id) targetUserId = adminUserData.id;
        } else {
          const res = await fetch('/api/users/admin');
          if (res.ok) {
            const adminUserData = await res.json();
            if (adminUserData?.id) targetUserId = adminUserData.id;
          }
        }
      }
      if (!targetUserId) targetUserId = 1;

      const payload = {
        username: trimmedUsername,
        password: trimmedPassword,
        role: 'admin',
        language: language
      };

      if (window.electronAPI) {
        await window.electronAPI.updateUser(targetUserId, payload);
      } else {
        await fetch(`/api/users/${targetUserId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (user) {
        setUser(prev => prev ? { ...prev, username: trimmedUsername } : null);
      }

      setNotification({ message: t.success_save || 'Settings saved successfully', type: 'success' });
    } catch (e) {
      console.error('Failed to update admin credentials:', e);
      setNotification({ message: 'Failed to update credentials', type: 'error' });
    }
  };

  const handleAddEntry = async (data: any) => {
    if (isSubmittingRef.current) return;

    const entryData = { ...data, date: data.date || (editingEntry ? editingEntry.date : new Date().toISOString()) };
    
    // Strict customer validation for roznamcha and kata
    if (activeTab === 'roznamcha' || activeTab === 'kata') {
      const custId = entryData.customer_id ? Number(entryData.customer_id) : 0;
      if (!custId || isNaN(custId) || custId <= 0) {
        setNotification({ 
          message: t.error_customer_required || t.customer_required || 'Customer selection is required', 
          type: 'error' 
        });
        return;
      }
    }

    // Client-side debounce & duplicate prevention: check if identical record was submitted within last 5 seconds
    const datePart = (entryData.date || '').split('T')[0];
    const submissionKey = `${activeTab}_${entryData.customer_id || ''}_${entryData.type || ''}_${entryData.amount || ''}_${entryData.currency || 'AFN'}_${datePart}_${(entryData.bill_number || '').trim()}_${(entryData.description || '').trim()}_${(entryData.item_name || '').trim()}`;
    const now = Date.now();
    
    // Clean old records older than 10 seconds
    recentSubmissionsRef.current = recentSubmissionsRef.current.filter(item => now - item.timestamp < 10000);

    if (!editingEntry) {
      const isDuplicate = recentSubmissionsRef.current.some(
        item => item.key === submissionKey && (now - item.timestamp < 5000)
      );
      if (isDuplicate) {
        setNotification({ 
          message: t.error_duplicate_record || 'Duplicate transaction prevented. Record already saved.', 
          type: 'error' 
        });
        return;
      }
    }

    recentSubmissionsRef.current.push({ key: submissionKey, timestamp: now });
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      if (window.electronAPI) {
        if (editingEntry) {
          if (activeTab === 'roznamcha') await window.electronAPI.updateRoznamcha(editingEntry.id, entryData);
          else if (activeTab === 'kata') await window.electronAPI.updateKataTransaction(editingEntry.id, entryData);
          else if (activeTab === 'stock') await window.electronAPI.updateStock(editingEntry.id, entryData);
        } else {
          if (activeTab === 'roznamcha') await window.electronAPI.createRoznamcha(entryData);
          else if (activeTab === 'kata') await window.electronAPI.createKataTransaction(entryData);
          else if (activeTab === 'stock') await window.electronAPI.createStock(entryData);
        }
      } else {
        let endpoint = '';
        if (activeTab === 'roznamcha') endpoint = '/api/roznamcha';
        else if (activeTab === 'kata') endpoint = '/api/kata/transactions';
        else if (activeTab === 'stock') endpoint = '/api/stock';

        if (editingEntry) {
          const res = await fetch(`${endpoint}/${editingEntry.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entryData)
          });
          if (!res.ok) {
            const errJson = await res.json();
            throw new Error(errJson.error || 'Failed to update entry');
          }
        } else {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entryData)
          });
          if (!res.ok) {
            const errJson = await res.json();
            throw new Error(errJson.error || 'Failed to create entry');
          }
        }
      }
      setIsModalOpen(false);
      setEditingEntry(null);
      setModalErrors({});
      await fetchTabData(activeTab);
      setNotification({ message: t.success_save || 'Saved successfully', type: 'success' });
    } catch (error: any) {
      console.error('Error saving entry:', error);
      setNotification({ message: error.message || 'Error saving entry', type: 'error' });
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntry = async (id: number) => {
    setEntryToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (entryToDelete === null) return;

    try {
      if (window.electronAPI) {
        if (activeTab === 'roznamcha') await window.electronAPI.deleteRoznamcha(entryToDelete);
        else if (activeTab === 'kata') await window.electronAPI.deleteKataTransaction(entryToDelete);
        else if (activeTab === 'stock') await window.electronAPI.deleteStock(entryToDelete);
        else if (activeTab === 'customers') await window.electronAPI.deleteCustomer(entryToDelete);
      } else {
        let endpoint = '';
        if (activeTab === 'roznamcha') endpoint = `/api/roznamcha/${entryToDelete}`;
        else if (activeTab === 'kata') endpoint = `/api/kata/transactions/${entryToDelete}`;
        else if (activeTab === 'stock') endpoint = `/api/stock/${entryToDelete}`;
        else if (activeTab === 'customers') endpoint = `/api/customers/${entryToDelete}`;

        const res = await fetch(endpoint, { method: 'DELETE' });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to delete');
        }
      }
      setIsDeleteModalOpen(false);
      setEntryToDelete(null);
      await fetchTabData(activeTab);
      if (activeTab === 'customers') {
        await fetchInitialData();
      }
      setNotification({ 
        message: activeTab === 'customers' ? ((t as any).success_delete || 'Customer deleted successfully') : ((t as any).success_delete || 'Deleted successfully'), 
        type: 'success' 
      });
    } catch (error: any) {
      console.error('Error deleting:', error);
      setNotification({ message: error.message || 'Failed to delete', type: 'error' });
    }
  };

  const handleEditEntry = (entry: any) => {
    setEditingEntry(entry);
    setEntryDateValue(entry?.date ? entry.date : new Date().toISOString().split('T')[0]);
    if (entry.customer_id) {
      setSelectedCustomerId(entry.customer_id);
    } else {
      setSelectedCustomerId(undefined);
    }
    setIsModalOpen(true);
  };

  const validateModal = (formData: FormData) => {
    const newErrors: Record<string, string> = {};
    
    if (activeTab === 'roznamcha') {
      const amount = formData.get('amount') as string;
      const targetCustomerId = selectedCustomerId || editingEntry?.customer_id;
      if (!targetCustomerId || Number(targetCustomerId) <= 0) {
        newErrors.customer_id = t.error_customer_required || t.customer_required || 'Customer is required';
      }
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        newErrors.amount = t.error_invalid_amount || 'Invalid amount';
      }
    } else if (activeTab === 'kata') {
      const amount = formData.get('amount') as string;
      const type = formData.get('type') as string;
      const targetCustomerId = selectedCustomerId || editingEntry?.customer_id;
      if (!targetCustomerId || Number(targetCustomerId) <= 0) {
        newErrors.customer_id = t.error_customer_required || t.customer_required || 'Customer is required';
      }
      if (!type) newErrors.type = (t as any).type_required || 'Type is required';
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        newErrors.amount = t.error_invalid_amount || 'Invalid amount';
      }
    } else if (activeTab === 'stock') {
      const item = formData.get('item_name') as string;
      const type = formData.get('type') as string;
      const qty = formData.get('quantity') as string;
      if (!item || item.trim().length < 2) newErrors.item_name = t.error_invalid_item_name || 'Invalid item name';
      if (!type) newErrors.type = 'Type is required';
      if (!qty || isNaN(Number(qty)) || Number(qty) <= 0) newErrors.quantity = t.error_invalid_quantity || 'Invalid quantity';
    }

    setModalErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleModalSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmittingRef.current || isSubmitting) return;

    const formData = new FormData(e.currentTarget);
    if (!validateModal(formData)) return;
    
    const data = Object.fromEntries(formData.entries());
    
    if (activeTab === 'kata') {
      const targetCustomerId = selectedCustomerId || editingEntry?.customer_id;
      const customer = customers.find(c => c.id === targetCustomerId);
      data.customer_id = targetCustomerId as any;
      data.customer_name = customer?.name || '';
    } else if (activeTab === 'roznamcha') {
      const targetCustomerId = selectedCustomerId || editingEntry?.customer_id;
      if (targetCustomerId) {
        data.customer_id = targetCustomerId as any;
      }
    }
    
    await handleAddEntry(data);
    setSelectedCustomerId(undefined);
  };

  const handleDeleteCustomer = (id: number) => {
    setEntryToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleCustomerSubmit = async (data: any) => {
    if (isSubmittingRef.current || isSubmitting) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setCustomerModalError(null);
    try {
      // Local check for unique name
      const nameExists = customers.some(c => 
        c.name.toLowerCase() === data.name.toLowerCase() && 
        (!editingCustomer || c.id !== editingCustomer.id)
      );
      
      if (nameExists) {
        setCustomerModalError(t.error_customer_exists || 'Customer name already exists');
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        return;
      }

      if (window.electronAPI) {
        if (editingCustomer) {
          await window.electronAPI.updateCustomer(editingCustomer.id, data);
        } else {
          await window.electronAPI.createCustomer(data);
        }
      } else {
        const method = editingCustomer ? 'PUT' : 'POST';
        const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : '/api/customers';
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        if (!res.ok) {
          const errData = await res.json();
          if (res.status === 400 && errData.error === 'Customer name already exists') {
            setCustomerModalError(t.error_customer_exists || 'Customer name already exists');
            return;
          }
          throw new Error(errData.error || 'Failed to save customer');
        }
      }
      setIsCustomerModalOpen(false);
      setEditingCustomer(null);
      setCustomerModalError(null);
      setSearchQuery(''); // Clear search to show new customer
      await fetchTabData('customers');
      await fetchInitialData();
      setNotification({ message: t.success_save || 'Saved successfully', type: 'success' });
    } catch (error: any) {
      console.error('Error saving customer:', error);
      setCustomerModalError(error.message || 'An error occurred while saving');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleRestore = async (data: any) => {
    try {
      setRoznamcha(data.roznamcha || []);
      setCustomers(data.customers || []);
      setKataTransactions(data.kataTransactions || []);
      setStock(data.stock || []);
      if (data.shopInfo) {
        await handleUpdateShopInfo(data.shopInfo);
      }
      if (data.adminSettings) {
        await handleUpdateAdminSettings(data.adminSettings);
      }
      await fetchInitialData();
      await fetchTabData(activeTab);
    } catch (error) {
      console.error('Restore failed:', error);
      throw error;
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            stats={stats} 
            roznamcha={roznamcha} 
            t={t} 
            onRefresh={async () => {
              await fetchInitialData();
              await fetchTabData('dashboard');
            }}
          />
        );
      case 'roznamcha':
        return (
          <Roznamcha 
            data={roznamcha} 
            customers={customers}
            t={t} 
            query={searchQuery} 
            dateFilter={dateFilter}
            billFilter={billFilter}
            isAdmin={user?.role === 'admin' || user?.role === 'developer'}
            onAdd={handleAddEntry} 
            onEdit={handleEditEntry}
            onDelete={handleDeleteEntry}
          />
        );
      case 'kata':
        return (
          <Kata 
            transactions={kataTransactions}
            summaries={kataSummaries}
            customers={customers}
            t={t} 
            query={searchQuery} 
            dateFilter={dateFilter}
            billFilter={billFilter}
            onAdd={handleAddEntry} 
            onAddClick={() => {
              setEditingEntry(null);
              setIsModalOpen(true);
            }}
            onEdit={handleEditEntry}
            onDelete={handleDeleteEntry}
          />
        );
      case 'customers':
        return (
          <Customers 
            t={t} 
            query={searchQuery} 
            customers={customers}
            onAdd={() => {
              setEditingCustomer(null);
              setCustomerModalError(null);
              setIsCustomerModalOpen(true);
            }}
            onEdit={(c) => {
              setEditingCustomer(c);
              setCustomerModalError(null);
              setIsCustomerModalOpen(true);
            }}
            onDelete={handleDeleteCustomer}
          />
        );
      case 'backup':
        return (
          <Backup 
            roznamcha={roznamcha}
            customers={customers}
            kataTransactions={kataTransactions}
            stock={stock}
            shopInfo={shopInfo}
            adminSettings={adminSettings}
            t={t}
            onRestore={handleRestore}
            onNotify={(msg, type) => setNotification({ message: msg, type })}
          />
        );
      case 'reports':
        return (
          <Reports
            roznamchaData={roznamcha}
            kataTransactions={kataTransactions}
            kataSummaries={kataSummaries}
            stockData={stock}
            customers={customers}
            t={t}
            shopName={shopInfo.name}
            shopAddress={shopInfo.address}
          />
        );
      case 'developer':
        return <DeveloperDashboard t={t} onNotify={(msg, type) => setNotification({ message: msg, type: type })} />;
      case 'stock':
        return (
          <Stock 
            data={stock} 
            t={t} 
            query={searchQuery} 
            dateFilter={dateFilter}
            billFilter={billFilter}
            onAdd={handleAddEntry} 
            onEdit={handleEditEntry}
            onDelete={handleDeleteEntry}
          />
        );
      case 'settings':
        return (
          <Settings 
            language={language} 
            setLanguage={setLanguage} 
            theme={theme} 
            toggleTheme={toggleTheme} 
            t={t}
            shopInfo={shopInfo}
            setShopInfo={handleUpdateShopInfo}
            adminSettings={adminSettings}
            setAdminSettings={handleUpdateAdminSettings}
            fetchData={async () => {
              await fetchInitialData();
              await fetchTabData('settings');
            }}
          />
        );
      default:
        return (
          <Dashboard 
            stats={stats} 
            roznamcha={roznamcha} 
            t={t} 
            onRefresh={async () => {
              await fetchInitialData();
              await fetchTabData('dashboard');
            }}
          />
        );
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} t={t} language={language} />;
  }

  return (
    <div className="relative min-h-screen">
      <MainLayout
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        language={language}
        setLanguage={setLanguage}
        t={t}
        theme={theme}
        toggleTheme={toggleTheme}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        billFilter={billFilter}
        setBillFilter={setBillFilter}
        onAddEntry={activeTab !== 'dashboard' && activeTab !== 'settings' && activeTab !== 'kata' && activeTab !== 'backup' ? () => {
          if (activeTab === 'customers') {
            setEditingCustomer(null);
            setIsCustomerModalOpen(true);
          } else {
            setEditingEntry(null);
            setEntryDateValue(new Date().toISOString().split('T')[0]);
            setIsModalOpen(true);
          }
        } : undefined}
        onLogout={handleLogout}
        shopName={shopInfo.name}
        shopAddress={shopInfo.address}
        userName={user?.username || 'Admin'}
        userRole={user?.role || 'admin'}
      >
        {isTabLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 via-blue-500 to-indigo-500 z-[250] animate-pulse origin-left"
          />
        )}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -50, x: '-50%' }}
              animate={{ opacity: 1, y: 20, x: '-50%' }}
              exit={{ opacity: 0, y: -50, x: '-50%' }}
              className={cn(
                "fixed top-0 left-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-bold",
                notification.type === 'success' ? "bg-green-500 text-white" : "bg-red-500 text-white"
              )}
            >
              {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              {notification.message}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </MainLayout>

      {/* Customer Modal */}
      <AnimatePresence>
        {isCustomerModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCustomerModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-[#1a1a1a] border border-[#262626] rounded-3xl p-8 w-full max-w-2xl relative z-[101] shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">{editingCustomer ? t.edit_customer : t.add_customer}</h2>
                <button onClick={() => setIsCustomerModalOpen(false)} className="p-2 hover:bg-[#262626] rounded-lg">
                  <X size={20} />
                </button>
              </div>

              {customerModalError && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500">
                  <AlertCircle size={20} />
                  <span className="text-sm font-bold">{customerModalError}</span>
                </div>
              )}

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleCustomerSubmit({
                    name: formData.get('name'),
                    address: formData.get('address'),
                    contact: formData.get('contact')
                  });
                }} 
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">{t.customer_name} *</label>
                    <input
                      name="name"
                      type="text"
                      defaultValue={editingCustomer?.name || ''}
                      className="w-full bg-[#0d0d0d] border border-[#262626] rounded-xl p-3 focus:border-blue-500 outline-none transition-colors"
                      placeholder="Enter full name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <SmartInput
                      name="contact"
                      type="text"
                      defaultValue={editingCustomer?.contact || ''}
                      label={t.customer_contact}
                      placeholder="Enter phone number"
                      className="bg-[#0d0d0d] border-[#262626]"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">{t.customer_address}</label>
                    <textarea
                      name="address"
                      defaultValue={editingCustomer?.address || ''}
                      className="w-full bg-[#0d0d0d] border border-[#262626] rounded-xl p-3 focus:border-blue-500 outline-none h-24 resize-none transition-colors"
                      placeholder="Enter address"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setIsCustomerModalOpen(false)}
                    className="flex-1 px-6 py-3 rounded-xl border border-[#262626] hover:bg-[#262626] transition-colors font-bold"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={cn(
                      "flex-1 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2",
                      isSubmitting && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : t.save}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Entry Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsModalOpen(false);
                setEditingEntry(null);
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-[#1a1a1a] border border-[#262626] rounded-3xl p-8 w-full max-w-4xl relative z-[101] shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold tracking-tight">{editingEntry ? t.edit_entry : t.add_entry}</h2>
                <motion.button 
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingEntry(null);
                  }} 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </motion.button>
              </div>
              
              <form onSubmit={handleModalSubmit} className="space-y-6">
                <motion.div 
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.05
                      }
                    }
                  }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  <motion.div variants={{ hidden: { x: -10, opacity: 0 }, visible: { x: 0, opacity: 1 } }}>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">{t.date}</label>
                    <ShamsiDatePicker
                      value={entryDateValue}
                      onChange={(gregStr) => setEntryDateValue(gregStr)}
                      lang={language === 'ps' ? 'ps' : language === 'dr' ? 'dr' : 'en'}
                    />
                    <input type="hidden" name="date" value={entryDateValue} />
                  </motion.div>

                  {activeTab === 'roznamcha' && (
                    <>
                      <motion.div variants={{ hidden: { x: -10, opacity: 0 }, visible: { x: 0, opacity: 1 } }}>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">{t.type}</label>
                        <select 
                          name="type" 
                          defaultValue={editingEntry?.type || 'income'}
                          className="w-full bg-[#0d0d0d] border border-[#262626] rounded-xl p-3 focus:border-blue-500 outline-none transition-colors"
                        >
                          <option value="income">{t.income}</option>
                          <option value="expense">{t.expense}</option>
                        </select>
                      </motion.div>
                      <motion.div variants={{ hidden: { x: -10, opacity: 0 }, visible: { x: 0, opacity: 1 } }}>
                        <CustomerSelect 
                          customers={customers}
                          selectedId={selectedCustomerId || editingEntry?.customer_id}
                          onSelect={(c) => setSelectedCustomerId(c.id)}
                          onQuickAdd={() => {
                            setIsModalOpen(false);
                            setActiveTab('customers');
                          }}
                          t={t}
                          error={modalErrors.customer_id}
                        />
                      </motion.div>
                      <motion.div variants={{ hidden: { x: -10, opacity: 0 }, visible: { x: 0, opacity: 1 } }}>
                        <NumericInput 
                          name="amount" 
                          required 
                          defaultValue={editingEntry?.amount || ''}
                          label={t.amount}
                          error={modalErrors.amount}
                          className="bg-[#0d0d0d] border-[#262626]"
                        />
                      </motion.div>
                      <motion.div variants={{ hidden: { x: -10, opacity: 0 }, visible: { x: 0, opacity: 1 } }}>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">{t.currency || 'Currency'}</label>
                        <select 
                          name="currency" 
                          defaultValue={editingEntry?.currency || 'AFN'}
                          className="w-full bg-[#0d0d0d] border border-[#262626] rounded-xl p-3 focus:border-blue-500 outline-none transition-colors text-sm font-bold"
                        >
                          <option value="AFN">{t.afn || 'AFN (افغانی)'}</option>
                          <option value="USD">{t.usd || 'USD ($) (دالر)'}</option>
                          <option value="EUR">{t.eur || 'EUR (€) (یورو)'}</option>
                          <option value="PKR">{t.pkr || 'PKR (₨) (کلدار)'}</option>
                        </select>
                      </motion.div>
                    </>
                  )}

                  {activeTab === 'kata' && (
                    <>
                      <motion.div variants={{ hidden: { x: -10, opacity: 0 }, visible: { x: 0, opacity: 1 } }}>
                        <CustomerSelect 
                          customers={customers}
                          selectedId={selectedCustomerId || editingEntry?.customer_id}
                          onSelect={(c) => setSelectedCustomerId(c.id)}
                          onQuickAdd={() => {
                            setIsModalOpen(false);
                            setActiveTab('customers');
                          }}
                          t={t}
                          error={modalErrors.customer_id}
                        />
                      </motion.div>
                      <motion.div variants={{ hidden: { x: -10, opacity: 0 }, visible: { x: 0, opacity: 1 } }}>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">{t.type}</label>
                        <select 
                          name="type" 
                          required 
                          defaultValue={editingEntry?.type || 'purchase'}
                          className={cn(
                            "w-full bg-[#0d0d0d] border border-[#262626] rounded-xl p-3 focus:border-blue-500 outline-none transition-colors",
                            modalErrors.type && "border-red-500 focus:border-red-500"
                          )}
                        >
                          <option value="purchase">{t.purchase || 'Purchase'}</option>
                          <option value="payment">{t.payment || 'Payment'}</option>
                        </select>
                        {modalErrors.type && <p className="text-[10px] text-red-500 font-bold mt-1">{modalErrors.type}</p>}
                      </motion.div>
                      <motion.div variants={{ hidden: { x: -10, opacity: 0 }, visible: { x: 0, opacity: 1 } }}>
                        <NumericInput 
                          name="amount" 
                          required 
                          defaultValue={editingEntry?.amount || ''}
                          label={t.amount}
                          error={modalErrors.amount}
                          className="bg-[#0d0d0d] border-[#262626]"
                        />
                      </motion.div>
                      <motion.div variants={{ hidden: { x: -10, opacity: 0 }, visible: { x: 0, opacity: 1 } }}>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">{t.currency || 'Currency'}</label>
                        <select 
                          name="currency" 
                          defaultValue={editingEntry?.currency || 'AFN'}
                          className="w-full bg-[#0d0d0d] border border-[#262626] rounded-xl p-3 focus:border-blue-500 outline-none transition-colors text-sm font-bold"
                        >
                          <option value="AFN">{t.afn || 'AFN (افغانی)'}</option>
                          <option value="USD">{t.usd || 'USD ($) (دالر)'}</option>
                          <option value="EUR">{t.eur || 'EUR (€) (یورو)'}</option>
                          <option value="PKR">{t.pkr || 'PKR (₨) (کلدار)'}</option>
                        </select>
                      </motion.div>
                    </>
                  )}

                  {activeTab === 'stock' && (
                    <>
                      <motion.div variants={{ hidden: { x: -10, opacity: 0 }, visible: { x: 0, opacity: 1 } }}>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">{t.item_name}</label>
                        <input 
                          name="item_name" 
                          type="text" 
                          required 
                          defaultValue={editingEntry?.item_name || ''}
                          className={cn(
                            "w-full bg-[#0d0d0d] border border-[#262626] rounded-xl p-3 focus:border-blue-500 outline-none transition-colors",
                            modalErrors.item_name && "border-red-500 focus:border-red-500"
                          )} 
                        />
                        {modalErrors.item_name && <p className="text-[10px] text-red-500 font-bold mt-1">{modalErrors.item_name}</p>}
                      </motion.div>
                      <motion.div variants={{ hidden: { x: -10, opacity: 0 }, visible: { x: 0, opacity: 1 } }}>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">{t.type}</label>
                        <select 
                          name="type" 
                          defaultValue={editingEntry?.type || 'in'}
                          className="w-full bg-[#0d0d0d] border border-[#262626] rounded-xl p-3 focus:border-blue-500 outline-none transition-colors"
                        >
                          <option value="in">{t.stock_in}</option>
                          <option value="out">{t.stock_out}</option>
                        </select>
                      </motion.div>
                      <motion.div variants={{ hidden: { x: -10, opacity: 0 }, visible: { x: 0, opacity: 1 } }}>
                        <NumericInput 
                          name="quantity" 
                          required 
                          defaultValue={editingEntry?.quantity || ''}
                          label={t.quantity}
                          error={modalErrors.quantity}
                        />
                      </motion.div>
                    </>
                  )}

                  <motion.div variants={{ hidden: { x: -10, opacity: 0 }, visible: { x: 0, opacity: 1 } }}>
                    <SmartInput 
                      name="bill_number" 
                      defaultValue={editingEntry?.bill_number || ''}
                      label={t.bill_number}
                      className="bg-[#0d0d0d] border-[#262626]"
                    />
                  </motion.div>
                  <motion.div variants={{ hidden: { x: -10, opacity: 0 }, visible: { x: 0, opacity: 1 } }} className="lg:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">{t.description}</label>
                    <textarea 
                      name="description" 
                      defaultValue={editingEntry?.description || ''}
                      className={cn(
                        "w-full bg-[#0d0d0d] border border-[#262626] rounded-xl p-3 focus:border-blue-500 outline-none h-12 transition-colors resize-none",
                        modalErrors.description && "border-red-500 focus:border-red-500"
                      )} 
                    />
                    {modalErrors.description && <p className="text-[10px] text-red-500 font-bold mt-1">{modalErrors.description}</p>}
                  </motion.div>

                  <motion.div 
                    variants={{ hidden: { y: 10, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
                    className="lg:col-span-3 flex gap-3 pt-4"
                  >
                    <motion.button 
                      type="button" 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setIsModalOpen(false);
                        setEditingEntry(null);
                      }} 
                      className="flex-1 px-6 py-3 rounded-xl border border-[#262626] hover:bg-[#262626] transition-colors font-bold"
                    >
                      {t.cancel}
                    </motion.button>
                    <motion.button 
                      type="submit" 
                      disabled={isSubmitting}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "flex-1 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2",
                        isSubmitting && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          {(t as any).saving || 'Saving...'}
                        </>
                      ) : (
                        t.save
                      )}
                    </motion.button>
                  </motion.div>
                </motion.div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-[#1a1a1a] border border-[#262626] rounded-3xl p-8 w-full max-w-sm relative z-[111] shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <X size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">{(t as any).confirm_delete_title || t.delete}</h3>
              <p className="text-gray-400 mb-8">
                {activeTab === 'customers' 
                  ? (t.confirm_delete_customer_desc || 'Are you sure you want to delete this customer? All their kata history will also be removed.') 
                  : (t.confirm_delete || 'Are you sure you want to delete this entry?')}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 px-6 py-3 rounded-xl border border-[#262626] hover:bg-[#262626] transition-colors font-bold"
                >
                  {t.cancel}
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 transition-colors font-bold"
                >
                  {t.delete}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
