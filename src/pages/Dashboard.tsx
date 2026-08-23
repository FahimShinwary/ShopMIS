import React, { useMemo, useState } from 'react';
import { 
  LayoutDashboard, 
  TrendingUp, 
  TrendingDown, 
  PackageSearch,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Clock,
  RefreshCw
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { formatShamsi } from '../lib/shamsi';
import { Stats, RoznamchaEntry } from '../types';

interface DashboardProps {
  stats: Stats;
  roznamcha: RoznamchaEntry[];
  t: any;
  onRefresh?: () => Promise<void> | void;
}

export default function Dashboard({ stats, roznamcha, t, onRefresh }: DashboardProps) {
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshClick = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const currencyTotals = useMemo(() => {
    const map: Record<string, { income: number; expense: number; balance: number }> = {
      AFN: { income: 0, expense: 0, balance: 0 },
      USD: { income: 0, expense: 0, balance: 0 },
      EUR: { income: 0, expense: 0, balance: 0 },
      PKR: { income: 0, expense: 0, balance: 0 },
    };

    if (Array.isArray(roznamcha)) {
      roznamcha.forEach(e => {
        const curr = e.currency || 'AFN';
        if (!map[curr]) map[curr] = { income: 0, expense: 0, balance: 0 };
        if (e.type === 'income') map[curr].income += e.amount || 0;
        else map[curr].expense += e.amount || 0;
        map[curr].balance = map[curr].income - map[curr].expense;
      });
    }

    return map;
  }, [roznamcha]);

  const activeTotals = useMemo(() => {
    if (currencyFilter === 'all') {
      let income = 0;
      let expense = 0;
      if (Array.isArray(roznamcha)) {
        roznamcha.forEach(e => {
          if (e.type === 'income') income += e.amount || 0;
          else expense += e.amount || 0;
        });
      }
      return { income, expense, balance: income - expense };
    }
    return currencyTotals[currencyFilter] || { income: 0, expense: 0, balance: 0 };
  }, [currencyFilter, currencyTotals, roznamcha]);

  const filteredRoznamcha = useMemo(() => {
    if (!Array.isArray(roznamcha)) return [];
    if (currencyFilter === 'all') return roznamcha;
    return roznamcha.filter(e => (e.currency || 'AFN') === currencyFilter);
  }, [roznamcha, currencyFilter]);

  const chartData = useMemo(() => {
    if (!Array.isArray(filteredRoznamcha)) return [];
    
    // Group by date for the last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return format(d, 'yyyy-MM-dd');
    }).reverse();

    return last7Days.map(date => {
      const dayEntries = filteredRoznamcha.filter(e => format(new Date(e.date), 'yyyy-MM-dd') === date);
      const income = dayEntries.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
      const expense = dayEntries.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
      return {
        name: formatShamsi(date, 'short'),
        income,
        expense
      };
    });
  }, [filteredRoznamcha]);

  const pieData = [
    { name: t.payment || t.income || 'Payment', value: activeTotals.income || 0, color: '#22c55e' },
    { name: t.purchase || t.expense || 'Purchase', value: activeTotals.expense || 0, color: '#ef4444' }
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  const currencies = [
    { id: 'all', label: t.all || 'All Currencies' },
    { id: 'AFN', label: 'AFN (افغانی)' },
    { id: 'USD', label: 'USD ($ دالر)' },
    { id: 'EUR', label: 'EUR (€ یورو)' },
    { id: 'PKR', label: 'PKR (₨ کلدار)' },
  ];

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* Currency Filter & Dashboard Action Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-card border border-border p-4 rounded-3xl shadow-soft">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{t.currency || 'Currency'}:</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {currencies.map((c) => (
            <button
              key={c.id}
              onClick={() => setCurrencyFilter(c.id)}
              className={cn(
                "px-4 py-2 rounded-2xl text-xs font-bold transition-all shadow-sm",
                currencyFilter === c.id
                  ? "bg-brand-500 text-brand-foreground shadow-md scale-105"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {c.label}
            </button>
          ))}
          <button
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold bg-brand-500/10 text-brand-500 hover:bg-brand-500 hover:text-brand-foreground transition-all shadow-sm ml-auto sm:ml-2 disabled:opacity-50"
            title="Refresh Dashboard"
          >
            <RefreshCw size={14} className={cn("transition-transform", isRefreshing && "animate-spin")} />
            <span>{isRefreshing ? (t.loading || 'Refreshing...') : (t.refresh || 'Refresh Dashboard')}</span>
          </button>
        </div>
      </div>

      {/* Multi-Currency Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {['AFN', 'USD', 'EUR', 'PKR'].map((curr) => {
          const tot = currencyTotals[curr] || { income: 0, expense: 0, balance: 0 };
          const isSelected = currencyFilter === curr;
          return (
            <div 
              key={curr}
              onClick={() => setCurrencyFilter(isSelected ? 'all' : curr)}
              className={cn(
                "bg-card border rounded-2xl p-4 shadow-sm cursor-pointer transition-all relative overflow-hidden group",
                isSelected 
                  ? "border-brand-500 ring-2 ring-brand-500/20 bg-brand-500/5" 
                  : "border-border hover:border-brand-500/50"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="px-3 py-1 rounded-lg bg-brand-500/10 text-brand-500 font-black text-xs tracking-wider uppercase">
                  {curr}
                </span>
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-xs font-black",
                  tot.balance >= 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                )}>
                  {tot.balance >= 0 ? '+' : ''}{tot.balance.toLocaleString()} {curr}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-bold pt-1 border-t border-border/50">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">{t.income || 'Payment'}</span>
                  <span className="text-green-500 font-black">+{tot.income.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">{t.expense || 'Purchase'}</span>
                  <span className="text-red-500 font-black">-{tot.expense.toLocaleString()}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Currency or Key Activity Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {currencyFilter !== 'all' ? (
          <>
            <StatCard 
              title={`${t.total_income || 'Total Income'} (${currencyFilter})`}
              value={activeTotals.income} 
              currency={currencyFilter}
              icon={TrendingUp} 
              trend={t.payment || "Payment"} 
              color="green" 
              variants={item}
            />
            <StatCard 
              title={`${t.total_expense || 'Total Expense'} (${currencyFilter})`}
              value={activeTotals.expense} 
              currency={currencyFilter}
              icon={TrendingDown} 
              trend={t.purchase || "Purchase"} 
              color="red" 
              variants={item}
            />
            <StatCard 
              title={`${t.balance || 'Balance'} (${currencyFilter})`}
              value={activeTotals.balance} 
              currency={currencyFilter}
              icon={Activity} 
              trend={activeTotals.balance >= 0 ? (t.healthy || "Positive") : (t.low || "Negative")} 
              color="brand" 
              variants={item}
            />
            <StatCard 
              title={t.stock_in} 
              value={stats.totalStockIn} 
              icon={PackageSearch} 
              trend={t.total_received || "Total received"} 
              color="green" 
              variants={item}
            />
          </>
        ) : (
          <>
            <StatCard 
              title="AFN Balance" 
              value={currencyTotals['AFN']?.balance || 0} 
              currency="AFN"
              icon={Activity} 
              trend="افغانی" 
              color="brand" 
              variants={item}
            />
            <StatCard 
              title="USD Balance" 
              value={currencyTotals['USD']?.balance || 0} 
              currency="USD"
              icon={Activity} 
              trend="$ دالر" 
              color="green" 
              variants={item}
            />
            <StatCard 
              title={t.stock_in} 
              value={stats.totalStockIn} 
              icon={PackageSearch} 
              trend={t.total_received || "Items"} 
              color="green" 
              variants={item}
            />
            <StatCard 
              title={t.stock_out} 
              value={stats.totalStockOut} 
              icon={PackageSearch} 
              trend={t.total_issued || "Items"} 
              color="red" 
              variants={item}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <motion.div 
          variants={item}
          className="lg:col-span-2 bg-card border border-border rounded-3xl p-8 shadow-soft relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp size={120} />
          </div>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold tracking-tight">{t.payment || t.income} vs {t.purchase || t.expense}</h3>
              <p className="text-sm text-muted-foreground">{t.weekly_overview || 'Weekly performance overview'}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs font-bold text-muted-foreground uppercase">{t.payment || t.income}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-xs font-bold text-muted-foreground uppercase">{t.purchase || t.expense}</span>
              </div>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.05} vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="currentColor" 
                  opacity={0.5} 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="currentColor" 
                  opacity={0.5} 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(1)}k` : value}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(26, 26, 26, 0.85)', 
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)', 
                    borderRadius: '16px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    color: '#fff'
                  }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="income" 
                  name={t.payment || 'Payment'} 
                  stroke="#22c55e" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorIncome)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="expense" 
                  name={t.purchase || 'Purchase'} 
                  stroke="#ef4444" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorExpense)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Distribution Chart */}
        <motion.div 
          variants={item}
          className="bg-card border border-border rounded-3xl p-8 shadow-soft flex flex-col"
        >
          <h3 className="text-xl font-bold tracking-tight mb-2">{t.distribution || 'Distribution'}</h3>
          <p className="text-sm text-muted-foreground mb-8">{t.cash_flow_desc || 'Cash flow allocation'}</p>
          <div className="flex-1 flex items-center justify-center min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(26, 26, 26, 0.85)', 
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)', 
                    borderRadius: '12px',
                    color: '#fff'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-4 mt-4">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm font-medium text-muted-foreground">{item.name}</span>
                </div>
                <span className="text-sm font-bold">{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div variants={item} className="bg-card border border-border rounded-3xl p-8 shadow-soft">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-500">
              <Clock size={20} />
            </div>
            <h3 className="text-xl font-bold tracking-tight">{t.recent_entries}</h3>
          </div>
          <span className="text-sm font-bold text-brand-500">{t.view_all || 'View All'}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.isArray(roznamcha) && roznamcha.slice(0, 6).map((entry) => (
            <div 
              key={entry.id} 
              className="flex items-center justify-between p-5 bg-muted/30 rounded-2xl border border-border/50 hover:border-brand-500/30 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                  entry.type === 'income' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                )}>
                  {entry.type === 'income' ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
                </div>
                <div>
                  <p className="font-bold text-sm line-clamp-1">{entry.description || 'No description'}</p>
                  <p className="text-xs text-muted-foreground font-medium">{formatShamsi(entry.date, 'full')}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={cn("font-black text-sm", entry.type === 'income' ? "text-green-500" : "text-red-500")}>
                  {entry.type === 'income' ? '+' : '-'}{entry.amount.toLocaleString()}
                </p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{entry.bill_number || 'N/A'}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatCard({ title, value, currency, icon: Icon, trend, color, variants }: { title: string, value: number, currency?: string, icon: any, trend: string, color: string, variants: any }) {
  const colorClasses = {
    green: "bg-green-500/10 text-green-500",
    red: "bg-red-500/10 text-red-500",
    brand: "bg-brand-500/10 text-brand-500",
    orange: "bg-orange-500/10 text-orange-500"
  };

  const valStr = value.toLocaleString();
  const fontCls = valStr.length > 18 
    ? "text-base sm:text-lg" 
    : valStr.length > 12 
      ? "text-lg sm:text-xl" 
      : valStr.length > 9 
        ? "text-xl sm:text-2xl" 
        : "text-2xl sm:text-3xl font-black";

  return (
    <motion.div 
      variants={variants}
      className="bg-card border border-border rounded-3xl p-6 shadow-soft hover:border-brand-500/30 transition-all group relative overflow-hidden min-w-0"
    >
      <div className="flex items-center justify-between mb-6">
        <div className={cn("p-4 rounded-2xl transition-transform group-hover:scale-110 duration-500 shrink-0", colorClasses[color as keyof typeof colorClasses])}>
          <Icon size={28} />
        </div>
        <div className="flex items-center gap-1.5">
          {currency && (
            <span className="px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-500 text-[10px] font-black uppercase tracking-wider">
              {currency}
            </span>
          )}
          <div className={cn(
            "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0",
            color === 'green' ? "bg-green-500/10 text-green-500" : 
            color === 'red' ? "bg-red-500/10 text-red-500" : "bg-brand-500/10 text-brand-500"
          )}>
            {trend}
          </div>
        </div>
      </div>
      <p className="text-muted-foreground text-xs font-black uppercase tracking-widest mb-1 truncate">{title}</p>
      <h4 className={cn("font-black tracking-tighter break-all min-w-0", fontCls)}>
        {valStr} {currency ? <span className="text-sm font-semibold text-muted-foreground ml-1">{currency}</span> : null}
      </h4>
      
      {/* Decorative background element */}
      <div className="absolute -bottom-4 -right-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity duration-500 pointer-events-none">
        <Icon size={100} />
      </div>
    </motion.div>
  );
}
