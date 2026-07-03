# finaTracker

finaTracker is a React Native finance app built with Expo Router. It focuses on daily cashflow visibility: manual accounts, transaction tracking, budgets, categories, savings goals, recurring bills, AI review/planning, reports, and local reminders.

## Core Features

- Cashflow overview: monthly income, expense, balance, net worth, budget risk, saving-plan progress, daily/weekly/monthly safe-to-spend allowance, timeline, and upcoming recurring items.
- Saving coach: monthly saving targets, safety buffer, spend allowance, and strict-but-non-shaming action signals.
- Ledger: create, edit, delete, search, and filter transaction records.
- Budgets and categories: manage spending categories, income categories, monthly limits, and user-defined spending rules.
- Accounts: track cash, banks, e-wallets, and credit cards while preserving historical transaction context. Credit cards can store statement day, due day, minimum payment, outstanding balance, interest rate, and credit limit.
- Goals: track savings targets, goal type, primary-goal status, progress, monthly contribution plans, and projected completion pace.
- Recurring bills: manage fixed income and expenses with local reminder support.
- AI review and planning: summarize weekly/monthly finance context, propose monthly saving/budget plans, and apply confirmed recommendations to budgets, spending rules, and saving plans.
- Reports: export transaction summaries to CSV or PDF.
- Scenario simulator: test a possible future income or expense against current cashflow before committing.

## Project Structure

- `app/`: Expo Router route files. Keep routes here so URLs and tab navigation stay stable.
- `features/`: domain-owned app features such as finance, imports, assistant, reports, and auth.
- `shared/`: reusable UI, hooks, app variant config, theme helpers, and app-level stores.
- `infrastructure/`: external clients and platform integrations, currently Supabase.
- `supabase/`: database migrations and Edge Functions.
- `scripts/`: local maintenance and asset generation tools.
- `docs/`: English architecture and feature notes for future maintenance.

See [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) and [docs/FEATURES.md](docs/FEATURES.md) for a deeper folder-by-folder guide.

## Development

Install dependencies:

```bash
npm install
```

Start Expo:

```bash
npx expo start
```

Validate code before shipping changes:

```bash
npx tsc --noEmit
npm run lint
```

## Environment

Copy `.env.example` and provide the Supabase and AI keys used by the app:

```bash
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_GEMINI_API_KEY=...
EXPO_PUBLIC_APP_VARIANT=developer
EXPO_PUBLIC_ENABLE_DEVELOPER_TOOLS=true
EXPO_PUBLIC_BUILD_CHANNEL=development
```

### App Variants

The app currently focuses on the developer version. Set `EXPO_PUBLIC_APP_VARIANT=developer` and `EXPO_PUBLIC_ENABLE_DEVELOPER_TOOLS=true` to show diagnostics such as Supabase configuration, AI configuration, data source, app version, and build channel in Profile.

For a normal-user build, set:

```bash
EXPO_PUBLIC_APP_VARIANT=normal
EXPO_PUBLIC_ENABLE_DEVELOPER_TOOLS=false
EXPO_PUBLIC_BUILD_CHANNEL=production
```

Normal-user builds hide developer diagnostics and replace technical setup wording with user-facing sync/AI messages.

## Database

`supabase/migrations/202607010001_finance_baseline.sql` is the clean baseline schema for a fresh database. It creates only the active finance tables used by the current app and intentionally excludes removed features such as `notification_imports` and `future_note_imports`.

This baseline is intended for starting over or resetting the project database. If an existing remote Supabase project already ran the older migration history, reset the database or repair migration history before switching to this baseline.

Local reminders use `expo-notifications`. Android notification-reading imports were intentionally removed and should not be reintroduced unless the product direction changes.
# 💰 Personal Finance App | 個人財務管理系統

[English](#english) | [繁體中文](#繁體中文)

---

## 繁體中文

### 📖 關於專案
這是一個基於 **React Native (Expo)** 與 **Supabase** 開發的個人財務管理應用程式。旨在幫助用戶輕鬆記錄日常收支、設定預算目標，並透過數據視覺化與 **AI 智能助手** 來深入了解自身的財務健康狀況。

### ✨ 主要功能
* **💸 便捷記帳 (Transaction Management)**：快速新增、編輯與刪除日常收支紀錄，支援自訂交易類別。
* **📊 數據統計與分析 (Analytics & Dashboard)**：提供直觀的圖表（如圓餅圖、趨勢圖），幫助您快速掌握資金流向。
* **🚨 預算管理與超支預警 (Budget & Alerts)**：可針對不同類別設定預算，當花費接近或超過預算時，系統會自動透過 **推播通知 (Push Notifications)** 提醒您，避免過度消費。
* **🤖 AI 財務小助手 (AI Agent)**：內建智能助理（金庫小助手），可根據您的收支紀錄自動生成「財務復盤報告」與個人化理財建議。
* **📑 報表匯出 (Export Reports)**：支援將一段時間內的財務數據一鍵匯出為 **PDF** 或 **Excel (CSV)** 檔案，方便後續整理、列印與備份。
* **☁️ 雲端同步與安全認證 (Cloud Sync & Auth)**：整合 Supabase 提供安全的會員登入與路由守衛系統，所有資料即時雲端同步，跨裝置使用也不怕遺失。
* **🔄 無縫熱更新 (OTA Updates)**：結合 EAS Update，應用程式可在背景自動下載最新版本並更新，無須頻繁前往商店重新下載安裝。

### 🛠️ 技術棧
* **前端**：React Native, Expo, NativeWind (Tailwind CSS), TypeScript
* **後端 & 資料庫**：Supabase (PostgreSQL, Auth, Edge Functions)
* **部署與管理**：EAS Build, EAS Update

---

## English

### 📖 About the Project
This is a personal finance management application built with **React Native (Expo)** and **Supabase**. It is designed to help users effortlessly track daily expenses, set budget goals, and gain actionable insights into their financial health through data visualization and an **AI Smart Assistant**.

### ✨ Key Features
* **💸 Transaction Management**: Quickly add, edit, and delete daily income and expenses with support for custom transaction categories.
* **📊 Analytics & Dashboard**: Intuitive charts (e.g., pie charts, trend lines) to help you understand your cash flow at a glance.
* **🚨 Budget Management & Overspend Alerts**: Set budgets for specific categories. The app sends automatic **Push Notifications** when your spending is close to or exceeding your budget limit.
* **🤖 AI Financial Assistant**: A built-in smart agent that analyzes your transaction history to generate comprehensive "Financial Reviews" and provide personalized financial advice.
* **📑 Export Reports**: Seamlessly export your financial data over any specific period into **PDF** or **Excel (CSV)** formats for backup, sharing, or further analysis.
* **☁️ Cloud Sync & Secure Auth**: Integrated with Supabase for secure user authentication and routing guards. All data is synced to the cloud in real-time across your devices.
* **🔄 Over-The-Air (OTA) Updates**: Powered by Expo EAS Update, allowing the app to download and apply the latest updates seamlessly in the background without needing a manual reinstall.

### 🛠️ Tech Stack
* **Frontend**: React Native, Expo, NativeWind (Tailwind CSS), TypeScript
* **Backend & Database**: Supabase (PostgreSQL, Auth)
* **Deployment & DevOps**: EAS Build, EAS Update
