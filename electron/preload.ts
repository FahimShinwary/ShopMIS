import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getStats: () => ipcRenderer.invoke('db:getStats'),
  getRoznamcha: () => ipcRenderer.invoke('db:getRoznamcha'),
  createRoznamcha: (entry: any) => ipcRenderer.invoke('db:createRoznamcha', entry),
  updateRoznamcha: (id: number, entry: any) => ipcRenderer.invoke('db:updateRoznamcha', id, entry),
  deleteRoznamcha: (id: number) => ipcRenderer.invoke('db:deleteRoznamcha', id),
  getKataTransactions: (customerId?: number) => ipcRenderer.invoke('db:getKataTransactions', customerId),
  getKataSummaries: () => ipcRenderer.invoke('db:getKataSummaries'),
  createKataTransaction: (entry: any) => ipcRenderer.invoke('db:createKataTransaction', entry),
  updateKataTransaction: (id: number, entry: any) => ipcRenderer.invoke('db:updateKataTransaction', id, entry),
  deleteKataTransaction: (id: number) => ipcRenderer.invoke('db:deleteKataTransaction', id),
  getStock: () => ipcRenderer.invoke('db:getStock'),
  createStock: (entry: any) => ipcRenderer.invoke('db:createStock', entry),
  updateStock: (id: number, entry: any) => ipcRenderer.invoke('db:updateStock', id, entry),
  deleteStock: (id: number) => ipcRenderer.invoke('db:deleteStock', id),
  getSettings: () => ipcRenderer.invoke('db:getSettings'),
  setSetting: (key: string, value: any) => ipcRenderer.invoke('db:setSetting', { key, value }),
  getDbLocation: () => ipcRenderer.invoke('db:getDbLocation'),
  setDbFolder: (folderPath: string) => ipcRenderer.invoke('db:setDbFolder', folderPath),
  backup: () => ipcRenderer.invoke('db:backup'),
  restore: () => ipcRenderer.invoke('db:restore'),
  
  // License
  getLicenseStatus: () => ipcRenderer.invoke('license:status'),
  activateLicense: (key: string) => ipcRenderer.invoke('license:activate', key),
  
  // Customers
  getCustomers: () => ipcRenderer.invoke('db:getCustomers'),
  createCustomer: (customer: any) => ipcRenderer.invoke('db:createCustomer', customer),
  updateCustomer: (id: number, customer: any) => ipcRenderer.invoke('db:updateCustomer', id, customer),
  deleteCustomer: (id: number) => ipcRenderer.invoke('db:deleteCustomer', id),
  
  // Users & Auth
  getUsers: () => ipcRenderer.invoke('db:getUsers'),
  getAdminUser: () => ipcRenderer.invoke('db:getAdminUser'),
  createUser: (user: any) => ipcRenderer.invoke('db:createUser', user),
  updateUser: (id: number, user: any) => ipcRenderer.invoke('db:updateUser', id, user),
  deleteUser: (id: number) => ipcRenderer.invoke('db:deleteUser', id),
  authenticate: (credentials: any) => ipcRenderer.invoke('db:authenticate', credentials),
  
  // Auto Backup
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  triggerAutoBackup: (folderPath?: string) => ipcRenderer.invoke('trigger-auto-backup', folderPath),
  
  // Logs & Dev
  getLogs: () => ipcRenderer.invoke('db:getLogs'),
  executeRaw: (query: string) => ipcRenderer.invoke('db:executeRaw', query),
  exportJson: () => ipcRenderer.invoke('db:exportJson'),
});
