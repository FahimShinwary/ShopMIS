var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// electron/main.ts
var import_electron = require("electron");
var import_path2 = __toESM(require("path"), 1);
var import_fs2 = __toESM(require("fs"), 1);

// src/database/db.ts
var import_better_sqlite3 = __toESM(require("better-sqlite3"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var _require = typeof require !== "undefined" ? require : null;
var getShopMisAppDataDir = () => {
  try {
    const electronModule = _require ? _require("electron") : null;
    const electronApp = electronModule?.app;
    if (electronApp && typeof electronApp.getPath === "function") {
      const uData = electronApp.getPath("userData");
      if (uData) {
        if (!import_fs.default.existsSync(uData)) import_fs.default.mkdirSync(uData, { recursive: true });
        return uData;
      }
    }
  } catch (e) {
  }
  const appData = process.env.APPDATA || (process.platform === "darwin" ? import_path.default.join(process.env.HOME || "", "Library/Application Support") : "/tmp");
  const targetDir = import_path.default.join(appData, "Shop MIS");
  try {
    if (!import_fs.default.existsSync(targetDir)) import_fs.default.mkdirSync(targetDir, { recursive: true });
  } catch (e) {
  }
  return targetDir;
};
var writeStartupLog = (type, error) => {
  try {
    const logDir = getShopMisAppDataDir();
    const logFile = import_path.default.join(logDir, "startup-error.log");
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const msg = `[${timestamp}] [${type}] ${error?.stack || error?.message || error}
`;
    import_fs.default.appendFileSync(logFile, msg, "utf8");
    console.error(`[${type}]`, error);
  } catch (e) {
  }
};
var getConfigPath = () => {
  const targetDir = getShopMisAppDataDir();
  return import_path.default.join(targetDir, "db_config.json");
};
var getCustomDbFolder = () => {
  try {
    const configPath = getConfigPath();
    if (import_fs.default.existsSync(configPath)) {
      const cfg = JSON.parse(import_fs.default.readFileSync(configPath, "utf8"));
      if (cfg && cfg.customDbFolder && import_fs.default.existsSync(cfg.customDbFolder)) {
        return cfg.customDbFolder;
      }
    }
  } catch (e) {
  }
  return "";
};
var getDatabasePath = () => {
  if (process.env.K_SERVICE || process.env.CLOUD_RUN_JOB) {
    return "/tmp/shop_mis.db";
  }
  const customFolder = getCustomDbFolder();
  if (customFolder && import_fs.default.existsSync(customFolder)) {
    return import_path.default.join(customFolder, "shop_mis.db");
  }
  try {
    const electronModule = typeof _require !== "undefined" ? _require("electron") : null;
    const electronApp = electronModule?.app;
    if (electronApp && typeof electronApp.getPath === "function") {
      const userDataPath = electronApp.getPath("userData");
      if (userDataPath) {
        if (!import_fs.default.existsSync(userDataPath)) {
          import_fs.default.mkdirSync(userDataPath, { recursive: true });
        }
        return import_path.default.join(userDataPath, "shop_mis.db");
      }
    }
  } catch (e) {
  }
  try {
    const appData = process.env.APPDATA || (process.platform === "darwin" ? import_path.default.join(process.env.HOME || "", "Library/Application Support") : "/tmp");
    const targetDir = import_path.default.join(appData, "Shop MIS");
    if (!import_fs.default.existsSync(targetDir)) {
      import_fs.default.mkdirSync(targetDir, { recursive: true });
    }
    return import_path.default.join(targetDir, "shop_mis.db");
  } catch (e) {
    return import_path.default.join(process.cwd(), "shop_mis.db");
  }
};
var dbPath = getDatabasePath();
console.log(`Database path: ${dbPath}`);
var dbInstance = null;
var resetDatabase = () => {
  console.warn("Database disk image is malformed. Resetting database...");
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch (e) {
    }
    dbInstance = null;
  }
  const corruptPath = `${dbPath}.corrupt-${Date.now()}`;
  if (import_fs.default.existsSync(dbPath)) {
    try {
      import_fs.default.renameSync(dbPath, corruptPath);
      console.log(`Corrupted database moved to: ${corruptPath}`);
    } catch (e) {
      console.error("Failed to rename corrupted database:", e);
      try {
        import_fs.default.unlinkSync(dbPath);
      } catch (unlinkErr) {
      }
    }
  }
};
var loadSqliteDatabase = (targetDbPath) => {
  let DatabaseConstructor;
  try {
    DatabaseConstructor = _require ? _require("better-sqlite3") : import_better_sqlite3.default;
  } catch (e) {
    DatabaseConstructor = import_better_sqlite3.default;
  }
  const execDir = process.execPath ? import_path.default.dirname(process.execPath) : "";
  const possibleBindingPaths = [
    import_path.default.join(process.resourcesPath || "", "app.asar.unpacked", "node_modules", "better-sqlite3", "build", "Release", "better_sqlite3.node"),
    import_path.default.join(process.resourcesPath || "", "app.asar.unpacked", "node_modules", "better-sqlite3", "build", "Debug", "better_sqlite3.node"),
    import_path.default.join(execDir, "resources", "app.asar.unpacked", "node_modules", "better-sqlite3", "build", "Release", "better_sqlite3.node"),
    import_path.default.join(process.resourcesPath || "", "app.asar.unpacked", "node_modules", "better-sqlite3", "prebuilds", `${process.platform}-${process.arch}.node`),
    import_path.default.join(process.resourcesPath || "", "app.asar.unpacked", "node_modules", "better-sqlite3", "prebuilds", "win32-x64.node"),
    import_path.default.join(__dirname, "..", "..", "app.asar.unpacked", "node_modules", "better-sqlite3", "build", "Release", "better_sqlite3.node"),
    import_path.default.join(__dirname, "..", "node_modules", "better-sqlite3", "build", "Release", "better_sqlite3.node"),
    import_path.default.join(process.cwd(), "node_modules", "better-sqlite3", "build", "Release", "better_sqlite3.node"),
    import_path.default.join(process.cwd(), "node_modules", "better-sqlite3", "build", "Debug", "better_sqlite3.node")
  ];
  for (const bindingPath of possibleBindingPaths) {
    try {
      if (import_fs.default.existsSync(bindingPath)) {
        console.log(`Loading SQLite native binding from: ${bindingPath}`);
        return new DatabaseConstructor(targetDbPath, { nativeBinding: bindingPath });
      }
    } catch (bindingErr) {
      console.warn(`Attempt with binding at ${bindingPath} failed:`, bindingErr?.message);
      writeStartupLog("SQLite_Binding_Attempt_Failed", { path: bindingPath, error: bindingErr });
    }
  }
  try {
    return new DatabaseConstructor(targetDbPath);
  } catch (err1) {
    console.error("Standard SQLite initialization failed:", err1?.message);
    writeStartupLog("SQLite_Init_Failure", {
      error: err1,
      targetDbPath,
      testedPaths: possibleBindingPaths,
      resourcesPath: process.resourcesPath,
      execPath: process.execPath
    });
    throw err1;
  }
};
var getDb = () => {
  if (!dbInstance) {
    dbPath = getDatabasePath();
    const parentDir = import_path.default.dirname(dbPath);
    try {
      if (!import_fs.default.existsSync(parentDir)) {
        import_fs.default.mkdirSync(parentDir, { recursive: true });
      }
    } catch (dirErr) {
      console.warn("Could not create DB parent directory:", dirErr);
    }
    try {
      console.log(`Initializing database at: ${dbPath}`);
      dbInstance = loadSqliteDatabase(dbPath);
      dbInstance.pragma("journal_mode = WAL");
      dbInstance.pragma("synchronous = NORMAL");
    } catch (error) {
      console.error("Initial database connection failed:", error);
      if (error.message && error.message.includes("malformed")) {
        resetDatabase();
        dbInstance = loadSqliteDatabase(dbPath);
      } else {
        try {
          const fallbackPath = import_path.default.join(process.env.TEMP || "/tmp", "shop_mis_fallback.db");
          console.warn(`Falling back to database at: ${fallbackPath}`);
          dbInstance = loadSqliteDatabase(fallbackPath);
          dbInstance.pragma("journal_mode = WAL");
        } catch (fallbackErr) {
          throw error;
        }
      }
    }
    try {
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
      const userCountRow = dbInstance.prepare("SELECT COUNT(*) as count FROM users").get();
      if (!userCountRow || userCountRow.count === 0) {
        console.log("No users found in database. Seeding initial default admin user...");
        dbInstance.prepare("INSERT INTO users (username, password, role, language) VALUES ('admin', 'NewCode@ShopMIS', 'admin', 'en')").run();
      }
      const licenseRow = dbInstance.prepare("SELECT value FROM settings WHERE key = 'system_license'").get();
      if (!licenseRow) {
        console.log("Seeding initial system license in database...");
        dbInstance.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('system_license', ?)").run(JSON.stringify("NewCode@ShopMIS"));
        dbInstance.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('license_activation_date', ?)").run(JSON.stringify((/* @__PURE__ */ new Date()).toISOString()));
      }
      const stockInfo = dbInstance.prepare("PRAGMA table_info(stock)").all();
      if (!stockInfo.find((c) => c.name === "type")) {
        dbInstance.exec("ALTER TABLE stock ADD COLUMN type TEXT DEFAULT 'out'");
      }
      if (!stockInfo.find((c) => c.name === "quantity")) {
        dbInstance.exec("ALTER TABLE stock ADD COLUMN quantity INTEGER");
        if (stockInfo.find((c) => c.name === "quantity_out")) {
          dbInstance.exec("UPDATE stock SET quantity = quantity_out");
        }
      }
      const roznamchaInfo = dbInstance.prepare("PRAGMA table_info(roznamcha)").all();
      if (!roznamchaInfo.find((c) => c.name === "customer_id")) {
        dbInstance.exec("ALTER TABLE roznamcha ADD COLUMN customer_id INTEGER");
      }
      if (!roznamchaInfo.find((c) => c.name === "currency")) {
        dbInstance.exec("ALTER TABLE roznamcha ADD COLUMN currency TEXT DEFAULT 'AFN'");
      }
      const kataTxInfo = dbInstance.prepare("PRAGMA table_info(kata_transactions)").all();
      if (!kataTxInfo.find((c) => c.name === "currency")) {
        dbInstance.exec("ALTER TABLE kata_transactions ADD COLUMN currency TEXT DEFAULT 'AFN'");
      }
      const kataSumInfo = dbInstance.prepare("PRAGMA table_info(kata_summary)").all();
      const currencyColInSum = kataSumInfo.find((c) => c.name === "currency");
      const pkCount = kataSumInfo.filter((c) => c.pk > 0).length;
      if (!currencyColInSum || pkCount < 2) {
        console.log("Migrating kata_summary table to composite primary key (customer_id, currency)...");
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
      rebuildAllKataSummaries(dbInstance);
      const logsInfo = dbInstance.prepare("PRAGMA table_info(system_logs)").all();
      if (!logsInfo.find((c) => c.name === "username")) {
        dbInstance.exec("ALTER TABLE system_logs ADD COLUMN username TEXT DEFAULT 'system'");
      }
      if (!logsInfo.find((c) => c.name === "action")) {
        dbInstance.exec("ALTER TABLE system_logs ADD COLUMN action TEXT DEFAULT 'LOG'");
      }
      console.log("Database initialized successfully.");
    } catch (error) {
      if (error.message && error.message.includes("malformed")) {
        resetDatabase();
        return getDb();
      }
      console.error("Failed to initialize database tables:", error);
      throw error;
    }
  }
  return dbInstance;
};
var rebuildAllKataSummaries = (db) => {
  try {
    db.prepare("UPDATE kata_transactions SET currency = 'AFN' WHERE currency IS NULL OR currency = ''").run();
    db.prepare("UPDATE roznamcha SET currency = 'AFN' WHERE currency IS NULL OR currency = ''").run();
    db.prepare("DELETE FROM kata_summary").run();
    const transactions = db.prepare(`
      SELECT customer_id, type, amount, COALESCE(currency, 'AFN') as currency 
      FROM kata_transactions 
      WHERE customer_id IS NOT NULL
    `).all();
    const grouped = {};
    transactions.forEach((t) => {
      const custId = Number(t.customer_id);
      if (!custId) return;
      const curr = t.currency || "AFN";
      const key = `${custId}___${curr}`;
      if (!grouped[key]) grouped[key] = { totalPurchase: 0, totalPaid: 0 };
      const isPurchase = t.type === "purchase" || t.type === "debit";
      if (isPurchase) grouped[key].totalPurchase += Number(t.amount) || 0;
      else grouped[key].totalPaid += Number(t.amount) || 0;
    });
    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO kata_summary (customer_id, currency, total_purchase, total_paid, remaining_balance)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const [key, values] of Object.entries(grouped)) {
      const [custIdStr, curr] = key.split("___");
      const custId = Number(custIdStr);
      const remainingBalance = values.totalPurchase - values.totalPaid;
      insertStmt.run(custId, curr, values.totalPurchase, values.totalPaid, remainingBalance);
    }
  } catch (err) {
    console.error("Failed to rebuild kata summaries:", err);
  }
};
var safeQuery = (callback) => {
  try {
    const db = getDb();
    return callback(db);
  } catch (error) {
    if (error.message && error.message.includes("malformed")) {
      resetDatabase();
      const newDb = getDb();
      return callback(newDb);
    }
    throw error;
  }
};
var reinitDatabase = () => {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch (e) {
    }
    dbInstance = null;
    console.log("Database connection closed.");
  }
  const journalFiles = [`${dbPath}-journal`, `${dbPath}-wal`, `${dbPath}-shm`];
  journalFiles.forEach((file) => {
    if (import_fs.default.existsSync(file)) {
      try {
        import_fs.default.unlinkSync(file);
        console.log(`Deleted journal file: ${file}`);
      } catch (e) {
        console.error(`Failed to delete journal file ${file}:`, e);
      }
    }
  });
};
var setCustomDbFolder = (targetFolder) => {
  try {
    if (!targetFolder || !targetFolder.trim()) {
      throw new Error("Target folder path cannot be empty.");
    }
    const cleanFolder = targetFolder.trim();
    if (!import_fs.default.existsSync(cleanFolder)) {
      import_fs.default.mkdirSync(cleanFolder, { recursive: true });
    }
    const newDbPath = import_path.default.join(cleanFolder, "shop_mis.db");
    const oldDbPath = dbPath;
    if (oldDbPath !== newDbPath && import_fs.default.existsSync(oldDbPath)) {
      reinitDatabase();
      if (!import_fs.default.existsSync(newDbPath)) {
        import_fs.default.copyFileSync(oldDbPath, newDbPath);
        console.log(`Copied database from ${oldDbPath} to ${newDbPath}`);
      }
    }
    const configPath = getConfigPath();
    import_fs.default.writeFileSync(configPath, JSON.stringify({ customDbFolder: cleanFolder }, null, 2));
    dbPath = newDbPath;
    reinitDatabase();
    getDb();
    return { success: true, dbPath: newDbPath, customFolder: cleanFolder };
  } catch (error) {
    console.error("Failed to set custom DB folder:", error);
    return { success: false, error: error.message || "Failed to update database folder" };
  }
};
var performDatabaseBackup = async (destPath) => {
  const db = getDb();
  try {
    db.pragma("wal_checkpoint(TRUNCATE)");
  } catch (e) {
    console.warn("WAL checkpoint error:", e);
  }
  if (typeof db.backup === "function") {
    try {
      await db.backup(destPath);
      console.log(`Database native backup completed to ${destPath}`);
      return;
    } catch (err) {
      console.warn("Native db.backup failed, falling back to fs.copyFileSync:", err);
    }
  }
  import_fs.default.copyFileSync(dbPath, destPath);
};

// src/database/crud.ts
var updateKataSummary = (customerId) => {
  safeQuery((db) => {
    const transactions = db.prepare(`
      SELECT type, amount, COALESCE(currency, 'AFN') as currency 
      FROM kata_transactions 
      WHERE customer_id = ?
    `).all(customerId);
    db.prepare("DELETE FROM kata_summary WHERE customer_id = ?").run(customerId);
    const grouped = {};
    transactions.forEach((t) => {
      const curr = t.currency || "AFN";
      if (!grouped[curr]) grouped[curr] = { totalPurchase: 0, totalPaid: 0 };
      const isPurchase = t.type === "purchase" || t.type === "debit";
      const numAmount = Number(t.amount) || 0;
      if (isPurchase) grouped[curr].totalPurchase += numAmount;
      else grouped[curr].totalPaid += numAmount;
    });
    const insertStmt = db.prepare(`
      INSERT INTO kata_summary (customer_id, currency, total_purchase, total_paid, remaining_balance)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const [curr, values] of Object.entries(grouped)) {
      const remainingBalance = values.totalPurchase - values.totalPaid;
      insertStmt.run(customerId, curr, values.totalPurchase, values.totalPaid, remainingBalance);
    }
  });
};
var roznamcha = {
  getAll: () => {
    return safeQuery((db) => {
      console.log("Fetching all roznamcha entries");
      return db.prepare("SELECT *, COALESCE(currency, 'AFN') as currency FROM roznamcha ORDER BY date DESC, id DESC").all();
    });
  },
  create: (entry, username = "admin") => {
    return safeQuery((db) => {
      console.log("Creating roznamcha entry:", entry);
      const { date, type, amount, description, bill_number, customer_id } = entry;
      const currency = entry.currency || "AFN";
      const numCustomerId = Number(customer_id);
      const numAmount = Number(amount) || 0;
      if (!numCustomerId || isNaN(numCustomerId) || numCustomerId <= 0) {
        throw new Error("Customer is required");
      }
      const cleanBill = (bill_number || "").trim();
      const cleanDesc = (description || "").trim();
      const existing = db.prepare(`
        SELECT id FROM roznamcha 
        WHERE date = ? AND customer_id = ? AND type = ? AND amount = ? 
          AND COALESCE(currency, 'AFN') = ? 
          AND COALESCE(bill_number, '') = ? 
          AND COALESCE(description, '') = ?
        ORDER BY id DESC LIMIT 1
      `).get(date, numCustomerId, type, numAmount, currency, cleanBill, cleanDesc);
      if (existing && existing.id) {
        console.warn(`Duplicate roznamcha record skipped for customer ${numCustomerId} (${type}, ${numAmount})`);
        const existingKata = db.prepare("SELECT id FROM kata_transactions WHERE roznamcha_id = ?").get(existing.id);
        if (!existingKata) {
          const kataType = type === "income" ? "payment" : "purchase";
          db.prepare("INSERT INTO kata_transactions (customer_id, date, type, amount, bill_number, description, roznamcha_id, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(numCustomerId, date, kataType, numAmount, cleanBill, cleanDesc, existing.id, currency);
          updateKataSummary(numCustomerId);
        }
        return { lastInsertRowid: existing.id, isDuplicate: true };
      }
      const info = db.prepare("INSERT INTO roznamcha (date, type, amount, description, bill_number, customer_id, currency) VALUES (?, ?, ?, ?, ?, ?, ?)").run(date, type, numAmount, cleanDesc, cleanBill, numCustomerId, currency);
      const roznamchaId = info.lastInsertRowid;
      if (numCustomerId) {
        const kataType = type === "income" ? "payment" : "purchase";
        db.prepare("INSERT INTO kata_transactions (customer_id, date, type, amount, bill_number, description, roznamcha_id, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(numCustomerId, date, kataType, numAmount, cleanBill, cleanDesc, roznamchaId, currency);
        updateKataSummary(numCustomerId);
      }
      logs.add("Roznamcha", `Created ${type} entry of ${numAmount} ${currency} (${cleanDesc || "No description"})`, "info", username, "CREATE");
      return info;
    });
  },
  update: (id, entry, username = "admin") => {
    return safeQuery((db) => {
      let { date, type, amount, description, bill_number, customer_id } = entry;
      const currency = entry.currency || "AFN";
      const parsedCustomerId = customer_id ? Number(customer_id) : null;
      const numAmount = Number(amount) || 0;
      if (!parsedCustomerId || isNaN(parsedCustomerId) || parsedCustomerId <= 0) {
        throw new Error("Customer is required");
      }
      const cleanBill = (bill_number || "").trim();
      const cleanDesc = (description || "").trim();
      const oldEntry = db.prepare("SELECT customer_id FROM roznamcha WHERE id = ?").get(id);
      const info = db.prepare("UPDATE roznamcha SET date = ?, type = ?, amount = ?, description = ?, bill_number = ?, customer_id = ?, currency = ? WHERE id = ?").run(date, type, numAmount, cleanDesc, cleanBill, parsedCustomerId, currency, id);
      const existingKata = db.prepare("SELECT id FROM kata_transactions WHERE roznamcha_id = ?").get(id);
      if (parsedCustomerId) {
        const kataType = type === "income" ? "payment" : "purchase";
        if (existingKata) {
          db.prepare("UPDATE kata_transactions SET customer_id = ?, date = ?, type = ?, amount = ?, bill_number = ?, description = ?, currency = ? WHERE roznamcha_id = ?").run(parsedCustomerId, date, kataType, numAmount, cleanBill, cleanDesc, currency, id);
        } else {
          db.prepare("INSERT INTO kata_transactions (customer_id, date, type, amount, bill_number, description, roznamcha_id, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(parsedCustomerId, date, kataType, numAmount, cleanBill, cleanDesc, id, currency);
        }
        updateKataSummary(parsedCustomerId);
      } else {
        if (existingKata) {
          db.prepare("DELETE FROM kata_transactions WHERE roznamcha_id = ?").run(id);
        }
      }
      if (oldEntry?.customer_id && Number(oldEntry.customer_id) !== parsedCustomerId) {
        updateKataSummary(Number(oldEntry.customer_id));
      }
      logs.add("Roznamcha", `Updated entry #${id} (${type}, ${numAmount} ${currency})`, "info", username, "UPDATE");
      return info;
    });
  },
  delete: (id, username = "admin") => {
    return safeQuery((db) => {
      const entry = db.prepare("SELECT customer_id, amount, type, COALESCE(currency, 'AFN') as currency FROM roznamcha WHERE id = ?").get(id);
      db.prepare("DELETE FROM kata_transactions WHERE roznamcha_id = ?").run(id);
      const info = db.prepare("DELETE FROM roznamcha WHERE id = ?").run(id);
      if (entry?.customer_id) {
        updateKataSummary(Number(entry.customer_id));
      }
      logs.add("Roznamcha", `Deleted entry #${id} (${entry?.type || ""} ${entry?.amount || 0} ${entry?.currency || "AFN"})`, "warning", username, "DELETE");
      return info;
    });
  }
};
var kata = {
  getTransactions: (customerId) => {
    return safeQuery((db) => {
      if (customerId) {
        return db.prepare("SELECT *, COALESCE(currency, 'AFN') as currency FROM kata_transactions WHERE customer_id = ? ORDER BY date DESC, id DESC").all(customerId);
      }
      return db.prepare("SELECT *, COALESCE(currency, 'AFN') as currency FROM kata_transactions ORDER BY date DESC, id DESC").all();
    });
  },
  getSummaries: () => {
    return safeQuery((db) => {
      return db.prepare(`
        SELECT ks.*, COALESCE(ks.currency, 'AFN') as currency, c.name as customer_name 
        FROM kata_summary ks
        JOIN customers c ON ks.customer_id = c.id
      `).all();
    });
  },
  createTransaction: (entry, username = "admin") => {
    return safeQuery((db) => {
      const { customer_id, date, type, amount, bill_number, description } = entry;
      const currency = entry.currency || "AFN";
      const numCustomerId = Number(customer_id);
      const numAmount = Number(amount) || 0;
      if (!numCustomerId || isNaN(numCustomerId) || numCustomerId <= 0) {
        throw new Error("Customer is required");
      }
      const cleanBill = (bill_number || "").trim();
      const cleanDesc = (description || "").trim();
      const existing = db.prepare(`
        SELECT id, roznamcha_id FROM kata_transactions 
        WHERE date = ? AND customer_id = ? AND type = ? AND amount = ? 
          AND COALESCE(currency, 'AFN') = ? 
          AND COALESCE(bill_number, '') = ? 
          AND COALESCE(description, '') = ?
        ORDER BY id DESC LIMIT 1
      `).get(date, numCustomerId, type, numAmount, currency, cleanBill, cleanDesc);
      if (existing && existing.id) {
        console.warn(`Duplicate kata record skipped for customer ${numCustomerId} (${type}, ${numAmount})`);
        return { lastInsertRowid: existing.id, isDuplicate: true };
      }
      const rozType = type === "payment" ? "income" : "expense";
      const rozInfo = db.prepare("INSERT INTO roznamcha (date, type, amount, description, bill_number, customer_id, currency) VALUES (?, ?, ?, ?, ?, ?, ?)").run(date, rozType, numAmount, cleanDesc, cleanBill, numCustomerId, currency);
      const roznamchaId = rozInfo.lastInsertRowid;
      const info = db.prepare("INSERT INTO kata_transactions (customer_id, date, type, amount, bill_number, description, roznamcha_id, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(numCustomerId, date, type, numAmount, cleanBill, cleanDesc, roznamchaId, currency);
      updateKataSummary(numCustomerId);
      logs.add("Kata", `Created transaction for customer #${numCustomerId} (${type}, ${numAmount} ${currency})`, "info", username, "CREATE");
      return info;
    });
  },
  updateTransaction: (id, entry, username = "admin") => {
    return safeQuery((db) => {
      const { customer_id, date, type, amount, bill_number, description } = entry;
      const currency = entry.currency || "AFN";
      const numCustomerId = Number(customer_id);
      const numAmount = Number(amount) || 0;
      if (!numCustomerId || isNaN(numCustomerId) || numCustomerId <= 0) {
        throw new Error("Customer is required");
      }
      const cleanBill = (bill_number || "").trim();
      const cleanDesc = (description || "").trim();
      const oldKata = db.prepare("SELECT customer_id, roznamcha_id FROM kata_transactions WHERE id = ?").get(id);
      const roznamchaId = oldKata?.roznamcha_id;
      const info = db.prepare("UPDATE kata_transactions SET customer_id = ?, date = ?, type = ?, amount = ?, bill_number = ?, description = ?, currency = ? WHERE id = ?").run(numCustomerId, date, type, numAmount, cleanBill, cleanDesc, currency, id);
      const rozType = type === "payment" ? "income" : "expense";
      if (roznamchaId) {
        db.prepare("UPDATE roznamcha SET date = ?, type = ?, amount = ?, description = ?, bill_number = ?, customer_id = ?, currency = ? WHERE id = ?").run(date, rozType, numAmount, cleanDesc, cleanBill, numCustomerId, currency, roznamchaId);
      } else {
        const rozInfo = db.prepare("INSERT INTO roznamcha (date, type, amount, description, bill_number, customer_id, currency) VALUES (?, ?, ?, ?, ?, ?, ?)").run(date, rozType, numAmount, cleanDesc, cleanBill, numCustomerId, currency);
        const newRozId = rozInfo.lastInsertRowid;
        db.prepare("UPDATE kata_transactions SET roznamcha_id = ? WHERE id = ?").run(newRozId, id);
      }
      updateKataSummary(numCustomerId);
      if (oldKata?.customer_id && Number(oldKata.customer_id) !== numCustomerId) {
        updateKataSummary(Number(oldKata.customer_id));
      }
      logs.add("Kata", `Updated transaction #${id} for customer #${numCustomerId} (${numAmount} ${currency})`, "info", username, "UPDATE");
      return info;
    });
  },
  deleteTransaction: (id, username = "admin") => {
    return safeQuery((db) => {
      const transaction = db.prepare("SELECT customer_id, roznamcha_id FROM kata_transactions WHERE id = ?").get(id);
      if (transaction?.roznamcha_id) {
        db.prepare("DELETE FROM roznamcha WHERE id = ?").run(transaction.roznamcha_id);
      }
      const info = db.prepare("DELETE FROM kata_transactions WHERE id = ?").run(id);
      if (transaction?.customer_id) {
        updateKataSummary(Number(transaction.customer_id));
      }
      logs.add("Kata", `Deleted transaction #${id}`, "warning", username, "DELETE");
      return info;
    });
  }
};
var customers = {
  getAll: () => {
    return safeQuery((db) => {
      return db.prepare("SELECT * FROM customers ORDER BY id DESC").all();
    });
  },
  create: (entry, username = "admin") => {
    return safeQuery((db) => {
      const { name, address, contact } = entry;
      const info = db.prepare("INSERT INTO customers (name, address, contact) VALUES (?, ?, ?)").run(name, address, contact);
      logs.add("Customers", `Created customer "${name}"`, "info", username, "CREATE");
      return info;
    });
  },
  update: (id, entry, username = "admin") => {
    return safeQuery((db) => {
      const { name, address, contact } = entry;
      const info = db.prepare("UPDATE customers SET name = ?, address = ?, contact = ? WHERE id = ?").run(name, address, contact, id);
      logs.add("Customers", `Updated customer #${id} ("${name}")`, "info", username, "UPDATE");
      return info;
    });
  },
  delete: (id, username = "admin") => {
    return safeQuery((db) => {
      const cust = db.prepare("SELECT name FROM customers WHERE id = ?").get(id);
      const deleteTx = db.transaction((customerId) => {
        db.prepare("DELETE FROM kata_summary WHERE customer_id = ?").run(customerId);
        db.prepare("DELETE FROM kata_transactions WHERE customer_id = ?").run(customerId);
        db.prepare("UPDATE roznamcha SET customer_id = NULL WHERE customer_id = ?").run(customerId);
        return db.prepare("DELETE FROM customers WHERE id = ?").run(customerId);
      });
      const res = deleteTx(id);
      logs.add("Customers", `Deleted customer #${id} ("${cust?.name || ""}")`, "warning", username, "DELETE");
      return res;
    });
  }
};
var stock = {
  getAll: () => {
    return safeQuery((db) => {
      return db.prepare("SELECT * FROM stock ORDER BY date DESC").all();
    });
  },
  create: (entry, username = "admin") => {
    return safeQuery((db) => {
      const { item_name, date, type, quantity, description, bill_number } = entry;
      const numQty = Number(quantity) || 0;
      const cleanItem = (item_name || "").trim();
      const cleanBill = (bill_number || "").trim();
      const cleanDesc = (description || "").trim();
      const existing = db.prepare(`
        SELECT id FROM stock 
        WHERE item_name = ? AND date = ? AND type = ? AND quantity = ? 
          AND COALESCE(bill_number, '') = ? 
          AND COALESCE(description, '') = ?
        ORDER BY id DESC LIMIT 1
      `).get(cleanItem, date, type, numQty, cleanBill, cleanDesc);
      if (existing && existing.id) {
        console.warn(`Duplicate stock record skipped for ${cleanItem} (qty: ${numQty})`);
        return { lastInsertRowid: existing.id, isDuplicate: true };
      }
      const info = db.prepare("INSERT INTO stock (item_name, date, type, quantity, description, bill_number) VALUES (?, ?, ?, ?, ?, ?)").run(cleanItem, date, type, numQty, cleanDesc, cleanBill);
      logs.add("Stock", `Created stock item "${cleanItem}" (${type}, qty: ${numQty})`, "info", username, "CREATE");
      return info;
    });
  },
  update: (id, entry, username = "admin") => {
    return safeQuery((db) => {
      const { item_name, date, type, quantity, description, bill_number } = entry;
      const info = db.prepare("UPDATE stock SET item_name = ?, date = ?, type = ?, quantity = ?, description = ?, bill_number = ? WHERE id = ?").run(item_name, date, type, quantity, description, bill_number, id);
      logs.add("Stock", `Updated stock item #${id} ("${item_name}", qty: ${quantity})`, "info", username, "UPDATE");
      return info;
    });
  },
  delete: (id, username = "admin") => {
    return safeQuery((db) => {
      const item = db.prepare("SELECT item_name FROM stock WHERE id = ?").get(id);
      const info = db.prepare("DELETE FROM stock WHERE id = ?").run(id);
      logs.add("Stock", `Deleted stock item #${id} ("${item?.item_name || ""}")`, "warning", username, "DELETE");
      return info;
    });
  }
};
var stats = {
  getOverview: () => {
    return safeQuery((db) => {
      const income = db.prepare("SELECT SUM(amount) as total FROM roznamcha WHERE type = 'income'").get();
      const expense = db.prepare("SELECT SUM(amount) as total FROM roznamcha WHERE type = 'expense'").get();
      const stockIn = db.prepare("SELECT SUM(quantity) as total FROM stock WHERE type = 'in'").get();
      const stockOut = db.prepare("SELECT SUM(quantity) as total FROM stock WHERE type = 'out'").get();
      return {
        totalIncome: income?.total || 0,
        totalExpense: expense?.total || 0,
        totalStockIn: stockIn?.total || 0,
        totalStockOut: stockOut?.total || 0,
        balance: (income?.total || 0) - (expense?.total || 0)
      };
    });
  }
};
var users = {
  getAdmin: () => {
    return safeQuery((db) => {
      return db.prepare("SELECT id, username, password, role, language FROM users WHERE role = 'admin' OR id = 1 LIMIT 1").get();
    });
  },
  getAll: () => {
    return safeQuery((db) => {
      return db.prepare("SELECT id, username, role, language FROM users").all();
    });
  },
  create: (user, actorUsername = "admin") => {
    return safeQuery((db) => {
      const { username, password, role, language } = user;
      const info = db.prepare("INSERT INTO users (username, password, role, language) VALUES (?, ?, ?, ?)").run(username, password, role, language || "en");
      logs.add("Users", `Created user "${username}" with role "${role}"`, "info", actorUsername, "CREATE");
      return info;
    });
  },
  update: (id, user, actorUsername = "admin") => {
    return safeQuery((db) => {
      const { username, password, role, language } = user;
      let info;
      if (password) {
        info = db.prepare("UPDATE users SET username = ?, password = ?, role = ?, language = ? WHERE id = ?").run(username, password, role, language, id);
      } else {
        info = db.prepare("UPDATE users SET username = ?, role = ?, language = ? WHERE id = ?").run(username, role, language, id);
      }
      logs.add("Users", `Updated user #${id} ("${username}")`, "info", actorUsername, "UPDATE");
      return info;
    });
  },
  delete: (id, actorUsername = "admin") => {
    return safeQuery((db) => {
      const u = db.prepare("SELECT username FROM users WHERE id = ?").get(id);
      const info = db.prepare("DELETE FROM users WHERE id = ?").run(id);
      logs.add("Users", `Deleted user #${id} ("${u?.username || ""}")`, "warning", actorUsername, "DELETE");
      return info;
    });
  },
  authenticate: (username, password) => {
    return safeQuery((db) => {
      const user = db.prepare("SELECT id, username, role, language FROM users WHERE username = ? AND password = ?").get(username, password);
      if (user) {
        logs.add("Auth", `User "${user.username}" logged in`, "info", user.username, "LOGIN");
      } else {
        logs.add("Auth", `Failed login attempt for username "${username}"`, "error", username || "guest", "LOGIN_FAILED");
      }
      return user;
    });
  }
};
var logs = {
  getAll: () => {
    return safeQuery((db) => {
      return db.prepare("SELECT * FROM system_logs ORDER BY date DESC LIMIT 500").all();
    });
  },
  add: (module2, message, type = "info", username = "admin", action = "LOG") => {
    return safeQuery((db) => {
      return db.prepare("INSERT INTO system_logs (date, module, message, type, username, action) VALUES (?, ?, ?, ?, ?, ?)").run((/* @__PURE__ */ new Date()).toISOString(), module2, message, type, username || "admin", action || "LOG");
    });
  }
};
var settings = {
  get: (key) => {
    return safeQuery((db) => {
      const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
      return row ? JSON.parse(row.value) : null;
    });
  },
  set: (key, value) => {
    return safeQuery((db) => {
      return db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, JSON.stringify(value));
    });
  },
  getAll: () => {
    return safeQuery((db) => {
      return db.prepare("SELECT * FROM settings").all();
    });
  }
};
var developer = {
  executeRaw: (query, actorUsername = "developer") => {
    return safeQuery((db) => {
      const trimmed = (query || "").trim();
      if (!trimmed) return { success: true };
      const statements = trimmed.split(";").map((s) => s.trim()).filter((s) => s.length > 0);
      if (statements.length > 1) {
        db.exec(trimmed);
        logs.add("Developer", `Executed raw batch query (${statements.length} statements): ${trimmed.substring(0, 100)}...`, "warning", actorUsername, "EXEC_QUERY");
        return { success: true, count: statements.length, message: `Executed ${statements.length} SQL statements successfully.` };
      }
      const stmt = db.prepare(trimmed);
      let res;
      if (trimmed.toUpperCase().startsWith("SELECT") || trimmed.toUpperCase().startsWith("PRAGMA")) {
        res = stmt.all();
      } else {
        res = stmt.run();
      }
      logs.add("Developer", `Executed raw query: ${trimmed.substring(0, 120)}${trimmed.length > 120 ? "..." : ""}`, "warning", actorUsername, "EXEC_QUERY");
      return res;
    });
  }
};

// electron/main.ts
import_electron.app.setName("Shop MIS");
try {
  const customUserData = getShopMisAppDataDir();
  import_electron.app.setPath("userData", customUserData);
} catch (e) {
}
var writeCrashLog = (type, error) => {
  writeStartupLog(type, error);
};
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  writeCrashLog("UncaughtException", error);
  try {
    import_electron.dialog.showErrorBox(
      "Shop MIS - Critical Error",
      `An unexpected error occurred:

${error?.message || error}

Please check startup-error.log in %APPDATA%\\Shop MIS`
    );
  } catch (e) {
  }
});
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
  writeCrashLog("UnhandledRejection", reason);
});
import_electron.app.on("child-process-gone", (event, details) => {
  console.error("Child process gone:", details);
  writeCrashLog("ChildProcessGone", details);
});
var getLicensePath = () => {
  try {
    const dir = getShopMisAppDataDir();
    return import_path2.default.join(dir, "license.json");
  } catch (e) {
    return import_path2.default.join(process.cwd(), "license.json");
  }
};
var isValidLicenseKey = (key) => {
  if (!key || typeof key !== "string") return false;
  const cleanKey = key.trim();
  if (!cleanKey) return false;
  const upperKey = cleanKey.toUpperCase();
  if (upperKey === "NEWCODE@SHOPMIS" || upperKey === "SHOPMIS" || upperKey === "SHOPMIS-2026" || upperKey === "SHOP-MIS-2026" || upperKey === "SOFTTOUCH-2026" || upperKey === "ADMIN-ACTIVATION" || upperKey === "SHOP-MIS-JALALABAD" || upperKey === "SHOP-MIS-JALALABD") {
    return true;
  }
  return cleanKey.length >= 4;
};
var getLicenseData = () => {
  const licensePath = getLicensePath();
  if (import_fs2.default.existsSync(licensePath)) {
    try {
      const data = JSON.parse(import_fs2.default.readFileSync(licensePath, "utf8"));
      if (data && isValidLicenseKey(data.system_license)) {
        return data;
      }
    } catch (e) {
    }
  }
  return {};
};
var saveLicenseData = (data) => {
  const licensePath = getLicensePath();
  import_fs2.default.writeFileSync(licensePath, JSON.stringify(data));
};
var mainWindow = null;
var isDev = !import_electron.app.isPackaged;
var gotTheLock = import_electron.app.requestSingleInstanceLock();
if (!gotTheLock) {
  writeCrashLog("SingleInstanceLock", "Another instance of Shop MIS is already running. Quitting duplicate instance.");
  import_electron.app.quit();
} else {
  let createWindow = function() {
    mainWindow = new import_electron.BrowserWindow({
      width: 1280,
      height: 820,
      minWidth: 900,
      minHeight: 600,
      webPreferences: {
        preload: import_path2.default.join(__dirname, "preload.cjs"),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false
      },
      backgroundColor: "#0a0a0a",
      title: "Shop MIS - Soft Touch Technology",
      show: true
    });
    mainWindow.removeMenu();
    import_electron.Menu.setApplicationMenu(null);
    mainWindow.once("ready-to-show", () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
    mainWindow.webContents.on("render-process-gone", (event, details) => {
      console.error("Renderer process gone:", details);
      writeCrashLog("RendererCrashed", JSON.stringify(details));
    });
    mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription) => {
      console.error("Failed to load:", errorCode, errorDescription);
      if (!isDev) {
        import_electron.dialog.showErrorBox(
          "Load Error",
          `Failed to load application content: ${errorDescription} (${errorCode})

Looking for: ${import_path2.default.join(__dirname, "../dist/index.html")}`
        );
      }
    });
    if (isDev) {
      mainWindow.loadURL("http://localhost:3000");
      mainWindow.webContents.openDevTools();
    } else {
      const indexPath = import_path2.default.join(__dirname, "../dist/index.html");
      if (import_fs2.default.existsSync(indexPath)) {
        mainWindow.loadFile(indexPath).catch((err) => {
          import_electron.dialog.showErrorBox("Startup Error", `Error loading index.html: ${err?.message || err}`);
        });
      } else {
        import_electron.dialog.showErrorBox(
          "Startup Error",
          `The application assets could not be found at: ${indexPath}
Please ensure the application was built correctly.`
        );
      }
    }
    mainWindow.on("closed", () => {
      mainWindow = null;
    });
  };
  import_electron.app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  import_electron.ipcMain.handle("db:getStats", () => stats.getOverview());
  import_electron.ipcMain.handle("db:getRoznamcha", () => roznamcha.getAll());
  import_electron.ipcMain.handle("db:createRoznamcha", (_, entry, username) => roznamcha.create(entry, username));
  import_electron.ipcMain.handle("db:updateRoznamcha", (_, id, entry, username) => roznamcha.update(id, entry, username));
  import_electron.ipcMain.handle("db:deleteRoznamcha", (_, id, username) => roznamcha.delete(id, username));
  import_electron.ipcMain.handle("db:getKataTransactions", (_, customerId) => kata.getTransactions(customerId));
  import_electron.ipcMain.handle("db:getKataSummaries", () => kata.getSummaries());
  import_electron.ipcMain.handle("db:createKataTransaction", (_, entry, username) => kata.createTransaction(entry, username));
  import_electron.ipcMain.handle("db:updateKataTransaction", (_, id, entry, username) => kata.updateTransaction(id, entry, username));
  import_electron.ipcMain.handle("db:deleteKataTransaction", (_, id, username) => kata.deleteTransaction(id, username));
  import_electron.ipcMain.handle("db:getStock", () => stock.getAll());
  import_electron.ipcMain.handle("db:createStock", (_, entry, username) => stock.create(entry, username));
  import_electron.ipcMain.handle("db:updateStock", (_, id, entry, username) => stock.update(id, entry, username));
  import_electron.ipcMain.handle("db:deleteStock", (_, id, username) => stock.delete(id, username));
  import_electron.ipcMain.handle("db:getCustomers", () => customers.getAll());
  import_electron.ipcMain.handle("db:createCustomer", (_, entry, username) => customers.create(entry, username));
  import_electron.ipcMain.handle("db:updateCustomer", (_, id, entry, username) => customers.update(id, entry, username));
  import_electron.ipcMain.handle("db:deleteCustomer", (_, id, username) => customers.delete(id, username));
  import_electron.ipcMain.handle("db:getUsers", () => users.getAll());
  import_electron.ipcMain.handle("db:getAdminUser", () => users.getAdmin());
  import_electron.ipcMain.handle("db:createUser", (_, user, username) => users.create(user, username));
  import_electron.ipcMain.handle("db:updateUser", (_, id, user, username) => users.update(id, user, username));
  import_electron.ipcMain.handle("db:deleteUser", (_, id, username) => users.delete(id, username));
  import_electron.ipcMain.handle("db:authenticate", (_, { username, password }) => {
    if (username === "admin" && password === "NewCode@ShopMIS") {
      logs.add("Auth", "Developer logged in via master credentials", "warning", "developer", "LOGIN");
      return {
        id: 0,
        username: "admin",
        role: "developer",
        language: "en"
      };
    }
    return users.authenticate(username, password);
  });
  import_electron.ipcMain.handle("db:getLogs", () => logs.getAll());
  import_electron.ipcMain.handle("db:executeRaw", (_, query, username) => developer.executeRaw(query, username));
  import_electron.ipcMain.handle("db:exportJson", async () => {
    const [roz, kataT, kataS, stock2, cust, sett] = await Promise.all([
      roznamcha.getAll(),
      kata.getTransactions(),
      kata.getSummaries(),
      stock.getAll(),
      customers.getAll(),
      settings.getAll()
    ]);
    return {
      roznamcha: roz,
      kataTransactions: kataT,
      kataSummaries: kataS,
      stock: stock2,
      customers: cust,
      settings: sett,
      exportDate: (/* @__PURE__ */ new Date()).toISOString()
    };
  });
  import_electron.ipcMain.handle("db:getSettings", () => settings.getAll());
  import_electron.ipcMain.handle("db:setSetting", (_, { key, value }) => settings.set(key, value));
  import_electron.ipcMain.handle("db:getDbLocation", () => {
    return {
      dbPath,
      customFolder: getCustomDbFolder()
    };
  });
  import_electron.ipcMain.handle("db:setDbFolder", (_, folderPath) => {
    return setCustomDbFolder(folderPath);
  });
  import_electron.ipcMain.handle("db:backup", async (event) => {
    const { filePath } = await import_electron.dialog.showSaveDialog({
      title: "Backup Database",
      defaultPath: "shop_mis_backup.db",
      filters: [{ name: "SQLite Database", extensions: ["db"] }]
    });
    if (filePath) {
      await performDatabaseBackup(filePath);
      return { success: true };
    }
    return { success: false };
  });
  import_electron.ipcMain.handle("db:restore", async (event) => {
    console.log("Restore request received...");
    const { filePaths } = await import_electron.dialog.showOpenDialog({
      title: "Restore Database",
      filters: [{ name: "SQLite Database", extensions: ["db"] }],
      properties: ["openFile"]
    });
    if (filePaths && filePaths.length > 0) {
      try {
        console.log(`Starting restore from: ${filePaths[0]}`);
        reinitDatabase();
        if (!import_fs2.default.existsSync(filePaths[0])) {
          throw new Error("Source backup file does not exist.");
        }
        if (import_fs2.default.existsSync(dbPath)) {
          console.log("Unlinking old database file...");
          import_fs2.default.unlinkSync(dbPath);
        }
        console.log("Copying new database file...");
        import_fs2.default.copyFileSync(filePaths[0], dbPath);
        if (!import_fs2.default.existsSync(dbPath)) {
          throw new Error("Database file copy failed - file not found at destination.");
        }
        console.log("Restore successful, re-initializing...");
        return { success: true };
      } catch (error) {
        console.error("Restore error in Main Process:", error);
        return { success: false, error: error.message || "Failed to restore database" };
      }
    }
    return { success: false };
  });
  import_electron.ipcMain.handle("select-directory", async () => {
    const result = await import_electron.dialog.showOpenDialog({
      title: "Select Auto-Backup Folder",
      properties: ["openDirectory", "createDirectory"]
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });
  import_electron.ipcMain.handle("trigger-auto-backup", async (_, customFolderPath) => {
    try {
      let targetFolder = customFolderPath || settings.get("auto_backup_folder");
      if (!targetFolder || typeof targetFolder !== "string" || !targetFolder.trim()) {
        targetFolder = import_path2.default.join(process.cwd(), "backups");
      } else {
        targetFolder = targetFolder.trim();
      }
      if (!import_fs2.default.existsSync(targetFolder)) {
        try {
          import_fs2.default.mkdirSync(targetFolder, { recursive: true });
        } catch (err) {
          return { success: false, error: "Target directory does not exist and could not be created: " + err.message };
        }
      }
      const now = /* @__PURE__ */ new Date();
      const dateStr = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const backupFileName = `shop_mis_backup_${dateStr}.db`;
      const destPath = import_path2.default.join(targetFolder, backupFileName);
      await performDatabaseBackup(destPath);
      settings.set("auto_backup_last_run", now.toISOString());
      logs.add("Backup", `Manual auto-backup saved to ${destPath}`, "info", "admin", "AUTO_BACKUP");
      return { success: true, filePath: destPath };
    } catch (err) {
      console.error("Trigger auto-backup error:", err);
      return { success: false, error: err.message || "Failed to perform auto-backup" };
    }
  });
  async function checkAndRunAutoBackup() {
    try {
      const enabled = settings.get("auto_backup_enabled");
      let folder = settings.get("auto_backup_folder");
      const scheduledTime = settings.get("auto_backup_time") || "20:00";
      const isEnabled = enabled === true || enabled === "true" || enabled === 1 || enabled === "1";
      if (!isEnabled) return;
      if (!folder || typeof folder !== "string" || !folder.trim()) {
        folder = import_path2.default.join(process.cwd(), "backups");
      } else {
        folder = folder.trim();
      }
      if (!import_fs2.default.existsSync(folder)) {
        try {
          import_fs2.default.mkdirSync(folder, { recursive: true });
        } catch (e) {
          return;
        }
      }
      const now = /* @__PURE__ */ new Date();
      const currentHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const todayYMD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const lastRun = settings.get("auto_backup_last_run");
      let lastRunYMD = "";
      if (lastRun) {
        const d = new Date(lastRun);
        if (!isNaN(d.getTime())) {
          lastRunYMD = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        }
      }
      if (lastRunYMD !== todayYMD && currentHHMM >= scheduledTime) {
        console.log(`Running scheduled auto-backup at ${currentHHMM} (scheduled: ${scheduledTime}) to ${folder}`);
        const dateStr = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const destPath = import_path2.default.join(folder, `shop_mis_auto_backup_${dateStr}.db`);
        await performDatabaseBackup(destPath);
        settings.set("auto_backup_last_run", now.toISOString());
        logs.add("Backup", `Scheduled auto-backup saved to ${destPath}`, "info", "system", "AUTO_BACKUP");
      }
    } catch (e) {
      console.error("Error in checkAndRunAutoBackup:", e);
    }
  }
  import_electron.app.whenReady().then(() => {
    try {
      createWindow();
      setInterval(checkAndRunAutoBackup, 3e4);
    } catch (error) {
      import_electron.dialog.showErrorBox("Initialization Error", error.message || "Failed to create main window");
    }
    import_electron.app.on("activate", () => {
      if (import_electron.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
  import_electron.ipcMain.handle("license:status", () => {
    const licenseData = getLicenseData();
    const status = licenseData.system_license || settings.get("system_license");
    let activationDate = licenseData.license_activation_date || settings.get("license_activation_date");
    if (!status || !isValidLicenseKey(status)) {
      return { activated: false };
    }
    if (!activationDate) {
      activationDate = (/* @__PURE__ */ new Date()).toISOString();
    }
    const activatedAt = new Date(activationDate);
    const expiresAt = new Date(activatedAt);
    expiresAt.setFullYear(expiresAt.getFullYear() + 100);
    return {
      activated: true,
      activationDate,
      expiresAt: expiresAt.toISOString(),
      remainingDays: "Lifetime"
    };
  });
  import_electron.ipcMain.handle("license:activate", (_, rawKey) => {
    let key = rawKey;
    if (typeof key === "string") {
      key = key.replace(/[۰-۹]/g, (d) => "\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9".indexOf(d).toString()).replace(/[٠-٩]/g, (d) => "\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669".indexOf(d).toString()).trim();
    }
    if (isValidLicenseKey(key)) {
      const licenseData = getLicenseData();
      licenseData.system_license = key;
      if (!licenseData.license_activation_date) {
        licenseData.license_activation_date = (/* @__PURE__ */ new Date()).toISOString();
      }
      saveLicenseData(licenseData);
      try {
        settings.set("system_license", key);
        const existingDate = settings.get("license_activation_date");
        if (!existingDate) {
          settings.set("license_activation_date", licenseData.license_activation_date);
        }
      } catch (e) {
        console.error("Failed to sync license to DB:", e);
      }
      return { success: true };
    }
    return { success: false };
  });
  import_electron.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      import_electron.app.quit();
    }
  });
}
