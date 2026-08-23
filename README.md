# Shop MIS - Professional Management System

A full-stack management system built with React, Vite, Express, and SQLite.

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18 or higher)
- npm

### 2. Installation
```bash
npm install
```

### 3. Build the Application
Before running the server in production mode, you MUST build the frontend assets:
```bash
npm run build
```

### 4. Start the Server
```bash
npm start
```
The application will be available at `http://localhost:3000`.

## 🛠️ Developer Mode
To run the application in development mode with Hot Module Replacement (HMR):
```bash
npm run dev
```

## 🖥️ Desktop Application (Electron)
If you are using the desktop version, please refer to the [DESKTOP_GUIDE.md](./DESKTOP_GUIDE.md) for troubleshooting and installation instructions.

## 📦 Deployment to GitHub
1. Use the **Export to GitHub** button in the AI Studio interface.
2. Once the repository is created, you can clone it locally.
3. **Important:** If you deploy to a platform like Cloud Run or a VPS, ensure you set the `PORT` environment variable (defaults to 3000) and provide any necessary secrets.

## 🔑 Credentials
- **Admin:** `admin` / `admin123`
- **Developer:** `admin` / `NewCode@ShopMIS`

## 📁 Project Structure
- `src/`: Frontend React components and logic.
- `server.ts`: Express backend server.
- `src/database/`: SQLite database schema and CRUD operations.
- `dist/`: Compiled frontend assets (generated after `npm run build`).
