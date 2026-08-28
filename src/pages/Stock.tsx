import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { 
  Plus, 
  Package, 
  Receipt, 
  Calendar, 
  Info, 
  Hash, 
  Layers,
  TrendingUp,
  Box,
  Pencil,
  Trash2,
  Printer,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, convertPersianDigits } from '../lib/utils';
import { formatShamsi, isDateInRange } from '../lib/shamsi';
import { StockEntry } from '../types';
import { openPrintablePDFWindow, exportToPDF, createPaginatedReportHtml } from '../lib/pdfUtils';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';
import NumericInput from '../components/NumericInput';
import SmartInput from '../components/SmartInput';
import Pagination from '../components/Pagination';

interface StockProps {
  data: StockEntry[];
  t: any;
  query: string;
  dateFilter: { start: string; end: string };
  billFilter: string;
  onAdd: (data: any) => Promise<void>;
  onEdit: (entry: StockEntry) => void;
  onDelete: (id: number) => Promise<void>;
}

export default function Stock({ data, t, query, dateFilter, billFilter, onAdd, onEdit, onDelete }: StockProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = React.useRef(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemNameInput, setItemNameInput] = useState('');
  const [showItemSuggestions, setShowItemSuggestions] = useState(false);
  const itemsPerPage = 10;

  const existingItemNames = useMemo(() => {
    const names = data.map(d => d.item_name).filter(Boolean);
    return Array.from(new Set(names));
  }, [data]);

  const matchedSuggestions = useMemo(() => {
    if (!itemNameInput.trim()) return [];
    const search = itemNameInput.toLowerCase().trim();
    return existingItemNames.filter(name => name.toLowerCase().includes(search));
  }, [existingItemNames, itemNameInput]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return data.filter(e => {
      const typeText = e.type === 'in' ? (t.stock_in || 'in').toLowerCase() : (t.stock_out || 'out').toLowerCase();

      const matchesQuery = !q ||
        (e.item_name || '').toLowerCase().includes(q) ||
        (e.bill_number || '').toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q) ||
        e.quantity.toString().includes(q) ||
        e.id.toString().includes(q) ||
        e.date.toLowerCase().includes(q) ||
        typeText.includes(q);
      
      const matchesDate = (dateFilter.start || dateFilter.end) 
        ? isDateInRange(e.date, dateFilter.start, dateFilter.end)
        : true;
      
      const matchesBill = !billFilter || (e.bill_number || '').toLowerCase().includes(billFilter.toLowerCase().trim());

      return matchesQuery && matchesDate && matchesBill;
    }).sort((a, b) => b.id - a.id || new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data, query, dateFilter, billFilter, t]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalStockOut = useMemo(() => {
    return filtered.filter(e => e.type === 'out').reduce((acc, curr) => acc + curr.quantity, 0);
  }, [filtered]);

  const totalStockIn = useMemo(() => {
    return filtered.filter(e => e.type === 'in').reduce((acc, curr) => acc + curr.quantity, 0);
  }, [filtered]);

  const inventorySummary = useMemo(() => {
    const summary: Record<string, { in: number; out: number; balance: number }> = {};
    const q = query.toLowerCase().trim();
    
    data.forEach(e => {
      if (!summary[e.item_name]) {
        summary[e.item_name] = { in: 0, out: 0, balance: 0 };
      }
      if (e.type === 'in') summary[e.item_name].in += e.quantity;
      else summary[e.item_name].out += e.quantity;
      summary[e.item_name].balance = summary[e.item_name].in - summary[e.item_name].out;
    });

    return Object.entries(summary).map(([name, stats]) => ({
      name,
      ...stats
    })).filter(item => 
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.in.toString().includes(q) ||
      item.out.toString().includes(q) ||
      item.balance.toString().includes(q)
    );
  }, [data, query]);

  const buildStockReportData = () => {
    const isRTL = document.documentElement.dir === 'rtl';
    const title = 'Stock Inventory Report';
    const dateRange = dateFilter.start || dateFilter.end ? ` (${dateFilter.start ? formatShamsi(dateFilter.start, 'full') : 'Start'} to ${dateFilter.end ? formatShamsi(dateFilter.end, 'full') : 'End'})` : '';

    const summaryHtml = `
      <div class="summary-grid">
        <div class="summary-card">
          <h3>${t.stock_in || 'Stock In'}</h3>
          <p class="badge-income">${totalStockIn.toLocaleString()}</p>
        </div>
        <div class="summary-card">
          <h3>${t.stock_out || 'Stock Out'}</h3>
          <p class="badge-expense">${totalStockOut.toLocaleString()}</p>
        </div>
        <div class="summary-card">
          <h3>Current Total Balance</h3>
          <p style="color: #0f172a; font-weight: 800;">${(totalStockIn - totalStockOut).toLocaleString()}</p>
        </div>
        <div class="summary-card">
          <h3>Total Entries</h3>
          <p style="color: #0f172a;">${filtered.length}</p>
        </div>
      </div>
    `;

    const columns = [
      { header: t.date || 'Date' },
      { header: t.item_name || 'Item Name' },
      { header: t.type || 'Type' },
      { header: t.quantity || 'Quantity' },
      { header: t.bill_number || 'Bill #' },
      { header: t.description || 'Description' }
    ];

    const contentHtml = createPaginatedReportHtml<StockEntry>({
      title,
      dateText: `Generated on ${formatShamsi(new Date(), 'full')}${dateRange}`,
      summaryHtml,
      records: filtered,
      recordsPerPage: 15,
      isRTL,
      columns,
      renderRow: (e: StockEntry) => `
        <tr>
          <td>
            <div style="font-weight:700">${formatShamsi(e.date, 'YYYY/MM/DD')} (${formatShamsi(e.date, 'full')})</div>
            <div style="font-size:10px; color:#2563eb; font-family:monospace; font-weight:bold;">USA: ${format(new Date(e.date), 'yyyy-MM-dd')}</div>
          </td>
          <td><strong style="unicode-bidi:plaintext;">${e.item_name}</strong></td>
          <td class="${e.type === 'in' ? 'badge-income' : 'badge-expense'}">${e.type === 'in' ? (t.stock_in || 'Stock In') : (t.stock_out || 'Stock Out')}</td>
          <td style="font-weight: 700;">${e.quantity.toLocaleString()}</td>
          <td>${e.bill_number ? `<span style="font-weight:700; unicode-bidi:plaintext;">${e.bill_number}</span>` : '-'}</td>
          <td><span style="unicode-bidi:plaintext;">${e.description || '-'}</span></td>
        </tr>
      `
    });

    return {
      title,
      filename: `stock_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`,
      contentHtml,
      isRTL
    };
  };

  const printSingleStockVoucher = (entry: StockEntry) => {
    const isRTL = document.documentElement.dir === 'rtl';
    const title = `${entry.type === 'in' ? (t.stock_in || 'Stock In Note') : (t.stock_out || 'Stock Out Note')} #${entry.bill_number || entry.id}`;

    const contentHtml = `
      <div class="header">
        <h1>${title}</h1>
        <p>${formatShamsi(entry.date, 'full')} | USA: ${format(new Date(entry.date), 'yyyy-MM-dd')}</p>
      </div>

      <div style="border:1px solid #cbd5e1; border-radius:8px; padding:16px; margin-bottom:20px; background:#f8fafc;">
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
          <div><strong>${t.item_name || 'Item Name'}:</strong> <span style="unicode-bidi:plaintext; font-weight:700;">${entry.item_name}</span></div>
          <div><strong>${t.bill_number || 'Bill #'}:</strong> <span style="unicode-bidi:plaintext; font-weight:700;">${entry.bill_number || '-'}</span></div>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <div><strong>${t.type || 'Movement Type'}:</strong> ${entry.type === 'in' ? (t.stock_in || 'Stock In') : (t.stock_out || 'Stock Out')}</div>
          <div><strong>${t.quantity || 'Quantity'}:</strong> <span style="font-weight:800;">${entry.quantity.toLocaleString()}</span></div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>${t.item_name || 'Item Name'}</th>
            <th>${t.type || 'Type'}</th>
            <th>${t.quantity || 'Quantity'}</th>
            <th>${t.description || 'Description'}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong style="unicode-bidi:plaintext;">${entry.item_name}</strong></td>
            <td class="${entry.type === 'in' ? 'badge-income' : 'badge-expense'}">${entry.type === 'in' ? (t.stock_in || 'Stock In') : (t.stock_out || 'Stock Out')}</td>
            <td style="font-weight:800;">${entry.quantity.toLocaleString()}</td>
            <td><span style="unicode-bidi:plaintext;">${entry.description || '-'}</span></td>
          </tr>
        </tbody>
      </table>

      <div class="footer">
        <p>Shop MIS System - Official Stock Movement Voucher</p>
      </div>
    `;

    openPrintablePDFWindow({
      title,
      filename: `stock_voucher_${entry.bill_number || entry.id}_${format(new Date(entry.date), 'yyyy-MM-dd')}.pdf`,
      contentHtml,
      isRTL
    });
  };

  const handlePrint = () => {
    openPrintablePDFWindow(buildStockReportData());
  };

  const handleDownloadPDF = () => {
    const data = buildStockReportData();
    exportToPDF(data.contentHtml, data.filename, data.title, data.isRTL);
  };

  const validate = (formData: FormData) => {
    const newErrors: Record<string, string> = {};
    const itemName = formData.get('item_name') as string;
    const quantity = formData.get('quantity') as string;

    if (!itemName || itemName.trim().length < 1) {
      newErrors.item_name = t.error_invalid_item_name || 'Please enter item name';
    }
    if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      newErrors.quantity = t.error_invalid_quantity || 'Please enter a valid quantity greater than 0';
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
      await onAdd({
        ...entryData,
        quantity: Number(entryData.quantity)
      });
      setIsFormOpen(false);
      setErrors({});
      setItemNameInput('');
      (e.target as HTMLFormElement).reset();
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Package className="text-brand-500" />
          {t.stock}
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-md shadow-emerald-600/20"
          >
            <Download size={18} />
            {t.download_pdf || 'Download PDF'}
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-muted hover:bg-muted/80 text-foreground px-4 py-2.5 rounded-xl font-bold transition-all border border-border"
          >
            <Printer size={18} />
            {t.print || 'Print'}
          </button>
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
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="space-y-1.5 relative z-40">
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
                <div className="space-y-1.5 relative">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Box size={12} />
                    {t.item_name}
                  </label>
                  <input 
                    name="item_name" 
                    type="text" 
                    required 
                    value={itemNameInput}
                    onChange={(e) => {
                      setItemNameInput(convertPersianDigits(e.target.value));
                      setShowItemSuggestions(true);
                    }}
                    onFocus={() => setShowItemSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowItemSuggestions(false), 200)}
                    placeholder="Type item name..."
                    autoComplete="off"
                    className={cn(
                      "w-full bg-muted border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-500 transition-colors text-sm",
                      errors.item_name && "border-red-500 focus:border-red-500"
                    )} 
                  />
                  {showItemSuggestions && matchedSuggestions.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-border/50">
                      {matchedSuggestions.map(name => (
                        <button
                          key={name}
                          type="button"
                          onMouseDown={() => {
                            setItemNameInput(name);
                            setShowItemSuggestions(false);
                          }}
                          className="w-full text-start px-4 py-2.5 text-sm hover:bg-muted font-medium transition-colors flex items-center justify-between"
                        >
                          <span>{name}</span>
                          <span className="text-[10px] bg-brand-500/10 text-brand-500 px-2 py-0.5 rounded-full font-bold">Existing Item</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {errors.item_name && <p className="text-[10px] text-red-500 font-bold">{errors.item_name}</p>}
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
                    <option value="in">{t.stock_in}</option>
                    <option value="out">{t.stock_out}</option>
                  </select>
                </div>
                <NumericInput 
                  name="quantity" 
                  required 
                  placeholder="0"
                  label={t.quantity}
                  icon={<Layers size={12} />}
                  error={errors.quantity}
                />
                <SmartInput 
                  name="bill_number" 
                  label={t.bill_number}
                  icon={<Hash size={12} />}
                  placeholder="Optional"
                />
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Info size={12} />
                    {t.description}
                  </label>
                  <input 
                    name="description" 
                    type="text" 
                    placeholder="Optional details..."
                    className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-500 transition-colors text-sm" 
                  />
                </div>
                <div className="lg:col-span-6 flex justify-end pt-2">
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between shadow-soft"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-500/10 text-green-500">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t.stock_in}</p>
              <p className="text-xl font-bold text-green-500">{totalStockIn.toLocaleString()}</p>
            </div>
          </div>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between shadow-soft"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500">
              <TrendingUp size={20} className="rotate-180" />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t.stock_out}</p>
              <p className="text-xl font-bold text-red-500">{totalStockOut.toLocaleString()}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Inventory Summary */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold tracking-tight flex items-center gap-2">
          <Layers className="text-brand-500" size={20} />
          {t.stock_inventory || 'Stock Inventory'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {inventorySummary.map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-card border border-border rounded-2xl p-4 shadow-soft"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold truncate pr-2">{item.name}</span>
                <span className={cn(
                  "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                  item.balance > 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                )}>
                  {item.balance > 0 ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase">{t.stock_in}</p>
                  <p className="text-xs font-bold text-green-500">{item.in}</p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase">{t.stock_out}</p>
                  <p className="text-xs font-bold text-red-500">{item.out}</p>
                </div>
                <div className="bg-muted/50 rounded-lg py-1">
                  <p className="text-[8px] font-bold text-muted-foreground uppercase">{t.total}</p>
                  <p className="text-xs font-black">{item.balance}</p>
                </div>
              </div>
            </motion.div>
          ))}
          {inventorySummary.length === 0 && (
            <div className="col-span-full p-8 text-center bg-muted/20 rounded-2xl border border-dashed border-border">
              <p className="text-sm text-muted-foreground">No items in inventory</p>
            </div>
          )}
        </div>
      </div>

      {/* Table View */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-start">
                  <div className="flex items-center gap-2">
                    <Box size={14} />
                    {t.item_name}
                  </div>
                </th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-start">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} />
                    {t.date}
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
                    <Layers size={14} />
                    {t.quantity}
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
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-brand-500" />
                      <span className="text-sm font-bold">{entry.item_name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm font-medium">
                    <div className="font-bold text-foreground">{formatShamsi(entry.date, 'YYYY/MM/DD')} <span className="text-xs font-semibold text-muted-foreground">({formatShamsi(entry.date, 'full')})</span></div>
                    <div className="text-[11px] text-brand-500 font-mono font-bold">USA: {format(new Date(entry.date), 'yyyy-MM-dd')}</div>
                  </td>
                  <td className="p-4">
                    <span className={cn(
                      "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border",
                      entry.type === 'in' 
                        ? "bg-green-500/10 text-green-500 border-green-500/20" 
                        : "bg-red-500/10 text-red-500 border-red-500/20"
                    )}>
                      {entry.type === 'in' ? t.stock_in : t.stock_out}
                    </span>
                  </td>
                  <td className={cn(
                    "p-4 font-bold text-sm",
                    entry.type === 'in' ? "text-green-500" : "text-red-500"
                  )}>
                    {entry.type === 'in' ? '+' : '-'}{entry.quantity.toLocaleString()}
                  </td>
                  <td className="p-4 text-sm text-muted-foreground font-mono">
                    {entry.bill_number || '-'}
                  </td>
                  <td className="p-4 text-sm text-foreground/80 font-medium">
                    {entry.description}
                  </td>
                  <td className="p-4 text-end">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => printSingleStockVoucher(entry)}
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
              <Package size={32} />
            </div>
            <p className="text-muted-foreground font-medium">{t.no_data}</p>
          </div>
        )}
      </div>
    </div>
  );
}
