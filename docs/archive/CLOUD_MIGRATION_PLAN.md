# Venturo 系統架構簡化計畫：從離線優先到純雲端

## 概述

本計畫旨在將 Venturo 專案從當前的「離線優先 (Offline-First)」架構安全、漸進地重構為「純雲端 (Cloud-Only)」架構。此變更將大幅簡化系統複雜度，降低維護成本，並解決現有客戶端資料庫（IndexedDB）帶來的「表格問題」，使架構更符合實際使用情境。

## 目標

- 徹底移除所有 IndexedDB 相關的程式碼和基礎設施。
- 將所有資料操作統一透過 Supabase 進行。
- 導入 SWR 等資料獲取庫，以高效管理雲端資料的快取與狀態，同時保持優良的使用者體驗。
- 提升程式碼的可維護性、可讀性，降低新功能開發與除錯的複雜度。

## 執行計畫

---

### **Phase 0: 準備工作 (Setup & Preparation)**

1.  **建立新的 Git 分支**: `git checkout -b feature/cloud-refactor`。確保所有變更在隔離環境中進行。
2.  **安裝 SWR 套件**: `npm install swr`。SWR 是 Vercel (Next.js 的母公司) 出品的資料獲取庫，非常適合這個專案。它能處理快取、重新驗證等，以最小的複雜度達到接近離線優先的效能體驗。
3.  **標準化 Supabase Client**: 確保有一個全域共用的 Supabase client 實例，方便在新的資料獲取層中統一呼叫。

---

### **Phase 1: 試點模組重構 (Pilot: Todos)**

選擇一個功能獨立、影響範圍小的模組作為概念驗證，證明新架構的可行性。`Todos` 模組是一個很好的起點。

1.  **建立新的資料獲取 Hook**: 在 `src/hooks` 或 `src/features/todos` 目錄下建立 `useTodos.ts`。使用 SWR 和 Supabase client 實現 `getTodos`, `addTodo`, `updateTodo`, `deleteTodo` 等功能。
2.  **重構 UI 元件**: 改造與 `Todos` 相關的 UI 元件，將它們的資料來源從舊的 `store` 切換到新的 `useTodos` hook。
3.  **驗證功能**: 完整測試 Todos 功能，確保所有操作（增刪改查）都符合預期。
4.  **移除舊程式碼**: 確認新架構運作正常後，從舊的 `store` 和 `create-store.ts` 邏輯中，移除所有與 `Todos` 相關的程式碼。

---

### **Phase 2: 全面模組重構 (Full Refactoring)**

將 Phase 1 的成功經驗複製到所有其他資料模組。針對下列每一個模組，重複「建立 Hook → 重構 UI → 驗證 → 移除舊程式碼」的流程。建議一次處理一個模組，確保每次迭代都穩定。

- Tours
- Orders
- Quotes
- Customers
- Itineraries
- Payment Requests & Receipts
- Suppliers
- Regions & Attractions
- Employees & Members
- ...以及 `use-realtime-hooks.ts` 中列出的所有其他實體。

---

### **Phase 3: 核心離線基礎設施移除 (Core Infrastructure Removal)**

當所有模組都不再依賴舊的 store 後，就可以安全地拆除整個離線優先的底層架構。

1.  **刪除 IndexedDB Adapter**: 刪除 `src/stores/adapters/indexeddb-adapter.ts`。
2.  **刪除同步與遷移邏輯**: 刪除 `src/stores/sync/coordinator.ts`, `src/lib/db/migrations.ts`, `src/lib/db/version-manager.ts`, 和 `src/services/offline-auth.service.ts` 等檔案。
3.  **刪除舊的 Store 核心**: 刪除 `src/stores/core/create-store.ts` 以及 `src/stores/operations` 下的所有檔案。
4.  **執行 `knip`**: 執行 `npm run knip` (或其他相關指令)，找出並刪除所有因這次重構而產生的「無用檔案、匯出和依賴」，進行一次徹底的專案瘦身。

---

### **Phase 4: 最終清理與驗證 (Final Cleanup & Verification)**

1.  **移除相關測試**: 刪除 `tests/e2e` 目錄下所有與 `indexeddb-sync` 相關的測試檔案。
2.  **移除工具頁面**: 刪除 `public/clear-indexeddb.html` 和 `app/tools/reset-db` 這類僅為離線架構服務的開發工具頁面。
3.  **更新文件**: 檢查 `README.md` 和 `docs` 目錄下的架構文件，移除所有關於「離線優先」、「IndexedDB」的描述，更新為「純雲端」架構。
4.  **進行完整回歸測試**: 全面測試一次應用程式的所有功能，確保在移除舊架構後沒有引入非預期的副作用。
5.  **合併分支**: 將 `feature/cloud-refactor` 分支合併回主開發分支。

---
