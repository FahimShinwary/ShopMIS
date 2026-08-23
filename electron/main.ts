import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import path from 'path';
import fs from 'fs';
import * as crud from '../src/database/crud';
import { dbPath, reinitDatabase, getCustomDbFolder, setCustomDbFolder, performDatabaseBackup } from '../src/database/db';

const writeCrashLog = (type: string, error: any) => {
  try {
    const logDir = app?.getPath ? app.getPath('userData') : process.cwd();
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logFile = path.join(logDir, 'crash_report.log');
    const timestamp = new Date().toISOString();
    const msg = `[${timestamp}] [${type}] ${error?.stack || error?.message || error}\n`;
    fs.appendFileSync(logFile, msg, 'utf8');
  } catch (e) {}
};

// Handle uncaught exceptions & promise rejections
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  writeCrashLog('UncaughtException', error);
  try {
    dialog.showErrorBox('Critical Error', `${error?.message || 'An unexpected error occurred.'}\n\nPlease check crash_report.log in %APPDATA%\\Shop MIS`);
  } catch (e) {}
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  writeCrashLog('UnhandledRejection', reason);
});

const licensePath = path.join(app.getPath('userData'), 'license.json');

const isValidLicenseKey = (key: string): boolean => {
  if (!key || typeof key !== 'string') return false;
  const cleanKey = key.trim();
  if (!cleanKey) return false;
  const upperKey = cleanKey.toUpperCase();
  if (upperKey === 'NEWCODE@SHOPMIS' || upperKey === 'SHOPMIS' || upperKey === 'SHOPMIS-2026' || upperKey === 'SHOP-MIS-2026' || upperKey === 'SOFTTOUCH-2026' || upperKey === 'ADMIN-ACTIVATION' || upperKey === 'SHOP-MIS-JALALABAD' || upperKey === 'SHOP-MIS-JALALABD') {
    return true;
  }
  return cleanKey.length >= 4;
};

const getLicenseData = () => {
  if (fs.existsSync(licensePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(licensePath, 'utf8'));
      if (data && isValidLicenseKey(data.system_license)) {
        return data;
      }
    } catch (e) {
      // ignore
    }
  }
  return {};
};

const saveLicenseData = (data: any) => {
  fs.writeFileSync(licensePath, JSON.stringify(data));
};

let mainWindow: BrowserWindow | null = null;
const isDev = !app.isPackaged;

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // If another instance is already running, focus it and quit this new launch
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 900,
      minHeight: 600,
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        nodeIntegration: false,
        contextIsolation: true,
      },
      backgroundColor: '#0a0a0a',
      title: 'Shop MIS - Soft Touch Technology',
      show: false,
    });

    mainWindow.removeMenu();
    Menu.setApplicationMenu(null);

    // Fallback: Show window after 5 seconds if ready-to-show doesn't fire
    const showTimeout = setTimeout(() => {
      if (mainWindow && !mainWindow.isVisible()) {
        mainWindow.show();
      }
    }, 5000);

    mainWindow.once('ready-to-show', () => {
      clearTimeout(showTimeout);
      if (mainWindow) {
        mainWindow.show();
      }
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Failed to load:', errorCode, errorDescription);
      if (!isDev) {
        dialog.showErrorBox(
          'Load Error',
          `Failed to load application content: ${errorDescription} (${errorCode})`
        );
      }
    });

    if (isDev) {
      mainWindow.loadURL('http://localhost:3000');
      mainWindow.webContents.openDevTools();
    } else {
      const indexPath = path.join(__dirname, '../dist/index.html');
      if (fs.existsSync(indexPath)) {
        mainWindow.loadFile(indexPath);
      } else {
        dialog.showErrorBox(
          'Startup Error',
          'The application assets (dist/index.html) could not be found. Please ensure the application was built correctly.'
        );
      }
    }

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  }

  // ... (rest of the IPC handlers)

// IPC Handlers for Database
ipcMain.handle('db:getStats', () => crud.stats.getOverview());

ipcMain.handle('db:getRoznamcha', () => crud.roznamcha.getAll());
ipcMain.handle('db:createRoznamcha', (_, entry, username) => crud.roznamcha.create(entry, username));
ipcMain.handle('db:updateRoznamcha', (_, id, entry, username) => crud.roznamcha.update(id, entry, username));
ipcMain.handle('db:deleteRoznamcha', (_, id, username) => crud.roznamcha.delete(id, username));

ipcMain.handle('db:getKataTransactions', (_, customerId) => crud.kata.getTransactions(customerId));
ipcMain.handle('db:getKataSummaries', () => crud.kata.getSummaries());
ipcMain.handle('db:createKataTransaction', (_, entry, username) => crud.kata.createTransaction(entry, username));
ipcMain.handle('db:updateKataTransaction', (_, id, entry, username) => crud.kata.updateTransaction(id, entry, username));
ipcMain.handle('db:deleteKataTransaction', (_, id, username) => crud.kata.deleteTransaction(id, username));

ipcMain.handle('db:getStock', () => crud.stock.getAll());
ipcMain.handle('db:createStock', (_, entry, username) => crud.stock.create(entry, username));
ipcMain.handle('db:updateStock', (_, id, entry, username) => crud.stock.update(id, entry, username));
ipcMain.handle('db:deleteStock', (_, id, username) => crud.stock.delete(id, username));

ipcMain.handle('db:getCustomers', () => crud.customers.getAll());
ipcMain.handle('db:createCustomer', (_, entry, username) => crud.customers.create(entry, username));
ipcMain.handle('db:updateCustomer', (_, id, entry, username) => crud.customers.update(id, entry, username));
ipcMain.handle('db:deleteCustomer', (_, id, username) => crud.customers.delete(id, username));

// User Management
ipcMain.handle('db:getUsers', () => crud.users.getAll());
ipcMain.handle('db:getAdminUser', () => crud.users.getAdmin());
ipcMain.handle('db:createUser', (_, user, username) => crud.users.create(user, username));
ipcMain.handle('db:updateUser', (_, id, user, username) => crud.users.update(id, user, username));
ipcMain.handle('db:deleteUser', (_, id, username) => crud.users.delete(id, username));
ipcMain.handle('db:authenticate', (_, { username, password }) => {
  // Developer Login (Hardcoded)
  if (username === 'admin' && password === 'NewCode@ShopMIS') {
    crud.logs.add('Auth', 'Developer logged in via master credentials', 'warning', 'developer', 'LOGIN');
    return { 
      id: 0, 
      username: 'admin', 
      role: 'developer', 
      language: 'en' 
    };
  }
  return crud.users.authenticate(username, password);
});

// Logs
ipcMain.handle('db:getLogs', () => crud.logs.getAll());

// Developer Tools
ipcMain.handle('db:executeRaw', (_, query, username) => crud.developer.executeRaw(query, username));

ipcMain.handle('db:exportJson', async () => {
  const [roz, kataT, kataS, stock, cust, sett] = await Promise.all([
    crud.roznamcha.getAll(),
    crud.kata.getTransactions(),
    crud.kata.getSummaries(),
    crud.stock.getAll(),
    crud.customers.getAll(),
    crud.settings.getAll()
  ]);
  return {
    roznamcha: roz,
    kataTransactions: kataT,
    kataSummaries: kataS,
    stock: stock,
    customers: cust,
    settings: sett,
    exportDate: new Date().toISOString()
  };
});

ipcMain.handle('db:getSettings', () => crud.settings.getAll());
ipcMain.handle('db:setSetting', (_, { key, value }) => crud.settings.set(key, value));

ipcMain.handle('db:getDbLocation', () => {
  return {
    dbPath,
    customFolder: getCustomDbFolder()
  };
});

ipcMain.handle('db:setDbFolder', (_, folderPath: string) => {
  return setCustomDbFolder(folderPath);
});

ipcMain.handle('db:backup', async (event) => {
  const { filePath } = await dialog.showSaveDialog({
    title: 'Backup Database',
    defaultPath: 'shop_mis_backup.db',
    filters: [{ name: 'SQLite Database', extensions: ['db'] }]
  });

  if (filePath) {
    await performDatabaseBackup(filePath);
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('db:restore', async (event) => {
  console.log('Restore request received...');
  const { filePaths } = await dialog.showOpenDialog({
    title: 'Restore Database',
    filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    properties: ['openFile']
  });

  if (filePaths && filePaths.length > 0) {
    try {
      console.log(`Starting restore from: ${filePaths[0]}`);
      
      // Close existing connection
      reinitDatabase();
      
      // Ensure file exists and is accessible
      if (!fs.existsSync(filePaths[0])) {
        throw new Error('Source backup file does not exist.');
      }

      // Explicitly delete old DB and journals
      if (fs.existsSync(dbPath)) {
        console.log('Unlinking old database file...');
        fs.unlinkSync(dbPath);
      }
      
      // Copy new file
      console.log('Copying new database file...');
      fs.copyFileSync(filePaths[0], dbPath);
      
      // Verify copy
      if (!fs.existsSync(dbPath)) {
        throw new Error('Database file copy failed - file not found at destination.');
      }

      console.log('Restore successful, re-initializing...');
      return { success: true };
    } catch (error: any) {
      console.error('Restore error in Main Process:', error);
      return { success: false, error: error.message || 'Failed to restore database' };
    }
  }
  return { success: false };
});

// Auto Backup IPC Handlers
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Select Auto-Backup Folder',
    properties: ['openDirectory', 'createDirectory']
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('trigger-auto-backup', async (_, customFolderPath?: string) => {
  try {
    let targetFolder = customFolderPath || crud.settings.get('auto_backup_folder');
    if (!targetFolder || typeof targetFolder !== 'string' || !targetFolder.trim()) {
      targetFolder = path.join(process.cwd(), 'backups');
    } else {
      targetFolder = targetFolder.trim();
    }

    if (!fs.existsSync(targetFolder)) {
      try {
        fs.mkdirSync(targetFolder, { recursive: true });
      } catch (err: any) {
        return { success: false, error: 'Target directory does not exist and could not be created: ' + err.message };
      }
    }

    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupFileName = `shop_mis_backup_${dateStr}.db`;
    const destPath = path.join(targetFolder, backupFileName);

    await performDatabaseBackup(destPath);
    crud.settings.set('auto_backup_last_run', now.toISOString());
    crud.logs.add('Backup', `Manual auto-backup saved to ${destPath}`, 'info', 'admin', 'AUTO_BACKUP');

    return { success: true, filePath: destPath };
  } catch (err: any) {
    console.error('Trigger auto-backup error:', err);
    return { success: false, error: err.message || 'Failed to perform auto-backup' };
  }
});

async function checkAndRunAutoBackup() {
  try {
    const enabled = crud.settings.get('auto_backup_enabled');
    let folder = crud.settings.get('auto_backup_folder');
    const scheduledTime = crud.settings.get('auto_backup_time') || '20:00';

    const isEnabled = enabled === true || enabled === 'true' || enabled === 1 || enabled === '1';
    if (!isEnabled) return;

    if (!folder || typeof folder !== 'string' || !folder.trim()) {
      folder = path.join(process.cwd(), 'backups');
    } else {
      folder = folder.trim();
    }

    if (!fs.existsSync(folder)) {
      try {
        fs.mkdirSync(folder, { recursive: true });
      } catch (e) {
        return;
      }
    }

    const now = new Date();
    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const todayYMD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const lastRun = crud.settings.get('auto_backup_last_run');
    let lastRunYMD = '';
    if (lastRun) {
      const d = new Date(lastRun);
      if (!isNaN(d.getTime())) {
        lastRunYMD = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
    }

    if (lastRunYMD !== todayYMD && currentHHMM >= scheduledTime) {
      console.log(`Running scheduled auto-backup at ${currentHHMM} (scheduled: ${scheduledTime}) to ${folder}`);
      const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const destPath = path.join(folder, `shop_mis_auto_backup_${dateStr}.db`);
      await performDatabaseBackup(destPath);
      crud.settings.set('auto_backup_last_run', now.toISOString());
      crud.logs.add('Backup', `Scheduled auto-backup saved to ${destPath}`, 'info', 'system', 'AUTO_BACKUP');
    }
  } catch (e: any) {
    console.error('Error in checkAndRunAutoBackup:', e);
  }
}

// Background scheduler every 10s
setInterval(checkAndRunAutoBackup, 10000);

// License IPC Handlers
ipcMain.handle('license:status', () => {
  const licenseData = getLicenseData();
  const status = licenseData.system_license || crud.settings.get('system_license');
  let activationDate = licenseData.license_activation_date || crud.settings.get('license_activation_date');
  
  if (!status || !isValidLicenseKey(status)) {
    return { activated: false };
  }

  if (!activationDate) {
    activationDate = new Date().toISOString();
  }

  const activatedAt = new Date(activationDate);
  const expiresAt = new Date(activatedAt);
  expiresAt.setFullYear(expiresAt.getFullYear() + 100); // 100 years lifetime

  return { 
    activated: true,
    activationDate,
    expiresAt: expiresAt.toISOString(),
    remainingDays: 'Lifetime'
  };
});

ipcMain.handle('license:activate', (_, rawKey) => {
  let key = rawKey;
  if (typeof key === 'string') {
    key = key
      .replace(/[۰-۹]/g, (d: string) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
      .replace(/[٠-٩]/g, (d: string) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
      .trim();
  }

  if (isValidLicenseKey(key)) {
    const licenseData = getLicenseData();
    licenseData.system_license = key;
    if (!licenseData.license_activation_date) {
      licenseData.license_activation_date = new Date().toISOString();
    }
    saveLicenseData(licenseData);
    
    // Also sync to DB for redundancy
    try {
      crud.settings.set('system_license', key);
      const existingDate = crud.settings.get('license_activation_date');
      if (!existingDate) {
        crud.settings.set('license_activation_date', licenseData.license_activation_date);
      }
    } catch (e) {
      console.error('Failed to sync license to DB:', e);
    }

    return { success: true };
  }
  return { success: false };
});

app.whenReady().then(() => {
  try {
    createWindow();
  } catch (error: any) {
    dialog.showErrorBox('Initialization Error', error.message || 'Failed to create main window');
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
}
