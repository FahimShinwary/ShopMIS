import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Helper for dynamic require in CJS/ESM
const _require = typeof require !== 'undefined' ? require : null;

// Safe AppData directory resolver
export const getShopMisAppDataDir = (): string => {
  try {
    const electronModule = _require ? _require('electron') : null;
    const electronApp = electronModule?.app;
    if (electronApp && typeof electronApp.getPath === 'function') {
      const uData = electronApp.getPath('userData');
      if (uData) {
        if (!fs.existsSync(uData)) fs.mkdirSync(uData, { recursive: true });
        return uData;
      }
    }
  } catch (e) {}

  const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME || '', 'Library/Application Support') : '/tmp');
  const targetDir = path.join(appData, 'Shop MIS');
  try {
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
  } catch (e) {}
  return targetDir;
};

// Safe diagnostic logger for startup & database operations
export const writeStartupLog = (type: string, error: any) => {
  try {
    const logDir = getShopMisAppDataDir();
    const logFile = path.join(logDir, 'startup-error.log');
    const timestamp = new Date().toISOString();
    const msg = `[${timestamp}] [${type}] ${error?.stack || error?.message || error}\n`;
    fs.appendFileSync(logFile, msg, 'utf8');
    console.error(`[${type}]`, error);
  } catch (e) {}
};

// Helper to get the database config path
const getConfigPath = () => {
  const targetDir = getShopMisAppDataDir();
  return path.join(targetDir, 'db_config.json');
};

export const getCustomDbFolder = (): string => {
  try {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (cfg && cfg.customDbFolder && fs.existsSync(cfg.customDbFolder)) {
        return cfg.customDbFolder;
      }
    }
  } catch (e) {}
  return '';
};

const getDatabasePath = () => {
  // In Cloud Run or similar container environments, /tmp is the only writable directory
  if (process.env.K_SERVICE || process.env.CLOUD_RUN_JOB) {
    return '/tmp/shop_mis.db';
  }

  const customFolder = getCustomDbFolder();
  if (customFolder && fs.existsSync(customFolder)) {
    return path.join(customFolder, 'shop_mis.db');
  }

  // If in Electron, use userData
  try {
    const electronModule = typeof _require !== 'undefined' ? _require('electron') : null;
    const electronApp = electronModule?.app;
    if (electronApp && typeof electronApp.getPath === 'function') {
      const userDataPath = electronApp.getPath('userData');
      if (userDataPath) {
        if (!fs.existsSync(userDataPath)) {
          fs.mkdirSync(userDataPath, { recursive: true });
        }
        return path.join(userDataPath, 'shop_mis.db');
      }
    }
  } catch (e) {}

  // Safe user AppData directory (Guaranteed writable on Windows)
  try {
    const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME || '', 'Library/Application Support') : '/tmp');
    const targetDir = path.join(appData, 'Shop MIS');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    return path.join(targetDir, 'shop_mis.db');
  } catch (e) {
    return path.join(process.cwd(), 'shop_mis.db');
  }
};

export let dbPath = getDatabasePath();
console.log(`Database path: ${dbPath}`);

let dbInstance: any = null;

const resetDatabase = () => {
  console.warn('Database disk image is malformed. Resetting database...');
  if (dbInstance) {
    try { dbInstance.close(); } catch (e) {}
    dbInstance = null;
  }
  const corruptPath = `${dbPath}.corrupt-${Date.now()}`;
  if (fs.existsSync(dbPath)) {
    try {
      fs.renameSync(dbPath, corruptPath);
      console.log(`Corrupted database moved to: ${corruptPath}`);
    } catch (e) {
      console.error('Failed to rename corrupted database:', e);
      try { fs.unlinkSync(dbPath); } catch (unlinkErr) {}
    }
  }
};

// Helper to load better-sqlite3 with automatic binary resolution for Electron ASAR
const loadSqliteDatabase = (targetDbPath: string) => {
  let DatabaseConstructor: any;
  try {
    DatabaseConstructor = _require ? _require('better-sqlite3') : Database;
  } catch (e) {
    DatabaseConstructor = Database;
  }

  // Safely determine current directory without throwing in ESM environments
  let currentDir = process.cwd();
  try {
    if (typeof __dirname !== 'undefined' && __dirname) {
      currentDir = __dirname;
    }
  } catch (e) {}

  // List of possible native binding locations in packaged and dev environments
  const execDir = process.execPath ? path.dirname(process.execPath) : '';
  const possibleBindingPaths = [
    path.join(process.resourcesPath || '', 'app.asar.unpacked', 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node'),
    path.join(process.resourcesPath || '', 'app.asar.unpacked', 'node_modules', 'better-sqlite3', 'build', 'Debug', 'better_sqlite3.node'),
    path.join(execDir, 'resources', 'app.asar.unpacked', 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node'),
    path.join(process.resourcesPath || '', 'app.asar.unpacked', 'node_modules', 'better-sqlite3', 'prebuilds', `${process.platform}-${process.arch}.node`),
    path.join(process.resourcesPath || '', 'app.asar.unpacked', 'node_modules', 'better-sqlite3', 'prebuilds', 'win32-x64.node'),
    path.join(currentDir, '..', '..', 'app.asar.unpacked', 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node'),
    path.join(currentDir, '..', 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node'),
    path.join(process.cwd(), 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node'),
    path.join(process.cwd(), 'node_modules', 'better-sqlite3', 'build', 'Debug', 'better_sqlite3.node'),
  ];

  // 1. If running packaged in Electron, prioritize the unpacked native binding directly
  for (const bindingPath of possibleBindingPaths) {
    try {
      if (fs.existsSync(bindingPath)) {
        console.log(`Loading SQLite native binding from: ${bindingPath}`);
        return new DatabaseConstructor(targetDbPath, { nativeBinding: bindingPath });
      }
    } catch (bindingErr: any) {
      console.warn(`Attempt with binding at ${bindingPath} failed:`, bindingErr?.message);
      writeStartupLog('SQLite_Binding_Attempt_Failed', { path: bindingPath, error: bindingErr });
    }
  }

  // 2. Fall back to standard initialization
  try {
    return new DatabaseConstructor(targetDbPath);
  } catch (err1: any) {
    console.error('Standard SQLite initialization failed:', err1?.message);
    writeStartupLog('SQLite_Init_Failure', {
      error: err1,
      targetDbPath,
      testedPaths: possibleBindingPaths,
      resourcesPath: process.resourcesPath,
      execPath: process.execPath,
    });
    throw err1;
  }
};

export const getDb = () => {
  if (!dbInstance) {
    dbPath = getDatabasePath();
    const parentDir = path.dirname(dbPath);
    try {
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
    } catch (dirErr) {
      console.warn('Could not create DB parent directory:', dirErr);
    }

    try {
      console.log(`Initializing database at: ${dbPath}`);
      dbInstance = loadSqliteDatabase(dbPath);
      dbInstance.pragma('journal_mode = WAL');
      dbInstance.pragma('synchronous = NORMAL');
    } catch (error: any) {
      console.error('Initial database connection failed:', error);
      if (error.message && error.message.includes('malformed')) {
        resetDatabase();
        dbInstance = loadSqliteDatabase(dbPath);
      } else {
        // Fallback to TEMP folder if primary location fails
        try {
          const fallbackPath = path.join(process.env.TEMP || '/tmp', 'shop_mis_fallback.db');
          console.warn(`Falling back to database at: ${fallbackPath}`);
          dbInstance = loadSqliteDatabase(fallbackPath);
          dbInstance.pragma('journal_mode = WAL');
        } catch (fallbackErr) {
          throw error;
        }
      }
    }

    try {
      // Initialize Database Tables
      dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE,
          password TEXT,
          role TEXT DEFAULT 'admin',
          language TEXT DEFAULT 'en'
        );

        CREATE TABLE IF NOT EXISTS roznamcha (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT,
          type TEXT, -- 'income' or 'expense'
          amount REAL,
          description TEXT,
          bill_number TEXT,
          customer_id INTEGER,
          currency TEXT DEFAULT 'AFN'
        );

        CREATE TABLE IF NOT EXISTS kata_transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER,
          date TEXT,
          type TEXT, -- 'purchase' or 'payment'
          amount REAL,
          bill_number TEXT,
          description TEXT,
          roznamcha_id INTEGER,
          currency TEXT DEFAULT 'AFN'
        );

        CREATE TABLE IF NOT EXISTS kata_summary (
          customer_id INTEGER,
          currency TEXT DEFAULT 'AFN',
          total_purchase REAL DEFAULT 0,
          total_paid REAL DEFAULT 0,
          remaining_balance REAL DEFAULT 0,
          PRIMARY KEY (customer_id, currency)
        );

        CREATE TABLE IF NOT EXISTS stock (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          item_name TEXT,
          date TEXT,
          type TEXT DEFAULT 'out', -- 'in' or 'out'
          quantity INTEGER,
          description TEXT,
          bill_number TEXT
        );

        CREATE TABLE IF NOT EXISTS customers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          address TEXT,
          contact TEXT
        );

        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT
        );

        CREATE TABLE IF NOT EXISTS system_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT,
          module TEXT,
          message TEXT,
          type TEXT DEFAULT 'info',
          username TEXT DEFAULT 'system',
          action TEXT DEFAULT 'LOG'
        );

      `);

      // Seed default admin ONLY IF the users table is completely empty
      const userCountRow = dbInstance.prepare("SELECT COUNT(*) as count FROM users").get() as any;
      if (!userCountRow || userCountRow.count === 0) {
        console.log('No users found in database. Seeding initial default admin user...');
        dbInstance.prepare("INSERT INTO users (username, password, role, language) VALUES ('admin', 'NewCode@ShopMIS', 'admin', 'en')").run();
      }

      // Migrations
      const stockInfo = dbInstance.prepare("PRAGMA table_info(stock)").all() as any[];
      if (!stockInfo.find((c: any) => c.name === 'type')) {
        dbInstance.exec("ALTER TABLE stock ADD COLUMN type TEXT DEFAULT 'out'");
      }
      if (!stockInfo.find((c: any) => c.name === 'quantity')) {
        dbInstance.exec("ALTER TABLE stock ADD COLUMN quantity INTEGER");
        if (stockInfo.find((c: any) => c.name === 'quantity_out')) {
          dbInstance.exec("UPDATE stock SET quantity = quantity_out");
        }
      }

      const roznamchaInfo = dbInstance.prepare("PRAGMA table_info(roznamcha)").all() as any[];
      if (!roznamchaInfo.find((c: any) => c.name === 'customer_id')) {
        dbInstance.exec("ALTER TABLE roznamcha ADD COLUMN customer_id INTEGER");
      }
      if (!roznamchaInfo.find((c: any) => c.name === 'currency')) {
        dbInstance.exec("ALTER TABLE roznamcha ADD COLUMN currency TEXT DEFAULT 'AFN'");
      }

      const kataTxInfo = dbInstance.prepare("PRAGMA table_info(kata_transactions)").all() as any[];
      if (!kataTxInfo.find((c: any) => c.name === 'currency')) {
        dbInstance.exec("ALTER TABLE kata_transactions ADD COLUMN currency TEXT DEFAULT 'AFN'");
      }

      const kataSumInfo = dbInstance.prepare("PRAGMA table_info(kata_summary)").all() as any[];
      const currencyColInSum = kataSumInfo.find((c: any) => c.name === 'currency');
      const pkCount = kataSumInfo.filter((c: any) => c.pk > 0).length;

      if (!currencyColInSum || pkCount < 2) {
        console.log('Migrating kata_summary table to composite primary key (customer_id, currency)...');
        dbInstance.exec(`
          DROP TABLE IF EXISTS kata_summary_old;
          ALTER TABLE kata_summary RENAME TO kata_summary_old;
          CREATE TABLE kata_summary (
            customer_id INTEGER,
            currency TEXT DEFAULT 'AFN',
            total_purchase REAL DEFAULT 0,
            total_paid REAL DEFAULT 0,
            remaining_balance REAL DEFAULT 0,
            PRIMARY KEY (customer_id, currency)
          );
          DROP TABLE IF EXISTS kata_summary_old;
        `);
      }

      // Rebuild kata summaries to ensure multi-currency accuracy
      rebuildAllKataSummaries(dbInstance);

      const logsInfo = dbInstance.prepare("PRAGMA table_info(system_logs)").all() as any[];
      if (!logsInfo.find((c: any) => c.name === 'username')) {
        dbInstance.exec("ALTER TABLE system_logs ADD COLUMN username TEXT DEFAULT 'system'");
      }
      if (!logsInfo.find((c: any) => c.name === 'action')) {
        dbInstance.exec("ALTER TABLE system_logs ADD COLUMN action TEXT DEFAULT 'LOG'");
      }

      console.log('Database initialized successfully.');
    } catch (error: any) {
       if (error.message && error.message.includes('malformed')) {
         resetDatabase();
         return getDb();
       }
       console.error('Failed to initialize database tables:', error);
       throw error;
    }
  }
  return dbInstance;
};

export const rebuildAllKataSummaries = (db: any) => {
  try {
    db.prepare("UPDATE kata_transactions SET currency = 'AFN' WHERE currency IS NULL OR currency = ''").run();
    db.prepare("UPDATE roznamcha SET currency = 'AFN' WHERE currency IS NULL OR currency = ''").run();
    db.prepare("DELETE FROM kata_summary").run();

    const transactions = db.prepare(`
      SELECT customer_id, type, amount, COALESCE(currency, 'AFN') as currency 
      FROM kata_transactions 
      WHERE customer_id IS NOT NULL
    `).all() as any[];

    const grouped: Record<string, { totalPurchase: number; totalPaid: number }> = {};

    transactions.forEach((t: any) => {
      const custId = Number(t.customer_id);
      if (!custId) return;
      const curr = t.currency || 'AFN';
      const key = `${custId}___${curr}`;
      if (!grouped[key]) grouped[key] = { totalPurchase: 0, totalPaid: 0 };
      const isPurchase = t.type === 'purchase' || t.type === 'debit';
      if (isPurchase) grouped[key].totalPurchase += Number(t.amount) || 0;
      else grouped[key].totalPaid += Number(t.amount) || 0;
    });

    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO kata_summary (customer_id, currency, total_purchase, total_paid, remaining_balance)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const [key, values] of Object.entries(grouped)) {
      const [custIdStr, curr] = key.split('___');
      const custId = Number(custIdStr);
      const remainingBalance = values.totalPurchase - values.totalPaid;
      insertStmt.run(custId, curr, values.totalPurchase, values.totalPaid, remainingBalance);
    }
  } catch (err) {
    console.error('Failed to rebuild kata summaries:', err);
  }
};

export const safeQuery = <T>(callback: (db: any) => T): T => {
  try {
    const db = getDb();
    return callback(db);
  } catch (error: any) {
    if (error.message && error.message.includes('malformed')) {
      resetDatabase();
      const newDb = getDb();
      return callback(newDb);
    }
    throw error;
  }
};

export const reinitDatabase = () => {
  if (dbInstance) {
    try { dbInstance.close(); } catch (e) {}
    dbInstance = null;
    console.log('Database connection closed.');
  }
  
  // Also delete journal files to prevent conflicts during restore
  const journalFiles = [`${dbPath}-journal`, `${dbPath}-wal`, `${dbPath}-shm`];
  journalFiles.forEach(file => {
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
        console.log(`Deleted journal file: ${file}`);
      } catch (e) {
        console.error(`Failed to delete journal file ${file}:`, e);
      }
    }
  });
};

export const setCustomDbFolder = (targetFolder: string) => {
  try {
    if (!targetFolder || !targetFolder.trim()) {
      throw new Error('Target folder path cannot be empty.');
    }
    const cleanFolder = targetFolder.trim();
    if (!fs.existsSync(cleanFolder)) {
      fs.mkdirSync(cleanFolder, { recursive: true });
    }

    const newDbPath = path.join(cleanFolder, 'shop_mis.db');
    const oldDbPath = dbPath;

    if (oldDbPath !== newDbPath && fs.existsSync(oldDbPath)) {
      // Close active database
      reinitDatabase();

      // Copy database to new location if it doesn't already exist there
      if (!fs.existsSync(newDbPath)) {
        fs.copyFileSync(oldDbPath, newDbPath);
        console.log(`Copied database from ${oldDbPath} to ${newDbPath}`);
      }
    }

    // Save config
    const configPath = getConfigPath();
    fs.writeFileSync(configPath, JSON.stringify({ customDbFolder: cleanFolder }, null, 2));

    // Update active dbPath
    dbPath = newDbPath;

    // Reinit database connection to new path
    reinitDatabase();
    getDb();

    return { success: true, dbPath: newDbPath, customFolder: cleanFolder };
  } catch (error: any) {
    console.error('Failed to set custom DB folder:', error);
    return { success: false, error: error.message || 'Failed to update database folder' };
  }
};

export const performDatabaseBackup = async (destPath: string): Promise<void> => {
  const db = getDb();
  
  // 1. Force WAL checkpoint so all recent edits are written to disk
  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
  } catch (e) {
    console.warn('WAL checkpoint error:', e);
  }

  // 2. Perform online backup using better-sqlite3 native backup if available
  if (typeof db.backup === 'function') {
    try {
      await db.backup(destPath);
      console.log(`Database native backup completed to ${destPath}`);
      return;
    } catch (err) {
      console.warn('Native db.backup failed, falling back to fs.copyFileSync:', err);
    }
  }

  fs.copyFileSync(dbPath, destPath);
};
