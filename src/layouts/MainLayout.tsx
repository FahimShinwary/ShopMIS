import React from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  Package, 
  Settings as SettingsIcon, 
  ChevronLeft, 
  ChevronRight, 
  LogOut,
  ShieldAlert,
  Search,
  Plus,
  Sun,
  Moon,
  Languages,
  User,
  MapPin,
  Store,
  Database,
  PieChart,
  X
} from 'lucide-react';
import { motion } from 'motion/react';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';
import { cn, convertPersianDigits } from '../lib/utils';
import { Language } from '../types';

interface MainLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: any;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  dateFilter: { start: string; end: string };
  setDateFilter: (filter: { start: string; end: string }) => void;
  billFilter: string;
  setBillFilter: (filter: string) => void;
  onAddEntry?: () => void;
  onLogout: () => void;
  shopName: string;
  shopAddress: string;
  userName: string;
  userRole: 'admin' | 'cashier' | 'developer';
}

export default function MainLayout({
  children,
  activeTab,
  setActiveTab,
  isSidebarOpen,
  setIsSidebarOpen,
  language,
  setLanguage,
  t,
  theme,
  toggleTheme,
  searchQuery,
  setSearchQuery,
  dateFilter,
  setDateFilter,
  billFilter,
  setBillFilter,
  onAddEntry,
  onLogout,
  shopName,
  shopAddress,
  userName,
  userRole
}: MainLayoutProps) {
  const menuItems = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'roznamcha', label: t.roznamcha, icon: BookOpen },
    { id: 'customers', label: t.customers, icon: Users },
    { id: 'kata', label: t.kata, icon: BookOpen },
    { id: 'stock', label: t.stock, icon: Package },
    { id: 'reports', label: t.reports || 'Reports', icon: PieChart },
    { id: 'backup', label: t.backup_restore || 'Backup', icon: Database },
    { id: 'settings', label: t.settings, icon: SettingsIcon },
    ...(userRole === 'developer' ? [{ id: 'developer', label: 'Developer', icon: Database }] : []),
  ];

  const languages: { id: Language; label: string }[] = [
    { id: 'en', label: 'EN' },
    { id: 'ps', label: 'PS' },
    { id: 'dr', label: 'DR' },
  ];

  return (
    <div className="h-screen flex bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        className="border-e border-border bg-card flex flex-col z-20 h-full"
      >
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white">
                <Store size={20} />
              </div>
              <span className="text-xl font-bold tracking-tighter text-brand-500 uppercase">Soft Touch</span>
            </motion.div>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
          >
            {isSidebarOpen ? (
              language === 'en' ? <ChevronLeft size={20} /> : <ChevronRight size={20} />
            ) : (
              language === 'en' ? <ChevronRight size={20} /> : <ChevronLeft size={20} />
            )}
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto custom-scrollbar pb-6">
          {menuItems.map((item) => (
            <motion.button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200",
                activeTab === item.id 
                  ? "bg-brand-500/10 text-brand-500 border border-brand-500/20" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon size={22} />
              {isSidebarOpen && <span className="font-medium">{item.label}</span>}
            </motion.button>
          ))}
        </nav>

        <div className="p-4 border-t border-border mt-auto">
          <motion.button
            onClick={onLogout}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
            )}
          >
            <LogOut size={22} />
            {isSidebarOpen && <span className="font-medium">{t.logout}</span>}
          </motion.button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className="absolute inset-0 grid-bg pointer-events-none" />
        
        {/* Top Header */}
        <header className="h-20 border-b border-border flex items-center justify-between px-8 bg-background/80 backdrop-blur-md z-10">
          {/* Shop Info */}
          <div className="flex flex-col">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Store size={18} className="text-brand-500" />
              {shopName}
            </h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin size={12} />
              {shopAddress}
            </p>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex items-center gap-4 flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute inset-s-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input 
                type="text" 
                placeholder={t.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(convertPersianDigits(e.target.value))}
                className="w-full bg-muted border border-border rounded-xl py-2 ps-10 pe-4 focus:outline-none focus:border-brand-500 transition-colors text-sm"
              />
            </div>
          </div>
          
          {/* Actions & Profile */}
          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <div className="flex items-center bg-muted border border-border rounded-xl p-1">
              {languages.map((lang) => (
                <motion.button
                  key={lang.id}
                  onClick={() => setLanguage(lang.id)}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    language === lang.id 
                      ? "bg-background text-brand-500 shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {lang.label}
                </motion.button>
              ))}
            </div>

            <motion.button 
              onClick={toggleTheme}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2.5 bg-muted border border-border rounded-xl text-muted-foreground hover:text-foreground transition-colors"
              title={theme === 'light' ? t.switch_to_dark : t.switch_to_light}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </motion.button>

            {onAddEntry && (
              <motion.button 
                onClick={onAddEntry}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                className="hidden lg:flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-brand-500/20"
              >
                <Plus size={20} />
                {t.add_entry}
              </motion.button>
            )}

            {/* User Profile */}
            <div className="flex items-center gap-3 ps-4 border-s border-border">
              <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-sm font-bold">{userName}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
                  {userRole === 'developer' ? (
                    <span className="text-red-500 font-black flex items-center gap-1">
                      <ShieldAlert size={10} />
                      Developer
                    </span>
                  ) : userRole === 'admin' ? t.administrator : 'Cashier'}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-500">
                <User size={20} />
              </div>
            </div>
          </div>
        </header>

        {/* Filter Bar */}
        {(activeTab === 'roznamcha' || activeTab === 'kata' || activeTab === 'stock') && (
          <div className="px-8 py-3 border-b border-border bg-card/30 backdrop-blur-sm flex flex-wrap items-center gap-4 z-10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t.date_range}:</span>
              <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg p-1.5">
                <div className="w-36 sm:w-44">
                  <ShamsiDatePicker
                    value={dateFilter.start}
                    onChange={(gregStr) => setDateFilter({ ...dateFilter, start: gregStr })}
                    lang={language === 'ps' ? 'ps' : language === 'dr' ? 'dr' : 'en'}
                    placeholder={t.from_date || 'From Date'}
                  />
                </div>
                <span className="text-muted-foreground text-xs font-bold">{t.to}</span>
                <div className="w-36 sm:w-44">
                  <ShamsiDatePicker
                    value={dateFilter.end}
                    onChange={(gregStr) => setDateFilter({ ...dateFilter, end: gregStr })}
                    lang={language === 'ps' ? 'ps' : language === 'dr' ? 'dr' : 'en'}
                    placeholder={t.to_date || 'To Date'}
                  />
                </div>
                {(dateFilter.start || dateFilter.end) && (
                  <button 
                    onClick={() => setDateFilter({ start: '', end: '' })}
                    className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                    title="Clear filter"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t.bill_no}:</span>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder={t.filter_by_bill}
                  value={billFilter}
                  onChange={(e) => setBillFilter(convertPersianDigits(e.target.value))}
                  className="bg-muted border border-border rounded-lg px-3 py-1 text-xs focus:outline-none focus:border-brand-500 transition-colors w-32"
                />
                {billFilter && (
                  <button 
                    onClick={() => setBillFilter('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-red-500"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* View Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
