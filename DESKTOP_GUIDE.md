# Shop MIS - Desktop App Guide

If you are having trouble with the desktop application after downloading it from GitHub, please follow these steps carefully.

## 1. Clean Installation
If you see multiple instances of "Shop MIS" in your Task Manager, follow these steps:
1. Open **Task Manager** (Ctrl + Shift + Esc).
2. Find all processes named **Shop MIS**.
3. Right-click each one and select **End Task**.
4. Uninstall the current version of the app from your computer.

## 2. Building the App Correctly
To ensure the app works, you must build it properly before packaging:
1. Open your terminal in the project folder.
2. Run: `npm install`
3. Run: `npm run build`
4. Run: `npm run package`

This will create an installer in the `release/` folder.

## 3. Why was it not opening?
We have fixed several issues that might have caused this:
- **Single Instance Lock:** The app now prevents multiple copies from running at once. If you click the icon again, it will simply focus the already open window.
- **Error Reporting:** If the app fails to start, it will now show a clear error message box instead of just doing nothing.
- **Asset Loading:** We improved how the app finds its files to ensure the screen doesn't stay blank.

## 4. Database Location
On Windows, your data is stored in:
`%APPDATA%/shop-mis/shop_mis.db`

If you want to start fresh, you can delete that file.
