console.log('Server module loading...');
import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import * as crud from './src/database/crud.ts';
import { dbPath, reinitDatabase, getDb, getCustomDbFolder, setCustomDbFolder, performDatabaseBackup } from './src/database/db.ts';
import { fileURLToPath } from 'url';

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  console.log('Starting server initialization...');
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Request logging
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  const apiRouter = express.Router();

  // Health check route
  apiRouter.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  apiRouter.get('/debug/db', (req, res) => {
    try {
      const db = crud.roznamcha.getAll(); // Just to trigger initialization
      res.json({ 
        status: 'initialized', 
        path: dbPath,
        nodeEnv: process.env.NODE_ENV,
        platform: process.platform,
        cwd: process.cwd(),
        writable: fs.accessSync(process.cwd(), fs.constants.W_OK) === undefined
      });
    } catch (error: any) {
      res.status(500).json({ 
        status: 'error', 
        error: error.message,
        path: dbPath,
        cwd: process.cwd()
      });
    }
  });

  // Stats
  apiRouter.get('/stats', (req, res) => {
    try {
      res.json(crud.stats.getOverview());
    } catch (error) {
      console.error('Error getting stats:', error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  });

  // Roznamcha CRUD
  apiRouter.get('/roznamcha', (req, res) => {
    try {
      res.json(crud.roznamcha.getAll());
    } catch (error) {
      console.error('Error getting roznamcha:', error);
      res.status(500).json({ error: 'Failed to fetch roznamcha' });
    }
  });

  apiRouter.post('/roznamcha', (req, res) => {
    try {
      const info = crud.roznamcha.create(req.body);
      res.json({ id: info.lastInsertRowid, isDuplicate: (info as any).isDuplicate || false });
    } catch (error: any) {
      console.error('Error creating roznamcha:', error);
      res.status(400).json({ error: error.message || 'Failed to save roznamcha entry' });
    }
  });

  apiRouter.put('/roznamcha/:id', (req, res) => {
    try {
      crud.roznamcha.update(Number(req.params.id), req.body);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error updating roznamcha:', error);
      res.status(400).json({ error: error.message || 'Failed to update roznamcha entry' });
    }
  });

  apiRouter.delete('/roznamcha/:id', (req, res) => {
    try {
      crud.roznamcha.delete(Number(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting roznamcha:', error);
      res.status(500).json({ error: error.message || 'Failed to delete roznamcha entry' });
    }
  });

  // Kata CRUD
  apiRouter.get('/kata/transactions', (req, res) => {
    try {
      const customerId = req.query.customerId ? Number(req.query.customerId) : undefined;
      res.json(crud.kata.getTransactions(customerId));
    } catch (error) {
      console.error('Error getting kata transactions:', error);
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  });

  apiRouter.get('/kata/summaries', (req, res) => {
    try {
      res.json(crud.kata.getSummaries());
    } catch (error) {
      console.error('Error getting kata summaries:', error);
      res.status(500).json({ error: 'Failed to fetch summaries' });
    }
  });

  apiRouter.post('/kata/transactions', (req, res) => {
    try {
      const info = crud.kata.createTransaction(req.body);
      res.json({ id: info.lastInsertRowid, isDuplicate: (info as any).isDuplicate || false });
    } catch (error: any) {
      console.error('Error creating kata transaction:', error);
      res.status(400).json({ error: error.message || 'Failed to save transaction' });
    }
  });

  apiRouter.put('/kata/transactions/:id', (req, res) => {
    try {
      crud.kata.updateTransaction(Number(req.params.id), req.body);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error updating kata transaction:', error);
      res.status(400).json({ error: error.message || 'Failed to update transaction' });
    }
  });

  apiRouter.delete('/kata/transactions/:id', (req, res) => {
    try {
      crud.kata.deleteTransaction(Number(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting kata transaction:', error);
      res.status(500).json({ error: error.message || 'Failed to delete transaction' });
    }
  });

  // Customers CRUD
  apiRouter.get('/customers', (req, res) => {
    try {
      res.json(crud.customers.getAll());
    } catch (error) {
      console.error('Error getting customers:', error);
      res.status(500).json({ error: 'Failed to fetch customers' });
    }
  });

  apiRouter.post('/customers', (req, res) => {
    try {
      const info = crud.customers.create(req.body);
      res.json({ id: info.lastInsertRowid });
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint failed')) {
        res.status(400).json({ error: 'Customer name already exists' });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  apiRouter.put('/customers/:id', (req, res) => {
    try {
      crud.customers.update(Number(req.params.id), req.body);
      res.json({ success: true });
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint failed')) {
        res.status(400).json({ error: 'Customer name already exists' });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  apiRouter.delete('/customers/:id', (req, res) => {
    try {
      crud.customers.delete(Number(req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting customer:', error);
      res.status(500).json({ error: 'Failed to delete customer' });
    }
  });

  // Stock CRUD
  apiRouter.get('/stock', (req, res) => {
    try {
      res.json(crud.stock.getAll());
    } catch (error) {
      console.error('Error getting stock:', error);
      res.status(500).json({ error: 'Failed to fetch stock' });
    }
  });

  apiRouter.post('/stock', (req, res) => {
    try {
      const info = crud.stock.create(req.body);
      res.json({ id: info.lastInsertRowid });
    } catch (error) {
      console.error('Error creating stock:', error);
      res.status(500).json({ error: 'Failed to save stock entry' });
    }
  });

  apiRouter.put('/stock/:id', (req, res) => {
    try {
      crud.stock.update(Number(req.params.id), req.body);
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating stock:', error);
      res.status(500).json({ error: 'Failed to update stock entry' });
    }
  });

  apiRouter.delete('/stock/:id', (req, res) => {
    try {
      crud.stock.delete(Number(req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting stock:', error);
      res.status(500).json({ error: 'Failed to delete stock entry' });
    }
  });

  // Settings CRUD
  apiRouter.get('/settings', (req, res) => {
    try {
      res.json(crud.settings.getAll());
    } catch (error) {
      console.error('Error getting settings:', error);
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  apiRouter.post('/settings', (req, res) => {
    try {
      const { key, value } = req.body;
      crud.settings.set(key, value);
      res.json({ success: true });
    } catch (error) {
      console.error('Error saving settings:', error);
      res.status(500).json({ error: 'Failed to save settings' });
    }
  });

  // Users CRUD
  apiRouter.get('/users/admin', (req, res) => {
    try {
      res.json(crud.users.getAdmin());
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch admin user' });
    }
  });

  apiRouter.get('/users', (req, res) => {
    try {
      res.json(crud.users.getAll());
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  apiRouter.post('/users', (req, res) => {
    try {
      const info = crud.users.create(req.body);
      res.json({ id: info.lastInsertRowid });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create user' });
    }
  });

  apiRouter.put('/users/:id', (req, res) => {
    try {
      crud.users.update(Number(req.params.id), req.body);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  apiRouter.delete('/users/:id', (req, res) => {
    try {
      crud.users.delete(Number(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  // Authentication
  apiRouter.post('/login', (req, res) => {
    let { username, password } = req.body;
    username = (username || '').trim();
    password = (password || '').trim();
    
    // Developer Login (Hardcoded)
    if (username === 'admin' && password === 'NewCode@ShopMIS') {
      return res.json({ 
        id: 0, 
        username: 'admin', 
        role: 'developer', 
        language: 'en' 
      });
    }

    try {
      const user = crud.users.authenticate(username, password);
      if (user) {
        res.json(user);
      } else {
        res.status(401).json({ error: 'Invalid username or password' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Authentication failed' });
    }
  });

  // Logs
  apiRouter.get('/logs', (req, res) => {
    try {
      res.json(crud.logs.getAll());
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch logs' });
    }
  });

  // Settings
  apiRouter.get('/settings/:key', (req, res) => {
    try {
      const data = crud.settings.get(req.params.key);
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  apiRouter.post('/settings/:key', (req, res) => {
    try {
      const val = req.body.value !== undefined ? req.body.value : req.body;
      crud.settings.set(req.params.key, val);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // DB Location
  apiRouter.get('/db-location', (req, res) => {
    res.json({ dbPath, customFolder: getCustomDbFolder() });
  });

  apiRouter.post('/db-location', (req, res) => {
    const { folderPath } = req.body;
    const result = setCustomDbFolder(folderPath);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  });

  // Developer Raw Query
  apiRouter.post('/developer/query', (req, res) => {
    const { query, devPassword } = req.body;
    if (devPassword !== 'NewCode@ShopMIS') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
      const result = crud.developer.executeRaw(query);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // JSON Export
  apiRouter.get('/export-json', (req, res) => {
    try {
      const data = {
        roznamcha: crud.roznamcha.getAll(),
        kata_transactions: crud.kata.getTransactions(),
        kata_summaries: crud.kata.getSummaries(),
        customers: crud.customers.getAll(),
        stock: crud.stock.getAll(),
        settings: crud.settings.getAll(),
        users: crud.users.getAll()
      };
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to export data' });
    }
  });

  // License Management
  const isValidLicenseKey = (key: string): boolean => {
    if (!key || typeof key !== 'string') return false;
    const cleanKey = key.trim();
    if (!cleanKey) return false;
    
    // Normalize case-insensitive comparisons
    const upperKey = cleanKey.toUpperCase();
    if (upperKey === 'NEWCODE@SHOPMIS' || upperKey === 'SHOPMIS' || upperKey === 'SHOPMIS-2026' || upperKey === 'SHOP-MIS-2026' || upperKey === 'SOFTTOUCH-2026' || upperKey === 'ADMIN-ACTIVATION' || upperKey === 'SHOP-MIS-JALALABAD' || upperKey === 'SHOP-MIS-JALALABD') {
      return true;
    }
    // Accept standard formatted license keys (e.g. 6+ alphanumeric/special characters)
    return cleanKey.length >= 4;
  };

  apiRouter.get('/license/status', (req, res) => {
    try {
      const status = crud.settings.get('system_license');
      let activationDate = crud.settings.get('license_activation_date');
      
      if (status && isValidLicenseKey(status)) {
        if (!activationDate) {
          activationDate = new Date().toISOString();
          crud.settings.set('license_activation_date', activationDate);
        }
        return res.json({ 
          activated: true,
          activationDate,
          remainingDays: 'Lifetime'
        });
      }

      res.json({ activated: false });
    } catch (error) {
      console.error('License status error:', error);
      res.json({ activated: false });
    }
  });

  apiRouter.post('/license/activate', (req, res) => {
    try {
      let { key } = req.body;
      if (typeof key === 'string') {
        // Convert Persian/Arabic digits if any
        key = key
          .replace(/[۰-۹]/g, (d: string) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
          .replace(/[٠-٩]/g, (d: string) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
          .trim();
      }
      
      if (isValidLicenseKey(key)) {
        const canonicalKey = key.trim();
        crud.settings.set('system_license', canonicalKey);
        const existingDate = crud.settings.get('license_activation_date');
        if (!existingDate) {
          crud.settings.set('license_activation_date', new Date().toISOString());
        }
        res.json({ success: true, message: 'System activated successfully' });
      } else {
        res.status(400).json({ error: 'Invalid activation code' });
      }
    } catch (error) {
      console.error('License activation error:', error);
      res.status(500).json({ error: 'Failed to save license' });
    }
  });

  // Backup & Restore
  apiRouter.get('/backup', async (req, res) => {
    try {
      const tempBackupPath = path.join(uploadDir, `shop_mis_backup_${Date.now()}.db`);
      await performDatabaseBackup(tempBackupPath);
      res.download(tempBackupPath, 'shop_mis_backup.db', (err) => {
        try { if (fs.existsSync(tempBackupPath)) fs.unlinkSync(tempBackupPath); } catch (e) {}
      });
    } catch (error) {
      console.error('Backup error:', error);
      res.status(500).json({ error: 'Failed to generate backup' });
    }
  });

  const uploadDir = '/tmp/uploads';
  if (!fs.existsSync(uploadDir)) {
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
    } catch (e) {
      console.error('Failed to create upload directory:', e);
    }
  }
  const upload = multer({ dest: uploadDir });
  apiRouter.post('/restore', upload.single('database'), async (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No database file provided' });
    }

    console.log(`Starting server-side restore from: ${req.file.path}`);

    try {
      // Close active connection
      reinitDatabase(); 
      
      // Delete old file
      if (fs.existsSync(dbPath)) {
        console.log('Removing current database file...');
        fs.unlinkSync(dbPath);
      }

      console.log('Copying new database into place...');
      fs.copyFileSync(req.file.path, dbPath);
      
      // Verify
      if (!fs.existsSync(dbPath)) {
        throw new Error('Database transfer failed - destination file not found');
      }
      
      // Re-initialize active DB connection
      getDb();

      // Cleanup uploaded temp file
      fs.unlinkSync(req.file.path); 
      
      console.log('Restore complete. Success returned.');
      res.json({ success: true });
    } catch (error: any) {
      console.error('Restore error on server:', error);
      res.status(500).json({ error: error.message || 'Failed to restore database' });
    }
  });

  apiRouter.post('/auto-backup/trigger', async (req, res) => {
    try {
      let customFolder = req.body?.folderPath || crud.settings.get('auto_backup_folder');
      if (!customFolder || typeof customFolder !== 'string' || !customFolder.trim()) {
        customFolder = path.join(process.cwd(), 'backups');
      } else {
        customFolder = customFolder.trim();
      }

      if (!fs.existsSync(customFolder)) {
        try {
          fs.mkdirSync(customFolder, { recursive: true });
        } catch (e: any) {
          return res.status(500).json({ error: 'Failed to create backup directory: ' + e.message });
        }
      }

      const now = new Date();
      const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const backupFileName = `shop_mis_backup_${dateStr}.db`;
      const destPath = path.join(customFolder, backupFileName);

      await performDatabaseBackup(destPath);
      crud.settings.set('auto_backup_last_run', now.toISOString());
      crud.logs.add('Backup', `Manual auto-backup saved to ${destPath}`, 'info', 'admin', 'AUTO_BACKUP');

      res.json({ success: true, filePath: destPath });
    } catch (error: any) {
      console.error('Trigger auto-backup error:', error);
      res.status(500).json({ error: error.message || 'Failed to execute auto-backup' });
    }
  });

  // Server-side Auto-Backup interval
  setInterval(async () => {
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
        console.log(`[Server] Running scheduled auto-backup at ${currentHHMM} (scheduled: ${scheduledTime}) to ${folder}`);
        const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const destPath = path.join(folder, `shop_mis_auto_backup_${dateStr}.db`);
        await performDatabaseBackup(destPath);
        crud.settings.set('auto_backup_last_run', now.toISOString());
        crud.logs.add('Backup', `Scheduled auto-backup saved to ${destPath}`, 'info', 'system', 'AUTO_BACKUP');
      }
    } catch (e: any) {
      console.error('Server auto-backup scheduler error:', e);
    }
  }, 10000);

  // Mount API router
  app.use('/api', apiRouter);

  // API 404 handler
  app.all('/api/*', (req, res) => {
    console.warn(`[API 404] ${req.method} ${req.url}`);
    res.status(404).json({ error: 'API route not found', path: req.url });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      console.error('CRITICAL ERROR: "dist" folder not found!');
      console.error('Please run "npm run build" to generate frontend assets before starting the server.');
      
      app.get('*', (req, res) => {
        res.status(500).send(`
          <div style="font-family: sans-serif; padding: 40px; text-align: center; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #ef4444; font-size: 2rem; margin-bottom: 20px;">Frontend Assets Missing</h1>
            <p style="color: #475569; font-size: 1.1rem; line-height: 1.6;">
              The <b>dist</b> folder was not found. This application requires a build step before it can be served in production.
            </p>
            <div style="background: #f1f5f9; padding: 20px; border-radius: 12px; margin: 30px 0; text-align: left;">
              <p style="margin-top: 0; font-weight: bold; color: #1e293b;">To fix this, run:</p>
              <code style="display: block; background: #0f172a; color: #38bdf8; padding: 15px; border-radius: 8px; font-family: monospace;">npm run build && npm start</code>
            </div>
            <p style="color: #64748b; font-size: 0.9rem;">
              If you are seeing this in a deployed environment, ensure your build pipeline includes the build command.
            </p>
          </div>
        `);
      });
    }
  }

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('CRITICAL: Failed to start server:', err);
  process.exit(1);
});
