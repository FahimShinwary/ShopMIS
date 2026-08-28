import { safeQuery } from './db.ts';
import type { RoznamchaEntry, KataTransaction, KataSummary, StockEntry, Customer } from '../types.ts';

// Helper to update kata summary
const updateKataSummary = (customerId: number) => {
  safeQuery((db) => {
    const transactions = db.prepare(`
      SELECT type, amount, COALESCE(currency, 'AFN') as currency 
      FROM kata_transactions 
      WHERE customer_id = ?
    `).all(customerId) as any[];
    
    // Clear existing summaries for this customer first
    db.prepare('DELETE FROM kata_summary WHERE customer_id = ?').run(customerId);

    const grouped: Record<string, { totalPurchase: number; totalPaid: number }> = {};
    
    transactions.forEach(t => {
      const curr = t.currency || 'AFN';
      if (!grouped[curr]) grouped[curr] = { totalPurchase: 0, totalPaid: 0 };
      const isPurchase = t.type === 'purchase' || t.type === 'debit';
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

// Roznamcha CRUD
export const roznamcha = {
  getAll: () => {
    return safeQuery((db) => {
      console.log('Fetching all roznamcha entries');
      return db.prepare("SELECT *, COALESCE(currency, 'AFN') as currency FROM roznamcha ORDER BY date DESC, id DESC").all();
    });
  },
  create: (entry: Omit<RoznamchaEntry, 'id'>, username: string = 'admin') => {
    return safeQuery((db) => {
      console.log('Creating roznamcha entry:', entry);
      const { date, type, amount, description, bill_number, customer_id } = entry;
      const currency = entry.currency || 'AFN';
      const numCustomerId = Number(customer_id);
      const numAmount = Number(amount) || 0;

      if (!numCustomerId || isNaN(numCustomerId) || numCustomerId <= 0) {
        throw new Error('Customer is required');
      }

      const cleanBill = (bill_number || '').trim();
      const cleanDesc = (description || '').trim();

      // Duplicate prevention: check if identical record already exists for the same date & details
      const existing = db.prepare(`
        SELECT id FROM roznamcha 
        WHERE date = ? AND customer_id = ? AND type = ? AND amount = ? 
          AND COALESCE(currency, 'AFN') = ? 
          AND COALESCE(bill_number, '') = ? 
          AND COALESCE(description, '') = ?
        ORDER BY id DESC LIMIT 1
      `).get(date, numCustomerId, type, numAmount, currency, cleanBill, cleanDesc) as any;

      if (existing && existing.id) {
        console.warn(`Duplicate roznamcha record skipped for customer ${numCustomerId} (${type}, ${numAmount})`);
        // Ensure kata is synced with this record
        const existingKata = db.prepare('SELECT id FROM kata_transactions WHERE roznamcha_id = ?').get(existing.id) as any;
        if (!existingKata) {
          const kataType = type === 'income' ? 'payment' : 'purchase';
          db.prepare('INSERT INTO kata_transactions (customer_id, date, type, amount, bill_number, description, roznamcha_id, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
            .run(numCustomerId, date, kataType, numAmount, cleanBill, cleanDesc, existing.id, currency);
          updateKataSummary(numCustomerId);
        }
        return { lastInsertRowid: existing.id, isDuplicate: true };
      }
      
      const info = db.prepare('INSERT INTO roznamcha (date, type, amount, description, bill_number, customer_id, currency) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(date, type, numAmount, cleanDesc, cleanBill, numCustomerId, currency);
      
      const roznamchaId = info.lastInsertRowid as number;

      // Automatic sync with Kata
      if (numCustomerId) {
        const kataType = type === 'income' ? 'payment' : 'purchase';
        db.prepare('INSERT INTO kata_transactions (customer_id, date, type, amount, bill_number, description, roznamcha_id, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .run(numCustomerId, date, kataType, numAmount, cleanBill, cleanDesc, roznamchaId, currency);
        updateKataSummary(numCustomerId);
      }

      logs.add('Roznamcha', `Created ${type} entry of ${numAmount} ${currency} (${cleanDesc || 'No description'})`, 'info', username, 'CREATE');
      
      return info;
    });
  },
  update: (id: number, entry: Omit<RoznamchaEntry, 'id'>, username: string = 'admin') => {
    return safeQuery((db) => {
      let { date, type, amount, description, bill_number, customer_id } = entry;
      const currency = entry.currency || 'AFN';
      const parsedCustomerId = customer_id ? Number(customer_id) : null;
      const numAmount = Number(amount) || 0;

      if (!parsedCustomerId || isNaN(parsedCustomerId) || parsedCustomerId <= 0) {
        throw new Error('Customer is required');
      }

      const cleanBill = (bill_number || '').trim();
      const cleanDesc = (description || '').trim();
      
      const oldEntry = db.prepare('SELECT customer_id FROM roznamcha WHERE id = ?').get(id) as any;
      
      const info = db.prepare('UPDATE roznamcha SET date = ?, type = ?, amount = ?, description = ?, bill_number = ?, customer_id = ?, currency = ? WHERE id = ?')
        .run(date, type, numAmount, cleanDesc, cleanBill, parsedCustomerId, currency, id);

      const existingKata = db.prepare('SELECT id FROM kata_transactions WHERE roznamcha_id = ?').get(id) as any;

      if (parsedCustomerId) {
        const kataType = type === 'income' ? 'payment' : 'purchase';
        if (existingKata) {
          db.prepare('UPDATE kata_transactions SET customer_id = ?, date = ?, type = ?, amount = ?, bill_number = ?, description = ?, currency = ? WHERE roznamcha_id = ?')
            .run(parsedCustomerId, date, kataType, numAmount, cleanBill, cleanDesc, currency, id);
        } else {
          db.prepare('INSERT INTO kata_transactions (customer_id, date, type, amount, bill_number, description, roznamcha_id, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
            .run(parsedCustomerId, date, kataType, numAmount, cleanBill, cleanDesc, id, currency);
        }
        updateKataSummary(parsedCustomerId);
      } else {
        if (existingKata) {
          db.prepare('DELETE FROM kata_transactions WHERE roznamcha_id = ?').run(id);
        }
      }
      
      if (oldEntry?.customer_id && Number(oldEntry.customer_id) !== parsedCustomerId) {
        updateKataSummary(Number(oldEntry.customer_id));
      }

      logs.add('Roznamcha', `Updated entry #${id} (${type}, ${numAmount} ${currency})`, 'info', username, 'UPDATE');
      
      return info;
    });
  },
  delete: (id: number, username: string = 'admin') => {
    return safeQuery((db) => {
      const entry = db.prepare("SELECT customer_id, amount, type, COALESCE(currency, 'AFN') as currency FROM roznamcha WHERE id = ?").get(id) as any;
      
      db.prepare('DELETE FROM kata_transactions WHERE roznamcha_id = ?').run(id);
      const info = db.prepare('DELETE FROM roznamcha WHERE id = ?').run(id);
      
      if (entry?.customer_id) {
        updateKataSummary(Number(entry.customer_id));
      }

      logs.add('Roznamcha', `Deleted entry #${id} (${entry?.type || ''} ${entry?.amount || 0} ${entry?.currency || 'AFN'})`, 'warning', username, 'DELETE');
      
      return info;
    });
  }
};

// Kata CRUD
export const kata = {
  getTransactions: (customerId?: number) => {
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
  createTransaction: (entry: Omit<KataTransaction, 'id'>, username: string = 'admin') => {
    return safeQuery((db) => {
      const { customer_id, date, type, amount, bill_number, description } = entry;
      const currency = entry.currency || 'AFN';
      const numCustomerId = Number(customer_id);
      const numAmount = Number(amount) || 0;

      if (!numCustomerId || isNaN(numCustomerId) || numCustomerId <= 0) {
        throw new Error('Customer is required');
      }

      const cleanBill = (bill_number || '').trim();
      const cleanDesc = (description || '').trim();

      // Duplicate prevention: check if identical record already exists for the same date & details
      const existing = db.prepare(`
        SELECT id, roznamcha_id FROM kata_transactions 
        WHERE date = ? AND customer_id = ? AND type = ? AND amount = ? 
          AND COALESCE(currency, 'AFN') = ? 
          AND COALESCE(bill_number, '') = ? 
          AND COALESCE(description, '') = ?
        ORDER BY id DESC LIMIT 1
      `).get(date, numCustomerId, type, numAmount, currency, cleanBill, cleanDesc) as any;

      if (existing && existing.id) {
        console.warn(`Duplicate kata record skipped for customer ${numCustomerId} (${type}, ${numAmount})`);
        return { lastInsertRowid: existing.id, isDuplicate: true };
      }
      
      // Automatic sync with Roznamcha
      const rozType = type === 'payment' ? 'income' : 'expense';
      const rozInfo = db.prepare('INSERT INTO roznamcha (date, type, amount, description, bill_number, customer_id, currency) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(date, rozType, numAmount, cleanDesc, cleanBill, numCustomerId, currency);
      
      const roznamchaId = rozInfo.lastInsertRowid as number;

      const info = db.prepare('INSERT INTO kata_transactions (customer_id, date, type, amount, bill_number, description, roznamcha_id, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(numCustomerId, date, type, numAmount, cleanBill, cleanDesc, roznamchaId, currency);
      
      updateKataSummary(numCustomerId);

      logs.add('Kata', `Created transaction for customer #${numCustomerId} (${type}, ${numAmount} ${currency})`, 'info', username, 'CREATE');

      return info;
    });
  },
  updateTransaction: (id: number, entry: Omit<KataTransaction, 'id'>, username: string = 'admin') => {
    return safeQuery((db) => {
      const { customer_id, date, type, amount, bill_number, description } = entry;
      const currency = entry.currency || 'AFN';
      const numCustomerId = Number(customer_id);
      const numAmount = Number(amount) || 0;

      if (!numCustomerId || isNaN(numCustomerId) || numCustomerId <= 0) {
        throw new Error('Customer is required');
      }

      const cleanBill = (bill_number || '').trim();
      const cleanDesc = (description || '').trim();
      
      const oldKata = db.prepare('SELECT customer_id, roznamcha_id FROM kata_transactions WHERE id = ?').get(id) as any;
      const roznamchaId = oldKata?.roznamcha_id;

      const info = db.prepare('UPDATE kata_transactions SET customer_id = ?, date = ?, type = ?, amount = ?, bill_number = ?, description = ?, currency = ? WHERE id = ?')
        .run(numCustomerId, date, type, numAmount, cleanBill, cleanDesc, currency, id);

      const rozType = type === 'payment' ? 'income' : 'expense';
      if (roznamchaId) {
        db.prepare('UPDATE roznamcha SET date = ?, type = ?, amount = ?, description = ?, bill_number = ?, customer_id = ?, currency = ? WHERE id = ?')
          .run(date, rozType, numAmount, cleanDesc, cleanBill, numCustomerId, currency, roznamchaId);
      } else {
        const rozInfo = db.prepare('INSERT INTO roznamcha (date, type, amount, description, bill_number, customer_id, currency) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(date, rozType, numAmount, cleanDesc, cleanBill, numCustomerId, currency);
        const newRozId = rozInfo.lastInsertRowid as number;
        db.prepare('UPDATE kata_transactions SET roznamcha_id = ? WHERE id = ?').run(newRozId, id);
      }

      updateKataSummary(numCustomerId);
      if (oldKata?.customer_id && Number(oldKata.customer_id) !== numCustomerId) {
        updateKataSummary(Number(oldKata.customer_id));
      }

      logs.add('Kata', `Updated transaction #${id} for customer #${numCustomerId} (${numAmount} ${currency})`, 'info', username, 'UPDATE');

      return info;
    });
  },
  deleteTransaction: (id: number, username: string = 'admin') => {
    return safeQuery((db) => {
      const transaction = db.prepare('SELECT customer_id, roznamcha_id FROM kata_transactions WHERE id = ?').get(id) as any;
      
      if (transaction?.roznamcha_id) {
        db.prepare('DELETE FROM roznamcha WHERE id = ?').run(transaction.roznamcha_id);
      }
      
      const info = db.prepare('DELETE FROM kata_transactions WHERE id = ?').run(id);
      
      if (transaction?.customer_id) {
        updateKataSummary(Number(transaction.customer_id));
      }

      logs.add('Kata', `Deleted transaction #${id}`, 'warning', username, 'DELETE');
      
      return info;
    });
  }
};

// Customer CRUD
export const customers = {
  getAll: () => {
    return safeQuery((db) => {
      return db.prepare('SELECT * FROM customers ORDER BY id DESC').all();
    });
  },
  create: (entry: Omit<Customer, 'id'>, username: string = 'admin') => {
    return safeQuery((db) => {
      const { name, address, contact } = entry;
      const info = db.prepare('INSERT INTO customers (name, address, contact) VALUES (?, ?, ?)')
        .run(name, address, contact);
      logs.add('Customers', `Created customer "${name}"`, 'info', username, 'CREATE');
      return info;
    });
  },
  update: (id: number, entry: Omit<Customer, 'id'>, username: string = 'admin') => {
    return safeQuery((db) => {
      const { name, address, contact } = entry;
      const info = db.prepare('UPDATE customers SET name = ?, address = ?, contact = ? WHERE id = ?')
        .run(name, address, contact, id);
      logs.add('Customers', `Updated customer #${id} ("${name}")`, 'info', username, 'UPDATE');
      return info;
    });
  },
  delete: (id: number, username: string = 'admin') => {
    return safeQuery((db) => {
      const cust = db.prepare('SELECT name FROM customers WHERE id = ?').get(id) as any;
      const deleteTx = db.transaction((customerId: number) => {
        // Cleanup related data
        db.prepare('DELETE FROM kata_summary WHERE customer_id = ?').run(customerId);
        db.prepare('DELETE FROM kata_transactions WHERE customer_id = ?').run(customerId);
        db.prepare('UPDATE roznamcha SET customer_id = NULL WHERE customer_id = ?').run(customerId);
        return db.prepare('DELETE FROM customers WHERE id = ?').run(customerId);
      });
      
      const res = deleteTx(id);
      logs.add('Customers', `Deleted customer #${id} ("${cust?.name || ''}")`, 'warning', username, 'DELETE');
      return res;
    });
  }
};

// Stock CRUD
export const stock = {
  getAll: () => {
    return safeQuery((db) => {
      return db.prepare('SELECT * FROM stock ORDER BY date DESC').all();
    });
  },
  create: (entry: Omit<StockEntry, 'id'>, username: string = 'admin') => {
    return safeQuery((db) => {
      const { item_name, date, type, quantity, description, bill_number } = entry;
      const numQty = Number(quantity) || 0;
      const cleanItem = (item_name || '').trim();
      const cleanBill = (bill_number || '').trim();
      const cleanDesc = (description || '').trim();

      const existing = db.prepare(`
        SELECT id FROM stock 
        WHERE item_name = ? AND date = ? AND type = ? AND quantity = ? 
          AND COALESCE(bill_number, '') = ? 
          AND COALESCE(description, '') = ?
        ORDER BY id DESC LIMIT 1
      `).get(cleanItem, date, type, numQty, cleanBill, cleanDesc) as any;

      if (existing && existing.id) {
        console.warn(`Duplicate stock record skipped for ${cleanItem} (qty: ${numQty})`);
        return { lastInsertRowid: existing.id, isDuplicate: true };
      }

      const info = db.prepare('INSERT INTO stock (item_name, date, type, quantity, description, bill_number) VALUES (?, ?, ?, ?, ?, ?)')
        .run(cleanItem, date, type, numQty, cleanDesc, cleanBill);
      logs.add('Stock', `Created stock item "${cleanItem}" (${type}, qty: ${numQty})`, 'info', username, 'CREATE');
      return info;
    });
  },
  update: (id: number, entry: Omit<StockEntry, 'id'>, username: string = 'admin') => {
    return safeQuery((db) => {
      const { item_name, date, type, quantity, description, bill_number } = entry;
      const info = db.prepare('UPDATE stock SET item_name = ?, date = ?, type = ?, quantity = ?, description = ?, bill_number = ? WHERE id = ?')
        .run(item_name, date, type, quantity, description, bill_number, id);
      logs.add('Stock', `Updated stock item #${id} ("${item_name}", qty: ${quantity})`, 'info', username, 'UPDATE');
      return info;
    });
  },
  delete: (id: number, username: string = 'admin') => {
    return safeQuery((db) => {
      const item = db.prepare('SELECT item_name FROM stock WHERE id = ?').get(id) as any;
      const info = db.prepare('DELETE FROM stock WHERE id = ?').run(id);
      logs.add('Stock', `Deleted stock item #${id} ("${item?.item_name || ''}")`, 'warning', username, 'DELETE');
      return info;
    });
  }
};

// Stats
export const stats = {
  getOverview: () => {
    return safeQuery((db) => {
      const income = db.prepare("SELECT SUM(amount) as total FROM roznamcha WHERE type = 'income'").get() as any;
      const expense = db.prepare("SELECT SUM(amount) as total FROM roznamcha WHERE type = 'expense'").get() as any;
      const stockIn = db.prepare("SELECT SUM(quantity) as total FROM stock WHERE type = 'in'").get() as any;
      const stockOut = db.prepare("SELECT SUM(quantity) as total FROM stock WHERE type = 'out'").get() as any;
      
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

// Users CRUD
export const users = {
  getAdmin: () => {
    return safeQuery((db) => {
      return db.prepare("SELECT id, username, password, role, language FROM users WHERE role = 'admin' OR id = 1 LIMIT 1").get();
    });
  },
  getAll: () => {
    return safeQuery((db) => {
      return db.prepare('SELECT id, username, role, language FROM users').all();
    });
  },
  create: (user: any, actorUsername: string = 'admin') => {
    return safeQuery((db) => {
      const { username, password, role, language } = user;
      const info = db.prepare('INSERT INTO users (username, password, role, language) VALUES (?, ?, ?, ?)')
        .run(username, password, role, language || 'en');
      logs.add('Users', `Created user "${username}" with role "${role}"`, 'info', actorUsername, 'CREATE');
      return info;
    });
  },
  update: (id: number, user: any, actorUsername: string = 'admin') => {
    return safeQuery((db) => {
      const { username, password, role, language } = user;
      let info;
      if (password) {
        info = db.prepare('UPDATE users SET username = ?, password = ?, role = ?, language = ? WHERE id = ?')
          .run(username, password, role, language, id);
      } else {
        info = db.prepare('UPDATE users SET username = ?, role = ?, language = ? WHERE id = ?')
          .run(username, role, language, id);
      }
      logs.add('Users', `Updated user #${id} ("${username}")`, 'info', actorUsername, 'UPDATE');
      return info;
    });
  },
  delete: (id: number, actorUsername: string = 'admin') => {
    return safeQuery((db) => {
      const u = db.prepare('SELECT username FROM users WHERE id = ?').get(id) as any;
      const info = db.prepare('DELETE FROM users WHERE id = ?').run(id);
      logs.add('Users', `Deleted user #${id} ("${u?.username || ''}")`, 'warning', actorUsername, 'DELETE');
      return info;
    });
  },
  authenticate: (username: string, password: string) => {
    return safeQuery((db) => {
      const user = db.prepare('SELECT id, username, role, language FROM users WHERE username = ? AND password = ?')
        .get(username, password);
      if (user) {
        logs.add('Auth', `User "${user.username}" logged in`, 'info', user.username, 'LOGIN');
      } else {
        logs.add('Auth', `Failed login attempt for username "${username}"`, 'error', username || 'guest', 'LOGIN_FAILED');
      }
      return user;
    });
  }
};

// Logs CRUD
export const logs = {
  getAll: () => {
    return safeQuery((db) => {
      return db.prepare('SELECT * FROM system_logs ORDER BY date DESC LIMIT 500').all();
    });
  },
  add: (module: string, message: string, type: string = 'info', username: string = 'admin', action: string = 'LOG') => {
    return safeQuery((db) => {
      return db.prepare('INSERT INTO system_logs (date, module, message, type, username, action) VALUES (?, ?, ?, ?, ?, ?)')
        .run(new Date().toISOString(), module, message, type, username || 'admin', action || 'LOG');
    });
  }
};

// Settings CRUD
export const settings = {
  get: (key: string) => {
    return safeQuery((db) => {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as any;
      return row ? JSON.parse(row.value) : null;
    });
  },
  set: (key: string, value: any) => {
    return safeQuery((db) => {
      return db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
        .run(key, JSON.stringify(value));
    });
  },
  getAll: () => {
    return safeQuery((db) => {
      return db.prepare('SELECT * FROM settings').all();
    });
  },
  delete: (key: string) => {
    return safeQuery((db) => {
      return db.prepare('DELETE FROM settings WHERE key = ?').run(key);
    });
  }
};

// Developer Tools
export const developer = {
  executeRaw: (query: string, actorUsername: string = 'developer') => {
    return safeQuery((db) => {
      const trimmed = (query || '').trim();
      if (!trimmed) return { success: true };

      // Handle multi-statement SQL scripts
      const statements = trimmed
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      if (statements.length > 1) {
        db.exec(trimmed);
        logs.add('Developer', `Executed raw batch query (${statements.length} statements): ${trimmed.substring(0, 100)}...`, 'warning', actorUsername, 'EXEC_QUERY');
        return { success: true, count: statements.length, message: `Executed ${statements.length} SQL statements successfully.` };
      }

      const stmt = db.prepare(trimmed);
      let res;
      if (trimmed.toUpperCase().startsWith('SELECT') || trimmed.toUpperCase().startsWith('PRAGMA')) {
        res = stmt.all();
      } else {
        res = stmt.run();
      }
      logs.add('Developer', `Executed raw query: ${trimmed.substring(0, 120)}${trimmed.length > 120 ? '...' : ''}`, 'warning', actorUsername, 'EXEC_QUERY');
      return res;
    });
  }
};
