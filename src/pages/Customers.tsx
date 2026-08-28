import React, { useState, useEffect } from 'react';
import { Plus, Search, User, MapPin, Phone, Edit2, Trash2, X, CheckCircle2, AlertCircle, Printer, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Customer } from '../types';
import { formatShamsi } from '../lib/shamsi';
import { openPrintablePDFWindow, exportToPDF, createPaginatedReportHtml } from '../lib/pdfUtils';
import Pagination from '../components/Pagination';

interface CustomersProps {
  t: any;
  query: string;
  customers: Customer[];
  onAdd: () => void;
  onEdit: (customer: Customer) => void;
  onDelete: (id: number) => void;
}

export default function Customers({ t, query, customers, onAdd, onEdit, onDelete }: CustomersProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  useEffect(() => {
    setCurrentPage(1);
  }, [customers.length]);

  const filteredCustomers = customers.filter(c => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.address || '').toLowerCase().includes(q) ||
      (c.contact || '').toLowerCase().includes(q) ||
      c.id.toString().includes(q)
    );
  });

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const buildCustomerReportData = () => {
    const isRTL = document.documentElement.dir === 'rtl';
    const title = `${t.customers || 'Customer'} ${t.report || 'Report'}`;

    const summaryHtml = `
      <div class="summary-grid">
        <div class="summary-card">
          <h3>${t.total_customers || 'Total Customers'}</h3>
          <p style="color: #0f172a; font-weight: 800;">${filteredCustomers.length}</p>
        </div>
      </div>
    `;

    const contentHtml = createPaginatedReportHtml({
      title,
      dateText: `${t.total_customers || 'Total Customers'}: ${filteredCustomers.length}`,
      summaryHtml,
      records: filteredCustomers,
      recordsPerPage: 15,
      isRTL,
      columns: [
        { header: 'ID', style: 'width: 60px; text-align: center;' },
        { header: t.customer_name || 'Customer Name' },
        { header: t.address || 'Address' },
        { header: t.contact || 'Contact / Phone' }
      ],
      renderRow: (c) => `
        <tr>
          <td style="text-align: center; font-weight: 700; color: #64748b;">${c.id}</td>
          <td><strong style="unicode-bidi: plaintext;">${c.name}</strong></td>
          <td><span style="unicode-bidi: plaintext;">${c.address || '-'}</span></td>
          <td><span style="unicode-bidi: plaintext;">${c.contact || '-'}</span></td>
        </tr>
      `
    });

    return {
      title,
      filename: `customer_directory_${new Date().toISOString().split('T')[0]}.pdf`,
      contentHtml,
      isRTL
    };
  };

  const handlePrint = () => {
    openPrintablePDFWindow(buildCustomerReportData());
  };

  const handleDownloadPDF = () => {
    const data = buildCustomerReportData();
    exportToPDF(data.contentHtml, data.filename, data.title, data.isRTL);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t.customers}</h2>
          <p className="text-muted-foreground">{t.manage_customers_desc}</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-xl font-bold transition-all shadow-md shadow-emerald-600/20"
          >
            <Download size={20} />
            {t.download_pdf || 'Download PDF'}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePrint}
            className="flex items-center gap-2 bg-muted hover:bg-muted/80 text-foreground px-4 py-3 rounded-xl font-bold transition-all border border-border"
          >
            <Printer size={20} />
            {t.print || 'Print'}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onAdd}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-brand-500/20"
          >
            <Plus size={20} />
            {t.add_customer}
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedCustomers.map((customer) => (
          <motion.div
            key={customer.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-2xl p-6 shadow-soft hover:border-brand-500/50 transition-colors group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-500">
                <User size={24} />
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => onEdit(customer)}
                  className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-brand-500 transition-colors"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => onDelete(customer.id)}
                  className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            
            <h3 className="text-xl font-bold mb-4">{customer.name}</h3>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <MapPin size={16} className="text-brand-500" />
                <span>{customer.address || 'No address provided'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Phone size={16} className="text-brand-500" />
                <span>{customer.contact || 'No contact provided'}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredCustomers.length}
        itemsPerPage={itemsPerPage}
        onPageChange={(p) => setCurrentPage(p)}
        t={t}
      />
    </div>
  );
}
