// electron/preload.ts
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("electronAPI", {
  getStats: () => import_electron.ipcRenderer.invoke("db:getStats"),
  getRoznamcha: () => import_electron.ipcRenderer.invoke("db:getRoznamcha"),
  createRoznamcha: (entry) => import_electron.ipcRenderer.invoke("db:createRoznamcha", entry),
  updateRoznamcha: (id, entry) => import_electron.ipcRenderer.invoke("db:updateRoznamcha", id, entry),
  deleteRoznamcha: (id) => import_electron.ipcRenderer.invoke("db:deleteRoznamcha", id),
  getKataTransactions: (customerId) => import_electron.ipcRenderer.invoke("db:getKataTransactions", customerId),
  getKataSummaries: () => import_electron.ipcRenderer.invoke("db:getKataSummaries"),
  createKataTransaction: (entry) => import_electron.ipcRenderer.invoke("db:createKataTransaction", entry),
  updateKataTransaction: (id, entry) => import_electron.ipcRenderer.invoke("db:updateKataTransaction", id, entry),
  deleteKataTransaction: (id) => import_electron.ipcRenderer.invoke("db:deleteKataTransaction", id),
  getStock: () => import_electron.ipcRenderer.invoke("db:getStock"),
  createStock: (entry) => import_electron.ipcRenderer.invoke("db:createStock", entry),
  updateStock: (id, entry) => import_electron.ipcRenderer.invoke("db:updateStock", id, entry),
  deleteStock: (id) => import_electron.ipcRenderer.invoke("db:deleteStock", id),
  getSettings: () => import_electron.ipcRenderer.invoke("db:getSettings"),
  setSetting: (key, value) => import_electron.ipcRenderer.invoke("db:setSetting", { key, value }),
  getDbLocation: () => import_electron.ipcRenderer.invoke("db:getDbLocation"),
  setDbFolder: (folderPath) => import_electron.ipcRenderer.invoke("db:setDbFolder", folderPath),
  backup: () => import_electron.ipcRenderer.invoke("db:backup"),
  restore: () => import_electron.ipcRenderer.invoke("db:restore"),
  // License
  getLicenseStatus: () => import_electron.ipcRenderer.invoke("license:status"),
  activateLicense: (key) => import_electron.ipcRenderer.invoke("license:activate", key),
  // Customers
  getCustomers: () => import_electron.ipcRenderer.invoke("db:getCustomers"),
  createCustomer: (customer) => import_electron.ipcRenderer.invoke("db:createCustomer", customer),
  updateCustomer: (id, customer) => import_electron.ipcRenderer.invoke("db:updateCustomer", id, customer),
  deleteCustomer: (id) => import_electron.ipcRenderer.invoke("db:deleteCustomer", id),
  // Users & Auth
  getUsers: () => import_electron.ipcRenderer.invoke("db:getUsers"),
  getAdminUser: () => import_electron.ipcRenderer.invoke("db:getAdminUser"),
  createUser: (user) => import_electron.ipcRenderer.invoke("db:createUser", user),
  updateUser: (id, user) => import_electron.ipcRenderer.invoke("db:updateUser", id, user),
  deleteUser: (id) => import_electron.ipcRenderer.invoke("db:deleteUser", id),
  authenticate: (credentials) => import_electron.ipcRenderer.invoke("db:authenticate", credentials),
  // Auto Backup
  selectDirectory: () => import_electron.ipcRenderer.invoke("select-directory"),
  triggerAutoBackup: (folderPath) => import_electron.ipcRenderer.invoke("trigger-auto-backup", folderPath),
  // Logs & Dev
  getLogs: () => import_electron.ipcRenderer.invoke("db:getLogs"),
  executeRaw: (query) => import_electron.ipcRenderer.invoke("db:executeRaw", query),
  exportJson: () => import_electron.ipcRenderer.invoke("db:exportJson")
});
