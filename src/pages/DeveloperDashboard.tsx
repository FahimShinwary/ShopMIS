import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Database, 
  ShieldAlert, 
  Users, 
  Download, 
  Upload, 
  Play, 
  Trash2, 
  Plus, 
  RefreshCw,
  AlertTriangle,
  FileJson,
  LayoutDashboard,
  Edit2,
  Search,
  User,
  Clock,
  Activity,
  Filter,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, convertPersianDigits } from '../lib/utils';

interface DeveloperDashboardProps {
  t: any;
  onNotify?: (msg: string, type: 'success' | 'error') => void;
}

export default function DeveloperDashboard({ t, onNotify }: DeveloperDashboardProps) {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'users' | 'logs' | 'backup' | 'query'>('overview');
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState<any>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'admin' });
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [pendingRestoreFile, setPendingRestoreFile] = useState<File | null>(null);
  
  // Audit Logs Filter State
  const [logSearch, setLogSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [selectedAction, setSelectedAction] = useState('ALL');

  useEffect(() => {
    fetchLogs();
    fetchUsers();
    fetchSystemStatus();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'logs') fetchLogs();
    if (activeSubTab === 'users') fetchUsers();
  }, [activeSubTab]);

  const fetchSystemStatus = async () => {
    try {
      let licenseData: any = null;
      if (window.electronAPI) {
        licenseData = await window.electronAPI.getLicenseStatus();
      } else {
        const res = await fetch('/api/license/status');
        licenseData = await res.json();
      }
      
      setSystemStatus({
        license: licenseData.activated ? 'Activated (Lifetime)' : 'Not Activated',
        remaining: licenseData.activated ? 'Lifetime' : 'N/A',
        database: 'Connected',
        version: '1.0.1',
        environment: window.electronAPI ? 'Desktop' : 'Web'
      });
    } catch (e) {
      setSystemStatus({ database: 'Error', license: 'Unknown' });
    }
  };

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI) {
        const data = await window.electronAPI.getLogs();
        setLogs(data);
      } else {
        const res = await fetch('/api/logs');
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI) {
        const data = await window.electronAPI.getUsers();
        setUsers(data);
      } else {
        const res = await fetch('/api/users');
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (window.electronAPI) {
        if (editingUser) {
          await window.electronAPI.executeRaw(`UPDATE users SET username = '${newUser.username}', password = '${newUser.password}', role = '${newUser.role}' WHERE id = ${editingUser.id}`);
        } else {
          await window.electronAPI.createUser(newUser);
        }
        setIsUserModalOpen(false);
        setEditingUser(null);
        setNewUser({ username: '', password: '', role: 'admin' });
        fetchUsers();
      } else {
        const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
        const method = editingUser ? 'PUT' : 'POST';
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newUser)
        });
        if (res.ok) {
          setIsUserModalOpen(false);
          setEditingUser(null);
          setNewUser({ username: '', password: '', role: 'admin' });
          fetchUsers();
        }
      }
    } catch (e) {
      alert('Failed to save user');
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      if (window.electronAPI) {
        await window.electronAPI.deleteUser(userToDelete);
        fetchUsers();
        setIsDeleteModalOpen(false);
        setUserToDelete(null);
      } else {
        const res = await fetch(`/api/users/${userToDelete}`, { method: 'DELETE' });
        if (res.ok) {
          fetchUsers();
          setIsDeleteModalOpen(false);
          setUserToDelete(null);
        } else {
          alert('Delete failed');
        }
      }
    } catch (e) {
      alert('Delete failed');
    }
  };

  const handleExecuteQuery = async () => {
    if (!query.trim()) return;
    setIsExecuting(true);
    setQueryError(null);
    setQueryResult(null);
    try {
      if (window.electronAPI) {
        const data = await window.electronAPI.executeRaw(query);
        setQueryResult(data);
      } else {
        const res = await fetch('/api/developer/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, devPassword: 'NewCode@ShopMIS' })
        });
        const data = await res.json();
        if (res.ok) {
          setQueryResult(data);
        } else {
          setQueryError(data.error);
        }
      }
    } catch (e: any) {
      setQueryError(e.message);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleRestoreDB = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (window.electronAPI) {
      setIsRestoreConfirmOpen(true);
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    setPendingRestoreFile(file);
    setIsRestoreConfirmOpen(true);
    e.target.value = '';
  };

  const confirmRestore = async () => {
    setIsRestoreConfirmOpen(false);
    setIsRestoring(true);
    
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.restore();
        if (res.success) {
          onNotify?.('Database restored successfully. Application will reload.', 'success');
          setTimeout(() => window.location.reload(), 1500);
        } else {
          onNotify?.('Restore failed: ' + (res.error || 'Unknown error'), 'error');
        }
      } else {
        if (!pendingRestoreFile) return;
        const formData = new FormData();
        formData.append('database', pendingRestoreFile);

        const res = await fetch('/api/restore', {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          onNotify?.('Database restored successfully. Application will reload.', 'success');
          setTimeout(() => window.location.reload(), 1500);
        } else {
          const data = await res.json();
          onNotify?.('Restore failed: ' + (data.error || 'Unknown error'), 'error');
        }
      }
    } catch (e: any) {
      onNotify?.('Restore failed: ' + e.message, 'error');
    } finally {
      setIsRestoring(false);
      setPendingRestoreFile(null);
    }
  };

  const handleQuickTool = async (tool: string) => {
    setIsExecuting(true);
    try {
      let q = '';
      if (tool === 'recalculate') {
        q = 'UPDATE kata_summary SET total_purchase = (SELECT COALESCE(SUM(amount), 0) FROM kata_transactions WHERE kata_transactions.customer_id = kata_summary.customer_id AND (type = "purchase" OR type = "debit"))';
      } else if (tool === 'clean_duplicates') {
        q = 'DELETE FROM roznamcha WHERE id NOT IN (SELECT MIN(id) FROM roznamcha GROUP BY date, type, amount, description, bill_number, customer_id)';
      } else if (tool === 'reset_admin') {
        q = "UPDATE users SET password = 'NewCode@ShopMIS' WHERE role = 'admin' OR id = 1";
      } else if (tool === 'reset_license') {
        if (!confirm('Lock app and show Activation License Window?')) {
          setIsExecuting(false);
          return;
        }
        localStorage.removeItem('shop_mis_license');
        if (window.electronAPI) {
          await window.electronAPI.executeRaw("DELETE FROM settings WHERE key IN ('system_license', 'license_activation_date')");
        } else {
          await fetch('/api/license/deactivate', { method: 'POST' });
        }
        onNotify?.('License reset! Showing activation window...', 'success');
        setTimeout(() => {
          window.location.reload();
        }, 500);
        return;
      } else if (tool === 'wipe_data') {
        if (!confirm('WIPE ALL DATA? This will permanently delete all transactions, logs, customers, and inventory. This cannot be undone!')) {
          setIsExecuting(false);
          return;
        }
        q = 'DELETE FROM roznamcha; DELETE FROM kata_transactions; DELETE FROM kata_summary; DELETE FROM stock; DELETE FROM customers; DELETE FROM system_logs;';
      }
      
      let success = false;
      if (window.electronAPI) {
        const res = await window.electronAPI.executeRaw(q);
        success = !res || !res.error;
      } else {
        const res = await fetch('/api/developer/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q, devPassword: 'NewCode@ShopMIS' })
        });
        const data = await res.json();
        success = res.ok && !data.error;
      }

      if (success) {
        if (tool === 'wipe_data') {
          onNotify?.('All system data wiped successfully! Reloading system...', 'success');
          alert('All business data wiped successfully! Click OK to reload.');
          window.location.reload();
        } else {
          onNotify?.('Tool executed successfully!', 'success');
          alert('Tool executed successfully');
        }
      } else {
        alert('Tool execution failed');
      }
    } catch (e: any) {
      alert('Tool execution failed: ' + (e.message || 'Unknown error'));
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExportJSON = async () => {
    try {
      let data;
      if (window.electronAPI) {
        data = await window.electronAPI.exportJson();
      } else {
        const res = await fetch('/api/export-json');
        data = await res.json();
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shop_mis_full_export_${new Date().toISOString()}.json`;
      a.click();
    } catch (e) {
      alert('Export failed');
    }
  };

  const handleDownloadDB = () => {
    if (window.electronAPI) {
      window.electronAPI.backup();
    } else {
      window.location.href = '/api/backup';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tighter flex items-center gap-3 text-red-500">
            <ShieldAlert size={32} />
            Developer Access
          </h2>
          <p className="text-muted-foreground font-medium mt-1">Root-level system management & debugging</p>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-muted border border-border rounded-2xl p-1 w-fit">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={cn(
            "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeSubTab === 'overview' ? "bg-background text-brand-500 shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <LayoutDashboard size={16} />
          Overview
        </button>
        <button
          onClick={() => setActiveSubTab('users')}
          className={cn(
            "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeSubTab === 'users' ? "bg-background text-brand-500 shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Users size={16} />
          User Management
        </button>
        <button
          onClick={() => setActiveSubTab('logs')}
          className={cn(
            "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeSubTab === 'logs' ? "bg-background text-brand-500 shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <AlertTriangle size={16} />
          Error Monitoring
        </button>
        <button
          onClick={() => setActiveSubTab('backup')}
          className={cn(
            "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeSubTab === 'backup' ? "bg-background text-brand-500 shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Database size={16} />
          Backup & Restore
        </button>
        <button
          onClick={() => setActiveSubTab('query')}
          className={cn(
            "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeSubTab === 'query' ? "bg-background text-brand-500 shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Terminal size={16} />
          Database Management
        </button>
      </div>

      <div className="bg-card border border-border rounded-3xl p-8 shadow-soft min-h-[500px]">
        {activeSubTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-muted/30 border border-border rounded-3xl p-6 space-y-4">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                  <Users size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total Users</p>
                  <p className="text-4xl font-black mt-1">{users.length}</p>
                </div>
              </div>
              <div className="bg-muted/30 border border-border rounded-3xl p-6 space-y-4">
                <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center text-red-500">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">System Errors</p>
                  <p className="text-4xl font-black mt-1">{logs.length}</p>
                </div>
              </div>
              <div className="bg-muted/30 border border-border rounded-3xl p-6 space-y-4">
                <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500">
                  <RefreshCw size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Activity Logs</p>
                  <p className="text-4xl font-black mt-1">{logs.length > 0 ? logs.length : 1}</p>
                </div>
              </div>
              <div className="bg-muted/30 border border-border rounded-3xl p-6 space-y-4">
                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500">
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">License Status</p>
                  <p className="text-4xl font-black mt-1">{systemStatus?.remaining || 'N/A'}</p>
                </div>
                <button
                  onClick={() => handleQuickTool('reset_license')}
                  className="w-full mt-2 text-xs py-2 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <Key size={14} />
                  Test Activation Screen
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {systemStatus && Object.entries(systemStatus).map(([key, value]: [string, any]) => (
                <div key={key} className="p-4 bg-muted/30 border border-border rounded-2xl">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{key}</p>
                  <p className={cn(
                    "text-sm font-bold",
                    value === 'Connected' || value === 'Activated' ? "text-green-500" : 
                    value === 'Error' || value === 'Not Activated' ? "text-red-500" : ""
                  )}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSubTab === 'query' && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Terminal size={20} className="text-brand-500" />
              Database Query Tool
            </h3>

            <div className="space-y-2">
              <div className="relative">
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter custom query or command..."
                  className="w-full h-40 bg-[#0a0a0a] border border-[#222] rounded-2xl p-6 font-mono text-sm text-green-500 focus:outline-none focus:border-brand-500/50 transition-all"
                />
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <button
                    onClick={handleExecuteQuery}
                    disabled={isExecuting}
                    className="bg-brand-500 hover:bg-brand-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-brand-500/20 disabled:opacity-50"
                  >
                    {isExecuting ? <RefreshCw className="animate-spin" size={18} /> : <Play size={18} />}
                    Execute Query
                  </button>
                  <button
                    onClick={() => handleQuickTool('wipe_data')}
                    className="bg-muted hover:bg-muted/80 text-muted-foreground px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all"
                  >
                    Reset DB
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => setQuery('CREATE TABLE IF NOT EXISTS new_table (id INTEGER PRIMARY KEY, name TEXT)')}
                className="p-4 bg-muted/30 border border-border rounded-2xl text-center font-bold hover:bg-muted/50 transition-all"
              >
                Add New Table
              </button>
              <button
                onClick={() => setQuery('ALTER TABLE users ADD COLUMN new_col TEXT')}
                className="p-4 bg-muted/30 border border-border rounded-2xl text-center font-bold hover:bg-muted/50 transition-all"
              >
                Add New Column
              </button>
              <button
                onClick={() => handleQuickTool('reset_admin')}
                className="p-4 bg-orange-500/10 border border-orange-500/20 text-orange-500 rounded-2xl text-center font-bold hover:bg-orange-500/20 transition-all"
              >
                Reset Admin Access
              </button>
              <button
                onClick={() => handleQuickTool('wipe_data')}
                className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-center font-bold hover:bg-red-500/20 transition-all"
              >
                Wipe All Data
              </button>
            </div>

            {queryError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-500 text-sm font-mono">
                Error: {queryError}
              </div>
            )}

            {queryResult && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">Query Result</label>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">{Array.isArray(queryResult) ? queryResult.length : 1} rows affected</span>
                </div>
                <div className="bg-[#0a0a0a] border border-[#222] rounded-2xl overflow-hidden">
                  <div className="max-h-[400px] overflow-auto">
                    <pre className="p-6 text-xs text-green-400 font-mono">
                      {JSON.stringify(queryResult, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'logs' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
                  <Activity className="text-red-500" size={22} />
                  Developer Audit & System Operations Log
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Tracks all user actions, database CRUD operations, logins, and system events with timestamps and actor details.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={fetchLogs} 
                  disabled={isLoading}
                  className="px-3 py-2 bg-muted/50 hover:bg-muted border border-border rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
                >
                  <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                  Refresh
                </button>
                <button 
                  onClick={() => handleQuickTool('DELETE FROM system_logs')} 
                  className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl font-bold text-xs flex items-center gap-2 transition-all"
                >
                  <Trash2 size={14} />
                  Clear All Logs
                </button>
              </div>
            </div>

            {/* Metrics Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="p-4 bg-muted/30 border border-border rounded-2xl">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Logs</span>
                <p className="text-xl font-black mt-1 text-foreground">{logs.length}</p>
              </div>
              <div className="p-4 bg-muted/30 border border-border rounded-2xl">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Creates</span>
                <p className="text-xl font-black mt-1 text-emerald-500">
                  {logs.filter(l => (l.action || '').toUpperCase() === 'CREATE').length}
                </p>
              </div>
              <div className="p-4 bg-muted/30 border border-border rounded-2xl">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Updates</span>
                <p className="text-xl font-black mt-1 text-blue-500">
                  {logs.filter(l => (l.action || '').toUpperCase() === 'UPDATE').length}
                </p>
              </div>
              <div className="p-4 bg-muted/30 border border-border rounded-2xl">
                <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Deletes</span>
                <p className="text-xl font-black mt-1 text-red-500">
                  {logs.filter(l => (l.action || '').toUpperCase() === 'DELETE').length}
                </p>
              </div>
              <div className="p-4 bg-muted/30 border border-border rounded-2xl col-span-2 md:col-span-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-500">Auth Events</span>
                <p className="text-xl font-black mt-1 text-purple-500">
                  {logs.filter(l => (l.module || '').toUpperCase() === 'AUTH' || (l.action || '').startsWith('LOGIN')).length}
                </p>
              </div>
            </div>

            {/* Filter & Search Controls */}
            <div className="p-4 bg-muted/20 border border-border rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="relative w-full md:w-80">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter by user, action, module, description..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/50"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold mr-1">
                  <Filter size={14} />
                  <span>Module:</span>
                </div>
                <select
                  value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value)}
                  className="bg-background border border-border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500/50"
                >
                  <option value="ALL">All Modules</option>
                  <option value="Roznamcha">Roznamcha</option>
                  <option value="Kata">Kata</option>
                  <option value="Customers">Customers</option>
                  <option value="Stock">Stock</option>
                  <option value="Users">Users</option>
                  <option value="Auth">Auth</option>
                  <option value="Developer">Developer</option>
                  <option value="System">System</option>
                </select>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold ml-2 mr-1">
                  <span>Action:</span>
                </div>
                <select
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value)}
                  className="bg-background border border-border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500/50"
                >
                  <option value="ALL">All Actions</option>
                  <option value="CREATE">CREATE</option>
                  <option value="UPDATE">UPDATE</option>
                  <option value="DELETE">DELETE</option>
                  <option value="LOGIN">LOGIN</option>
                  <option value="LOGIN_FAILED">LOGIN_FAILED</option>
                  <option value="EXEC_QUERY">EXEC_QUERY</option>
                </select>
              </div>
            </div>

            {/* Audit Logs Table List */}
            <div className="space-y-2.5">
              {logs
                .filter(log => {
                  const matchMod = selectedModule === 'ALL' || (log.module || '').toUpperCase() === selectedModule.toUpperCase();
                  const matchAct = selectedAction === 'ALL' || (log.action || '').toUpperCase() === selectedAction.toUpperCase();
                  const q = logSearch.toLowerCase().trim();
                  const matchQuery = !q || 
                    (log.username || '').toLowerCase().includes(q) ||
                    (log.message || '').toLowerCase().includes(q) ||
                    (log.module || '').toLowerCase().includes(q) ||
                    (log.action || '').toLowerCase().includes(q) ||
                    (log.date || '').toLowerCase().includes(q);

                  return matchMod && matchAct && matchQuery;
                })
                .map((log) => {
                  const actionUpper = (log.action || 'LOG').toUpperCase();
                  const typeUpper = (log.type || 'INFO').toUpperCase();

                  let actionBadgeStyle = "bg-muted text-muted-foreground border-border";
                  if (actionUpper === 'CREATE') actionBadgeStyle = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
                  else if (actionUpper === 'UPDATE') actionBadgeStyle = "bg-blue-500/10 text-blue-500 border-blue-500/20";
                  else if (actionUpper === 'DELETE') actionBadgeStyle = "bg-red-500/10 text-red-500 border-red-500/20";
                  else if (actionUpper === 'LOGIN') actionBadgeStyle = "bg-purple-500/10 text-purple-500 border-purple-500/20";
                  else if (actionUpper === 'LOGIN_FAILED') actionBadgeStyle = "bg-rose-500/20 text-rose-500 border-rose-500/30";
                  else if (actionUpper === 'EXEC_QUERY') actionBadgeStyle = "bg-amber-500/10 text-amber-500 border-amber-500/20";

                  return (
                    <div 
                      key={log.id} 
                      className="p-4 bg-card border border-border/70 hover:border-border rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all shadow-sm"
                    >
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        {/* Actor Badge */}
                        <div className="w-10 h-10 rounded-xl bg-muted/60 border border-border flex items-center justify-center shrink-0 text-muted-foreground">
                          <User size={18} />
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* User name badge */}
                            <span className="inline-flex items-center gap-1 font-bold text-xs text-foreground bg-muted px-2 py-0.5 rounded-md border border-border/50">
                              @{log.username || 'system'}
                            </span>

                            {/* Action badge */}
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${actionBadgeStyle}`}>
                              {actionUpper}
                            </span>

                            {/* Module badge */}
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/80 bg-muted/40 px-2 py-0.5 rounded-md">
                              {log.module}
                            </span>
                          </div>

                          {/* Detail message */}
                          <p className="text-xs font-medium text-foreground/90 break-words pt-0.5">
                            {log.message}
                          </p>
                        </div>
                      </div>

                      {/* Time timestamp */}
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground shrink-0 self-end sm:self-center bg-muted/30 px-2.5 py-1 rounded-lg border border-border/40">
                        <Clock size={12} className="text-muted-foreground/70" />
                        <span>{new Date(log.date).toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}

              {logs.length === 0 && !isLoading && (
                <div className="text-center py-20 text-muted-foreground border border-dashed border-border rounded-3xl">
                  <ShieldCheck size={36} className="mx-auto mb-3 text-muted-foreground/50" />
                  <p className="font-bold text-sm">No operation logs recorded yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Actions performed across Roznamcha, Kata, Stock, Users, and Developer mode will appear here.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeSubTab === 'users' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold tracking-tight">System User Management</h3>
              <button 
                onClick={() => setIsUserModalOpen(true)}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2"
              >
                <Plus size={18} />
                Create User
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {users.map((u) => (
                <div key={u.id} className="p-6 bg-muted/30 border border-border rounded-3xl flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-500">
                      <Users size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold">{u.username}</h4>
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{u.role}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        setEditingUser(u);
                        setNewUser({ username: u.username, password: u.password, role: u.role });
                        setIsUserModalOpen(true);
                      }}
                      className="p-2 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground hover:text-brand-500"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => {
                        setUserToDelete(u.id);
                        setIsDeleteModalOpen(true);
                      }}
                      className="p-2 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSubTab === 'backup' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 bg-muted/30 border border-border rounded-3xl space-y-6">
              <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500">
                <Database size={32} />
              </div>
              <div>
                <h4 className="text-lg font-bold">Database Backup</h4>
                <p className="text-sm text-muted-foreground mt-1">Download the full SQLite database file for offline storage.</p>
              </div>
              <button
                onClick={handleDownloadDB}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Download size={20} />
                Download .db File
              </button>
            </div>

            <div className="p-8 bg-muted/30 border border-border rounded-3xl space-y-6">
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500">
                <Upload size={32} />
              </div>
              <div>
                <h4 className="text-lg font-bold">Restore Database</h4>
                <p className="text-sm text-muted-foreground mt-1">Upload a previously backed up .db file to restore the entire system.</p>
              </div>
              <div className="relative">
                {!window.electronAPI ? (
                  <>
                    <input
                      type="file"
                      accept=".db"
                      onChange={handleRestoreDB}
                      disabled={isRestoring}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <button
                      className={cn(
                        "w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all",
                        isRestoring && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {isRestoring ? <RefreshCw className="animate-spin" size={20} /> : <Upload size={20} />}
                      Upload & Restore .db
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleRestoreDB({} as any)}
                    disabled={isRestoring}
                    className={cn(
                      "w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all",
                      isRestoring && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {isRestoring ? <RefreshCw className="animate-spin" size={20} /> : <Upload size={20} />}
                    Restore from .db File
                  </button>
                )}
              </div>
            </div>

            <div className="p-8 bg-muted/30 border border-border rounded-3xl space-y-6 md:col-span-2">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500">
                  <FileJson size={32} />
                </div>
                <div>
                  <h4 className="text-lg font-bold">JSON Data Export</h4>
                  <p className="text-sm text-muted-foreground mt-1">Export all system data as a readable JSON file for reporting or manual inspection.</p>
                </div>
              </div>
              <button
                onClick={handleExportJSON}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Download size={20} />
                Export JSON
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isUserModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUserModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-card border border-border rounded-3xl p-8 w-full max-w-md relative z-[101] shadow-2xl"
            >
              <h3 className="text-xl font-bold mb-6">{editingUser ? 'Edit System User' : 'Create New System User'}</h3>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Username</label>
                  <input 
                    type="text" 
                    required
                    value={newUser.username}
                    onChange={e => setNewUser({...newUser, username: convertPersianDigits(e.target.value)})}
                    className="w-full bg-muted border border-border rounded-xl px-4 py-2 focus:outline-none focus:border-red-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Password</label>
                  <input 
                    type="password" 
                    required
                    value={newUser.password}
                    onChange={e => setNewUser({...newUser, password: convertPersianDigits(e.target.value)})}
                    className="w-full bg-muted border border-border rounded-xl px-4 py-2 focus:outline-none focus:border-red-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Role</label>
                  <select 
                    value={newUser.role}
                    onChange={e => setNewUser({...newUser, role: e.target.value})}
                    className="w-full bg-muted border border-border rounded-xl px-4 py-2 focus:outline-none focus:border-red-500"
                  >
                    <option value="admin">Admin</option>
                    <option value="cashier">Cashier</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsUserModalOpen(false);
                      setEditingUser(null);
                      setNewUser({ username: '', password: '', role: 'admin' });
                    }}
                    className="flex-1 py-2 rounded-xl border border-border hover:bg-muted transition-all font-bold"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white transition-all font-bold"
                  >
                    {editingUser ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
              className="bg-card border border-border rounded-3xl p-8 w-full max-w-sm relative z-[101] shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">Delete User?</h3>
              <p className="text-muted-foreground text-sm mb-6">This action cannot be undone. The user will lose all access immediately.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-border hover:bg-muted transition-all font-bold"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteUser}
                  className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-all font-bold"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isRestoreConfirmOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRestoreConfirmOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-card border border-border rounded-3xl p-8 w-full max-w-sm relative z-[101] shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Database size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">Restore Database?</h3>
              <p className="text-muted-foreground text-sm mb-6">
                This will **OVERWRITE** the entire current database. Any unsaved data will be lost. Are you sure?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsRestoreConfirmOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-border hover:bg-muted transition-all font-bold"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmRestore}
                  className="flex-1 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-all font-bold"
                >
                  Overwrite & Restore
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
