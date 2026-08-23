# Shop Management Information System (Shop-MIS) - Developer Guide

This document contains all critical information, credentials, and architectural details for the Shop-MIS project.

## 🔑 Critical Credentials & Keys

| Item | Value | Description |
|------|-------|-------------|
| **Developer Password** | `NewCode@ShopMIS` | Hardcoded password for the `admin` username to access Dev Dashboard. |
| **Default Admin** | `admin` / `admin123` | Default user credentials created in the database on first run. |
| **License Master Key** | `NewCode@ShopMIS` | The universal key used to activate the system. |
| **Developer Contacts** | `+93794820308`, `+93772743175` | Used in the license expiration screen. |

---

## 🏗️ Project Structure & Architecture

The project is a **Full-Stack Desktop Application** built using the following stack:

- **Frontend**: React (TypeScript) with Vite.
- **Desktop Wrapper**: Electron.
- **Backend / API**: Express.js (integrated into Electron main process).
- **Styling**: Tailwind CSS (Mobile-first, Responsive).
- **Database**: SQLite (via `better-sqlite3`).
- **Icons**: Lucide React.
- **Animations**: Framer Motion (`motion/react`).

### Key Files
- `electron/main.ts`: Main process logic, IPC handlers, license management.
- `electron/preload.ts`: Bridge between Electron and React.
- `server.ts`: Express server for handling API requests (useful for web-distro).
- `src/database/db.ts`: Database initialization, table schemas, and path resolution.
- `src/database/crud.ts`: Data access layer (Business Logic).
- `src/components/LicenseGuard.tsx`: Security layer for license protection.

---

## 📂 Database & Storage

### Technology: SQLite
The database is local and does not require a separate server.

### Path Resolution
- **Non-Packaged/Dev**: `process.cwd()/shop_mis.db`
- **Packaged (Production)**: `appData/shop_mis.db` (User specific data folder).
- **Cloud/Container**: `/tmp/shop_mis.db`

### Tables
1. `users`: Credentials and roles.
2. `roznamcha`: Daily transactions (Income/Expense).
3. `kata_transactions`: Detailed customer credit/debit records.
4. `kata_summary`: Aggregated balances for customers.
5. `stock`: Inventory tracking (Stock In/Out).
6. `customers`: Customer profiles.
7. `settings`: Application-wide configurations and license status.
8. `system_logs`: Audit trail for errors and operations.

---

## 🌐 Language & Localization

The system supports three languages with **Full RTL (Right-to-Left)** support:
1. **English** (`en`)
2. **Pashto** (`ps`)
3. **Dari** (`dr`)

### Localization Logic
- Translations are managed in `src/lib/translations.ts`.
- Digits are converted to standard western numerals in the background for database consistency using `src/lib/utils.ts` (`convertPersianDigits`).

---

## 🛡️ License System Implementation

The license system is a **hybrid file + database** approach to prevent data loss.

1. **Storage**: Status is saved in `userData/license.json` on the disk.
2. **Persistence**: Even if the database is restored from an old backup, the `license.json` file remains, ensuring the app doesn't relock.
3. **Validity**: Fixed for **1 year (365 days)** from the first activation.
4. **Enforcement**: A background interval checks license status every hour and locks the UI if expired.

---

## 🚀 Build & Deployment

The project uses **GitHub Actions** for automated `.exe` builds.

- **Workflow**: `.github/workflows/build-exe.yml`
- **Builder**: `electron-builder`
- **Output**: A portable `.exe` and a Windows Installer.

### Setup for New Developer
1. Clone the repo.
2. Run `npm install`.
3. Run `npm run dev` to start dev mode.
4. Run `npm run build` to build the app.
