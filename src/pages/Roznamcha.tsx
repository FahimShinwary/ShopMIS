import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Plus, TrendingUp, TrendingDown, Receipt, Calendar, Info, Hash, DollarSign, Pencil, Trash2, MoreVertical, Printer, FileText, User, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, convertPersianDigits } from '../lib/utils';
import { formatShamsi, isDateInRange, getTodayShamsi } from '../lib/shamsi';
import { RoznamchaEntry, Customer } from '../types';
import { openPrintablePDFWindow, exportToPDF, createPaginatedReportHtml } from '../lib/pdfUtils';
import CustomerSelect from '../components/CustomerSelect';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';
import NumericInput from '../components/NumericInput';
import SmartInput from '../components/SmartInput';
import Pagination from '../components/Pagination';

interface RoznamchaProps {
  data: RoznamchaEntry[];
  customers: Customer[];
  t: any;
  query: string;
  dateFilter: { start: string; end: string };
  billFilter: string;
  isAdmin?: boolean;
  onAdd: (data: any) => Promise<void>;
  onEdit: (entry: RoznamchaEntry) => void;
  onDelete: (id: number) => Promise<void>;
}

export default function Roznamcha({ data, customers, t, query, dateFilter, billFilter, isAdmin, onAdd, onEdit, onDelete }: RoznamchaProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = React.useRef(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | undefined>();
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return data.filter(e => {
      const customer = customers.find(c => c.id === e.customer_id);
      const customerName = customer?.name || '';
      const customerPhone = customer?.contact || '';
      const customerAddress = customer?.address || '';
      const entryCurrency = e.currency || 'AFN';

      const matchesQuery = !q ||
        customerName.toLowerCase().includes(q) ||
        customerPhone.toLowerCase().includes(q) ||
        customerAddress.toLowerCase().includes(q) ||
        (e.bill_number || '').toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q) ||
        e.amount.toString().includes(q) ||
        entryCurrency.toLowerCase().includes(q) ||
        e.id.toString().includes(q) ||
        e.date.toLowerCase().includes(q) ||
        (e.type === 'income' ? (t.income || 'payment').toLowerCase() : (t.expense || 'purchase').toLowerCase()).includes(q);

      const matchesFilter = activeFilter === 'all' || e.type === activeFilter;
      const matchesCurrency = currencyFilter === 'all' || entryCurrency === currencyFilter;
      
      const todayStr = getTodayShamsi().gregStr;
      
      const matchesDate = (dateFilter.start || dateFilter.end) 
        ? isDateInRange(e.date, dateFilter.start, dateFilter.end)
        : (q ? true : isDateInRange(e.date, todayStr, todayStr));
      
      const matchesBill = !billFilter || (e.bill_number || '').toLowerCase().includes(billFilter.toLowerCase().trim());

      return matchesQuery && matchesFilter && matchesCurrency && matchesDate && matchesBill;
    }).sort((a, b) => b.id - a.id || new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data, customers, query, activeFilter, currencyFilter, dateFilter, billFilter, t]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totals = useMemo(() => {
    return filtered.reduce((acc, curr) => {
      if (curr.type === 'income') acc.income += curr.amount;
      else acc.expense += curr.amount;
      return acc;
    }, { income: 0, expense: 0 });
  }, [filtered]);

  const currencyTotals = useMemo(() => {
    const map: Record<string, { income: number; expense: number; balance: number }> = {
      AFN: { income: 0, expense: 0, balance: 0 },
      USD: { income: 0, expense: 0, balance: 0 },
      EUR: { income: 0, expense: 0, balance: 0 },
      PKR: { income: 0, expense: 0, balance: 0 },
    };

    filtered.forEach(e => {
      const curr = e.currency || 'AFN';
      if (!map[curr]) map[curr] = { income: 0, expense: 0, balance: 0 };
      if (e.type === 'income') map[curr].income += e.amount || 0;
      else map[curr].expense += e.amount || 0;
      map[curr].balance = map[curr].income - map[curr].expense;
    });

    return map;
  }, [filtered]);

  const validate = (formData: FormData) => {
    const newErrors: Record<string, string> = {};
    const amount = formData.get('amount') as string;

    if (!selectedCustomerId || Number(selectedCustomerId) <= 0) {
      newErrors.customer_id = t.error_customer_required || t.customer_required || 'Customer selection is required';
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      newErrors.amount = t.error_invalid_amount || 'Please enter a valid amount greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmittingRef.current || isSubmitting) return;

    const formData = new FormData(e.currentTarget);
    
    if (!validate(formData)) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      const entryData = Object.fromEntries(formData.entries());
      entryData.customer_id = selectedCustomerId as any;
      await onAdd(entryData);
      setIsFormOpen(false);
      setErrors({});
      setSelectedCustomerId(undefined);
      (e.target as HTMLFormElement).reset();
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const buildRoznamchaReportData = () => {
    const isRTL = document.documentElement.dir === 'rtl';
    const reportTitle = `${t.roznamcha || 'Roznamcha'} ${t.report || 'Report'}`;
    const dateText = `${dateFilter.start ? formatShamsi(dateFilter.start, 'full') : (t.all || 'All')} ${t.to || 'to'} ${dateFilter.end ? formatShamsi(dateFilter.end, 'full') : formatShamsi(new Date(), 'full')}`;

    const summaryHtml = `
      <div class="summary-grid">
        <div class="summary-card">
          <h3>${t.total_income || 'Total Income'}</h3>
          <p class="badge-income">${totals.income.toLocaleString()} AFN</p>
        </div>
        <div class="summary-card">
          <h3>${t.total_expense || 'Total Expense'}</h3>
          <p class="badge-expense">${totals.expense.toLocaleString()} AFN</p>
        </div>
        <div class="summary-card">
          <h3>Net Balance</h3>
          <p class="${(totals.income - totals.expense) >= 0 ? 'badge-income' : 'badge-expense'}">${(totals.income - totals.expense).toLocaleString()} AFN</p>
        </div>
        <div class="summary-card">
          <h3>Total Records</h3>
          <p style="color: #0f172a;">${filtered.length}</p>
        </div>
      </div>
    `;

    const contentHtml = createPaginatedReportHtml<RoznamchaEntry>({
      title: reportTitle,
      dateText,
      summaryHtml,
      records: filtered,
      recordsPerPage: 20,
      isRTL,
      columns: [
        { header: t.date || 'Date' },
        { header: t.customer_name || t.customers || 'Customer Name' },
        { header: t.type || 'Type' },
        { header: t.currency || 'Currency' },
        { header: t.amount || 'Amount' },
        { header: t.bill_number || 'Bill #' },
        { header: t.description || 'Description' }
      ],
      renderRow: (e: RoznamchaEntry) => `
        <tr>
          <td>
            <div style="font-weight:700">${formatShamsi(e.date, 'YYYY/MM/DD')} (${formatShamsi(e.date, 'full')})</div>
            <div style="font-size:10px; color:#2563eb; font-family:monospace; font-weight:bold;">USA: ${format(new Date(e.date), 'yyyy-MM-dd')}</div>
          </td>
          <td><strong style="unicode-bidi:plaintext;">${customers.find(c => c.id === e.customer_id)?.name || '-'}</strong></td>
          <td class="${e.type === 'income' ? 'badge-income' : 'badge-expense'}">${e.type === 'income' ? (t.income || 'Income') : (t.expense || 'Expense')}</td>
          <td><strong>${e.currency || 'AFN'}</strong></td>
          <td class="${e.type === 'income' ? 'badge-income' : 'badge-expense'}">${e.type === 'income' ? '+' : '-'}${e.amount.toLocaleString()} ${e.currency || 'AFN'}</td>
          <td>${e.bill_number ? `<span style="font-weight:700; unicode-bidi:plaintext;">${e.bill_number}</span>` : '-'}</td>
          <td><span style="unicode-bidi:plaintext;">${e.description || '-'}</span></td>
        </tr>
      `
    });

    return {
      title: reportTitle,
      filename: `roznamcha_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`,
      contentHtml,
      isRTL
    };
  };

  const printSingleRoznamchaBill = (entry: RoznamchaEntry) => {
    const isRTL = document.documentElement.dir === 'rtl';
    const customer = customers.find(c => c.id === entry.customer_id);
    const title = `${entry.type === 'income' ? (t.income || 'Income Receipt') : (t.expense || 'Expense Voucher')} #${entry.bill_number || entry.id}`;

    const contentHtml = `
      <div class="header">
        <h1>${title}</h1>
        <p>${formatShamsi(entry.date, 'full')} | USA: ${format(new Date(entry.date), 'yyyy-MM-dd')}</p>
      </div>

      <div style="border:1px solid #cbd5e1; border-radius:8px; padding:16px; margin-bottom:20px; background:#f8fafc;">
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
          <div><strong>${t.customer || 'Customer'}:</strong> <span style="unicode-bidi:plaintext;">${customer?.name || '-'}</span></div>
          <div><strong>${t.bill_number || 'Bill #'}:</strong> <span style="unicode-bidi:plaintext; font-weight:700;">${entry.bill_number || '-'}</span></div>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
          <div><strong>${t.type || 'Type'}:</strong> ${entry.type === 'income' ? (t.income || 'Income') : (t.expense || 'Expense')}</div>
          <div><strong>${t.currency || 'Currency'}:</strong> ${entry.currency || 'AFN'}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>${t.description || 'Description'}</th>
            <th>${t.currency || 'Currency'}</th>
            <th class="text-end">${t.amount || 'Amount'}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span style="unicode-bidi:plaintext;">${entry.description || '-'}</span></td>
            <td><strong>${entry.currency || 'AFN'}</strong></td>
            <td class="text-end ${entry.type === 'income' ? 'badge-income' : 'badge-expense'}" style="font-size:14px; font-weight:800;">
              ${entry.type === 'income' ? '+' : '-'}${entry.amount.toLocaleString()} ${entry.currency || 'AFN'}
            </td>
          </tr>
        </tbody>
      </table>

      <div class="footer">
        <p>Shop MIS System - Official Roznamcha Voucher</p>
      </div>
    `;

    openPrintablePDFWindow({
      title,
      filename: `roznamcha_voucher_${entry.bill_number || entry.id}_${format(new Date(entry.date), 'yyyy-MM-dd')}.pdf`,
      contentHtml,
      isRTL
    });
  };

  const handlePrint = () => {
    openPrintablePDFWindow(buildRoznamchaReportData());
  };

  const handleDownloadPDF = () => {
    const data = buildRoznamchaReportData();
    exportToPDF(data.contentHtml, data.filename, data.title, data.isRTL);
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-muted border border-border rounded-xl p-1 w-fit">
            <button
              onClick={() => setActiveFilter('all')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                activeFilter === 'all' ? "bg-background text-brand-500 shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              All
            </button>
            <button
              onClick={() => setActiveFilter('income')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5",
                activeFilter === 'income' ? "bg-background text-green-500 shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <TrendingUp size={16} />
              {t.income}
            </button>
            <button
              onClick={() => setActiveFilter('expense')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5",
                activeFilter === 'expense' ? "bg-background text-red-500 shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <TrendingDown size={16} />
              {t.expense}
            </button>
          </div>

          {/* Currency Filter Dropdown */}
          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value)}
            className="bg-muted border border-border rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-brand-500"
          >
            <option value="all">{t.all_currencies || 'All Currencies'}</option>
            <option value="AFN">AFN (افغانی)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="PKR">PKR (₨)</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <>
              <button
                onClick={handleDownloadPDF}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-md shadow-emerald-600/20"
              >
                <Download size={18} />
                {t.download_pdf || 'Download PDF'}
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 bg-muted hover:bg-muted/80 text-foreground px-5 py-2.5 rounded-xl font-bold transition-all border border-border"
              >
                <Printer size={18} />
                {t.print || 'Print'}
              </button>
            </>
          )}
          
          <button
            onClick={() => {
              setIsFormOpen(!isFormOpen);
              setErrors({});
            }}
            className="flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-brand-500/20"
          >
            <Plus size={20} className={cn("transition-transform", isFormOpen && "rotate-45")} />
            {isFormOpen ? t.cancel : t.add_entry}
          </button>
        </div>
      </div>

      {/* Quick Add Form */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-visible"
          >
            <div className="bg-card border border-border rounded-2xl p-6 shadow-soft mb-6">
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Calendar size={12} />
                    {t.date}
                  </label>
                  <ShamsiDatePicker
                    value={formDate}
                    onChange={(gregStr) => setFormDate(gregStr)}
                  />
                  <input type="hidden" name="date" value={formDate} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <TrendingUp size={12} />
                    {t.type}
                  </label>
                  <select 
                    name="type" 
                    required
                    className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-500 transition-colors text-sm"
                  >
                    <option value="income">{t.income}</option>
                    <option value="expense">{t.expense}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <CustomerSelect 
                    customers={customers}
                    selectedId={selectedCustomerId}
                    onSelect={(c) => setSelectedCustomerId(c.id)}
                    onQuickAdd={() => {
                      // Handle quick add if needed
                    }}
                    t={t}
                    error={errors.customer_id}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <DollarSign size={12} />
                    {t.currency || 'Currency'}
                  </label>
                  <select
                    name="currency"
                    defaultValue="AFN"
                    className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-500 transition-colors text-sm font-bold"
                  >
                    <option value="AFN">AFN (افغانی)</option>
                    <option value="USD">USD ($) (دالر)</option>
                    <option value="EUR">EUR (€) (یورو)</option>
                    <option value="PKR">PKR (₨) (کلدار)</option>
                  </select>
                </div>
                <NumericInput 
                  name="amount" 
                  required 
                  placeholder={t.placeholder_amount || '0.00'}
                  label={t.amount}
                  icon={<DollarSign size={12} />}
                  error={errors.amount}
                />
                <SmartInput 
                  name="bill_number" 
                  label={t.bill_number}
                  icon={<Hash size={12} />}
                  placeholder={t.placeholder_optional || 'Optional...'}
                />
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Info size={12} />
                    {t.description}
                  </label>
                  <input 
                    name="description" 
                    type="text" 
                    placeholder={t.placeholder_optional_desc || 'Optional description...'}
                    className={cn(
                      "w-full bg-muted border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-500 transition-colors text-sm",
                      errors.description && "border-red-500 focus:border-red-500"
                    )} 
                  />
                  {errors.description && <p className="text-[10px] text-red-500 font-bold">{errors.description}</p>}
                </div>
                <div className="lg:col-span-7 flex justify-end pt-2">
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className={cn(
                      "bg-brand-500 hover:bg-brand-600 text-white px-8 py-2.5 rounded-xl font-bold transition-all shadow-md flex items-center gap-2",
                      isSubmitting && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {t.saving || 'Saving...'}
                      </>
                    ) : (
                      t.save
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Multi-Currency Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {['AFN', 'USD', 'EUR', 'PKR'].map((curr) => {
          const tot = currencyTotals[curr] || { income: 0, expense: 0, balance: 0 };
          const isSelected = currencyFilter === curr;
          return (
            <motion.div 
              key={curr}
              onClick={() => setCurrencyFilter(isSelected ? 'all' : curr)}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "bg-card border rounded-2xl p-4 shadow-soft cursor-pointer transition-all relative overflow-hidden group",
                isSelected 
                  ? "border-brand-500 ring-2 ring-brand-500/20 bg-brand-500/5" 
                  : "border-border hover:border-brand-500/50"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-1 rounded-lg bg-brand-500/10 text-brand-500 font-black text-xs uppercase">
                  {curr}
                </span>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-black",
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
            </motion.div>
          );
        })}
      </div>

      {/* Table View */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-start">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} />
                    {t.date}
                  </div>
                </th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-start">
                  <div className="flex items-center gap-2">
                    <User size={14} />
                    {t.customer_name || t.customers || 'Customer'}
                  </div>
                </th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-start">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} />
                    {t.type}
                  </div>
                </th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-start">
                  <div className="flex items-center gap-2">
                    <DollarSign size={14} />
                    {t.currency || 'Currency'}
                  </div>
                </th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-start">
                  <div className="flex items-center gap-2">
                    <DollarSign size={14} />
                    {t.amount}
                  </div>
                </th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-start">
                  <div className="flex items-center gap-2">
                    <Receipt size={14} />
                    {t.bill_number}
                  </div>
                </th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-start">
                  <div className="flex items-center gap-2">
                    <Info size={14} />
                    {t.description}
                  </div>
                </th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-end">
                  {t.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedData.map((entry, index) => (
                <motion.tr 
                  key={entry.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="hover:bg-muted/30 transition-colors group"
                >
                  <td className="p-4 text-sm font-medium">
                    <div className="font-bold text-foreground">☀️ {formatShamsi(entry.date, 'YYYY/MM/DD')} <span className="text-xs font-semibold text-muted-foreground">({formatShamsi(entry.date, 'full')})</span></div>
                    <div className="text-[11px] text-brand-500 font-mono font-bold">📅 USA: {format(new Date(entry.date), 'yyyy-MM-dd')}</div>
                  </td>
                  <td className="p-4 text-sm font-semibold text-foreground">
                    {customers.find(c => c.id === entry.customer_id)?.name || '-'}
                  </td>
                  <td className="p-4">
                    <span className={cn(
                      "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border",
                      entry.type === 'income' 
                        ? "bg-green-500/10 text-green-500 border-green-500/20" 
                        : "bg-red-500/10 text-red-500 border-red-500/20"
                    )}>
                      {entry.type === 'income' ? t.income : t.expense}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-500 border border-blue-500/20 text-xs font-bold">
                      {entry.currency || 'AFN'}
                    </span>
                  </td>
                  <td className={cn(
                    "p-4 font-bold text-sm",
                    entry.type === 'income' ? "text-green-500" : "text-red-500"
                  )}>
                    {entry.type === 'income' ? '+' : '-'}{entry.amount.toLocaleString()} <span className="text-xs opacity-75">{entry.currency || 'AFN'}</span>
                  </td>
                  <td className="p-4 text-sm font-mono text-muted-foreground">
                    {entry.bill_number || '-'}
                  </td>
                  <td className="p-4 text-sm text-foreground/80 font-medium">
                    {entry.description || '-'}
                  </td>
                  <td className="p-4 text-end">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => printSingleRoznamchaBill(entry)}
                        className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500 hover:bg-purple-500 hover:text-white transition-all"
                        title={t.print || 'Print Voucher'}
                      >
                        <Printer size={14} />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onEdit(entry)}
                        className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-all"
                        title={t.edit}
                      >
                        <Pencil size={14} />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onDelete(entry.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                        title={t.delete}
                      >
                        <Trash2 size={14} />
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-border bg-muted/20">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filtered.length}
            itemsPerPage={itemsPerPage}
            onPageChange={(p) => setCurrentPage(p)}
            t={t}
          />
        </div>

        {filtered.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
              <Receipt size={32} />
            </div>
            <p className="text-muted-foreground font-medium">{t.no_data}</p>
          </div>
        )}
      </div>
    </div>
  );
}
