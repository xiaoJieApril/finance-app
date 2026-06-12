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
