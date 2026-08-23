import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { 
  Plus, 
  User, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Receipt, 
  Calendar, 
  Info, 
  Hash, 
  DollarSign,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Trash2,
  Search,
  ChevronRight,
  Printer,
  Download,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { formatShamsi, isDateInRange } from '../lib/shamsi';
import Pagination from '../components/Pagination';
import { KataTransaction, KataSummary, Customer } from '../types';
import { openPrintablePDFWindow, exportToPDF } from '../lib/pdfUtils';

interface KataProps {
  transactions: KataTransaction[];
  summaries: KataSummary[];
  customers: Customer[];
  t: any;
  query: string;
  dateFilter: { start: string; end: string };
  billFilter: string;
  onAdd: (data: any) => Promise<void>;
  onAddClick: () => void;
  onEdit: (entry: any) => void;
  onDelete: (id: number) => Promise<void>;
}

export default function Kata({ transactions, summaries, customers, t, query, dateFilter, billFilter, onAdd, onAddClick, onEdit, onDelete }: KataProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<KataSummary | null>(null);
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [summaryPage, setSummaryPage] = useState(1);
  const itemsPerPage = 10;
  const summariesPerPage = 6;

  const filteredSummaries = useMemo(() => {
    const q = query.toLowerCase().trim();
    return summaries.filter(s => {
      const cust = customers.find(c => c.id === s.customer_id);
      const curr = s.currency || 'AFN';

      const matchesCurrency = currencyFilter === 'all' || curr === currencyFilter;
      const matchesQuery = !q ||
        (s.customer_name || '').toLowerCase().includes(q) ||
        (cust?.contact || '').toLowerCase().includes(q) ||
        (cust?.address || '').toLowerCase().includes(q) ||
        curr.toLowerCase().includes(q) ||
        s.total_purchase.toString().includes(q) ||
        s.total_paid.toString().includes(q) ||
        s.remaining_balance.toString().includes(q) ||
        s.customer_id.toString().includes(q);

      return matchesCurrency && matchesQuery;
    });
  }, [summaries, customers, query, currencyFilter]);

  const paginatedSummaries = useMemo(() => {
    const start = (summaryPage - 1) * summariesPerPage;
    return filteredSummaries.slice(start, start + summariesPerPage);
  }, [filteredSummaries, summaryPage]);

  const totalSummaryPages = Math.ceil(filteredSummaries.length / summariesPerPage);

  const filteredTransactions = useMemo(() => {
    let data = selectedCustomer 
      ? transactions.filter(t => t.customer_id === selectedCustomer.customer_id && (t.currency || 'AFN') === (selectedCustomer.currency || 'AFN'))
      : transactions;

    if (currencyFilter !== 'all') {
      data = data.filter(t => (t.currency || 'AFN') === currencyFilter);
    }

    const q = query.toLowerCase().trim();

    return data.filter(e => {
      const cust = customers.find(c => c.id === e.customer_id);
      const customerName = cust?.name || '';
      const customerPhone = cust?.contact || '';
      const customerAddress = cust?.address || '';
      const curr = e.currency || 'AFN';

      const isPurchase = (e.type as string) === 'purchase' || (e.type as string) === 'debit';
      const typeText = isPurchase ? (t.purchase || 'purchase').toLowerCase() : (t.payment || 'payment').toLowerCase();

      const matchesQuery = !q ||
        customerName.toLowerCase().includes(q) ||
        customerPhone.toLowerCase().includes(q) ||
        customerAddress.toLowerCase().includes(q) ||
        curr.toLowerCase().includes(q) ||
        (e.bill_number || '').toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q) ||
        e.amount.toString().includes(q) ||
        e.id.toString().includes(q) ||
        e.date.toLowerCase().includes(q) ||
        typeText.includes(q);
      
      const matchesDate = (dateFilter.start || dateFilter.end) 
        ? isDateInRange(e.date, dateFilter.start, dateFilter.end)
        : true;
      
      const bf = billFilter.toLowerCase().trim();
      const matchesBill = !bf ||
        customerName.toLowerCase().includes(bf) ||
        customerPhone.toLowerCase().includes(bf) ||
        (e.bill_number || '').toLowerCase().includes(bf) ||
        (e.description || '').toLowerCase().includes(bf) ||
        e.amount.toString().includes(bf) ||
        e.date.toLowerCase().includes(bf);

      return matchesQuery && matchesDate && matchesBill;
    }).sort((a, b) => b.id - a.id || new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedCustomer, currencyFilter, query, dateFilter, billFilter, customers, t]);

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(start, start + itemsPerPage);
  }, [filteredTransactions, currentPage]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  const buildKataReportData = () => {
    const isRTL = document.documentElement.dir === 'rtl';
    const title = selectedCustomer ? `${selectedCustomer.customer_name} (${selectedCustomer.currency || 'AFN'}) - Kata Ledger Report` : 'Kata All Transactions Report';
    const dateRange = dateFilter.start || dateFilter.end ? ` (${dateFilter.start ? formatShamsi(dateFilter.start, 'full') : 'Start'} to ${dateFilter.end ? formatShamsi(dateFilter.end, 'full') : 'End'})` : '';

    let tableRows = filteredTransactions.map(tx => `
      <tr>
        <td>
          <div style="font-weight:700">${formatShamsi(tx.date, 'YYYY/MM/DD')} (${formatShamsi(tx.date, 'full')})</div>
          <div style="font-size:10px; color:#2563eb; font-family:monospace; font-weight:bold;">USA: ${format(new Date(tx.date), 'yyyy-MM-dd')}</div>
        </td>
        ${!selectedCustomer ? `<td>${customers.find(c => c.id === tx.customer_id)?.name || 'Unknown'}</td>` : ''}
        <td>${tx.type === 'purchase' ? (t.purchase || 'Purchase') : (t.payment || 'Payment')}</td>
        <td><strong>${tx.currency || 'AFN'}</strong></td>
        <td>${tx.bill_number || '-'}</td>
        <td class="${tx.type === 'purchase' ? 'badge-expense' : 'badge-income'}">
          ${tx.type === 'purchase' ? '+' : '-'}${tx.amount.toLocaleString()} ${tx.currency || 'AFN'}
        </td>
        <td>${tx.description || '-'}</td>
      </tr>
    `).join('');

    const summaryHtml = selectedCustomer ? `
      <div class="summary-grid">
        <div class="summary-card">
          <h3>${t.total_purchase || 'Total Purchase'}</h3>
          <p>${selectedCustomer.total_purchase.toLocaleString()} ${selectedCustomer.currency || 'AFN'}</p>
        </div>
        <div class="summary-card">
          <h3>${t.total_paid || 'Total Paid'}</h3>
          <p class="badge-income">${selectedCustomer.total_paid.toLocaleString()} ${selectedCustomer.currency || 'AFN'}</p>
        </div>
        <div class="summary-card">
          <h3>${t.remaining_balance || 'Remaining Balance'}</h3>
          <p class="${selectedCustomer.remaining_balance > 0 ? 'badge-expense' : 'badge-income'}">${selectedCustomer.remaining_balance.toLocaleString()} ${selectedCustomer.currency || 'AFN'}</p>
        </div>
      </div>
    ` : '';

    const contentHtml = `
      <div class="header">
        <h1>${title}</h1>
        <p>Generated on ${formatShamsi(new Date(), 'full')}${dateRange}</p>
      </div>
      ${summaryHtml}
      <table>
        <thead>
          <tr>
            <th>${t.date || 'Date'}</th>
            ${!selectedCustomer ? `<th>${t.customer || 'Customer'}</th>` : ''}
            <th>${t.type || 'Type'}</th>
            <th>${t.currency || 'Currency'}</th>
            <th>${t.bill_number || 'Bill #'}</th>
            <th>${t.amount || 'Amount'}</th>
            <th>${t.description || 'Description'}</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      <div class="footer">
        <p>Printed by Shop MIS System</p>
      </div>
    `;

    return {
      title,
      filename: `kata_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`,
      contentHtml,
      isRTL
    };
  };

  const handlePrint = () => {
    openPrintablePDFWindow(buildKataReportData());
  };

  const handleDownloadPDF = () => {
    const data = buildKataReportData();
    exportToPDF(data.contentHtml, data.filename, data.title, data.isRTL);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-brand-500/10 text-brand-500">
              <Wallet size={32} />
            </div>
            {t.kata}
          </h2>
          <p className="text-muted-foreground font-medium mt-1">Automatic balance tracking & Roznamcha sync</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Currency Filter Dropdown/Pills */}
          <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border">
            {['all', 'AFN', 'USD', 'EUR', 'PKR'].map((curr) => (
              <button
                key={curr}
                onClick={() => {
                  setCurrencyFilter(curr);
                  setCurrentPage(1);
                  setSummaryPage(1);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  currencyFilter === curr 
                    ? "bg-brand-500 text-white shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {curr === 'all' ? (t.all || 'All') : curr}
              </button>
            ))}
          </div>

          <button
            onClick={onAddClick}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-brand-500/20"
          >
            <Plus size={20} />
            {t.add_entry}
          </button>
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
          {selectedCustomer && (
            <button
              onClick={() => {
                setSelectedCustomer(null);
                setCurrentPage(1);
              }}
              className="flex items-center gap-2 text-sm font-bold text-brand-500 hover:underline"
            >
              <ChevronRight className="rotate-180" size={16} />
              View All Customers
            </button>
          )}
        </div>
      </div>

      {/* Selected Customer Top Banner Header */}
      {selectedCustomer && (
        <div className="bg-gradient-to-r from-brand-500/15 via-brand-500/5 to-transparent border border-brand-500/30 rounded-3xl p-6 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-500 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-brand-500/30 shrink-0">
              <User size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-500">
                  {t.customer_ledger || 'Customer Ledger'}
                </span>
                <span className="text-xs font-bold text-muted-foreground">
                  Customer ID: #{selectedCustomer.customer_id}
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-blue-500/10 text-blue-500 border border-blue-500/20 text-xs font-bold">
                  {selectedCustomer.currency || 'AFN'}
                </span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground mt-1 break-words">
                {selectedCustomer.customer_name} ({selectedCustomer.currency || 'AFN'})
              </h3>
              {customers.find(c => c.id === selectedCustomer.customer_id)?.contact && (
                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                  Contact: {customers.find(c => c.id === selectedCustomer.customer_id)?.contact}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedCustomer(null);
              setCurrentPage(1);
            }}
            className="flex items-center justify-center gap-2 bg-card hover:bg-muted text-foreground border border-border px-5 py-2.5 rounded-2xl font-bold text-sm transition-all shadow-sm shrink-0"
          >
            <ChevronRight className="rotate-180" size={18} />
            View All Customers
          </button>
        </div>
      )}

      {/* Summaries Grid */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {!selectedCustomer ? (
            paginatedSummaries.map((summary, index) => (
              <SummaryCard 
                key={`${summary.customer_id}-${summary.currency || 'AFN'}`} 
                summary={summary} 
                t={t} 
                onClick={() => setSelectedCustomer(summary)}
                index={index}
              />
            ))
          ) : (
            <>
              <StatCard 
                title={t.total_purchase} 
                value={selectedCustomer.total_purchase}
                currency={selectedCustomer.currency || 'AFN'} 
                icon={ArrowUpRight} 
                color="red" 
              />
              <StatCard 
                title={t.total_paid} 
                value={selectedCustomer.total_paid} 
                currency={selectedCustomer.currency || 'AFN'}
                icon={ArrowDownLeft} 
                color="green" 
              />
              <StatCard 
                title={selectedCustomer.remaining_balance < 0 ? (t.advance_payment || 'Advance Payment') : (t.remaining || 'Remaining Balance')} 
                value={Math.abs(selectedCustomer.remaining_balance)} 
                currency={selectedCustomer.currency || 'AFN'}
                icon={Wallet} 
                color={selectedCustomer.remaining_balance < 0 ? 'green' : selectedCustomer.remaining_balance > 0 ? 'red' : 'brand'} 
                isBalance
                isAdvance={selectedCustomer.remaining_balance < 0}
              />
            </>
          )}
        </div>

        {/* Summary Pagination */}
        {!selectedCustomer && (
          <Pagination
            currentPage={summaryPage}
            totalPages={totalSummaryPages}
            totalItems={filteredSummaries.length}
            itemsPerPage={summariesPerPage}
            onPageChange={(p) => setSummaryPage(p)}
            t={t}
          />
        )}
      </div>

      {/* Transactions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Receipt className="text-brand-500" size={20} />
            {selectedCustomer ? `${selectedCustomer.customer_name}'s ${t.transaction_history}` : t.recent_entries}
          </h3>
        </div>

        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="p-5 text-xs font-black text-muted-foreground uppercase tracking-widest text-start">{t.date}</th>
                  {!selectedCustomer && <th className="p-5 text-xs font-black text-muted-foreground uppercase tracking-widest text-start">{t.customer_name}</th>}
                  <th className="p-5 text-xs font-black text-muted-foreground uppercase tracking-widest text-start">{t.type}</th>
                  <th className="p-5 text-xs font-black text-muted-foreground uppercase tracking-widest text-start">{t.currency || 'Currency'}</th>
                  <th className="p-5 text-xs font-black text-muted-foreground uppercase tracking-widest text-start">{t.bill_number}</th>
                  <th className="p-5 text-xs font-black text-muted-foreground uppercase tracking-widest text-start">{t.amount}</th>
                  <th className="p-5 text-xs font-black text-muted-foreground uppercase tracking-widest text-start">{t.description}</th>
                  <th className="p-5 text-xs font-black text-muted-foreground uppercase tracking-widest text-end">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedTransactions.map((tx, index) => (
                  <motion.tr 
                    key={tx.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    <td className="p-5 text-sm font-bold">
                      <div className="font-bold text-foreground">☀️ {formatShamsi(tx.date, 'YYYY/MM/DD')} <span className="text-xs font-semibold text-muted-foreground">({formatShamsi(tx.date, 'full')})</span></div>
                      <div className="text-[11px] text-brand-500 font-mono font-bold">📅 USA: {format(new Date(tx.date), 'yyyy-MM-dd')}</div>
                    </td>
                    {!selectedCustomer && (
                      <td className="p-5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-500">
                            <User size={14} />
                          </div>
                          <span className="text-sm font-bold">{customers.find(c => c.id === tx.customer_id)?.name || 'Unknown'}</span>
                        </div>
                      </td>
                    )}
                    <td className="p-5">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                        tx.type === 'purchase' 
                          ? "bg-red-500/10 text-red-500 border-red-500/20" 
                          : "bg-green-500/10 text-green-500 border-green-500/20"
                      )}>
                        {tx.type === 'purchase' ? t.purchase : t.payment}
                      </span>
                    </td>
                    <td className="p-5">
                      <span className="px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-500 border border-blue-500/20 text-xs font-bold">
                        {tx.currency || 'AFN'}
                      </span>
                    </td>
                    <td className="p-5 text-sm font-mono text-muted-foreground">
                      {tx.bill_number || '-'}
                    </td>
                    <td className={cn(
                      "p-5 font-black text-sm",
                      tx.type === 'purchase' ? "text-red-500" : "text-green-500"
                    )}>
                      {tx.type === 'purchase' ? '+' : '-'}{tx.amount.toLocaleString()} <span className="text-xs opacity-75">{tx.currency || 'AFN'}</span>
                    </td>
                    <td className="p-5 text-sm text-foreground/70 font-medium">
                      {tx.description || '-'}
                    </td>
                    <td className="p-5 text-end">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => onEdit(tx)}
                          className="p-2 rounded-xl bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-all"
                          title={t.edit || 'Edit'}
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          onClick={() => onDelete(tx.id)}
                          className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                          title={t.delete || 'Delete'}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredTransactions.length === 0 && (
            <div className="p-20 text-center">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6 text-muted-foreground">
                <Search size={40} />
              </div>
              <h4 className="text-xl font-bold mb-2">No transactions found</h4>
              <p className="text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          )}
          
          {/* Pagination */}
          <div className="p-4 border-t border-border bg-muted/20">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredTransactions.length}
              itemsPerPage={itemsPerPage}
              onPageChange={(p) => setCurrentPage(p)}
              t={t}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const SummaryCard: React.FC<{ summary: KataSummary, t: any, onClick: () => void, index: number }> = ({ summary, t, onClick, index }) => {
  const isAdvance = summary.remaining_balance < 0;
  const isSettled = summary.remaining_balance === 0;
  const curr = summary.currency || 'AFN';

  const totalPurchaseStr = `${summary.total_purchase.toLocaleString()} ${curr}`;
  const remainingStr = `${Math.abs(summary.remaining_balance).toLocaleString()} ${curr}`;

  const getDynamicClass = (str: string) => {
    if (str.length > 20) return "text-xs font-black break-all leading-tight";
    if (str.length > 14) return "text-sm font-black break-all leading-tight";
    if (str.length > 10) return "text-base font-black break-all leading-tight";
    return "text-lg font-black break-all tracking-tight leading-tight";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={onClick}
      className="bg-card border border-border rounded-3xl p-6 shadow-soft hover:border-brand-500/30 transition-all group cursor-pointer relative overflow-hidden flex flex-col justify-between"
    >
      <div className="flex items-start gap-3 mb-5 min-w-0">
        <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-500 transition-transform group-hover:scale-110 shrink-0">
          <User size={24} />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <h4 className="font-black text-base sm:text-lg tracking-tight text-foreground break-words min-w-0">
              {summary.customer_name}
            </h4>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[10px] font-bold">
                {curr}
              </span>
              <div className={cn(
                "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 whitespace-nowrap",
                isAdvance ? "bg-green-500/10 text-green-500" : isSettled ? "bg-brand-500/10 text-brand-500" : "bg-red-500/10 text-red-500"
              )}>
                {isAdvance ? (t.advance_payment || 'Advance') : isSettled ? (t.settled || 'Settled') : (t.unpaid || 'Unpaid')}
              </div>
            </div>
          </div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest break-all">
            Customer ID: #{summary.customer_id}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/40">
        <div className="space-y-1 min-w-0">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest break-words">{t.total_purchase}</p>
          <p className={getDynamicClass(totalPurchaseStr)}>{totalPurchaseStr}</p>
        </div>
        <div className="space-y-1 min-w-0">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest break-words">
            {isAdvance ? (t.advance_payment || 'Advance Payment') : (t.remaining || 'Remaining Balance')}
          </p>
          <p className={cn(getDynamicClass(remainingStr), isAdvance ? "text-green-500" : isSettled ? "text-foreground" : "text-red-500")}>
            {remainingStr}
          </p>
        </div>
      </div>

      <div className="absolute -bottom-2 -right-2 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
        <Wallet size={80} />
      </div>
    </motion.div>
  );
}

function StatCard({ title, value, currency, icon: Icon, color, isBalance, isAdvance }: { title: string, value: number, currency?: string, icon: any, color: string, isBalance?: boolean, isAdvance?: boolean }) {
  const colorClasses = {
    green: "bg-green-500/10 text-green-500",
    red: "bg-red-500/10 text-red-500",
    brand: "bg-brand-500/10 text-brand-500"
  };

  const curr = currency || 'AFN';
  const valStr = `${value.toLocaleString()} ${curr}`;
  const fontSizeClass = valStr.length > 20 ? "text-xl sm:text-2xl" : valStr.length > 14 ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl";

  return (
    <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-soft relative overflow-hidden group min-w-0">
      <div className="flex items-center justify-between mb-6">
        <div className={cn("p-4 rounded-2xl transition-transform group-hover:scale-110 duration-500 shrink-0", colorClasses[color as keyof typeof colorClasses])}>
          <Icon size={28} />
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 text-xs font-bold">
          {curr}
        </span>
      </div>
      <p className="text-muted-foreground text-xs font-black uppercase tracking-widest mb-1 break-words">{title}</p>
      <h4 className={cn(
        "font-black tracking-tighter break-all min-w-0",
        fontSizeClass,
        isBalance && (isAdvance ? "text-green-500" : value > 0 ? "text-red-500" : "text-green-500")
      )}>
        {valStr}
      </h4>
      
      <div className="absolute -bottom-4 -right-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity duration-500 pointer-events-none">
        <Icon size={120} />
      </div>
    </div>
  );
}
