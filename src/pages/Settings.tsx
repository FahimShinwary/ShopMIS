import React, { useState, useRef, useEffect } from 'react';
import { Languages, Settings as SettingsIcon, Sun, Moon, Store, MapPin, User, Lock, Save, CheckCircle2, Download, Upload, Database as DbIcon, AlertTriangle, FolderOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, convertPersianDigits } from '../lib/utils';
import { Language } from '../types';

interface SettingsProps {
  language: Language;
  setLanguage: (l: Language) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  t: any;
  shopInfo: { name: string; address: string };
  setShopInfo: (info: { name: string; address: string }) => void;
  adminSettings: { username: string; password: string };
  setAdminSettings: (settings: { username: string; password: string }) => void;
  fetchData: () => void;
}

export default function Settings({ 
  language, 
  setLanguage, 
  theme, 
  toggleTheme, 
  t,
  shopInfo,
  setShopInfo,
  adminSettings,
  setAdminSettings,
  fetchData
}: SettingsProps) {
  const [localShopInfo, setLocalShopInfo] = useState(shopInfo);
  const [localAdminSettings, setLocalAdminSettings] = useState(adminSettings);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (shopInfo) setLocalShopInfo(shopInfo);
  }, [shopInfo]);

  useEffect(() => {
    if (adminSettings) setLocalAdminSettings(adminSettings);
  }, [adminSettings]);
  const [isRestoring, setIsRestoring] = useState(false);
  const [dbPathInfo, setDbPathInfo] = useState<{ dbPath: string; customFolder: string }>({ dbPath: '', customFolder: '' });
  const [customFolderInput, setCustomFolderInput] = useState('');
  const [dbFolderSaveMsg, setDbFolderSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSavingDbFolder, setIsSavingDbFolder] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDbLocation();
  }, []);

  const loadDbLocation = async () => {
    try {
      if (window.electronAPI?.getDbLocation) {
        const info = await window.electronAPI.getDbLocation();
        setDbPathInfo(info);
        setCustomFolderInput(info.customFolder || '');
      } else {
        const res = await fetch('/api/db-location');
        if (res.ok) {
          const info = await res.json();
          setDbPathInfo(info);
          setCustomFolderInput(info.customFolder || '');
        }
      }
    } catch (e) {
      console.error('Failed to load DB location:', e);
    }
  };

  const handleSelectDbFolder = async () => {
    if (window.electronAPI?.selectDirectory) {
      const selected = await window.electronAPI.selectDirectory();
      if (selected) {
        setCustomFolderInput(selected);
      }
    }
  };

  const handleSaveDbFolder = async () => {
    if (!customFolderInput.trim()) {
      setDbFolderSaveMsg({ type: 'error', text: 'Please enter or select a valid folder path.' });
      return;
    }
    setIsSavingDbFolder(true);
    setDbFolderSaveMsg(null);
    try {
      let res: { success: boolean; error?: string; dbPath?: string; customFolder?: string };
      if (window.electronAPI?.setDbFolder) {
        res = await window.electronAPI.setDbFolder(customFolderInput.trim());
      } else {
        const fetchRes = await fetch('/api/db-location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderPath: customFolderInput.trim() })
        });
        res = await fetchRes.json();
      }

      if (res.success) {
        setDbFolderSaveMsg({ type: 'success', text: `Database location updated! File saved to: ${res.dbPath || res.customFolder}` });
        await loadDbLocation();
        fetchData();
      } else {
        setDbFolderSaveMsg({ type: 'error', text: res.error || 'Failed to update database folder.' });
      }
    } catch (e: any) {
      setDbFolderSaveMsg({ type: 'error', text: e.message || 'An error occurred.' });
    } finally {
      setIsSavingDbFolder(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setShopInfo(localShopInfo);
      await setAdminSettings(localAdminSettings);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update settings in DB:', err);
    }
  };

  const handleBackup = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.backup();
      if (result.success) {
        alert('Backup saved successfully!');
      }
    } else {
      window.location.href = '/api/backup';
    }
  };

  const handleRestoreClick = () => {
    if (window.electronAPI) {
      handleElectronRestore();
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleElectronRestore = async () => {
    if (!confirm('Are you sure you want to restore? This will replace all current data!')) return;
    
    setIsRestoring(true);
    const result = await window.electronAPI.restore();
    setIsRestoring(false);
    
    if (result.success) {
      alert('Database restored successfully! The app will now refresh.');
      window.location.reload();
    } else {
      alert(result.error || 'Failed to restore database.');
    }
  };

  const handleWebRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Are you sure you want to restore? This will replace all current data!')) {
      e.target.value = '';
      return;
    }

    setIsRestoring(true);
    const formData = new FormData();
    formData.append('database', file);

    try {
      const response = await fetch('/api/restore', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        alert('Database restored successfully! The app will now refresh.');
        window.location.reload();
      } else {
        alert('Failed to restore database.');
      }
    } catch (error) {
      console.error('Restore error:', error);
      alert('An error occurred during restore.');
    } finally {
      setIsRestoring(false);
      e.target.value = '';
    }
  };

  return (
    <div className="max-w-4xl space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">{t.settings}</h2>
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-2 bg-green-500/10 text-green-500 px-4 py-2 rounded-xl border border-green-500/20 text-sm font-medium"
            >
              <CheckCircle2 size={18} />
              {t.success_save}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Shop Information */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-8 shadow-soft"
        >
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Store size={24} className="text-brand-500" />
            {t.shop_info}
          </h3>
          <form className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">{t.shop_name}</label>
              <div className="relative">
                <Store className="absolute inset-s-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                  type="text"
                  value={localShopInfo.name}
                  onChange={(e) => setLocalShopInfo({ ...localShopInfo, name: convertPersianDigits(e.target.value) })}
                  className="w-full bg-muted border border-border rounded-xl py-2.5 ps-10 pe-4 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">{t.shop_address}</label>
              <div className="relative">
                <MapPin className="absolute inset-s-3 top-3 text-muted-foreground" size={18} />
                <textarea
                  value={localShopInfo.address}
                  onChange={(e) => setLocalShopInfo({ ...localShopInfo, address: convertPersianDigits(e.target.value) })}
                  className="w-full bg-muted border border-border rounded-xl py-2.5 ps-10 pe-4 focus:outline-none focus:border-brand-500 transition-colors h-24 resize-none"
                />
              </div>
            </div>
          </form>
        </motion.div>

        {/* Admin Credentials */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-2xl p-8 shadow-soft"
        >
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <User size={24} className="text-brand-500" />
            {t.admin_creds}
          </h3>
          <form className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">{t.username}</label>
              <div className="relative">
                <User className="absolute inset-s-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                  type="text"
                  value={localAdminSettings.username}
                  onChange={(e) => setLocalAdminSettings({ ...localAdminSettings, username: convertPersianDigits(e.target.value) })}
                  className="w-full bg-muted border border-border rounded-xl py-2.5 ps-10 pe-4 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">{t.password}</label>
              <div className="relative">
                <Lock className="absolute inset-s-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                  type="password"
                  value={localAdminSettings.password}
                  onChange={(e) => setLocalAdminSettings({ ...localAdminSettings, password: convertPersianDigits(e.target.value) })}
                  className="w-full bg-muted border border-border rounded-xl py-2.5 ps-10 pe-4 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>
          </form>
        </motion.div>

        {/* Database Storage Location */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="bg-card border border-border rounded-2xl p-8 shadow-soft lg:col-span-2"
        >
          <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
            <DbIcon size={24} className="text-brand-500" />
            Database Storage Folder
          </h3>
          <p className="text-xs text-muted-foreground mb-6">
            Configure the local directory where your SQLite database (<code className="text-brand-500">shop_mis.db</code>) is saved on your computer.
          </p>

          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-xl border border-border text-xs space-y-1">
              <span className="text-muted-foreground font-medium">Active Database File Path:</span>
              <p className="font-mono text-foreground font-semibold break-all">{dbPathInfo.dbPath || 'Loading...'}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Custom Database Folder Location</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. C:\ShopMISData or D:\Databases"
                  value={customFolderInput}
                  onChange={(e) => setCustomFolderInput(e.target.value)}
                  className="flex-1 bg-muted border border-border rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-brand-500 transition-colors"
                />
                {window.electronAPI?.selectDirectory && (
                  <button
                    type="button"
                    onClick={handleSelectDbFolder}
                    className="flex items-center gap-2 px-4 py-2.5 bg-muted border border-border hover:bg-muted/80 rounded-xl text-sm font-bold transition-all"
                  >
                    <FolderOpen size={18} />
                    Browse
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSaveDbFolder}
                  disabled={isSavingDbFolder}
                  className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                >
                  {isSavingDbFolder ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <Save size={18} />
                  )}
                  Save Folder
                </button>
              </div>
            </div>

            {dbFolderSaveMsg && (
              <div className={cn(
                "p-3 rounded-xl border text-xs font-medium flex items-center gap-2",
                dbFolderSaveMsg.type === 'success' ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-red-500/10 border-red-500/20 text-red-500"
              )}>
                {dbFolderSaveMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                {dbFolderSaveMsg.text}
              </div>
            )}
          </div>
        </motion.div>

        {/* Backup & Restore */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card border border-border rounded-2xl p-8 shadow-soft lg:col-span-2"
        >
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <DbIcon size={24} className="text-brand-500" />
            Backup & Restore
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-muted rounded-2xl border border-border space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <Download size={20} />
                </div>
                <div>
                  <p className="font-bold text-sm">Backup Database</p>
                  <p className="text-xs text-muted-foreground">Download a copy of your data</p>
                </div>
              </div>
              <button 
                onClick={handleBackup}
                className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold transition-all"
              >
                <Download size={18} />
                Download Backup
              </button>
            </div>

            <div className="p-6 bg-muted rounded-2xl border border-border space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <Upload size={20} />
                </div>
                <div>
                  <p className="font-bold text-sm">Restore Database</p>
                  <p className="text-xs text-muted-foreground">Upload and replace current data</p>
                </div>
              </div>
              <button 
                onClick={handleRestoreClick}
                disabled={isRestoring}
                className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50"
              >
                {isRestoring ? (
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <Upload size={18} />
                )}
                {isRestoring ? 'Restoring...' : 'Restore from File'}
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleWebRestore} 
                accept=".db" 
                className="hidden" 
              />
              <div className="flex items-start gap-2 text-[10px] text-amber-600 font-medium bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                Warning: Restoring will overwrite all current data. This action cannot be undone.
              </div>
            </div>
          </div>
        </motion.div>

        {/* Language & Theme */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-2xl p-8 shadow-soft lg:col-span-2"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Languages size={24} className="text-brand-500" />
                {t.language}
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {(['en', 'ps', 'dr'] as Language[]).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={cn(
                      "p-3 rounded-xl border transition-all font-bold text-sm",
                      language === lang 
                        ? "bg-brand-500/10 border-brand-500 text-brand-500" 
                        : "bg-muted border-border text-muted-foreground hover:border-brand-500/50"
                    )}
                  >
                    {lang === 'en' ? 'English' : lang === 'ps' ? 'پښتو' : 'دری'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <SettingsIcon size={24} className="text-brand-500" />
                {t.appearance}
              </h3>
              <div className="flex items-center justify-between p-4 bg-muted rounded-xl border border-border">
                <div>
                  <p className="font-bold text-sm">{t.theme_mode}</p>
                  <p className="text-xs text-muted-foreground">Toggle between light and dark</p>
                </div>
                <button 
                  onClick={toggleTheme}
                  className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                  <span className="text-xs font-bold uppercase">{theme}</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="flex justify-end">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-brand-500/20"
        >
          <Save size={20} />
          {t.save_changes}
        </motion.button>
      </div>
    </div>
  );
}
