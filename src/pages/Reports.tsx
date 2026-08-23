import React, { useState, useMemo } from 'react';
import { format, startOfWeek, startOfMonth, startOfYear, isWithinInterval, parseISO } from 'date-fns';
import { 
  FileText, 
  Calendar, 
  Printer, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BookOpen, 
  Users, 
  Package, 
  Filter,
  Search,
  CheckCircle2,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  User
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';
import CustomerSelect from '../components/CustomerSelect';
import Pagination from '../components/Pagination';
import { 
  getTodayShamsi, 
  getShamsiStartOfWeek, 
  getShamsiStartOfMonth, 
  getShamsiStartOfYear, 
  formatShamsi,
  isDateInRange
} from '../lib/shamsi';
import { RoznamchaEntry, KataTransaction, KataSummary, StockEntry, Customer, Currency } from '../types';
import { openPrintablePDFWindow, exportToPDF, printViaIframe, downloadPDFDirectly } from '../lib/pdfUtils';
import PrintPreviewModal from '../components/PrintPreviewModal';

interface ReportsProps {
  roznamchaData: RoznamchaEntry[];
  kataTransactions: KataTransaction[];
  kataSummaries?: KataSummary[];
  stockData: StockEntry[];
  customers: Customer[];
  t: any;
  shopName?: string;
  shopAddress?: string;
}

export default function Reports({
  roznamchaData,
  kataTransactions,
  kataSummaries = [],
  stockData,
  customers,
  t,
  shopName = 'Kabul Electronics',
  shopAddress = 'Kabul, Afghanistan'
}: ReportsProps) {
  // Default date filter to "Today" (Shamsi)
  const todayStr = getTodayShamsi().gregStr;
  const monthStartStr = getShamsiStartOfMonth();

  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [activeReportTab, setActiveReportTab] = useState<'financial' | 'roznamcha' | 'kata' | 'stock' | 'customers' | 'single_customer'>('financial');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerReportId, setSelectedCustomerReportId] = useState<number | 'all'>('all');

  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;
  const [previewModalData, setPreviewModalData] = useState<{
    isOpen: boolean;
    title: string;
    filename: string;
    contentHtml: string;
    isRTL: boolean;
  }>({
    isOpen: false,
    title: '',
    filename: '',
    contentHtml: '',
    isRTL: false,
  });

  React.useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, activeReportTab, currencyFilter, searchQuery, selectedCustomerReportId]);

  const selectedCustomerObj = useMemo(() => {
    if (selectedCustomerReportId === 'all') return null;
    return customers.find(c => c.id === selectedCustomerReportId) || null;
  }, [customers, selectedCustomerReportId]);

  const singleCustomerTransactions = useMemo(() => {
    if (!selectedCustomerObj) return [];
    return kataTransactions
      .filter(t => t.customer_id === selectedCustomerObj.id)
      .sort((a, b) => b.id - a.id || new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [kataTransactions, selectedCustomerObj]);

  const singleCustomerCurrencySummary = useMemo(() => {
    const map: Record<string, { totalPurchase: number; totalPaid: number; remainingBalance: number }> = {
      AFN: { totalPurchase: 0, totalPaid: 0, remainingBalance: 0 },
      USD: { totalPurchase: 0, totalPaid: 0, remainingBalance: 0 },
      EUR: { totalPurchase: 0, totalPaid: 0, remainingBalance: 0 },
      PKR: { totalPurchase: 0, totalPaid: 0, remainingBalance: 0 },
    };

    if (selectedCustomerObj) {
      const custTrans = kataTransactions.filter(t => t.customer_id === selectedCustomerObj.id);
      custTrans.forEach(t => {
        const curr = t.currency || 'AFN';
        if (!map[curr]) map[curr] = { totalPurchase: 0, totalPaid: 0, remainingBalance: 0 };
        const isPurchase = (t.type as string) === 'purchase' || (t.type as string) === 'debit';
        if (isPurchase) map[curr].totalPurchase += t.amount || 0;
        else map[curr].totalPaid += t.amount || 0;
        map[curr].remainingBalance = map[curr].totalPurchase - map[curr].totalPaid;
      });
    }

    return map;
  }, [kataTransactions, selectedCustomerObj]);

  // Quick Preset Handlers
  const handlePreset = (preset: 'today' | 'week' | 'month' | 'year' | 'all') => {
    const todayFormatted = getTodayShamsi().gregStr;

    if (preset === 'today') {
      setStartDate(todayFormatted);
      setEndDate(todayFormatted);
    } else if (preset === 'week') {
      setStartDate(getShamsiStartOfWeek());
      setEndDate(todayFormatted);
    } else if (preset === 'month') {
      setStartDate(getShamsiStartOfMonth());
      setEndDate(todayFormatted);
    } else if (preset === 'year') {
      setStartDate(getShamsiStartOfYear());
      setEndDate(todayFormatted);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Helper date filter check
  const isDateInFilter = (dateStr: string) => {
    return isDateInRange(dateStr, startDate, endDate);
  };

  // Filtered Datasets based on Date Range, Search Query & Currency Filter
  const filteredRoznamcha = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return roznamchaData.filter(e => {
      if (!isDateInFilter(e.date)) return false;
      const curr = e.currency || 'AFN';
      if (currencyFilter !== 'all' && curr !== currencyFilter) return false;
      if (!q) return true;
      const cust = customers.find(c => c.id === e.customer_id);
      const cName = cust?.name || '';
      const cPhone = cust?.contact || '';
      const cAddress = cust?.address || '';
      return (
        (e.description || '').toLowerCase().includes(q) ||
        (e.bill_number || '').toLowerCase().includes(q) ||
        cName.toLowerCase().includes(q) ||
        cPhone.toLowerCase().includes(q) ||
        cAddress.toLowerCase().includes(q) ||
        curr.toLowerCase().includes(q) ||
        e.amount.toString().includes(q) ||
        e.id.toString().includes(q) ||
        e.date.toLowerCase().includes(q)
      );
    });
  }, [roznamchaData, startDate, endDate, searchQuery, currencyFilter, customers]);

  const filteredKata = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return kataTransactions.filter(e => {
      if (!isDateInFilter(e.date)) return false;
      const curr = e.currency || 'AFN';
      if (currencyFilter !== 'all' && curr !== currencyFilter) return false;
      if (!q) return true;
      const cust = customers.find(c => c.id === e.customer_id);
      const cName = cust?.name || '';
      const cPhone = cust?.contact || '';
      const cAddress = cust?.address || '';
      return (
        (e.description || '').toLowerCase().includes(q) ||
        (e.bill_number || '').toLowerCase().includes(q) ||
        cName.toLowerCase().includes(q) ||
        cPhone.toLowerCase().includes(q) ||
        cAddress.toLowerCase().includes(q) ||
        curr.toLowerCase().includes(q) ||
        e.amount.toString().includes(q) ||
        e.id.toString().includes(q) ||
        e.date.toLowerCase().includes(q)
      );
    });
  }, [kataTransactions, startDate, endDate, searchQuery, currencyFilter, customers]);

  const filteredStock = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return stockData.filter(e => {
      if (!isDateInFilter(e.date)) return false;
      if (!q) return true;
      return (
        (e.item_name || '').toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q) ||
        (e.bill_number || '').toLowerCase().includes(q) ||
        e.quantity.toString().includes(q) ||
        e.id.toString().includes(q) ||
        e.date.toLowerCase().includes(q)
      );
    });
  }, [stockData, startDate, endDate, searchQuery]);

  const paginatedRoznamcha = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRoznamcha.slice(start, start + itemsPerPage);
  }, [filteredRoznamcha, currentPage]);
  const totalPagesRoznamcha = Math.ceil(filteredRoznamcha.length / itemsPerPage);

  const paginatedKata = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredKata.slice(start, start + itemsPerPage);
  }, [filteredKata, currentPage]);
  const totalPagesKata = Math.ceil(filteredKata.length / itemsPerPage);

  const paginatedStock = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStock.slice(start, start + itemsPerPage);
  }, [filteredStock, currentPage]);
  const totalPagesStock = Math.ceil(filteredStock.length / itemsPerPage);

  const filteredCustomerSummaries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    // Map customer transactions by customer_id and currency
    const map: Record<string, { total_purchase: number; total_paid: number }> = {};
    
    kataTransactions.forEach(t => {
      const custId = t.customer_id;
      if (!custId) return;
      const curr = t.currency || 'AFN';
      const key = `${custId}___${curr}`;
      if (!map[key]) map[key] = { total_purchase: 0, total_paid: 0 };
      const isPurchase = (t.type as string) === 'purchase' || (t.type as string) === 'debit';
      if (isPurchase) map[key].total_purchase += (t.amount || 0);
      else map[key].total_paid += (t.amount || 0);
    });

    const resultList: KataSummary[] = [];
    const customerIdsWithTx = new Set<number>();

    // 1. Add summaries from transaction aggregation
    for (const [key, val] of Object.entries(map)) {
      const [custIdStr, curr] = key.split('___');
      const custId = Number(custIdStr);
      customerIdsWithTx.add(custId);
      const cust = customers.find(c => c.id === custId);
      resultList.push({
        customer_id: custId,
        customer_name: cust?.name || `Customer #${custId}`,
        currency: curr as Currency,
        total_purchase: val.total_purchase,
        total_paid: val.total_paid,
        remaining_balance: val.total_purchase - val.total_paid
      });
    }

    // 2. Add any existing kataSummaries from DB if not already present
    kataSummaries.forEach(s => {
      const key = `${s.customer_id}___${s.currency || 'AFN'}`;
      if (!map[key]) {
        customerIdsWithTx.add(s.customer_id);
        const cust = customers.find(c => c.id === s.customer_id);
        resultList.push({
          customer_id: s.customer_id,
          customer_name: cust?.name || s.customer_name || `Customer #${s.customer_id}`,
          currency: s.currency || 'AFN',
          total_purchase: s.total_purchase || 0,
          total_paid: s.total_paid || 0,
          remaining_balance: (s.total_purchase || 0) - (s.total_paid || 0)
        });
      }
    });

    // 3. Add all remaining customers from customers prop (so all customer accounts are listed)
    customers.forEach(c => {
      if (!customerIdsWithTx.has(c.id)) {
        resultList.push({
          customer_id: c.id,
          customer_name: c.name,
          currency: 'AFN',
          total_purchase: 0,
          total_paid: 0,
          remaining_balance: 0
        });
      }
    });

    // 4. Apply currency filter & search query
    return resultList.filter(s => {
      if (currencyFilter !== 'all' && (s.currency || 'AFN') !== currencyFilter) return false;
      if (!q) return true;
      const cust = customers.find(c => c.id === s.customer_id);
      const custName = cust?.name || s.customer_name || '';
      const phone = cust?.contact || '';
      const address = cust?.address || '';
      return (
        custName.toLowerCase().includes(q) ||
        phone.toLowerCase().includes(q) ||
        address.toLowerCase().includes(q) ||
        s.customer_id.toString().includes(q) ||
        (s.currency || '').toLowerCase().includes(q)
      );
    }).sort((a, b) => a.customer_id - b.customer_id);
  }, [customers, kataTransactions, kataSummaries, currencyFilter, searchQuery]);

  const paginatedCustomerSummaries = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCustomerSummaries.slice(start, start + itemsPerPage);
  }, [filteredCustomerSummaries, currentPage]);
  const totalPagesCustomers = Math.ceil(filteredCustomerSummaries.length / itemsPerPage);

  const paginatedSingleCustomer = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return singleCustomerTransactions.slice(start, start + itemsPerPage);
  }, [singleCustomerTransactions, currentPage]);
  const totalPagesSingleCustomer = Math.ceil(singleCustomerTransactions.length / itemsPerPage);

  // Totals grouped by currency
  const totalsByCurrency = useMemo(() => {
    const map: Record<string, { income: number; expense: number; kataPurchase: number; kataPayment: number; netCashflow: number }> = {
      AFN: { income: 0, expense: 0, kataPurchase: 0, kataPayment: 0, netCashflow: 0 },
      USD: { income: 0, expense: 0, kataPurchase: 0, kataPayment: 0, netCashflow: 0 },
      EUR: { income: 0, expense: 0, kataPurchase: 0, kataPayment: 0, netCashflow: 0 },
      PKR: { income: 0, expense: 0, kataPurchase: 0, kataPayment: 0, netCashflow: 0 },
    };

    filteredRoznamcha.forEach(e => {
      const curr = e.currency || 'AFN';
      if (!map[curr]) map[curr] = { income: 0, expense: 0, kataPurchase: 0, kataPayment: 0, netCashflow: 0 };
      if (e.type === 'income') map[curr].income += e.amount;
      else map[curr].expense += e.amount;
      map[curr].netCashflow = map[curr].income - map[curr].expense;
    });

    filteredKata.forEach(e => {
      const curr = e.currency || 'AFN';
      if (!map[curr]) map[curr] = { income: 0, expense: 0, kataPurchase: 0, kataPayment: 0, netCashflow: 0 };
      const isPurchase = (e.type as string) === 'purchase' || (e.type as string) === 'debit';
      if (isPurchase) map[curr].kataPurchase += e.amount;
      else map[curr].kataPayment += e.amount;
    });

    return map;
  }, [filteredRoznamcha, filteredKata]);

  // Overall Financial Aggregations
  const totals = useMemo(() => {
    const roznamchaIncome = filteredRoznamcha
      .filter(e => e.type === 'income')
      .reduce((sum, e) => sum + e.amount, 0);

    const roznamchaExpense = filteredRoznamcha
      .filter(e => e.type === 'expense')
      .reduce((sum, e) => sum + e.amount, 0);

    const kataDebits = filteredKata
      .filter(e => (e.type as string) === 'debit' || (e.type as string) === 'purchase')
      .reduce((sum, e) => sum + e.amount, 0);

    const kataCredits = filteredKata
      .filter(e => (e.type as string) === 'credit' || (e.type as string) === 'payment')
      .reduce((sum, e) => sum + e.amount, 0);

    const totalStockInQty = filteredStock
      .filter(e => e.type === 'in')
      .reduce((sum, e) => sum + e.quantity, 0);

    const totalStockOutQty = filteredStock
      .filter(e => e.type === 'out')
      .reduce((sum, e) => sum + e.quantity, 0);

    const netCashflow = roznamchaIncome - roznamchaExpense;

    return {
      roznamchaIncome,
      roznamchaExpense,
      kataDebits,
      kataCredits,
      totalStockInQty,
      totalStockOutQty,
      netCashflow
    };
  }, [filteredRoznamcha, filteredKata, filteredStock]);

  // Build Report HTML Data
  const buildReportHtml = () => {
    const isRTL = document.documentElement.dir === 'rtl';
    const dateRangeLabel = `${startDate ? formatShamsi(startDate, 'full') : (t.all_time || 'All Time')} ${t.to || 'to'} ${endDate ? formatShamsi(endDate, 'full') : formatShamsi(todayStr, 'full')}`;
    const title = `${t.reports || 'Report'} - ${shopName}`;

    let contentHtml = `
      <div class="header">
        <h1>${shopName}</h1>
        <p style="margin-top:2px; font-size:12px; color:#64748b;">${shopAddress}</p>
        <h2 style="margin-top:12px; font-size:18px; color:#0f172a;">${t.reports || 'Date Range Report'}</h2>
        <p style="margin-top:4px; font-weight:600; color:#475569;">${t.date_range || 'Date Range'}: ${dateRangeLabel}</p>
      </div>

      <div style="margin-top:20px; display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:10px;">
        ${['AFN', 'USD', 'EUR', 'PKR'].map(curr => {
          const tot = totalsByCurrency[curr];
          if (!tot || (tot.income === 0 && tot.expense === 0)) return '';
          return `
            <div class="summary-card" style="border: 1px solid #cbd5e1; border-radius:8px; padding:8px;">
              <h3 style="font-size:11px; margin-bottom:4px;">${curr} ${t.summary || 'Summary'}</h3>
              <p style="font-size:11px; font-weight:bold;" class="badge-income">+${tot.income.toLocaleString()} ${curr}</p>
              <p style="font-size:11px; font-weight:bold;" class="badge-expense">-${tot.expense.toLocaleString()} ${curr}</p>
              <p style="font-size:11px; font-weight:bold; margin-top:2px;">Net: ${tot.netCashflow >= 0 ? '+' : ''}${tot.netCashflow.toLocaleString()} ${curr}</p>
            </div>
          `;
        }).join('')}
      </div>
    `;

    if (activeReportTab === 'financial' || activeReportTab === 'roznamcha') {
      contentHtml += `
        <h3 style="margin-top: 24px; font-size: 15px; font-weight: 700; color: #0f172a;">
          ${t.roznamcha_report || 'Roznamcha Transactions'} (${filteredRoznamcha.length})
        </h3>
        <table>
          <thead>
            <tr>
              <th>${t.date || 'Date'}</th>
              <th>${t.customer_name || 'Customer Name'}</th>
              <th>${t.type || 'Type'}</th>
              <th>${t.currency || 'Currency'}</th>
              <th>${t.amount || 'Amount'}</th>
              <th>${t.bill_number || 'Bill #'}</th>
              <th>${t.description || 'Description'}</th>
            </tr>
          </thead>
          <tbody>
            ${filteredRoznamcha.length > 0 ? filteredRoznamcha.map(e => {
              const cName = customers.find(c => c.id === e.customer_id)?.name || '-';
              const curr = e.currency || 'AFN';
              return `
                <tr>
                  <td>${formatShamsi(e.date, 'full')}</td>
                  <td><strong>${cName}</strong></td>
                  <td class="${e.type === 'income' ? 'badge-income' : 'badge-expense'}">${e.type === 'income' ? (t.income || 'Payment') : (t.expense || 'Purchase')}</td>
                  <td><strong>${curr}</strong></td>
                  <td class="${e.type === 'income' ? 'badge-income' : 'badge-expense'}">${e.type === 'income' ? '+' : '-'}${e.amount.toLocaleString()}</td>
                  <td>${e.bill_number || '-'}</td>
                  <td>${e.description}</td>
                </tr>
              `;
            }).join('') : `<tr><td colspan="7" style="text-align:center;">${t.no_records_range || 'No records found'}</td></tr>`}
          </tbody>
        </table>
      `;
    }

    if (activeReportTab === 'financial' || activeReportTab === 'kata') {
      contentHtml += `
        <h3 style="margin-top: 28px; font-size: 15px; font-weight: 700; color: #0f172a;">
          ${t.kata_report || 'Kata Ledger Transactions'} (${filteredKata.length})
        </h3>
        <table>
          <thead>
            <tr>
              <th>${t.date || 'Date'}</th>
              <th>${t.customer_name || 'Customer Name'}</th>
              <th>${t.type || 'Type'}</th>
              <th>${t.currency || 'Currency'}</th>
              <th>${t.amount || 'Amount'}</th>
              <th>${t.bill_number || 'Bill #'}</th>
              <th>${t.description || 'Description'}</th>
            </tr>
          </thead>
          <tbody>
            ${filteredKata.length > 0 ? filteredKata.map(e => {
              const cName = customers.find(c => c.id === e.customer_id)?.name || '-';
              const isPurchase = (e.type as string) === 'debit' || (e.type as string) === 'purchase';
              const curr = e.currency || 'AFN';
              return `
                <tr>
                  <td>${formatShamsi(e.date, 'full')}</td>
                  <td><strong>${cName}</strong></td>
                  <td class="${isPurchase ? 'badge-expense' : 'badge-income'}">${isPurchase ? (t.purchase || 'Credit Purchase') : (t.payment || 'Debt Payment')}</td>
                  <td><strong>${curr}</strong></td>
                  <td class="${isPurchase ? 'badge-expense' : 'badge-income'}">${e.amount.toLocaleString()}</td>
                  <td>${e.bill_number || '-'}</td>
                  <td>${e.description}</td>
                </tr>
              `;
            }).join('') : `<tr><td colspan="7" style="text-align:center;">${t.no_records_range || 'No records found'}</td></tr>`}
          </tbody>
        </table>
      `;
    }

    if (activeReportTab === 'stock') {
      contentHtml += `
        <h3 style="margin-top: 28px; font-size: 15px; font-weight: 700; color: #0f172a;">
          ${t.stock_report || 'Stock Book Movements'} (${filteredStock.length})
        </h3>
        <table>
          <thead>
            <tr>
              <th>${t.date || 'Date'}</th>
              <th>${t.item_name || 'Item Name'}</th>
              <th>${t.type || 'Type'}</th>
              <th>${t.quantity || 'Quantity'}</th>
              <th>${t.bill_number || 'Bill #'}</th>
              <th>${t.description || 'Description'}</th>
            </tr>
          </thead>
          <tbody>
            ${filteredStock.length > 0 ? filteredStock.map(e => `
              <tr>
                <td>${formatShamsi(e.date, 'full')}</td>
                <td><strong>${e.item_name}</strong></td>
                <td class="${e.type === 'in' ? 'badge-income' : 'badge-expense'}">${e.type === 'in' ? (t.stock_in || 'Stock In') : (t.stock_out || 'Stock Out')}</td>
                <td>${e.quantity.toLocaleString()}</td>
                <td>${e.bill_number || '-'}</td>
                <td>${e.description}</td>
              </tr>
            `).join('') : `<tr><td colspan="6" style="text-align:center;">${t.no_records_range || 'No records found'}</td></tr>`}
          </tbody>
        </table>
      `;
    }

    if (activeReportTab === 'customers') {
      contentHtml += `
        <h3 style="margin-top: 28px; font-size: 15px; font-weight: 700; color: #0f172a;">
          ${t.customer_balances_report || 'Customer Account Summary'} (${filteredCustomerSummaries.length})
        </h3>
        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">#</th>
              <th>${t.customer_name || 'Name'}</th>
              <th>${t.currency || 'Currency'}</th>
              <th>${t.total_purchase || 'Total Purchases'}</th>
              <th>${t.total_paid || 'Total Paid'}</th>
              <th>${t.remaining_balance || 'Remaining Balance'}</th>
            </tr>
          </thead>
          <tbody>
            ${filteredCustomerSummaries.length > 0 ? filteredCustomerSummaries.map((s, idx) => {
              const cust = customers.find(c => c.id === s.customer_id);
              const custName = cust?.name || s.customer_name || 'Unknown';
              return `
                <tr>
                  <td style="text-align: center; color: #64748b; font-weight: bold;">${idx + 1}</td>
                  <td><strong>${custName}</strong></td>
                  <td><strong>${s.currency || 'AFN'}</strong></td>
                  <td>${s.total_purchase.toLocaleString()}</td>
                  <td class="badge-income">${s.total_paid.toLocaleString()}</td>
                  <td class="${s.remaining_balance > 0 ? 'badge-expense' : 'badge-income'}">${s.remaining_balance.toLocaleString()}</td>
                </tr>
              `;
            }).join('') : `<tr><td colspan="6" style="text-align:center;">${t.no_records_range || 'No records found'}</td></tr>`}
          </tbody>
        </table>
      `;
    }

    if (activeReportTab === 'single_customer' && selectedCustomerObj) {
      contentHtml = `
        <div class="header">
          <h1>${shopName}</h1>
          <p style="margin-top:2px; font-size:12px; color:#64748b;">${shopAddress}</p>
          <h2 style="margin-top:12px; font-size:18px; color:#0f172a;">Customer Multi-Currency Account Statement</h2>
        </div>

        <div style="margin-top:16px; padding:12px; border:1px solid #93c5fd; border-radius:8px; background-color:#eff6ff;">
          <h2 style="margin:0; font-size:16px; color:#1e40af;">Customer: ${selectedCustomerObj.name}</h2>
          <p style="margin:4px 0 0 0; font-size:12px; color:#475569;">Contact: ${selectedCustomerObj.contact || '-'} | Address: ${selectedCustomerObj.address || '-'}</p>
        </div>

        <h3 style="margin-top: 20px; font-size: 14px; font-weight: 700; color: #0f172a;">
          Account Balances across All Currencies
        </h3>
        <table style="margin-top:8px;">
          <thead>
            <tr>
              <th>Currency</th>
              <th>Total Purchases</th>
              <th>Total Paid</th>
              <th>Remaining Balance</th>
            </tr>
          </thead>
          <tbody>
            ${['AFN', 'USD', 'EUR', 'PKR'].map(curr => {
              const s = singleCustomerCurrencySummary[curr];
              if (!s || (s.totalPurchase === 0 && s.totalPaid === 0)) return '';
              return `
                <tr>
                  <td><strong>${curr}</strong></td>
                  <td class="badge-expense">${s.totalPurchase.toLocaleString()} ${curr}</td>
                  <td class="badge-income">${s.totalPaid.toLocaleString()} ${curr}</td>
                  <td><strong style="color:${s.remainingBalance > 0 ? '#ef4444' : '#22c55e'}">${s.remainingBalance.toLocaleString()} ${curr}</strong></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <h3 style="margin-top: 24px; font-size: 14px; font-weight: 700; color: #0f172a;">
          Complete Transaction Statement (${singleCustomerTransactions.length})
        </h3>
        <table>
          <thead>
            <tr>
              <th>${t.date || 'Date'}</th>
              <th>${t.type || 'Type'}</th>
              <th>${t.currency || 'Currency'}</th>
              <th>${t.amount || 'Amount'}</th>
              <th>${t.bill_number || 'Bill #'}</th>
              <th>${t.description || 'Description'}</th>
            </tr>
          </thead>
          <tbody>
            ${singleCustomerTransactions.length > 0 ? singleCustomerTransactions.map(e => {
              const isPurchase = (e.type as string) === 'purchase' || (e.type as string) === 'debit';
              const curr = e.currency || 'AFN';
              return `
                <tr>
                  <td>${formatShamsi(e.date, 'full')} (${format(new Date(e.date), 'yyyy-MM-dd')})</td>
                  <td class="${isPurchase ? 'badge-expense' : 'badge-income'}">${isPurchase ? 'Purchase' : 'Payment'}</td>
                  <td><strong>${curr}</strong></td>
                  <td class="${isPurchase ? 'badge-expense' : 'badge-income'}">${e.amount.toLocaleString()} ${curr}</td>
                  <td>${e.bill_number || '-'}</td>
                  <td>${e.description}</td>
                </tr>
              `;
            }).join('') : `<tr><td colspan="6" style="text-align:center;">No records found</td></tr>`}
          </tbody>
        </table>
      `;
    }

    contentHtml += `
      <div class="footer" style="margin-top: 30px;">
        <p>Report Generated on ${formatShamsi(new Date(), 'full')} | ${shopName} MIS</p>
      </div>
    `;

    return {
      title,
      filename: `report_${startDate || 'all'}_to_${endDate || 'all'}.pdf`,
      contentHtml,
      isRTL
    };
  };

  // Preview in-app modal handler
  const handlePreviewReport = () => {
    const reportData = buildReportHtml();
    setPreviewModalData({
      isOpen: true,
      title: reportData.title,
      filename: reportData.filename,
      contentHtml: reportData.contentHtml,
      isRTL: reportData.isRTL,
    });
  };

  // Print PDF Report Handler
  const handlePrintReport = () => {
    const reportData = buildReportHtml();
    printViaIframe(reportData.contentHtml, reportData.title, reportData.isRTL);
  };

  // Direct Download PDF Handler
  const handleDownloadPDF = () => {
    const reportData = buildReportHtml();
    downloadPDFDirectly({
      title: reportData.title,
      filename: reportData.filename,
      contentHtml: reportData.contentHtml,
      isRTL: reportData.isRTL,
    });
  };

  // Export JSON handler
  const handleExportJSON = () => {
    const reportExportData = {
      generatedAt: new Date().toISOString(),
      shopName,
      dateRange: { startDate, endDate },
      totals,
      roznamcha: filteredRoznamcha,
      kata: filteredKata,
      stock: filteredStock,
      customers
    };

    const blob = new Blob([JSON.stringify(reportExportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${startDate || 'all'}_to_${endDate || 'all'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-500">
              <PieChart size={24} />
            </div>
            {t.reports || 'Business Reports'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t.reports_desc || 'Generate detailed financial and transaction reports by custom date range'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePreviewReport}
            id="btn-preview-report"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-sm font-bold border border-border shadow-sm transition-all cursor-pointer"
          >
            <BookOpen size={16} />
            <span>{t.preview || 'Preview'}</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDownloadPDF}
            id="btn-download-pdf-report"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-sm font-bold shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Download size={16} />
            {t.download_pdf || 'Download PDF'}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePrintReport}
            id="btn-print-report"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 active:scale-95 text-white text-sm font-bold shadow-lg shadow-brand-500/20 transition-all cursor-pointer"
          >
            <Printer size={16} />
            {t.print_report || 'Print Report'}
          </motion.button>
        </div>
      </div>

      {/* Date Range Selection Bar */}
      <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Calendar size={16} className="text-brand-500" />
            {t.select_date_range || 'Date Range Filter'}
          </h2>

          <div className="text-xs font-semibold text-brand-500 bg-brand-500/10 px-3 py-1 rounded-full border border-brand-500/20">
            {startDate || 'Start'} {t.to || 'to'} {endDate || 'Today'}
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-muted-foreground font-medium me-2">
            {t.quick_ranges || 'Presets'}:
          </span>
          <button
            onClick={() => handlePreset('today')}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-muted hover:bg-brand-500/10 hover:text-brand-500 border border-border transition-all"
          >
            {t.today || 'Today'}
          </button>
          <button
            onClick={() => handlePreset('week')}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-muted hover:bg-brand-500/10 hover:text-brand-500 border border-border transition-all"
          >
            {t.this_week || 'This Week'}
          </button>
          <button
            onClick={() => handlePreset('month')}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-muted hover:bg-brand-500/10 hover:text-brand-500 border border-border transition-all"
          >
            {t.this_month || 'This Month'}
          </button>
          <button
            onClick={() => handlePreset('year')}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-muted hover:bg-brand-500/10 hover:text-brand-500 border border-border transition-all"
          >
            {t.this_year || 'This Year'}
          </button>
          <button
            onClick={() => handlePreset('all')}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-muted hover:bg-brand-500/10 hover:text-brand-500 border border-border transition-all"
          >
            {t.all_time || 'All Time'}
          </button>
        </div>

        {/* Custom Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">
              {t.from_date || 'From Date'}
            </label>
            <ShamsiDatePicker
              value={startDate}
              onChange={(gregStr) => setStartDate(gregStr)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">
              {t.to_date || 'To Date'}
            </label>
            <ShamsiDatePicker
              value={endDate}
              onChange={(gregStr) => setEndDate(gregStr)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">
              {t.search || 'Filter Keywords'}
            </label>
            <div className="relative">
              <Search size={16} className="absolute inset-y-0 my-auto start-3 text-muted-foreground" />
              <input
                type="text"
                placeholder={t.search || 'Search description, bill #, customer...'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-background border border-border rounded-xl ps-9 pe-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-foreground font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Currency Filter Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-card border border-border p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t.currency || 'Currency Filter'}:</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { id: 'all', label: t.all || 'All Currencies' },
            { id: 'AFN', label: 'AFN (افغانی)' },
            { id: 'USD', label: 'USD ($ دالر)' },
            { id: 'EUR', label: 'EUR (€ یورو)' },
            { id: 'PKR', label: 'PKR (₨ کلدار)' },
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => setCurrencyFilter(c.id)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm",
                currencyFilter === c.id
                  ? "bg-brand-500 text-brand-foreground shadow-md"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Multi-Currency Overview Row if "All" is selected */}
      {currencyFilter === 'all' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {['AFN', 'USD', 'EUR', 'PKR'].map((curr) => {
            const tot = totalsByCurrency[curr] || { income: 0, expense: 0, netCashflow: 0 };
            return (
              <div 
                key={curr}
                onClick={() => setCurrencyFilter(curr)}
                className="bg-card border border-border rounded-2xl p-4 shadow-sm hover:border-brand-500/50 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-1 rounded-lg bg-brand-500/10 text-brand-500 font-black text-xs">{curr}</span>
                  <span className={cn("text-xs font-bold", tot.netCashflow >= 0 ? "text-green-500" : "text-red-500")}>
                    {tot.netCashflow >= 0 ? '+' : ''}{tot.netCashflow.toLocaleString()} {curr}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-muted-foreground">
                  <div>{t.income || 'Income'}: <span className="text-green-500 font-bold">+{tot.income.toLocaleString()}</span></div>
                  <div>{t.expense || 'Expense'}: <span className="text-red-500 font-bold">-{tot.expense.toLocaleString()}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* KPI Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Roznamcha Income / Payment */}
        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm relative overflow-hidden group min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider truncate me-2">
              {t.total_sales_income || 'Total Payments'}
            </span>
            <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center shrink-0">
              <ArrowDownRight size={20} />
            </div>
          </div>
          {(() => {
            const valStr = `+${totals.roznamchaIncome.toLocaleString()}`;
            const fontCls = valStr.length > 20 ? "text-base font-black break-all" : valStr.length > 13 ? "text-lg font-black break-all" : "text-2xl font-black break-all";
            return (
              <div className={cn("text-green-500 mt-2 min-w-0", fontCls)}>
                {valStr}
              </div>
            );
          })()}
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {filteredRoznamcha.filter(e => e.type === 'income').length} {t.recent_entries || 'entries'}
          </p>
        </div>

        {/* Total Roznamcha Expense / Purchase */}
        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm relative overflow-hidden group min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider truncate me-2">
              {t.total_purchases_expense || 'Total Purchases'}
            </span>
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
              <ArrowUpRight size={20} />
            </div>
          </div>
          {(() => {
            const valStr = `-${totals.roznamchaExpense.toLocaleString()}`;
            const fontCls = valStr.length > 20 ? "text-base font-black break-all" : valStr.length > 13 ? "text-lg font-black break-all" : "text-2xl font-black break-all";
            return (
              <div className={cn("text-red-500 mt-2 min-w-0", fontCls)}>
                {valStr}
              </div>
            );
          })()}
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {filteredRoznamcha.filter(e => e.type === 'expense').length} {t.recent_entries || 'entries'}
          </p>
        </div>

        {/* Net Profit / Cashflow */}
        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm relative overflow-hidden group min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider truncate me-2">
              {t.net_profit || 'Net Cashflow'}
            </span>
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0">
              <DollarSign size={20} />
            </div>
          </div>
          {(() => {
            const valStr = `${totals.netCashflow >= 0 ? '+' : ''}${totals.netCashflow.toLocaleString()}`;
            const fontCls = valStr.length > 20 ? "text-base font-black break-all" : valStr.length > 13 ? "text-lg font-black break-all" : "text-2xl font-black break-all";
            return (
              <div className={cn("mt-2 min-w-0", fontCls, totals.netCashflow >= 0 ? "text-green-500" : "text-red-500")}>
                {valStr}
              </div>
            );
          })()}
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {t.roznamcha || 'Roznamcha'} {t.balance || 'Balance'}
          </p>
        </div>

        {/* Kata Credit Sales & Payments */}
        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm relative overflow-hidden group min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider truncate me-2">
              {t.kata_report || 'Kata Movements'}
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
              <BookOpen size={20} />
            </div>
          </div>
          <div className="mt-1 space-y-0.5 text-xs font-bold text-foreground min-w-0">
            <div className="flex flex-wrap justify-between items-baseline gap-x-2 min-w-0">
              <span className="text-muted-foreground font-medium shrink-0">{t.debit || 'Purchase'}:</span>
              <span className="text-red-500 font-black break-all min-w-0">{totals.kataDebits.toLocaleString()}</span>
            </div>
            <div className="flex flex-wrap justify-between items-baseline gap-x-2 min-w-0">
              <span className="text-muted-foreground font-medium shrink-0">{t.credit || 'Payment'}:</span>
              <span className="text-green-500 font-black break-all min-w-0">{totals.kataCredits.toLocaleString()}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {filteredKata.length} {t.transaction_history || 'transactions'}
          </p>
        </div>
      </div>

      {/* Sub-Report Tabs */}
      <div className="flex items-center gap-2 border-b border-border overflow-x-auto custom-scrollbar pb-2">
        <button
          onClick={() => setActiveReportTab('financial')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
            activeReportTab === 'financial'
              ? "bg-brand-500 text-white shadow-md shadow-brand-500/20"
              : "bg-card border border-border text-muted-foreground hover:text-foreground"
          )}
        >
          <PieChart size={16} />
          {t.financial_summary || 'Financial Summary'}
        </button>

        <button
          onClick={() => setActiveReportTab('roznamcha')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
            activeReportTab === 'roznamcha'
              ? "bg-brand-500 text-white shadow-md shadow-brand-500/20"
              : "bg-card border border-border text-muted-foreground hover:text-foreground"
          )}
        >
          <BookOpen size={16} />
          {t.roznamcha_report || 'Roznamcha Journal'} ({filteredRoznamcha.length})
        </button>

        <button
          onClick={() => setActiveReportTab('kata')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
            activeReportTab === 'kata'
              ? "bg-brand-500 text-white shadow-md shadow-brand-500/20"
              : "bg-card border border-border text-muted-foreground hover:text-foreground"
          )}
        >
          <BookOpen size={16} />
          {t.kata_report || 'Kata Ledger'} ({filteredKata.length})
        </button>

        <button
          onClick={() => setActiveReportTab('stock')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
            activeReportTab === 'stock'
              ? "bg-brand-500 text-white shadow-md shadow-brand-500/20"
              : "bg-card border border-border text-muted-foreground hover:text-foreground"
          )}
        >
          <Package size={16} />
          {t.stock_report || 'Stock Book'} ({filteredStock.length})
        </button>

        <button
          onClick={() => setActiveReportTab('customers')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
            activeReportTab === 'customers'
              ? "bg-brand-500 text-white shadow-md shadow-brand-500/20"
              : "bg-card border border-border text-muted-foreground hover:text-foreground"
          )}
        >
          <Users size={16} />
          {t.customer_balances_report || 'Customer Balances'} ({customers.length})
        </button>

        <button
          onClick={() => setActiveReportTab('single_customer')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
            activeReportTab === 'single_customer'
              ? "bg-brand-500 text-white shadow-md shadow-brand-500/20"
              : "bg-card border border-border text-muted-foreground hover:text-foreground"
          )}
        >
          <User size={16} />
          {t.single_customer_report || 'Customer Statement'}
        </button>
      </div>

      {/* Active Tab Content Tables */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {/* Roznamcha Section */}
        {(activeReportTab === 'financial' || activeReportTab === 'roznamcha') && (
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <BookOpen size={18} className="text-brand-500" />
                {t.roznamcha_report || 'Roznamcha Transactions'}
              </h3>
              <span className="text-xs text-muted-foreground">
                {filteredRoznamcha.length} {t.recent_entries || 'records'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-start border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-xs font-bold text-muted-foreground uppercase">
                    <th className="p-3 text-start">{t.date || 'Date'}</th>
                    <th className="p-3 text-start">{t.customer_name || 'Customer'}</th>
                    <th className="p-3 text-start">{t.type || 'Type'}</th>
                    <th className="p-3 text-start">{t.amount || 'Amount'}</th>
                    <th className="p-3 text-start">{t.bill_number || 'Bill #'}</th>
                    <th className="p-3 text-start">{t.description || 'Description'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {paginatedRoznamcha.length > 0 ? (
                    paginatedRoznamcha.map(entry => {
                      const cName = customers.find(c => c.id === entry.customer_id)?.name || '-';
                      return (
                        <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3 text-sm font-medium">
                            <div className="font-bold text-foreground">{formatShamsi(entry.date, 'YYYY/MM/DD')} <span className="text-xs font-semibold text-muted-foreground">({formatShamsi(entry.date, 'full')})</span></div>
                            <div className="text-[11px] text-brand-500 font-mono font-bold">USA: {format(new Date(entry.date), 'yyyy-MM-dd')}</div>
                          </td>
                          <td className="p-3 font-semibold text-foreground">{cName}</td>
                          <td className="p-3">
                            <span className={cn(
                              "px-2.5 py-0.5 rounded-lg text-[10px] font-bold border uppercase",
                              entry.type === 'income'
                                ? "bg-green-500/10 text-green-500 border-green-500/20"
                                : "bg-red-500/10 text-red-500 border-red-500/20"
                            )}>
                              {entry.type === 'income' ? (t.income || 'Payment') : (t.expense || 'Purchase')}
                            </span>
                          </td>
                          <td className={cn(
                            "p-3 font-bold",
                            entry.type === 'income' ? "text-green-500" : "text-red-500"
                          )}>
                            {entry.type === 'income' ? '+' : '-'}{entry.amount.toLocaleString()}
                          </td>
                          <td className="p-3 font-mono text-muted-foreground">{entry.bill_number || '-'}</td>
                          <td className="p-3 text-foreground/80">{entry.description}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        {t.no_records_range || 'No records found for selected date range.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPagesRoznamcha}
              totalItems={filteredRoznamcha.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              t={t}
            />
          </div>
        )}

        {/* Kata Section */}
        {(activeReportTab === 'financial' || activeReportTab === 'kata') && (
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Users size={18} className="text-brand-500" />
                {t.kata_report || 'Kata Ledger Transactions'}
              </h3>
              <span className="text-xs text-muted-foreground">
                {filteredKata.length} {t.recent_entries || 'records'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-start border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-xs font-bold text-muted-foreground uppercase">
                    <th className="p-3 text-start">{t.date || 'Date'}</th>
                    <th className="p-3 text-start">{t.customer_name || 'Customer'}</th>
                    <th className="p-3 text-start">{t.type || 'Type'}</th>
                    <th className="p-3 text-start">{t.amount || 'Amount'}</th>
                    <th className="p-3 text-start">{t.bill_number || 'Bill #'}</th>
                    <th className="p-3 text-start">{t.description || 'Description'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {paginatedKata.length > 0 ? (
                    paginatedKata.map(entry => {
                      const cName = customers.find(c => c.id === entry.customer_id)?.name || '-';
                      const isPurchase = (entry.type as string) === 'debit' || (entry.type as string) === 'purchase';
                      return (
                        <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3 text-sm font-medium">
                            <div className="font-bold text-foreground">{formatShamsi(entry.date, 'YYYY/MM/DD')} <span className="text-xs font-semibold text-muted-foreground">({formatShamsi(entry.date, 'full')})</span></div>
                            <div className="text-[11px] text-brand-500 font-mono font-bold">USA: {format(new Date(entry.date), 'yyyy-MM-dd')}</div>
                          </td>
                          <td className="p-3 font-semibold text-foreground">{cName}</td>
                          <td className="p-3">
                            <span className={cn(
                              "px-2.5 py-0.5 rounded-lg text-[10px] font-bold border uppercase",
                              isPurchase
                                ? "bg-red-500/10 text-red-500 border-red-500/20"
                                : "bg-green-500/10 text-green-500 border-green-500/20"
                            )}>
                              {isPurchase ? (t.purchase || 'Purchase') : (t.payment || 'Payment')}
                            </span>
                          </td>
                          <td className={cn(
                            "p-3 font-bold",
                            isPurchase ? "text-red-500" : "text-green-500"
                          )}>
                            {entry.amount.toLocaleString()}
                          </td>
                          <td className="p-3 font-mono text-muted-foreground">{entry.bill_number || '-'}</td>
                          <td className="p-3 text-foreground/80">{entry.description}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        {t.no_records_range || 'No records found for selected date range.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPagesKata}
              totalItems={filteredKata.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              t={t}
            />
          </div>
        )}

        {/* Stock Section */}
        {activeReportTab === 'stock' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Package size={18} className="text-brand-500" />
                {t.stock_report || 'Stock Movement Log'}
              </h3>
              <span className="text-xs text-muted-foreground">
                {filteredStock.length} {t.recent_entries || 'records'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-start border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-xs font-bold text-muted-foreground uppercase">
                    <th className="p-3 text-start">{t.date || 'Date'}</th>
                    <th className="p-3 text-start">{t.item_name || 'Item Name'}</th>
                    <th className="p-3 text-start">{t.type || 'Type'}</th>
                    <th className="p-3 text-start">{t.quantity || 'Quantity'}</th>
                    <th className="p-3 text-start">{t.bill_number || 'Bill #'}</th>
                    <th className="p-3 text-start">{t.description || 'Description'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {paginatedStock.length > 0 ? (
                    paginatedStock.map(entry => (
                      <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 text-sm font-medium">
                          <div className="font-bold text-foreground">{formatShamsi(entry.date, 'YYYY/MM/DD')} <span className="text-xs font-semibold text-muted-foreground">({formatShamsi(entry.date, 'full')})</span></div>
                          <div className="text-[11px] text-brand-500 font-mono font-bold">USA: {format(new Date(entry.date), 'yyyy-MM-dd')}</div>
                        </td>
                        <td className="p-3 font-semibold text-foreground">{entry.item_name}</td>
                        <td className="p-3">
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-lg text-[10px] font-bold border uppercase",
                            entry.type === 'in'
                              ? "bg-green-500/10 text-green-500 border-green-500/20"
                              : "bg-red-500/10 text-red-500 border-red-500/20"
                          )}>
                            {entry.type === 'in' ? (t.stock_in || 'Stock In') : (t.stock_out || 'Stock Out')}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-foreground">{entry.quantity.toLocaleString()}</td>
                        <td className="p-3 font-mono text-muted-foreground">{entry.bill_number || '-'}</td>
                        <td className="p-3 text-foreground/80">{entry.description}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        {t.no_records_range || 'No records found for selected date range.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPagesStock}
              totalItems={filteredStock.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              t={t}
            />
          </div>
        )}

        {/* Customer Balances Section */}
        {activeReportTab === 'customers' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Users size={18} className="text-brand-500" />
                {t.customer_balances_report || 'Customer Account Summary'}
              </h3>
              <span className="text-xs text-muted-foreground">
                {filteredCustomerSummaries.length} {t.accounts || 'accounts'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-start border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-xs font-bold text-muted-foreground uppercase">
                    <th className="p-3 text-start w-12">#</th>
                    <th className="p-3 text-start">{t.customer_name || 'Name'}</th>
                    <th className="p-3 text-start">{t.currency || 'Currency'}</th>
                    <th className="p-3 text-start">{t.total_purchase || 'Total Purchases'}</th>
                    <th className="p-3 text-start">{t.total_paid || 'Total Paid'}</th>
                    <th className="p-3 text-start">{t.remaining_balance || 'Remaining Balance'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {paginatedCustomerSummaries.length > 0 ? (
                    paginatedCustomerSummaries.map((s, idx) => {
                      const cust = customers.find(c => c.id === s.customer_id);
                      const custName = cust?.name || s.customer_name || 'Unknown';
                      const curr = s.currency || 'AFN';
                      const rowNum = (currentPage - 1) * itemsPerPage + idx + 1;
                      return (
                        <tr key={`${s.customer_id}-${curr}`} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3 text-muted-foreground font-mono font-bold text-xs">#{rowNum}</td>
                          <td className="p-3 font-bold text-foreground">{custName}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-500 font-bold text-xs">
                              {curr}
                            </span>
                          </td>
                          <td className="p-3 font-semibold">{s.total_purchase.toLocaleString()} {curr}</td>
                          <td className="p-3 font-semibold text-green-500">{s.total_paid.toLocaleString()} {curr}</td>
                          <td className={cn(
                            "p-3 font-bold",
                            s.remaining_balance > 0 ? "text-red-500" : "text-green-500"
                          )}>
                            {s.remaining_balance.toLocaleString()} {curr}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground font-medium">
                        {t.no_records_range || 'No customer account records found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPagesCustomers}
              totalItems={filteredCustomerSummaries.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              t={t}
            />
          </div>
        )}

        {/* Single Customer Multi-Currency Statement Section */}
        {activeReportTab === 'single_customer' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/30 p-4 rounded-2xl border border-border">
              <div className="flex-1 max-w-md">
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  {t.select_customer || 'Select Customer'}
                </label>
                <CustomerSelect 
                  customers={customers} 
                  selectedId={selectedCustomerReportId === 'all' ? undefined : selectedCustomerReportId} 
                  onSelect={(c) => setSelectedCustomerReportId(c.id)} 
                  t={t}
                />
              </div>

              {selectedCustomerObj && (
                <button
                  onClick={handlePrintReport}
                  className="flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-md shadow-brand-500/20"
                >
                  <Printer size={18} />
                  {t.print_statement || 'Print Customer Statement'}
                </button>
              )}
            </div>

            {selectedCustomerObj ? (
              <div className="space-y-6">
                {/* Customer Details Banner */}
                <div className="bg-brand-50/50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-800/50 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-brand-500 text-white flex items-center justify-center font-black text-lg shadow-md">
                      {selectedCustomerObj.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-foreground">{selectedCustomerObj.name}</h3>
                      <p className="text-xs text-muted-foreground font-medium flex items-center gap-3 mt-0.5">
                        <span>📞 {selectedCustomerObj.contact || 'No phone'}</span>
                        <span>📍 {selectedCustomerObj.address || 'No address'}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Multi-Currency Cards for this customer */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    {t.multi_currency_balances || 'Account Balances across All Currencies'}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {['AFN', 'USD', 'EUR', 'PKR'].map(curr => {
                      const s = singleCustomerCurrencySummary[curr];
                      const isDeptor = s.remainingBalance > 0;
                      return (
                        <div key={curr} className="bg-card border border-border rounded-2xl p-4 shadow-soft">
                          <div className="flex items-center justify-between mb-2">
                            <span className="px-2.5 py-1 rounded-lg bg-brand-500/10 text-brand-500 font-black text-xs">
                              {curr}
                            </span>
                            <span className={cn(
                              "text-xs font-black px-2 py-0.5 rounded-full",
                              isDeptor ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"
                            )}>
                              {isDeptor ? 'Debt' : 'Settled'}
                            </span>
                          </div>
                          <div className="space-y-1 text-xs font-semibold">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t.total_purchase || 'Purchases'}:</span>
                              <span className="text-red-500 font-bold">{s.totalPurchase.toLocaleString()} {curr}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t.total_paid || 'Paid'}:</span>
                              <span className="text-green-500 font-bold">{s.totalPaid.toLocaleString()} {curr}</span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-border">
                              <span className="font-bold text-foreground">{t.remaining_balance || 'Balance'}:</span>
                              <span className={cn("font-black", isDeptor ? "text-red-500" : "text-green-500")}>
                                {s.remainingBalance.toLocaleString()} {curr}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Single Customer Transaction Table */}
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-soft">
                  <div className="p-4 bg-muted/40 border-b border-border flex items-center justify-between">
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <BookOpen size={16} className="text-brand-500" />
                      {t.transaction_history || 'All Purchase & Payment Records'}
                    </h4>
                    <span className="text-xs text-muted-foreground font-semibold">
                      {singleCustomerTransactions.length} {t.recent_entries || 'records'}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-start border-collapse">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border text-xs font-bold text-muted-foreground uppercase">
                          <th className="p-3 text-start">{t.date || 'Date'}</th>
                          <th className="p-3 text-start">{t.type || 'Type'}</th>
                          <th className="p-3 text-start">{t.currency || 'Currency'}</th>
                          <th className="p-3 text-start">{t.amount || 'Amount'}</th>
                          <th className="p-3 text-start">{t.bill_number || 'Bill #'}</th>
                          <th className="p-3 text-start">{t.description || 'Description'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border text-sm">
                        {paginatedSingleCustomer.length > 0 ? (
                          paginatedSingleCustomer.map(entry => {
                            const isPurchase = (entry.type as string) === 'purchase' || (entry.type as string) === 'debit';
                            return (
                              <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                                <td className="p-3 text-sm font-medium">
                                  <div className="font-bold text-foreground">{formatShamsi(entry.date, 'full')}</div>
                                  <div className="text-[11px] text-muted-foreground font-mono">{format(new Date(entry.date), 'yyyy-MM-dd')}</div>
                                </td>
                                <td className="p-3">
                                  <span className={cn(
                                    "px-2.5 py-0.5 rounded-lg text-[10px] font-bold border uppercase",
                                    isPurchase
                                      ? "bg-red-500/10 text-red-500 border-red-500/20"
                                      : "bg-green-500/10 text-green-500 border-green-500/20"
                                  )}>
                                    {isPurchase ? (t.purchase || 'Purchase') : (t.payment || 'Payment')}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 font-bold text-xs">
                                    {entry.currency || 'AFN'}
                                  </span>
                                </td>
                                <td className={cn(
                                  "p-3 font-black",
                                  isPurchase ? "text-red-500" : "text-green-500"
                                )}>
                                  {isPurchase ? '+' : '-'}{entry.amount.toLocaleString()} <span className="text-xs opacity-70">{entry.currency || 'AFN'}</span>
                                </td>
                                <td className="p-3 font-mono text-muted-foreground">{entry.bill_number || '-'}</td>
                                <td className="p-3 text-foreground/80 font-medium">{entry.description || '-'}</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-muted-foreground font-medium">
                              {t.no_records_range || 'No transaction records found for this customer.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPagesSingleCustomer}
                    totalItems={singleCustomerTransactions.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    t={t}
                  />
                </div>
              </div>
            ) : (
              <div className="p-12 text-center bg-muted/20 rounded-2xl border border-dashed border-border space-y-3">
                <User size={36} className="mx-auto text-muted-foreground/60" />
                <h4 className="font-bold text-foreground text-base">Select a Customer to View Ledger</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Pick any customer from the dropdown above to analyze all their purchases, debt payments, and balances across AFN, USD, EUR, and PKR.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* In-App PDF & Print Preview Modal */}
      <PrintPreviewModal
        isOpen={previewModalData.isOpen}
        onClose={() => setPreviewModalData(prev => ({ ...prev, isOpen: false }))}
        title={previewModalData.title}
        filename={previewModalData.filename}
        contentHtml={previewModalData.contentHtml}
        isRTL={previewModalData.isRTL}
      />
    </div>
  );
}
