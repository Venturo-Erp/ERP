# VENTURO 6.0 系統狀態文檔

最後更新：2026-01-22

> **架構更新 (2026-01)**：系統已從「離線優先」升級為「純雲端」架構。

## 資料庫架構

- **使用中**：Supabase PostgreSQL（唯一資料來源）
- **連線狀態**：✅ 已連接
- **表數量**：50+ 個
- **架構模式**：純雲端架構（Supabase 為 Single Source of Truth）
- **資料隔離**：RLS (Row Level Security) + Workspace 隔離

## 登入系統

### 認證方式

- **主要認證**：Supabase Auth
- **輔助機制**：JWT Token（Cookie 儲存）

### 預設帳號

- **系統主管**：william01 / Venturo2025!

> 💡 其他帳號請從人資管理介面新增

### 登入驗證流程

1. 用戶輸入 Workspace Code + 員工編號 + 密碼
2. 使用 Supabase Auth `signInWithPassword` 驗證
3. 從 API 取得員工資料（繞過 RLS）
4. 確保 Auth 同步（`ensureAuthSync`）
5. 建立 JWT Token 並設定 Cookie
6. 更新 Zustand Store 狀態

## Store 架構

### 當前架構（純雲端）

- 使用 `createCloudStore` 工廠函數
- 資料流：Supabase → Zustand Store → UI
- 快取層：SWR（React Query 風格快取）
- 寫入策略：直接寫入 Supabase

### 主要 Store

| Store              | 說明       | 使用方式           |
| ------------------ | ---------- | ------------------ |
| `useTourStore`     | 旅遊團管理 | `createCloudStore` |
| `useOrderStore`    | 訂單管理   | `createCloudStore` |
| `useCustomerStore` | 客戶管理   | `createCloudStore` |
| `usePaymentStore`  | 付款管理   | `createCloudStore` |
| `useQuoteStore`    | 報價管理   | `createCloudStore` |
| `useMemberStore`   | 成員管理   | `createCloudStore` |
| `useEmployeeStore` | 員工管理   | `createCloudStore` |

### 輔助 Store

| Store                | 說明     |
| -------------------- | -------- |
| `auth-store.ts`      | 認證狀態 |
| `workspace-store.ts` | 工作空間 |
| `calendar-store.ts`  | 行事曆   |
| `todo-store.ts`      | 待辦事項 |

## 資料結構標準

- **欄位命名**：`snake_case`（前後端一致）
- **ID 格式**：UUID
- **編號格式**：詳見下方編號規範
- **時間戳**：ISO 8601 格式（`created_at`, `updated_at`）

### 編號規範

| 項目       | 格式                      | 範例             | 說明                    |
| ---------- | ------------------------- | ---------------- | ----------------------- |
| **團號**   | `{城市代碼}{YYMMDD}{A-Z}` | `CNX250128A`     | 清邁 2025/01/28 第1團   |
| **訂單**   | `{團號}-O{2位數}`         | `CNX250128A-O01` | 該團第1筆訂單           |
| **出納單** | `P{YYMMDD}{A-Z}`          | `P250128A`       | 2025/01/28 第1張出納單  |
| **客戶**   | `C{6位數}`                | `C000001`        | 全域流水號              |
| **報價單** | `Q{6位數}` / `X{6位數}`   | `Q000001`        | 標準報價 Q / 快速報價 X |
| **員工**   | `E{3位數}`                | `E001`           | 員工編號                |

## 資料表結構

### 核心業務表

| 表格            | 說明     | RLS |
| --------------- | -------- | --- |
| `tours`         | 旅遊團   | ✅  |
| `orders`        | 訂單     | ✅  |
| `order_members` | 訂單成員 | ✅  |
| `customers`     | 客戶     | ✅  |
| `payments`      | 付款記錄 | ✅  |
| `receipts`      | 收款單   | ✅  |
| `quotes`        | 報價單   | ✅  |
| `proposals`     | 提案     | ✅  |
| `itineraries`   | 行程表   | ✅  |
| `visas`         | 簽證資料 | ✅  |

### 基礎資料表（無 RLS）

| 表格          | 說明     |
| ------------- | -------- |
| `workspaces`  | 工作空間 |
| `employees`   | 員工     |
| `countries`   | 國家     |
| `cities`      | 城市     |
| `attractions` | 景點     |
| `suppliers`   | 供應商   |
| `hotels`      | 飯店     |
| `airlines`    | 航空公司 |

## 開發工具

### /dev 頁面

- **路徑**：http://localhost:3000/dev
- **功能**：
  - 顯示預設帳號資訊
  - 開發除錯工具

## 技術棧

| 類別           | 技術                     | 版本 |
| -------------- | ------------------------ | ---- |
| **前端框架**   | Next.js                  | 16   |
| **UI 框架**    | React                    | 19.2 |
| **語言**       | TypeScript               | 5    |
| **狀態管理**   | Zustand                  | 5    |
| **資料快取**   | SWR                      | 2.x  |
| **雲端資料庫** | Supabase PostgreSQL      | -    |
| **認證**       | Supabase Auth            | -    |
| **UI 組件**    | Tailwind CSS + shadcn/ui | 4    |
| **開發端口**   | -                        | 3000 |

## 開發進度（2026-01 更新）

### 已完成 ✅

- ✅ 純雲端架構遷移
- ✅ Supabase Auth 整合
- ✅ RLS 資料隔離
- ✅ 編號系統重構
- ✅ Store 系統重構（createCloudStore）
- ✅ UI 組件標準化（ListPageLayout、Table Cells）
- ✅ 核心 CRUD 功能

### 進行中 ⏳

- ⏳ 效能優化
- ⏳ E2E 測試補充
- ⏳ 文檔整理

## 注意事項

1. **純雲端架構**：所有資料直接存取 Supabase，無本地快取
2. **開發端口**：統一使用 3000
3. **連線需求**：需要網路連線到 Supabase
4. **RLS 政策**：業務資料透過 RLS 進行 Workspace 隔離
5. **Logger 使用**：禁止使用 `console.log`，改用 `logger`
