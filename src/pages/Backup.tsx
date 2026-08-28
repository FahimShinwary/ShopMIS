import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Upload, 
  FileSpreadsheet, 
  FileText,
  Printer,
  Database, 
  ShieldCheck, 
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Clock,
  FolderOpen,
  Save,
  Play,
  Sliders
} from 'lucide-react';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';
import { cn } from '../lib/utils';
import { openPrintablePDFWindow, exportToPDF, createPaginatedReportHtml } from '../lib/pdfUtils';
import { 
  RoznamchaEntry, 
  Customer, 
  KataTransaction, 
  StockEntry 
} from '../types';

interface BackupProps {
  roznamcha: RoznamchaEntry[];
  customers: Customer[];
  kataTransactions: KataTransaction[];
  stock: StockEntry[];
  shopInfo: any;
  adminSettings: any;
  t: any;
  onRestore: (data: any) => Promise<void>;
  onNotify?: (msg: string, type: 'success' | 'error') => void;
}

export default function Backup({ 
  roznamcha, 
  customers, 
  kataTransactions, 
  stock, 
  shopInfo, 
  t,
  onNotify
}: BackupProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoringDb, setIsRestoringDb] = useState(false);
  const [isDbConfirmOpen, setIsDbConfirmOpen] = useState(false);
  const [pendingDbFile, setPendingDbFile] = useState<File | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Auto-backup configuration state
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [autoBackupTime, setAutoBackupTime] = useState('20:00');
  const [autoBackupFolder, setAutoBackupFolder] = useState('');
  const [autoBackupLastRun, setAutoBackupLastRun] = useState('');
  const [isSavingAutoBackup, setIsSavingAutoBackup] = useState(false);
  const [isTestingAutoBackup, setIsTestingAutoBackup] = useState(false);

  const notify = (msg: string, type: 'success' | 'error') => {
    if (onNotify) onNotify(msg, type);
    else setStatus({ message: msg, type });
  };

  useEffect(() => {
    loadAutoBackupSettings();
  }, []);

  const loadAutoBackupSettings = async () => {
    try {
      if (window.electronAPI) {
        const settingsList = await window.electronAPI.getSettings();
        if (Array.isArray(settingsList)) {
          const getVal = (key: string) => {
            const item = settingsList.find((s: any) => s.key === key);
            if (!item) return null;
            try { return JSON.parse(item.value); } catch { return item.value; }
          };
          const enabledVal = getVal('auto_backup_enabled');
          setAutoBackupEnabled(enabledVal === true || enabledVal === 'true');
          setAutoBackupTime(getVal('auto_backup_time') || '20:00');
          setAutoBackupFolder(getVal('auto_backup_folder') || 'backups');
          setAutoBackupLastRun(getVal('auto_backup_last_run') || '');
        }
      } else {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const settingsList = await res.json();
          if (Array.isArray(settingsList)) {
            const getVal = (key: string) => {
              const item = settingsList.find((s: any) => s.key === key);
              if (!item) return null;
              try { return JSON.parse(item.value); } catch { return item.value; }
            };
            const enabledVal = getVal('auto_backup_enabled');
            setAutoBackupEnabled(enabledVal === true || enabledVal === 'true');
            setAutoBackupTime(getVal('auto_backup_time') || '20:00');
            setAutoBackupFolder(getVal('auto_backup_folder') || 'backups');
            setAutoBackupLastRun(getVal('auto_backup_last_run') || '');
          }
        }
      }
    } catch (err) {
      console.error('Failed to load auto backup settings:', err);
    }
  };

  const handleSaveAutoBackupSettings = async () => {
    setIsSavingAutoBackup(true);
    const folderToSave = autoBackupFolder.trim() || 'backups';
    setAutoBackupFolder(folderToSave);

    try {
      if (window.electronAPI) {
        await window.electronAPI.setSetting('auto_backup_enabled', autoBackupEnabled);
        await window.electronAPI.setSetting('auto_backup_time', autoBackupTime);
        await window.electronAPI.setSetting('auto_backup_folder', folderToSave);
      } else {
        await fetch('/api/settings/auto_backup_enabled', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: autoBackupEnabled })
        });
        await fetch('/api/settings/auto_backup_time', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: autoBackupTime })
        });
        await fetch('/api/settings/auto_backup_folder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: folderToSave })
        });
      }
      notify('Automatic backup configuration saved successfully', 'success');
    } catch (error: any) {
      notify('Failed to save auto backup settings: ' + error.message, 'error');
    } finally {
      setIsSavingAutoBackup(false);
    }
  };

  const handleBrowseFolder = async () => {
    if (window.electronAPI?.selectDirectory) {
      const selected = await window.electronAPI.selectDirectory();
      if (selected) {
        setAutoBackupFolder(selected);
      }
    }
  };

  const handleTriggerBackupNow = async () => {
    const folderToUse = autoBackupFolder.trim() || 'backups';
    setAutoBackupFolder(folderToUse);
    setIsTestingAutoBackup(true);

    try {
      if (window.electronAPI?.triggerAutoBackup) {
        const res = await window.electronAPI.triggerAutoBackup(folderToUse);
        if (res.success) {
          notify(`Automatic backup saved successfully to: ${res.filePath}`, 'success');
          setAutoBackupLastRun(new Date().toISOString());
        } else {
          notify('Auto-backup failed: ' + (res.error || 'Unknown error'), 'error');
        }
      } else {
        const res = await fetch('/api/auto-backup/trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderPath: folderToUse })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          notify(`Automatic backup saved successfully to: ${data.filePath}`, 'success');
          setAutoBackupLastRun(new Date().toISOString());
        } else {
          notify('Auto-backup failed: ' + (data.error || 'Unknown error'), 'error');
        }
      }
    } catch (err: any) {
      notify('Backup test failed: ' + err.message, 'error');
    } finally {
      setIsTestingAutoBackup(false);
    }
  };

  const exportToDb = async () => {
    setIsExporting(true);
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.backup();
        if (res.success) {
          notify('Full database backup saved successfully', 'success');
        } else {
          notify('Database backup failed', 'error');
        }
      } else {
        window.location.href = '/api/backup';
      }
    } catch (error) {
      console.error(error);
      notify('Failed to export Database', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDbImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPendingDbFile(file);
    setIsDbConfirmOpen(true);
  };

  const cancelRestoreDb = () => {
    setIsDbConfirmOpen(false);
    setPendingDbFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleElectronRestoreClick = async () => {
    setIsRestoringDb(true);
    try {
      const res = await window.electronAPI.restore();
      if (res.success) {
        notify('Database restored successfully. Application will reload.', 'success');
        setTimeout(() => window.location.reload(), 1500);
      } else if (!res.canceled) {
        notify('Restore failed: ' + (res.error || 'Unknown error'), 'error');
      }
    } catch (e: any) {
      notify('Restore failed: ' + e.message, 'error');
    } finally {
      setIsRestoringDb(false);
    }
  };

  const confirmRestoreDb = async () => {
    setIsDbConfirmOpen(false);
    if (!pendingDbFile) return;

    setIsRestoringDb(true);
    try {
      const formData = new FormData();
      formData.append('database', pendingDbFile);

      const res = await fetch('/api/restore', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        notify('Database restored successfully. Application will reload.', 'success');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        const data = await res.json();
        notify('Restore failed: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (e: any) {
      notify('Restore failed: ' + e.message, 'error');
    } finally {
      setIsRestoringDb(false);
      setPendingDbFile(null);
    }
  };

  const exportToExcel = () => {
    setIsExporting(true);
    try {
      const wb = XLSX.utils.book_new();
      
      // Roznamcha
      const roznamchaData = roznamcha.map(e => ({
        Date: e.date,
        Type: e.type,
        Amount: e.amount,
        Description: e.description,
        'Bill Number': e.bill_number || '',
        'Customer ID': e.customer_id || ''
      }));
      const wsRoznamcha = XLSX.utils.json_to_sheet(roznamchaData);
      XLSX.utils.book_append_sheet(wb, wsRoznamcha, 'Roznamcha');
      
      // Customers
      const customersData = customers.map(c => ({
        ID: c.id,
        Name: c.name,
        Address: c.address,
        Contact: c.contact
      }));
      const wsCustomers = XLSX.utils.json_to_sheet(customersData);
      XLSX.utils.book_append_sheet(wb, wsCustomers, 'Customers');
      
      // Kata
      const kataData = kataTransactions.map(k => ({
        Date: k.date,
        'Customer ID': k.customer_id,
        Type: k.type,
        Amount: k.amount,
        'Bill Number': k.bill_number || '',
        Description: k.description || ''
      }));
      const wsKata = XLSX.utils.json_to_sheet(kataData);
      XLSX.utils.book_append_sheet(wb, wsKata, 'Kata');
      
      // Stock
      const stockData = stock.map(s => ({
        Date: s.date,
        'Item Name': s.item_name,
        Type: s.type,
        Quantity: s.quantity,
        'Bill Number': s.bill_number || '',
        Description: s.description
      }));
      const wsStock = XLSX.utils.json_to_sheet(stockData);
      XLSX.utils.book_append_sheet(wb, wsStock, 'Stock');
      
      XLSX.writeFile(wb, `shop_mis_backup_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      setStatus({ type: 'success', message: 'Excel backup downloaded successfully' });
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to export Excel' });
    } finally {
      setIsExporting(false);
    }
  };

  const buildBackupReportData = () => {
    const totalIncome = roznamcha.filter(r => r.type === 'income').reduce((acc, c) => acc + c.amount, 0);
    const totalExpense = roznamcha.filter(r => r.type === 'expense').reduce((acc, c) => acc + c.amount, 0);

    const summaryHtml = `
      <div class="summary-grid">
        <div class="summary-card">
          <h3>Total Income</h3>
          <p class="badge-income">${totalIncome.toLocaleString()} AFN</p>
        </div>
        <div class="summary-card">
          <h3>Total Expense</h3>
          <p class="badge-expense">${totalExpense.toLocaleString()} AFN</p>
        </div>
        <div class="summary-card">
          <h3>Total Customers</h3>
          <p>${customers.length}</p>
        </div>
        <div class="summary-card">
          <h3>Stock Records</h3>
          <p>${stock.length}</p>
        </div>
      </div>
    `;

    const contentHtml = createPaginatedReportHtml({
      title: `${shopInfo?.name || 'Shop MIS'} - Full System Report`,
      shopAddress: shopInfo?.address || '',
      dateText: `Generated on ${new Date().toLocaleDateString()} | Admin Backup Report`,
      summaryHtml,
      records: roznamcha,
      recordsPerPage: 15,
      isRTL: true,
      columns: [
        { header: 'Date' },
        { header: 'Type' },
        { header: 'Amount' },
        { header: 'Bill #' },
        { header: 'Description' }
      ],
      renderRow: (r) => `
        <tr>
          <td>${r.date}</td>
          <td class="${r.type === 'income' ? 'badge-income' : 'badge-expense'}">${r.type}</td>
          <td class="${r.type === 'income' ? 'badge-income' : 'badge-expense'}">${r.amount.toLocaleString()}</td>
          <td>${r.bill_number || '-'}</td>
          <td>${r.description || '-'}</td>
        </tr>
      `
    });

    return {
      title: `${shopInfo?.name || 'Shop'} System Report`,
      filename: `shop_mis_report_${new Date().toISOString().split('T')[0]}.pdf`,
      contentHtml
    };
  };

  const exportToPdfReport = () => {
    setIsExporting(true);
    try {
      openPrintablePDFWindow(buildBackupReportData());
      setStatus({ type: 'success', message: 'PDF report opened for printing successfully' });
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to export PDF report' });
    } finally {
      setIsExporting(false);
    }
  };

  const downloadPdfReport = async () => {
    setIsExporting(true);
    try {
      const data = buildBackupReportData();
      await exportToPDF(data.contentHtml, data.filename, data.title, true);
      setStatus({ type: 'success', message: 'PDF downloaded successfully' });
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to download PDF' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 rounded-2xl bg-brand-500/10 text-brand-500">
          <Database size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-black tracking-tighter">{t.backup_restore || 'Backup & Restore'}</h2>
          <p className="text-muted-foreground font-medium">Manage automated scheduled backups and system copies</p>
        </div>
      </div>

      {status && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "p-4 rounded-2xl border flex items-center gap-3",
            status.type === 'success' 
              ? "bg-green-500/10 border-green-500/20 text-green-500" 
              : "bg-red-500/10 border-red-500/20 text-red-500"
          )}
        >
          {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
          <span className="font-bold">{status.message}</span>
          <button onClick={() => setStatus(null)} className="ms-auto text-xs underline">Dismiss</button>
        </motion.div>
      )}

      {/* Automatic Backup Configuration Section */}
      <div className="bg-card border border-border rounded-3xl p-8 shadow-soft space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500">
              <Clock size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight">Automatic Scheduled Backups</h3>
              <p className="text-xs text-muted-foreground">Configure automatic daily database backups to your chosen folder</p>
            </div>
          </div>
          
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={autoBackupEnabled} 
              onChange={(e) => setAutoBackupEnabled(e.target.checked)} 
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            <span className="ms-3 text-xs font-bold uppercase tracking-wider">{autoBackupEnabled ? 'Enabled' : 'Disabled'}</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
              <Clock size={14} className="text-emerald-500" /> Scheduled Daily Backup Time
            </label>
            <input 
              type="time" 
              value={autoBackupTime}
              onChange={(e) => setAutoBackupTime(e.target.value)}
              className="w-full bg-muted border border-border rounded-xl px-4 py-3 font-mono font-bold text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <p className="text-[11px] text-muted-foreground">The system will automatically back up every day at this exact time.</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
              <FolderOpen size={14} className="text-emerald-500" /> Target Backup Directory Folder
            </label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={autoBackupFolder}
                onChange={(e) => setAutoBackupFolder(e.target.value)}
                placeholder="e.g. C:\ShopBackups or /var/backups"
                className="flex-1 bg-muted border border-border rounded-xl px-4 py-3 font-mono text-xs focus:outline-none focus:border-emerald-500 transition-colors"
              />
              {window.electronAPI?.selectDirectory && (
                <button
                  type="button"
                  onClick={handleBrowseFolder}
                  className="px-4 py-3 bg-muted hover:bg-muted/80 border border-border rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <FolderOpen size={16} /> Browse
                </button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">Select or type the destination folder path on your machine where backups will be saved.</p>
          </div>
        </div>

        {autoBackupLastRun && (
          <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-xs flex items-center gap-2 text-emerald-500 font-medium">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>Last automatic backup executed on: <strong>{new Date(autoBackupLastRun).toLocaleString()}</strong></span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
          <button
            type="button"
            onClick={handleTriggerBackupNow}
            disabled={isTestingAutoBackup}
            className="flex items-center gap-2 px-5 py-2.5 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          >
            {isTestingAutoBackup ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} className="text-emerald-500" />}
            {isTestingAutoBackup ? 'Running Backup...' : 'Backup Now'}
          </button>

          <button
            type="button"
            onClick={handleSaveAutoBackupSettings}
            disabled={isSavingAutoBackup}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
          >
            {isSavingAutoBackup ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            {isSavingAutoBackup ? 'Saving...' : 'Save Auto-Backup Config'}
          </button>
        </div>
      </div>

      {/* Manual Export & Restore Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Section */}
        <div className="bg-card border border-border rounded-3xl p-8 shadow-soft space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Download size={20} />
            </div>
            <h3 className="text-xl font-bold tracking-tight">Manual Export</h3>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Download an instant manual copy of your database or reports.
          </p>

          <div className="space-y-3">
            <button
              onClick={exportToDb}
              disabled={isExporting}
              className="w-full flex items-center justify-between p-4 bg-muted hover:bg-muted/80 rounded-2xl border border-blue-500/30 transition-all group"
            >
              <div className="flex items-center gap-3">
                <Database className="text-blue-500" size={24} />
                <div className="text-start">
                  <p className="font-bold">Database File (.db)</p>
                  <p className="text-[10px] text-blue-500/70 font-black uppercase tracking-widest">Complete System Copy</p>
                </div>
              </div>
              <Download size={18} className="text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>

            <button
              onClick={exportToExcel}
              disabled={isExporting}
              className="w-full flex items-center justify-between p-4 bg-muted hover:bg-muted/80 rounded-2xl border border-border transition-all group"
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="text-green-500" size={24} />
                <div className="text-start">
                  <p className="font-bold">Excel Format</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">For viewing & reporting</p>
                </div>
              </div>
              <Download size={18} className="text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>

            <button
              onClick={downloadPdfReport}
              disabled={isExporting}
              className="w-full flex items-center justify-between p-4 bg-muted hover:bg-muted/80 rounded-2xl border border-emerald-500/20 transition-all group"
            >
              <div className="flex items-center gap-3">
                <FileText className="text-emerald-500" size={24} />
                <div className="text-start">
                  <p className="font-bold">Download PDF File</p>
                  <p className="text-[10px] text-emerald-500/70 font-black uppercase tracking-widest">Direct PDF Export with Pashto/Dari</p>
                </div>
              </div>
              <Download size={18} className="text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>

            <button
              onClick={exportToPdfReport}
              disabled={isExporting}
              className="w-full flex items-center justify-between p-4 bg-muted hover:bg-muted/80 rounded-2xl border border-red-500/20 transition-all group"
            >
              <div className="flex items-center gap-3">
                <Printer className="text-red-500" size={24} />
                <div className="text-start">
                  <p className="font-bold">Print Report</p>
                  <p className="text-[10px] text-red-500/70 font-black uppercase tracking-widest">Printable Admin Document</p>
                </div>
              </div>
              <Printer size={18} className="text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>
          </div>
        </div>

        {/* Restore Section */}
        <div className="bg-card border border-border rounded-3xl p-8 shadow-soft space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Upload size={20} />
            </div>
            <h3 className="text-xl font-bold tracking-tight">Manual Restore</h3>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Restore your database from a previously saved .db file. 
            <span className="text-red-500 font-bold block mt-1">Warning: This will overwrite all current data!</span>
          </p>

          <div className="grid grid-cols-1 gap-4">
            {window.electronAPI ? (
              <button
                type="button"
                onClick={handleElectronRestoreClick}
                disabled={isRestoringDb}
                className={cn(
                  "w-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-amber-500/30 rounded-2xl bg-amber-500/5 transition-all",
                  isRestoringDb ? "opacity-50 cursor-not-allowed" : "hover:bg-amber-500/10 hover:border-amber-500/50"
                )}
              >
                {isRestoringDb ? (
                  <RefreshCw size={28} className="text-amber-500 animate-spin mb-2" />
                ) : (
                  <Database size={28} className="text-amber-500 mb-2" />
                )}
                <p className="font-bold text-sm text-amber-500">Restore from .db File</p>
                <p className="text-[10px] text-amber-500/70 font-bold uppercase tracking-widest mt-1 text-center font-mono">Select .db file to overwrite database</p>
              </button>
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".db"
                  onChange={handleDbImport}
                  disabled={isRestoringDb}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isRestoringDb}
                  className={cn(
                    "w-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-amber-500/30 rounded-2xl bg-amber-500/5 transition-all cursor-pointer",
                    isRestoringDb ? "opacity-50 cursor-not-allowed" : "hover:bg-amber-500/10 hover:border-amber-500/50"
                  )}
                >
                  {isRestoringDb ? (
                    <RefreshCw size={28} className="text-amber-500 animate-spin mb-2" />
                  ) : (
                    <Database size={28} className="text-amber-500 mb-2" />
                  )}
                  <p className="font-bold text-sm text-amber-500">Restore from .db File</p>
                  <p className="text-[10px] text-amber-500/70 font-bold uppercase tracking-widest mt-1 text-center font-mono">Select .db file to overwrite database</p>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Restore Confirmation Modal */}
      {isDbConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={cancelRestoreDb}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-3xl p-8 w-full max-w-sm relative z-[101] shadow-2xl text-center"
          >
            <div className="w-16 h-16 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 font-bold">
              <Database size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2">Overwrite Database?</h3>
            <p className="text-muted-foreground text-sm mb-2">
              You selected: <span className="font-mono text-xs text-brand-500 font-bold block mt-1 break-all bg-muted p-2 rounded-lg">{pendingDbFile?.name}</span>
            </p>
            <p className="text-muted-foreground text-xs mb-6 text-red-500 font-semibold">
              This will <strong>PERMANENTLY OVERWRITE</strong> your current database. All existing data will be replaced.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={cancelRestoreDb}
                className="flex-1 py-2.5 rounded-xl border border-border hover:bg-muted transition-all font-bold text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={confirmRestoreDb}
                className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-all font-bold text-sm"
              >
                Yes, Restore
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Security Info */}
      <div className="bg-brand-500/5 border border-brand-500/10 rounded-3xl p-6 flex items-start gap-4">
        <div className="p-2 rounded-xl bg-brand-500/10 text-brand-500 shrink-0">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h4 className="font-bold text-brand-500">Data Security & Storage</h4>
          <p className="text-sm text-muted-foreground mt-1">
            All database backups are saved locally on your device in your configured backup directory. 
            Keep your backup folder secure as it contains complete financial and store transaction records.
          </p>
        </div>
      </div>
    </div>
  );
}
