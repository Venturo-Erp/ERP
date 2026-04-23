# VENTURO 5.0 系統開發手冊

**版本**: 6.0.0
**日期**: 2026-01-22
**維護者**: William Chien

> ⚠️ **重要更新 (2026-01)**: 系統已從「離線優先」架構升級為「純雲端」架構，IndexedDB 已棄用。

---

## 📚 文件架構說明

**本專案包含三份核心文件，建議按順序閱讀：**

1. **PROJECT_PRINCIPLES.md** 🎯 設計理念與決策
   - 專案定位與目標用戶
   - 核心設計原則
   - 重要決策說明
   - 常見誤解澄清

2. **VENTURO_5.0_MANUAL.md** 📖 技術實作細節（本文件）
   - 系統架構規範
   - 技術實作細節
   - 開發檢查清單
   - API 與資料流

3. **CLAUDE.md** 🤖 AI 助手行為規範
   - AI 助手工作指引
   - 行為控制規範
   - 快速參考資訊

---

## 📖 文檔使用指南

### 使用指南

1. 開始開發前閱讀本文件了解系統架構
2. 遵循架構規範與開發檢查清單
3. 參考範例程式碼確保正確實作

---

## 📋 系統概述

### 專案定位

Venturo 是一個旅行社內部管理系統，採用純雲端架構。

### 核心決策

- **為什麼純雲端？** - Supabase 提供穩定的即時資料存取，簡化架構複雜度
- **為什麼 Supabase？** - 多人協作必須有統一的資料來源，RLS 提供資料隔離
- **為什麼保留現有 UI？** - UI/UX 已經驗證可用，持續優化

---

## 🎯 系統設計理念

### 當前架構

**純雲端架構 (Cloud-First)**

- Supabase 雲端資料庫（唯一的 Source of Truth）
- Zustand 狀態管理（UI 快取）
- RLS 資料隔離（workspace 級別）
- Supabase Auth 認證

### 設計原則

1. **簡單優先** - 不過度設計，夠用就好
2. **漸進增強** - 先跑起來，再優化
3. **保持彈性** - 預留擴充空間，但不預先實作

---

## 🏗️ 系統架構規範

### 五層架構定義

| 層級              | 職責                 | 技術實作                           | 禁止事項              |
| ----------------- | -------------------- | ---------------------------------- | --------------------- |
| **UI Layer**      | 顯示資料、使用者互動 | React Components, Shadcn UI        | 不可直接調用 Store/DB |
| **Hook Layer**    | 業務邏輯、資料編排   | Custom Hooks (useTours, useOrders) | 不可直接操作 DB       |
| **Service Layer** | API 抽象、資料轉換   | API Services（預留未來使用）       | 不可包含業務規則      |
| **Store Layer**   | 狀態管理、快取       | Zustand + SWR                      | 不可包含業務邏輯      |
| **DB Layer**      | 資料持久化           | Supabase                           | 不可包含業務規則      |

### 資料流規範

**✅ 正確流程**：

```
登入流程：
Supabase Auth 驗證 → 建立 Session → 載入使用者資料

新增資料：
UI → Hook → Store → Supabase（雲端）
```

**❌ 錯誤流程**：

```
UI → Store ❌ (跳過 Hook)
UI → DB ❌ (跳過中間層)
Hook → DB ❌ (跳過 Store)
```

### 層級職責詳解

#### 1. UI Layer - 純展示層

```typescript
// ✅ 正確：只處理顯示邏輯
function TourList() {
  const { tours, loading, createTour, deleteTour } = useTours();

  return (
    <div>
      {loading && <Spinner />}
      {tours.map(tour => <TourCard key={tour.id} tour={tour} />)}
    </div>
  );
}

// ❌ 錯誤：包含業務邏輯
function BadTourList() {
  const store = useTourStore(); // 不應直接用 Store
  const canEdit = tour.status === 'draft'; // 業務規則應在 Hook
}
```

#### 2. Hook Layer - 業務邏輯層

```typescript
// ✅ 正確：集中業務邏輯
export function useTours() {
  const store = useTourStore()

  const canEditTour = (tour: Tour): boolean => {
    return tour.status === 'draft' && hasPermission('tour:edit')
  }

  const createTour = async (data: CreateTourData) => {
    validateTourDates(data)
    const enrichedData = calculateTourMetrics(data)
    return await store.create(enrichedData)
  }

  return { tours: store.items, canEditTour, createTour }
}
```

#### 3. Service Layer - API 抽象層（預留擴充）

```typescript
// 預留未來擴充：統一 API 介面
export class TourService {
  async getAll(): Promise<Tour[]> {
    const response = await fetch('/api/tours')
    return response.json()
  }

  async create(data: CreateTourData): Promise<Tour> {
    return await apiClient.post('/tours', data)
  }
}
```

#### 4. Store Layer - 狀態管理層

```typescript
// ✅ 正確：純狀態管理，無業務邏輯
export const useTourStore = createStore<Tour>('tours', 'T')

// 自動提供：
// - items: Tour[]
// - loading: boolean
// - error: string | null
// - create, update, delete, fetchAll...
```

#### 5. DB Layer - 資料持久層

```typescript
// ✅ 正確：使用 Supabase Client 進行 CRUD 操作
import { supabase } from '@/lib/supabase/client'

const { data, error } = await supabase.from('tours').select('*').eq('workspace_id', workspaceId)
```

---

## 🔢 編號規範（固定標準，不可更改）

> **重要**：以下編號格式為固定規範，所有編號生成必須遵守此標準。
> 編號生成邏輯集中在：`src/stores/utils/code-generator.ts`

### 編號格式一覽表

| 項目             | 格式                      | 範例              | 說明                         |
| ---------------- | ------------------------- | ----------------- | ---------------------------- |
| **團號**         | `{城市代碼}{YYMMDD}{A-Z}` | `CNX250128A`      | 清邁 2025/01/28 第1團        |
| **訂單**         | `{團號}-O{2位數}`         | `CNX250128A-O01`  | 該團第1筆訂單                |
| **需求單**       | `{團號}-RQ{2位數}`        | `CNX250128A-RQ01` | 該團第1張需求單 (RQ=Request) |
| **請款單**       | `{團號}-I{2位數}`         | `CNX250128A-I01`  | 該團第1張請款單 (I=Invoice)  |
| **收款單**       | `{團號}-R{2位數}`         | `CNX250128A-R01`  | 該團第1張收款單 (R=Receipt)  |
| **出納單**       | `P{YYMMDD}{A-Z}`          | `P250128A`        | 2025/01/28 第1張出納單       |
| **客戶**         | `C{6位數}`                | `C000001`         | 流水號                       |
| **報價單(標準)** | `Q{6位數}`                | `Q000001`         | 流水號                       |
| **報價單(快速)** | `X{6位數}`                | `X000001`         | 流水號                       |
| **員工**         | `E{3位數}`                | `E001`            | 無辦公室前綴，入口選公司     |
| **提案**         | `PR{6位數}`               | `PR000001`        | 提案編號                     |

### 編號規則說明

```
團號規則：
- 城市代碼：使用 IATA 機場代碼（CNX=清邁, BKK=曼谷, HND=東京...）
- 日期：YYMMDD 格式（年後2碼+月2碼+日2碼）
- 序號：A-Z 字母（同城市同日期的第N團）

關聯編號規則：
- 訂單/需求單/請款單/收款單：都依附於團號，格式為 {團號}-{類型}{序號}
- 序號為 2 位數，從 01 開始
- 類型代碼：O=訂單, RQ=需求單, I=請款單, R=收款單

獨立編號規則：
- 出納單：以出帳日期為基準，格式為 P{日期}{字母}
- 客戶/報價單：純流水號，6位數

員工編號特殊規則：
- 台北和台中員工都使用 E001~E999
- 登入時需選擇公司來區分
```

---

## 🎨 UI 開發規範

### 頁面高度規範（必須遵守）

**所有頁面必須遵循統一的高度結構**，確保內容區能正確填滿到視窗底部。

#### 標準結構

```tsx
// ✅ 正確：所有頁面都應該使用這個結構
export default function YourPage() {
  return (
    <div className="h-full flex flex-col">
      {/* Header 區域 - 固定高度 */}
      <ResponsiveHeader
        title="頁面標題"
        breadcrumb={[...]}
      />

      {/* 主內容區 - 自動填滿剩餘空間 */}
      <div className="flex-1 overflow-auto">
        {/* 表格或其他內容 */}
        <EnhancedTable className="min-h-full" ... />
      </div>
    </div>
  );
}
```

#### MainLayout 配合

```tsx
// src/components/layout/main-layout.tsx
<main className="h-screen transition-all duration-300 pt-[72px] ...">
  <div className="p-6 h-full">{children} // ← 頁面組件在這裡</div>
</main>
```

#### 高度鏈條

```
MainLayout (h-screen)
  └─ <div className="p-6 h-full">
      └─ YourPage (h-full flex flex-col)
          ├─ ResponsiveHeader (固定高度)
          └─ <div className="flex-1 overflow-auto">
              └─ 內容區（可捲動，正確填滿）
```

#### 為什麼這樣做？

1. **統一規範** - 所有頁面遵循相同結構
2. **正確填滿** - 確保內容區填滿到視窗底部，不留空白
3. **易於維護** - 未來修改只需遵循同一套規則
4. **避免問題** - 防止「內容區不夠高」「底部留白」等問題

#### 錯誤示範

```tsx
// ❌ 錯誤：沒有 h-full，內容區不會填滿
export default function BadPage() {
  return (
    <div className="space-y-6">  // ❌ 應該用 h-full flex flex-col
      <ResponsiveHeader ... />
      <div>  // ❌ 應該用 flex-1 overflow-auto
        <Content />
      </div>
    </div>
  );
}
```

#### 特殊情況

- **需要固定高度的組件**（如聊天室、編輯器）更需要嚴格遵守此規範
- **列表頁面**：即使內容很長需要捲動，也要用 `overflow-auto` 讓捲軸正確出現

---

## 📁 檔案命名規範

### 命名規則

| 類型      | 格式                | 範例            |
| --------- | ------------------- | --------------- |
| Component | kebab-case          | `tour-list.tsx` |
| Hook      | use-\*              | `use-tours.ts`  |
| Store     | kebab-case + .store | `tour.store.ts` |
| Type      | kebab-case + .types | `tour.types.ts` |
| Util      | kebab-case          | `date-utils.ts` |

**⚠️ 重要說明（2025-01-06 修正）：**

- 組件檔案統一用 `kebab-case`（文檔原寫 PascalCase 但專案實際用 kebab-case）
- Hook 檔案統一 `use-*.ts` 格式
- 詳細規範請見 [CODE_STANDARDS.md](./CODE_STANDARDS.md)

### 資料欄位規範

**核心原則：全系統 100% 使用 snake_case**

**決策理由：**

- ✅ 資料庫標準：snake_case 是 SQL/Supabase 標準
- ✅ 無需轉換：前後端統一格式
- ✅ 團隊效率：減少 camelCase ↔ snake_case 轉換錯誤

```typescript
// ✅ 正確：全系統統一 snake_case
interface Tour {
  tour_name: string
  start_date: string
  created_at: string
}

// ❌ 錯誤：不要混用
interface BadTour {
  tourName: string // ❌ camelCase
  start_date: string // ✅ snake_case
  createdAt: string // ❌ camelCase
}
```

### 🗄️ 資料表命名規範

**全部使用 snake_case：**

```typescript
// ✅ 正確
'payment_requests'
'disbursement_orders'
'receipt_orders'
'quote_items'
'calendar_events'
'workspace_items'
'timebox_sessions'

// ❌ 錯誤
'paymentRequests'
'disbursementOrders'
'receiptOrders'
'quoteItems'
```

### 🚨 命名檢查清單

**Types 檔案 (src/types/\*.ts)：**

- ✅ 所有 interface 欄位用 snake_case
- ✅ 狀態值常量也用 snake_case（`'in_progress'`）

**Stores 檔案 (src/stores/\*.ts)：**

- ✅ 所有 interface 欄位用 snake_case
- ✅ Store 內部操作欄位用 snake_case

**Components 檔案 (src/components/\*\*/\*.tsx)：**

- ✅ 所有資料物件欄位用 snake_case
- ✅ Supabase 資料統一用 snake_case

**API Routes 檔案 (src/app/api/\*\*/route.ts)：**

- ✅ 全部用 snake_case
- ✅ 前後端統一，無需轉換

### 📋 常見錯誤對照表

| ❌ 錯誤寫法 (camelCase) | ✅ 正確寫法 (snake_case) |
| ----------------------- | ------------------------ |
| `employeeNumber`        | `employee_number`        |
| `tourName`              | `tour_name`              |
| `createdAt`             | `created_at`             |
| `updatedAt`             | `updated_at`             |
| `isActive`              | `is_active`              |
| `fieldKey`              | `field_key`              |
| `startDate`             | `start_date`             |
| `endDate`               | `end_date`               |

---

## 🔐 認證與登入系統

### 當前架構：Supabase Auth

系統使用 Supabase Auth 進行認證，使用者資訊存儲在 Zustand Store。

### 登入流程架構

```
┌─────────────────────────────────────────────────────────┐
│  登入頁面 (src/app/login/page.tsx)                      │
│  - 表單輸入：員工編號 + 密碼                            │
└─────────────────────┬───────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│  Supabase Auth API                                      │
│  - 驗證員工編號和密碼                                   │
│  - 取得員工資料                                         │
└─────────────────────┬───────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│  useAuthStore 更新登入狀態                              │
│  - 儲存 User 資料到 Zustand                            │
│  - 儲存到 localStorage ('auth-storage')                │
│  - 觸發路由跳轉到 /workspace                            │
└─────────────────────────────────────────────────────────┘
```

### 認證相關檔案

| 檔案                          | 用途          |
| ----------------------------- | ------------- |
| `src/stores/auth-store.ts`    | 認證狀態管理  |
| `src/lib/auth.ts`             | 認證工具函數  |
| `src/lib/auth/auth-sync.ts`   | Session 同步  |
| `src/hooks/useRequireAuth.ts` | 認證守衛 Hook |

### 權限檢查

```typescript
import { usePermissions } from '@/hooks/usePermissions'

const { hasPermission } = usePermissions()

if (hasPermission('tour:edit')) {
  // 可以編輯旅遊團
}
```

### 角色與權限

系統使用 RBAC (Role-Based Access Control)：

- **super_admin**: 完整權限，可跨 workspace
- **admin**: workspace 內完整權限
- **manager**: 業務管理權限
- **sales**: 銷售相關權限
- **accountant**: 財務權限

---

## 📡 資料載入架構（Data Loading Architecture）

### 設計原則：Route-based Loading

**核心概念**：只載入當前頁面需要的資料

#### 1. Route-based Loading（路由層載入）

```typescript
// ✅ 正確：只在進入頁面時載入
export default function ToursPage() {
  const { items: tours, fetchAll } = useTourStore();

  useEffect(() => {
    fetchAll(); // 進入頁面才載入
  }, [fetchAll]);

  return <div>{tours.map(...)}</div>;
}
```

#### 2. 禁止全域載入

```typescript
// ❌ 錯誤：Layout/Sidebar 載入資料
function Sidebar() {
  const { items: tours, fetchAll } = useTourStore();

  useEffect(() => {
    fetchAll(); // ❌ 每個頁面都觸發！
  }, []);

  return <Link to="/tours">團務 ({tours.length})</Link>;
}

// ✅ 正確：Sidebar 不載入業務資料
function Sidebar() {
  return <Link to="/tours">團務</Link>; // 不顯示數量
}
```

#### 3. 工廠 Store 統一介面

**所有 stores 使用相同方法名：**

| 方法               | 說明     | 範例                                           |
| ------------------ | -------- | ---------------------------------------------- |
| `items`            | 資料陣列 | `const { items: tours } = useTourStore()`      |
| `fetchAll()`       | 載入所有 | `await fetchAll()`                             |
| `fetchById(id)`    | 載入單筆 | `await fetchById('123')`                       |
| `create(data)`     | 新增     | `await create({ name: '日本團' })`             |
| `update(id, data)` | 更新     | `await update('123', { name: '日本團2.0' })`   |
| `delete(id)`       | 刪除     | `await delete('123')`                          |
| `loading`          | 載入狀態 | `const loading = useTourStore(s => s.loading)` |
| `error`            | 錯誤訊息 | `const error = useTourStore(s => s.error)`     |

```typescript
// ✅ 正確：使用工廠 store 標準方法
import { useTourStore, useOrderStore } from '@/stores'

const { items: tours, fetchAll, create, update, delete: deleteTour } = useTourStore()

// ❌ 錯誤：期待舊的自訂方法名
const { tours, addTour, updateTour, deleteTour } = useTourStore() // ❌ 這些方法不存在
```

### 資料流向

```
用戶點擊導航
    ↓
進入 ToursPage
    ↓
useEffect 觸發 fetchAll()
    ↓
Store 執行載入流程：
  1. 檢查 Memory Cache
  2. Cache Miss → 從 Supabase 讀取
  3. 更新 Memory Cache
  4. 更新 Store state
    ↓
UI 渲染
```

### 多 Store 組合

```typescript
// ✅ 多個獨立 stores，各自載入
export default function ToursPage() {
  const { items: tours, fetchAll: fetchTours } = useTourStore();
  const { items: orders, fetchAll: fetchOrders } = useOrderStore();
  const { items: members, fetchAll: fetchMembers } = useMemberStore();

  useEffect(() => {
    // 並行載入
    Promise.all([
      fetchTours(),
      fetchOrders(),
      fetchMembers()
    ]);
  }, [fetchTours, fetchOrders, fetchMembers]);

  return <div>...</div>;
}
```

### 效能對比

**優化後架構：**

- ✅ 只在進入頁面時載入該頁資料
- ✅ Memory Cache 減少重複讀取
- ✅ Supabase 按需讀取
- ✅ 首次進入頁面：只載入必要資料

### 實作檢查清單

**新增頁面時：**

- [ ] 在頁面組件內呼叫 `fetchAll()`
- [ ] 使用 `useEffect` 確保只載入一次
- [ ] 使用工廠 store 的標準方法（`items`, `create`, `update`, `delete`）
- [ ] 不在 Layout/Sidebar 載入資料

**修改現有頁面時：**

- [ ] 檢查是否有全域載入（Layout/useEffect）
- [ ] 移除 Sidebar 的資料讀取
- [ ] 改用 Route-based Loading
- [ ] 統一使用 `items` 而非自訂名稱（如 `tours`, `orders`）

### 完整範例

```typescript
// src/app/tours/page.tsx
export default function ToursPage() {
  // 使用工廠 stores
  const { items: tours, fetchAll, create, update, delete: deleteTour } = useTourStore();
  const loading = useTourStore(state => state.loading);
  const error = useTourStore(state => state.error);

  // Route-based Loading
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // CRUD 操作
  const handleCreate = async () => {
    await create({ name: '日本團', departureDate: '2025-03-01' });
  };

  const handleUpdate = async (id: string) => {
    await update(id, { name: '日本團 2.0' });
  };

  const handleDelete = async (id: string) => {
    await deleteTour(id);
  };

  // UI
  if (loading) return <div>載入中...</div>;
  if (error) return <div>錯誤：{error}</div>;

  return (
    <div>
      <button onClick={handleCreate}>新增團</button>
      {tours.map(tour => (
        <TourCard
          key={tour.id}
          tour={tour}
          onUpdate={() => handleUpdate(tour.id)}
          onDelete={() => handleDelete(tour.id)}
        />
      ))}
    </div>
  );
}
```

### 詳細文檔

完整規範請參考：[DATA_LOADING_STANDARDS.md](./DATA_LOADING_STANDARDS.md)

---

## ✅ 開發檢查清單

### 基礎建設

#### 型別系統

- [x] 建立 `types/base.types.ts`
- [x] 建立 `types/employee.types.ts`
- [x] 建立 `types/tour.types.ts`
- [x] 建立 `types/order.types.ts`
- [x] 建立 `types/customer.types.ts`
- [x] 建立 `types/finance.types.ts`
- [x] 建立 `types/quote.types.ts`
- [x] 建立 `types/common.types.ts`
- [x] 建立 `types/index.ts` 統一匯出
- [x] 統一使用 snake_case（2025-10-08 更新）
- [x] 所有實體繼承 BaseEntity
- [x] 移除所有 any 類型

#### ~~IndexedDB 層~~ (已棄用 2026-01)

> ⚠️ **已棄用**：系統已升級為純雲端架構，以下進度僅為歷史紀錄。
>
> - 現行架構直接使用 Supabase 作為唯一資料來源
> - `lib/db/index.ts` 保留但已標記為 deprecated
> - 所有 Store 已改用 `createCloudStore` 模式

#### Store 系統

- [x] 建立 `stores/create-store.ts` - Store 工廠函數
- [x] 實作自動 CRUD 生成（create, read, update, delete）
- [x] 實作批次操作（createMany, deleteMany）
- [x] 實作查詢功能（findByField, filter, count）
- [x] 加入樂觀更新機制
- [x] 處理載入狀態（loading, error）
- [x] 自動編號生成（支援 T, O, C, P, Q 等前綴）
- [x] 建立 `stores/index.ts` - 使用工廠建立所有 Stores
- [x] 支援 11 個主要 Store（Tour, Order, Customer, Payment, Quote, PaymentRequest, DisbursementOrder, ReceiptOrder, Member, QuoteItem, Employee）
- [x] 統一 Store 架構，避免重複代碼

### 整合測試

#### Hook 層

- [x] 建立 useTours
- [x] 建立 useOrders
- [x] 建立 useCustomers
- [x] 建立 usePayments
- [x] 建立 useQuotes
- [x] 建立 hooks/index.ts
- [x] 加入業務邏輯（驗證、權限、計算）
- [x] 加入資料驗證（Zod schemas）

#### UI 整合

- 替換舊的資料來源
- 測試 CRUD 功能
- 修復顯示問題
- 確認資料綁定

#### 認證系統

- 建立 `auth.store.ts`
- 實作登入邏輯
- 加入 session 管理
- 測試權限控制

#### 錯誤處理

- 加入全域錯誤邊界
- 實作錯誤提示
- 加入重試機制
- 記錄錯誤日誌

---

## 🚫 常見錯誤與解決

### 問題 1: 為什麼不直接用 Supabase？

**原因**:

- 開發階段頻繁改動，同步增加複雜度
- 本地開發不需要網路，提高效率
- 避免資料庫 schema 不一致問題

**未來擴充**:

- 會加入 Supabase 雲端同步
- 只需修改 DB 層，其他層不用動

### 問題 2: 為什麼 Store 方法不統一？

**原因**:

- 歷史遺留問題
- 不同開發者的習慣

**解決方案**:

```typescript
// 統一規範：所有方法返回 Promise
interface StoreOperations<T> {
  add: (data: T) => Promise<T>
  update: (id: string, data: T) => Promise<T>
  delete: (id: string) => Promise<void>
}
```

### 問題 3: TypeScript 錯誤太多

**原因**:

- 型別定義不完整
- any 類型濫用
- 介面不一致

**解決優先順序**:

1. 先修 TS2339（屬性不存在）
2. 再修 TS2322（類型不匹配）
3. 最後修其他錯誤

---

## 📊 資料模型定義

### 核心實體關係圖

```
Employee (員工)
    ↓ creates
Tour (旅遊團)
    ↓ has many
Order (訂單) ← places ← Customer (客戶)
    ↓ has many
Payment (付款)
Member (團員)
```

### 編號規則

> **注意**：完整的編號規範請參考上方「編號規範」章節。以下為快速參考表。

| 實體     | 格式                      | 範例             | 說明                    |
| -------- | ------------------------- | ---------------- | ----------------------- |
| Tour     | `{城市代碼}{YYMMDD}{A-Z}` | `CNX250128A`     | 清邁 2025/01/28 第1團   |
| Order    | `{團號}-O{2位數}`         | `CNX250128A-O01` | 該團第1筆訂單           |
| Customer | `C{6位數}`                | `C000001`        | 全域流水號              |
| Payment  | `P{YYMMDD}{A-Z}`          | `P250128A`       | 2025/01/28 第1張出納單  |
| Quote    | `Q{6位數}` / `X{6位數}`   | `Q000001`        | 標準報價 Q / 快速報價 X |

**訂單編號說明：**

- 訂單編號依附於團號，每個團獨立流水號
- 格式：`{團號}-O{2位數流水號}`
- 範例：
  - `CNX250128A-O01`：清邁 2025/01/28 第1團的第1筆訂單
  - `CNX250128A-O02`：清邁 2025/01/28 第1團的第2筆訂單
  - `BKK250210B-O01`：曼谷 2025/02/10 第2團的第1筆訂單

---

## 🔧 技術決策記錄

### Decision 001: 使用 Supabase 作為資料庫

**日期**: 2026-01 (更新)

**原因**:

- 統一的 Source of Truth
- 內建 RLS 資料隔離
- 即時同步支援
- 完整的 Auth 系統

> ~~原決策 (2025-01): IndexedDB - 已棄用~~

### Decision 002: 使用 Zustand 而非 Redux

**日期**: 2025-01-06

**原因**:

- 更簡單的 API
- 更少的樣板代碼
- 內建 TypeScript 支援
- 檔案大小更小

### Decision 003: 純雲端架構

**日期**: 2026-01 (更新)

**原因**:

- 簡化架構複雜度
- 避免同步衝突問題
- Supabase 提供穩定服務
- 多人協作即時同步

> ~~原決策 (2025-01): 先本地後雲端 - 已改為純雲端~~

### Decision 004: 統一 Store 架構

**日期**: 2025-01-06

**原因**:

- 避免重複代碼：統一 CRUD 邏輯
- 維護更簡單：一個工廠管理所有
- 自動編號生成：內建 code 生成邏輯
- 型別安全：完整 TypeScript 支援

**架構說明**:

```
src/stores/
├── index.ts             # 用工廠建立所有 stores
└── create-store.ts      # Store 工廠函數（統一邏輯）
```

**使用方式**:

```typescript
// 一行建立一個 Store
export const useTourStore = createStore<Tour>('tours', 'T')
export const useOrderStore = createStore<Order>('orders', 'O')
```

### Decision 005: 升級為五層架構

**日期**: 2025-01-06

**原因**:

- 職責分離：UI、業務邏輯、API、狀態、資料各司其職
- 可擴展性：預留 Service Layer 供未來使用
- 可測試性：每層可獨立測試
- 可維護性：修改某層不影響其他層

**架構定義**:

```
UI Layer      → 純顯示與互動
Hook Layer    → 業務邏輯與驗證
Service Layer → API 抽象（預留擴充）
Store Layer   → 狀態管理與快取
DB Layer      → 資料持久化
```

**資料流**:

- 當前: UI → Hook → Store → DB
- 未來: UI → Hook → Service → API, 同時 Hook → Store (快取)

### Decision 006: 權限系統設計

**日期**: 2025-01-06

**原因**:

- 細粒度控制：每個操作都有對應權限
- 角色導向：5 種角色對應不同權限組合
- 多層防護：UI、Hook、Service 三層檢查
- 可審計：所有權限操作都可追蹤

**權限類型**:

- 資源權限：tour:_, order:_, customer:_, payment:_, quote:\*
- 操作權限：create, read, update, delete, approve, export
- 系統權限：settings, users, backup, audit

**角色定義**:

- admin: 完整權限
- manager: 業務 + 部分財務
- sales: 旅遊 + 訂單 + 客戶
- accountant: 財務專用
- customer_service: 查詢 + 客服

### Decision 007: 錯誤處理標準化

**日期**: 2025-01-06

**原因**:

- 統一錯誤處理：5 種標準錯誤類別
- 分級處理：warning、error、critical
- 使用者友善：不同錯誤不同呈現方式
- 開發友善：完整錯誤追蹤與日誌

**錯誤分類**:

```typescript
ValidationError   → 表單驗證錯誤 → Toast 提示
PermissionError   → 權限不足 → 跳轉登入
BusinessError     → 業務邏輯錯誤 → Dialog 提示
DatabaseError     → 資料庫錯誤 → Toast + 錄日誌
NetworkError      → 網路錯誤 → Toast + 重試
```

**處理流程**:

1. Hook 層拋出特定錯誤
2. ErrorBoundary 捕捉錯誤
3. handleError 分類處理
4. 執行對應 UI 動作
5. 記錄到錯誤追蹤服務

### Decision 008: 領域驅動設計（DDD）

**日期**: 2025-01-06

**原因**:

- 清晰的領域邊界：4 個 Bounded Contexts
- 業務邏輯封裝：Aggregates 保證一致性
- 可擴展性：領域獨立演進
- 團隊協作：明確的模組職責

**Bounded Contexts**:

1. Tour Management - 旅遊團管理
2. Order Processing - 訂單處理
3. Financial - 財務結算
4. Customer Relationship - 客戶關係

**核心概念**:

- Aggregates: 聚合根保證一致性
- Domain Events: 領域事件解耦
- Anti-Corruption Layer: 防腐層隔離

### Decision 009: 事件驅動架構

**日期**: 2025-01-06

**原因**:

- 解耦服務：透過事件通訊
- 可追溯性：Event Sourcing 預留
- 擴展性：新功能只需訂閱事件
- 容錯性：事件重播機制

**核心元件**:

```typescript
Event Bus      → 事件發布/訂閱
Event Store    → 事件持久化
Event Handler  → 事件處理器
Event Sourcing → 狀態重建
```

**使用場景**:

- 訂單建立 → 扣減庫存 + 發送郵件
- 付款完成 → 更新訂單 + 財務記帳
- 旅遊團取消 → 批次退款 + 通知客戶

### Decision 010: 快取策略

**日期**: 2026-01 (更新)

**原因**:

- 效能提升：減少 DB 查詢
- 使用者體驗：快速回應
- 成本控制：減少 API 呼叫

**快取架構**:

```
L1: Memory Cache     → 快速存取，短 TTL
L2: Supabase         → Source of truth
```

> ~~原架構包含 IndexedDB 層 - 已移除~~

**失效策略**:

- Time-based: TTL 過期
- Event-based: 監聽領域事件
- Manual: 手動清除

### Decision 011: 監控與可觀測性

**日期**: 2025-01-06

**原因**:

- 及早發現問題：Sentry 錯誤追蹤
- 效能優化：Web Vitals 監控
- 業務洞察：Business Metrics
- 使用者體驗：效能追蹤

**監控層級**:

1. 錯誤監控 - Sentry
2. 效能監控 - Core Web Vitals
3. 業務指標 - Custom Analytics
4. 稽核日誌 - Audit Logging

### Decision 012: 安全性設計

**日期**: 2025-01-06

**原因**:

- 資料保護：敏感資料加密
- 合規要求：GDPR、個資法
- 風險控制：XSS/CSRF 防護
- 可追蹤性：完整稽核日誌

**安全措施**:

- 資料加密：AES-256
- PII 遮罩：日誌安全
- XSS/CSRF 防護：Input Sanitization
- Rate Limiting：防止濫用
- Audit Logging：操作追蹤

---

## 📈 效能基準

### 目標指標

| 操作     | 目標時間 | 備註     |
| -------- | -------- | -------- |
| 頁面載入 | < 2秒    | 首次載入 |
| 資料查詢 | < 100ms  | 1000筆內 |
| 新增操作 | < 200ms  | 含驗證   |
| 更新操作 | < 200ms  | 含驗證   |
| 刪除操作 | < 100ms  | 軟刪除   |

### 優化策略

1. 虛擬滾動（超過 100 筆）
2. 懶加載（分頁載入）
3. 快取策略（LRU Cache）
4. 批次操作（減少 DB 呼叫）

---

## 🚀 部署計劃

### 開發環境（現在）

```bash
npm run dev
# 純本地，無需設定
```

### 測試環境（2週後）

```bash
npm run build
npm run preview
# 加入 .env.local
```

### 生產環境（1個月後）

```bash
# 需要設定
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
DATABASE_URL=xxx
```

---

## 📦 型別系統實作

### 檔案清單

1. **base.types.ts** (2.6KB)
   - BaseEntity 基礎介面
   - 分頁、篩選、排序型別
   - API 回應與錯誤處理型別

2. **employee.types.ts** (3.0KB)
   - Employee 介面
   - 16 種 Permission 權限
   - 員工 CRUD 資料型別

3. **tour.types.ts** (3.8KB)
   - Tour 介面（統一使用 code）
   - TourStatus、TourCategory 枚舉
   - 旅遊團統計型別

4. **order.types.ts** (6.6KB)
   - Order、Member 介面
   - OrderStatus、PaymentStatus
   - 團員詳細資料型別

5. **customer.types.ts** (4.4KB)
   - Customer 介面
   - VIP 等級、客戶來源
   - 客戶統計型別

6. **finance.types.ts** (8.6KB)
   - Payment、PaymentRequest
   - DisbursementOrder、ReceiptOrder
   - 完整財務流程型別

7. **quote.types.ts** (6.1KB)
   - Quote、QuoteItem 介面
   - 報價版本管理
   - 報價統計型別

8. **common.types.ts** (7.1KB)
   - 地址、聯絡資訊
   - 檔案上傳、金額
   - 搜尋、通知、匯出等通用型別

9. **index.ts** (3.3KB)
   - 統一匯出所有型別
   - 支援 `import { Tour } from '@/types'`

### 設計規範

- **命名統一**：全部使用 snake_case
- **繼承規範**：所有實體繼承 BaseEntity
- **編號統一**：統一使用 `code` 欄位
- **型別安全**：無任何 `any` 型別
- **日期格式**：統一使用 ISO 8601 字串

### 使用範例

```typescript
// 從統一入口匯入
import { Tour, Order, Customer, BaseEntity } from '@/types'

// 型別安全的函數
function createTour(data: CreateTourData): Promise<Tour> {
  // TypeScript 會自動檢查所有必填欄位
}
```

---

## 🏪 Store 系統實作總結

### 檔案清單

1. **create-store.ts** (8.7KB) - Store 工廠函數
   - 自動 CRUD 生成
   - 批次操作支援
   - 查詢功能
   - 自動編號生成
   - 樂觀更新機制
   - 錯誤處理

2. **index.ts** (3.0KB) - Store 統一匯出
   - 11 個主要 Store
   - 一行建立一個 Store
   - 型別安全

### 核心功能

#### 自動 CRUD

- `create(data)` - 建立單筆（自動生成 ID 和編號）
- `fetchById(id)` - 取得單筆
- `update(id, data)` - 更新單筆
- `delete(id)` - 刪除單筆
- `fetchAll()` - 取得所有資料

#### 批次操作

- `createMany(dataArray)` - 批次建立
- `deleteMany(ids)` - 批次刪除

#### 查詢功能

- `findByField(field, value)` - 欄位查詢
- `filter(predicate)` - 自訂過濾
- `count()` - 計數

#### 狀態管理

- `loading` - 載入狀態
- `error` - 錯誤訊息
- `items` - 資料陣列

### 主要 Stores 與編號格式

> **注意**：編號格式詳見本文件「編號規範」章節

| Store                     | 說明   | 編號格式範例     |
| ------------------------- | ------ | ---------------- |
| useTourStore              | 旅遊團 | `CNX250128A`     |
| useOrderStore             | 訂單   | `CNX250128A-O01` |
| useCustomerStore          | 客戶   | `C000001`        |
| useQuoteStore             | 報價單 | `Q000001`        |
| usePaymentRequestStore    | 請款單 | `CNX250128A-I01` |
| useReceiptOrderStore      | 收款單 | `CNX250128A-R01` |
| useDisbursementOrderStore | 出納單 | `P250128A`       |
| useMemberStore            | 團員   | 無獨立編號       |
| useEmployeeStore          | 員工   | `E001`           |

### 設計特點

✅ **工廠模式**：一個函數建立所有 Store
✅ **自動編號**：依據編號規範自動生成
✅ **型別安全**：完整 TypeScript 支援
✅ **Supabase 整合**：直接與雲端同步
✅ **樂觀更新**：即時更新 UI
✅ **統一介面**：所有 Store 操作一致

### 使用範例

```typescript
import { useTourStore } from '@/stores';

function TourList() {
  const { items, loading, error, fetchAll, create, delete } = useTourStore();

  // 載入資料
  useEffect(() => {
    fetchAll();
  }, []);

  // 建立旅遊團（自動生成 ID 和編號）
  const handleCreate = async () => {
    await create({
      name: '日本櫻花之旅',
      destination: '日本',
      startDate: '2024-04-01',
      endDate: '2024-04-07',
      days: 7,
      nights: 6,
      status: 'draft',
      isActive: true,
    });
  };

  // 刪除旅遊團
  const handleDelete = async (id: string) => {
    await delete(id);
  };

  return (
    <div>
      {loading && <p>載入中...</p>}
      {error && <p>錯誤：{error}</p>}
      {items.map(tour => (
        <div key={tour.id}>
          {tour.code} - {tour.name}
          <button onClick={() => handleDelete(tour.id)}>刪除</button>
        </div>
      ))}
      <button onClick={handleCreate}>新增</button>
    </div>
  );
}
```

### 架構優勢

**對比傳統方式**：

- ❌ 傳統：每個實體寫一個 Store 檔案（10+ 個檔案）
- ✅ 新架構：只要 2 個檔案（create-store.ts + index.ts）

**維護成本**：

- ❌ 傳統：修改邏輯需要改 10+ 個檔案
- ✅ 新架構：只需修改 create-store.ts

**新增實體**：

- ❌ 傳統：複製貼上整個檔案，容易出錯
- ✅ 新架構：加一行 `export const useXxxStore = createStore(...)`

---

## 🎣 Hook 層實作總結

### 檔案清單

1. **useTours.ts** (10KB) - 旅遊團業務邏輯
   - 完整日期驗證（開始/結束日期、天數計算）
   - 權限檢查（create, edit, delete, view）
   - 業務規則（canEditTour, canCancelTour）
   - 複雜查詢（getActiveTours, getUpcomingTours）
   - 統計功能（calculateOccupancyRate）

2. **useOrders.ts** (5.1KB) - 訂單業務邏輯
   - 付款狀態自動更新
   - 餘額計算與追蹤
   - 團員管理集成
   - 訂單查詢與篩選

3. **useCustomers.ts** (1.8KB) - 客戶業務邏輯
   - 客戶資料驗證（電話、Email）
   - VIP 折扣計算
   - 客戶搜尋功能
   - VIP 客戶篩選

4. **usePayments.ts** (1.6KB) - 付款業務邏輯
   - 付款金額驗證
   - 付款方式標籤轉換
   - 訂單付款追蹤
   - 待處理付款查詢

5. **useQuotes.ts** (1.9KB) - 報價單業務邏輯
   - 報價編輯權限控制
   - 轉團檢查邏輯
   - 有效期限檢查
   - 報價項目總額計算

6. **index.ts** (568B) - 統一匯出
   - 所有 Hook 統一匯出
   - 支援 `import { useTours } from '@/hooks'`

### 核心設計模式

#### 1. 業務邏輯分離

```typescript
// ✅ 正確：業務邏輯集中在 Hook
export function useTours() {
  const validateTourDates = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)

    if (isNaN(startDate.getTime())) {
      throw new TourDateValidationError('開始日期格式錯誤')
    }
    if (endDate <= startDate) {
      throw new TourDateValidationError('結束日期必須晚於開始日期')
    }
  }

  const canEditTour = (tour: Tour): boolean => {
    return tour.status === 'draft' || tour.status === 'active'
  }
}
```

#### 2. 權限控制

```typescript
// 每個 Hook 包含權限檢查
const createTour = async (data: CreateTourData) => {
  if (!hasPermission('tour:create')) {
    throw new TourPermissionError('沒有建立旅遊團的權限')
  }
  // ... 業務邏輯
}
```

#### 3. 資料驗證

```typescript
// 統一驗證模式
const validateCustomerData = (data: Partial<Customer>) => {
  if (data.phone && !/^[0-9-+()]{8,15}$/.test(data.phone)) {
    throw new Error('電話格式錯誤')
  }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    throw new Error('Email 格式錯誤')
  }
}
```

#### 4. 自訂錯誤處理

```typescript
// 專門的錯誤類別
export class TourDateValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TourDateValidationError'
  }
}

export class TourPermissionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TourPermissionError'
  }
}
```

### 業務功能完整度

#### useTours - 旅遊團管理

- ✅ 日期驗證與計算
- ✅ 狀態管理（draft → active → completed → cancelled）
- ✅ 權限控制（建立、編輯、刪除、查看）
- ✅ 進階查詢（活躍團、即將出發、已完成）
- ✅ 統計功能（入住率、收入總額）

#### useOrders - 訂單管理

- ✅ 付款追蹤與計算
- ✅ 自動狀態更新
- ✅ 團員資料整合
- ✅ 訂單查詢與篩選

#### useCustomers - 客戶管理

- ✅ 資料格式驗證
- ✅ VIP 等級折扣
- ✅ 智能搜尋（姓名、電話、Email）
- ✅ VIP 客戶專屬查詢

#### usePayments - 付款管理

- ✅ 金額驗證
- ✅ 付款方式管理
- ✅ 訂單付款關聯
- ✅ 待處理付款追蹤

#### useQuotes - 報價管理

- ✅ 編輯權限控制
- ✅ 轉團資格檢查
- ✅ 有效期限管理
- ✅ 金額計算

### 使用範例

```typescript
import { useTours, useOrders, useCustomers } from '@/hooks';

function TourManagement() {
  const {
    tours,
    loading,
    createTour,
    updateTour,
    canEditTour,
    getActiveTours,
  } = useTours();

  const handleCreate = async () => {
    try {
      await createTour({
        name: '日本櫻花之旅',
        destination: '日本',
        startDate: '2024-04-01',
        endDate: '2024-04-07',
        days: 7,
        nights: 6,
        status: 'draft',
        // ... 其他欄位
      });
      toast.success('建立成功');
    } catch (error) {
      if (error instanceof TourPermissionError) {
        toast.error('權限不足');
      } else if (error instanceof TourDateValidationError) {
        toast.error(error.message);
      }
    }
  };

  return (
    <div>
      {loading && <Spinner />}
      {tours.map(tour => (
        <TourCard
          key={tour.id}
          tour={tour}
          canEdit={canEditTour(tour)}
        />
      ))}
    </div>
  );
}
```

### 設計優勢

**對比直接使用 Store**：

- ❌ 舊方式：業務邏輯散落在各個 Component
- ✅ 新方式：業務邏輯統一在 Hook 層

**維護性提升**：

- 統一的驗證邏輯
- 統一的錯誤處理
- 統一的權限控制
- 可重用的業務規則

**測試友善**：

```typescript
// 可以獨立測試業務邏輯
describe('useTours', () => {
  it('should validate tour dates correctly', () => {
    const { validateTourDates } = useTours()
    expect(() => {
      validateTourDates('2024-01-10', '2024-01-01')
    }).toThrow(TourDateValidationError)
  })
})
```

### 下一步行動

- ✅ Hook 層完成
- ⏭️ 進入 Day 8: UI 整合測試
- 📝 建立錯誤處理標準
- 🔒 完善權限系統

---

## 🧪 測試策略

### 測試金字塔

```
        /\
       /E2E\       10% - 端對端測試
      /------\
     /整合測試 \     30% - 整合測試
    /----------\
   /  單元測試   \   60% - 單元測試
  /--------------\
```

### 單元測試規範

#### 1. Type System 測試

```typescript
// types/__tests__/tour.types.test.ts
describe('Tour Types', () => {
  it('should enforce required fields', () => {
    const tour: Tour = {
      id: 'test-id',
      code: 'T20240001',
      name: '測試團',
      // TypeScript 會在編譯時檢查必填欄位
    }
  })
})
```

#### 2. DB Layer 測試

```typescript
// lib/db/__tests__/local-database.test.ts
describe('LocalDatabase', () => {
  beforeEach(async () => {
    await localDB.init()
    await localDB.clearAll()
  })

  it('should create and retrieve data', async () => {
    const tour = await localDB.create('tours', mockTour)
    const retrieved = await localDB.read('tours', tour.id)
    expect(retrieved).toEqual(tour)
  })

  it('should handle errors gracefully', async () => {
    await expect(localDB.read('tours', 'non-existent-id')).rejects.toThrow()
  })
})
```

#### 3. Store Layer 測試

```typescript
// stores/__tests__/tour-store.test.ts
import { renderHook, act } from '@testing-library/react'

describe('useTourStore', () => {
  it('should create tour with auto-generated code', async () => {
    const { result } = renderHook(() => useTourStore())

    await act(async () => {
      await result.current.create({
        name: '測試團',
        // ... 其他欄位
      })
    })

    expect(result.current.items[0].code).toMatch(/^T\d{8}$/)
  })
})
```

#### 4. Hook Layer 測試

```typescript
// hooks/__tests__/useTours.test.ts
describe('useTours', () => {
  it('should validate tour dates', () => {
    const { result } = renderHook(() => useTours())

    expect(() => {
      result.current.validateTourDates('2024-01-10', '2024-01-01')
    }).toThrow(TourDateValidationError)
  })

  it('should check edit permission correctly', () => {
    const { result } = renderHook(() => useTours())

    const draftTour = { ...mockTour, status: 'draft' }
    expect(result.current.canEditTour(draftTour)).toBe(true)

    const completedTour = { ...mockTour, status: 'completed' }
    expect(result.current.canEditTour(completedTour)).toBe(false)
  })
})
```

### 整合測試規範

```typescript
// __tests__/integration/tour-workflow.test.ts
describe('Tour Workflow Integration', () => {
  it('should complete full tour lifecycle', async () => {
    // 1. 建立旅遊團
    const tour = await createTour(mockTourData)
    expect(tour.status).toBe('draft')

    // 2. 新增訂單
    const order = await createOrder({
      tourId: tour.id,
      customerId: mockCustomer.id,
    })

    // 3. 更新狀態
    const updatedTour = await updateTourStatus(tour.id, 'active')
    expect(updatedTour.status).toBe('active')

    // 4. 完成旅遊
    const completedTour = await completeTour(tour.id)
    expect(completedTour.status).toBe('completed')
  })
})
```

### E2E 測試規範

```typescript
// e2e/tour-management.spec.ts
import { test, expect } from '@playwright/test'

test('should create and manage tour', async ({ page }) => {
  await page.goto('http://localhost:3000')

  // 登入
  await page.fill('[data-testid="username"]', 'admin')
  await page.fill('[data-testid="password"]', 'password')
  await page.click('[data-testid="login-btn"]')

  // 建立旅遊團
  await page.click('[data-testid="create-tour-btn"]')
  await page.fill('[data-testid="tour-name"]', '測試團')
  await page.click('[data-testid="submit-btn"]')

  // 驗證建立成功
  await expect(page.locator('.toast-success')).toBeVisible()
  await expect(page.locator('[data-tour-name="測試團"]')).toBeVisible()
})
```

### 測試覆蓋率目標

| 層級        | 目標覆蓋率 | 重點項目         |
| ----------- | ---------- | ---------------- |
| Type System | 100%       | 型別定義完整性   |
| DB Layer    | 90%        | CRUD、錯誤處理   |
| Store Layer | 85%        | 狀態管理、持久化 |
| Hook Layer  | 80%        | 業務邏輯、驗證   |
| UI Layer    | 70%        | 關鍵使用者流程   |

### 測試工具配置

```json
// package.json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test"
  },
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.0.0",
    "@vitest/ui": "^1.0.0",
    "vitest": "^1.0.0",
    "@playwright/test": "^1.40.0"
  }
}
```

---

## 🔒 權限系統設計

> **設計原則**：
>
> - **系統主管**：自動擁有全部權限（勾選時自動全選）
> - **其他角色**：可自訂權限組合（保留彈性）
> - **角色可擴充**：未來可新增自訂角色

### 權限矩陣

| 角色       | 旅遊團  | 訂單    | 客戶    | 財務    | 報價    | 系統設定 | 說明     |
| ---------- | ------- | ------- | ------- | ------- | ------- | -------- | -------- |
| **系統主管** | ✅ 全部 | ✅ 全部 | ✅ 全部 | ✅ 全部 | ✅ 全部 | ✅ 全部  | 自動全選 |
| **經理**   | CRUD    | CRUD    | CRUD    | RU      | CRUD    | R        | 可自訂   |
| **業務**   | RU      | CRUD    | CRUD    | R       | CRUD    | -        | 可自訂   |
| **會計**   | R       | R       | R       | CRUD    | R       | -        | 可自訂   |
| **客服**   | R       | RU      | RU      | -       | R       | -        | 可自訂   |

> C=Create, R=Read, U=Update, D=Delete

### 權限定義

**目前實作**（參考 `src/types/employee.types.ts`）：

```typescript
export type Permission =
  // 系統權限
  | 'admin' // 系統主管（自動擁有全部權限）

  // 功能模組權限（可自由組合）
  | 'quotes' // 報價單
  | 'tours' // 旅遊團
  | 'orders' // 訂單
  | 'payments' // 收款
  | 'disbursement' // 出納
  | 'todos' // 待辦事項
  | 'hr' // 人資管理
  | 'reports' // 報表
  | 'settings' // 設定
  | 'customers' // 客戶管理
  | 'suppliers' // 供應商管理
  | 'visas' // 簽證管理
  | 'accounting' // 會計
  | 'templates' // 模板管理
```

**未來擴充版本**：

```typescript
// 細粒度權限（CRUD 分離）
export type Permission =
  // 旅遊團權限
  'tour:create' | 'tour:read' | 'tour:update' | 'tour:delete' | 'tour:publish' | 'tour:cancel'
// ... 其他資源權限
```

### 權限檢查實作

**目前實作**（參考 `src/lib/permissions.ts`）：

```typescript
// 系統主管檢查
export function hasPermissionForRoute(userPermissions: string[], pathname: string): boolean {
  // 系統主管有所有權限
  if (userPermissions.includes('admin')) {
    return true
  }

  // 獲取所需權限
  const requiredPermissions = getRequiredPermissions(pathname)

  // 檢查用戶是否有任一所需權限
  return (
    requiredPermissions.length === 0 ||
    requiredPermissions.some(permission => userPermissions.includes(permission))
  )
}

// lib/auth.ts
export function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
  return userPermissions.includes('admin') || userPermissions.includes(requiredPermission)
}
```

**未來擴充版本**：

```typescript
// 角色基礎權限配置
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: ['*'], // 所有權限

  manager: [
    'tour:create',
    'tour:read',
    'tour:update',
    'tour:delete',
    'order:create',
    'order:read',
    'order:update',
    'order:delete',
    // ...
  ],
  // ...
}
```

### UI 權限控制實作

**當前實作**（參考 `src/components/hr/tabs/permissions-tab.tsx`）：

```typescript
// 系統主管自動全選權限
const handlePermissionToggle = (permissionId: string) => {
  if (!isEditing) return

  // 如果勾選系統主管，自動全選所有權限
  if (permissionId === 'admin') {
    const isAdminSelected = selectedPermissions.includes('admin')
    if (!isAdminSelected) {
      setSelectedPermissions(SYSTEM_PERMISSIONS.map(p => p.id))
    } else {
      setSelectedPermissions([])
    }
    return
  }

  // 如果取消勾選任何權限，自動取消系統主管
  setSelectedPermissions(prev => {
    const newPermissions = prev.includes(permissionId)
      ? prev.filter(id => id !== permissionId)
      : [...prev, permissionId]

    if (prev.includes('admin') && !newPermissions.includes(permissionId)) {
      return newPermissions.filter(id => id !== 'admin')
    }

    return newPermissions
  })
}
```

### 權限檢查使用範例

**未來擴充版本**：

```typescript
// components/TourActions.tsx
function TourActions({ tour }: { tour: Tour }) {
  const { canEditTour, canDeleteTour } = useTours();
  const { hasPermission } = useAuth();

  return (
    <div>
      {hasPermission('tours') && canEditTour(tour) && (
        <Button onClick={() => handleEdit(tour)}>編輯</Button>
      )}

      {hasPermission('tours') && canDeleteTour(tour) && (
        <Button variant="destructive" onClick={() => handleDelete(tour)}>
          刪除
        </Button>
      )}
    </div>
  );
}
```

---

### 角色權限系統總結

**當前實作**：

- ✅ 系統主管自動全權限
- ✅ 功能模組級權限（14種）
- ✅ UI 自動全選/取消邏輯
- ✅ 路由權限檢查

**規劃中**：

- ⏭️ 角色預設權限模板
- ⏭️ 權限審計日誌

**未來擴充**：

- ⏭️ 細粒度 CRUD 權限
- ⏭️ 資源級權限控制
- ⏭️ 動態角色管理

---

## 🚨 錯誤處理標準

### 錯誤分類

```typescript
// lib/errors/index.ts

// 1. 驗證錯誤
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

// 2. 權限錯誤
export class PermissionError extends Error {
  constructor(
    message: string,
    public requiredPermission?: string
  ) {
    super(message)
    this.name = 'PermissionError'
  }
}

// 3. 業務邏輯錯誤
export class BusinessError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message)
    this.name = 'BusinessError'
  }
}

// 4. 資料庫錯誤
export class DatabaseError extends Error {
  constructor(
    message: string,
    public operation?: string
  ) {
    super(message)
    this.name = 'DatabaseError'
  }
}

// 5. 網路錯誤
export class NetworkError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'NetworkError'
  }
}
```

### 錯誤處理流程

```typescript
// lib/errors/handler.ts
export function handleError(error: Error): ErrorResponse {
  // 1. 驗證錯誤
  if (error instanceof ValidationError) {
    return {
      type: 'validation',
      message: error.message,
      field: error.field,
      severity: 'warning',
      action: 'show_toast',
    }
  }

  // 2. 權限錯誤
  if (error instanceof PermissionError) {
    return {
      type: 'permission',
      message: error.message,
      severity: 'error',
      action: 'redirect_login',
    }
  }

  // 3. 業務錯誤
  if (error instanceof BusinessError) {
    return {
      type: 'business',
      message: error.message,
      code: error.code,
      severity: 'error',
      action: 'show_dialog',
    }
  }

  // 4. 資料庫錯誤
  if (error instanceof DatabaseError) {
    console.error('[DB Error]', error)
    return {
      type: 'database',
      message: '資料操作失敗，請稍後再試',
      severity: 'error',
      action: 'show_toast',
    }
  }

  // 5. 未知錯誤
  console.error('[Unknown Error]', error)
  return {
    type: 'unknown',
    message: '系統發生錯誤，請聯絡技術支援',
    severity: 'critical',
    action: 'show_error_page',
  }
}
```

### 全域錯誤邊界

```typescript
// components/ErrorBoundary.tsx
export class ErrorBoundary extends React.Component<Props, State> {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorResponse = handleError(error);

    // 記錄到錯誤追蹤服務
    logErrorToService({
      error,
      errorInfo,
      user: getCurrentUser(),
      timestamp: new Date().toISOString(),
    });

    // 根據錯誤類型執行對應動作
    switch (errorResponse.action) {
      case 'show_toast':
        toast.error(errorResponse.message);
        break;
      case 'show_dialog':
        showErrorDialog(errorResponse.message);
        break;
      case 'redirect_login':
        router.push('/login');
        break;
      case 'show_error_page':
        this.setState({ showErrorPage: true });
        break;
    }
  }

  render() {
    if (this.state.showErrorPage) {
      return <ErrorPage error={this.state.error} />;
    }

    return this.props.children;
  }
}
```

### Hook 層錯誤處理

```typescript
// hooks/useTours.ts
export function useTours() {
  const createTour = async (data: CreateTourData) => {
    try {
      // 1. 驗證資料
      validateTourDates(data.startDate, data.endDate)

      // 2. 檢查權限
      if (!hasPermission('tour:create')) {
        throw new PermissionError('沒有建立旅遊團的權限', 'tour:create')
      }

      // 3. 業務邏輯
      const tour = await store.create(data)
      return tour
    } catch (error) {
      // 4. 錯誤轉換
      if (error instanceof TourDateValidationError) {
        throw new ValidationError(error.message, 'startDate')
      }

      throw error // 其他錯誤向上傳遞
    }
  }

  return { createTour }
}
```

---

## 📊 API 設計規範（未來擴充）

### RESTful API 設計

```typescript
// API 路由設計
GET    /api/tours              # 取得所有旅遊團
GET    /api/tours/:id          # 取得單一旅遊團
POST   /api/tours              # 建立旅遊團
PUT    /api/tours/:id          # 更新旅遊團
DELETE /api/tours/:id          # 刪除旅遊團

GET    /api/tours/:id/orders   # 取得旅遊團的訂單
GET    /api/tours/:id/members  # 取得旅遊團的團員

# 查詢參數
GET /api/tours?status=active&page=1&limit=20&sort=-startDate
```

### API 回應格式

```typescript
// 成功回應
{
  "success": true,
  "data": {
    "id": "tour-001",
    "code": "T20240001",
    "name": "日本櫻花之旅"
  },
  "meta": {
    "timestamp": "2024-01-06T12:00:00Z",
    "requestId": "req-123"
  }
}

// 錯誤回應
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "開始日期不可晚於結束日期",
    "details": {
      "field": "startDate",
      "value": "2024-01-10"
    }
  },
  "meta": {
    "timestamp": "2024-01-06T12:00:00Z",
    "requestId": "req-123"
  }
}

// 分頁回應
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

### Service Layer 實作

```typescript
// services/tour.service.ts
export class TourService {
  private apiClient: APIClient

  async getAll(params?: QueryParams): Promise<PaginatedResponse<Tour>> {
    const response = await this.apiClient.get('/tours', { params })
    return response.data
  }

  async getById(id: string): Promise<Tour> {
    const response = await this.apiClient.get(`/tours/${id}`)
    return response.data
  }

  async create(data: CreateTourData): Promise<Tour> {
    const response = await this.apiClient.post('/tours', data)
    return response.data
  }

  async update(id: string, data: UpdateTourData): Promise<Tour> {
    const response = await this.apiClient.put(`/tours/${id}`, data)
    return response.data
  }

  async delete(id: string): Promise<void> {
    await this.apiClient.delete(`/tours/${id}`)
  }
}

// Hook 整合 Service
export function useTours() {
  const service = new TourService()

  const createTour = async (data: CreateTourData) => {
    validateTourDates(data.startDate, data.endDate)

    if (!hasPermission('tour:create')) {
      throw new PermissionError('沒有建立權限')
    }

    // 呼叫 Service 而非直接操作 Store
    const tour = await service.create(data)

    // 更新本地快取
    store.addItem(tour)

    return tour
  }

  return { createTour }
}
```

---

## 💾 ~~資料遷移策略~~ (已完成 2026-01)

> ⚠️ **歷史參考**：IndexedDB → Supabase 遷移已於 2026-01 完成。
>
> 以下內容僅為遷移歷史紀錄，現行系統直接使用 Supabase，無需遷移。

### ~~Schema 升級遷移~~ (歷史參考)

```typescript
// lib/migration/schema-migration.ts
export async function migrateSchema() {
  console.log('開始 Schema 資料遷移...')

  // 1. 備份資料
  const backup = await localDB.export()
  await saveBackupToFile(backup, 'schema-backup.json')

  // 2. 加入新欄位
  const tours = await localDB.getAll<Tour>('tours')
  for (const tour of tours) {
    await localDB.update('tours', tour.id, {
      ...tour,
      createdBy: 'system', // 新增欄位
      metadata: {}, // 新增欄位
    })
  }

  // 3. 驗證遷移
  const migratedTours = await localDB.getAll<Tour>('tours')
  const hasAllFields = migratedTours.every(
    t => t.createdBy !== undefined && t.metadata !== undefined
  )

  if (!hasAllFields) {
    throw new Error('資料遷移失敗')
  }

  console.log('Schema 遷移完成')
}
```

### Supabase 雲端同步遷移

```typescript
// lib/migration/supabase-migration.ts
export async function migrateToSupabase() {
  console.log('開始 IndexedDB → Supabase 遷移...')

  // 1. 備份 IndexedDB 資料
  const localData = await localDB.export()
  await uploadBackupToS3(localData)

  // 2. 批次上傳到 Supabase
  const tables = ['tours', 'orders', 'customers', 'payments', 'quotes', 'members', 'employees']

  for (const table of tables) {
    const data = await localDB.getAll(table)

    // 分批上傳（每次 100 筆）
    for (let i = 0; i < data.length; i += 100) {
      const batch = data.slice(i, i + 100)
      await supabase.from(table).insert(batch)
    }

    console.log(`✅ ${table}: ${data.length} 筆資料已遷移`)
  }

  // 3. 驗證資料一致性
  for (const table of tables) {
    const localCount = await localDB.count(table)
    const { count: remoteCount } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })

    if (localCount !== remoteCount) {
      throw new Error(`${table} 資料數量不一致`)
    }
  }

  console.log('✅ Supabase 遷移完成')

  // 4. 更新資料來源
  await updateDataSource('supabase')

  // 5. 清理 IndexedDB（可選）
  // await localDB.clearAll();
}
```

### 遷移檢查清單

```typescript
// lib/migration/checklist.ts
export const MIGRATION_CHECKLIST = {
  'schema-upgrade': [
    '✅ 備份 IndexedDB 資料',
    '✅ 加入 createdBy, updatedBy 欄位',
    '✅ 加入 metadata 欄位',
    '✅ 更新 schema 版本',
    '✅ 驗證資料完整性',
  ],

  'supabase-migration': [
    '✅ 匯出 IndexedDB 完整備份',
    '✅ 上傳備份到 S3',
    '✅ 建立 Supabase Tables',
    '✅ 批次遷移資料',
    '✅ 驗證資料一致性',
    '✅ 更新資料來源設定',
    '✅ 測試 CRUD 操作',
    '✅ 清理舊資料（可選）',
  ],
}
```

---

## 🏗️ 領域驅動設計（DDD）

### Bounded Contexts 定義

VENTURO 系統劃分為 4 個核心領域邊界：

```
┌─────────────────┐  ┌─────────────────┐
│ Tour Management │  │Order Processing │
│  旅遊團管理      │  │   訂單處理      │
└─────────────────┘  └─────────────────┘
        │                      │
        └──────────┬───────────┘
                   │
        ┌──────────▼──────────┐
        │    Shared Kernel    │
        │  (Customer, User)   │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐  ┌─────────────────┐
        │     Financial       │  │Customer Relation│
        │     財務結算        │  │   客戶關係      │
        └─────────────────────┘  └─────────────────┘
```

#### 1. Tour Management Context（旅遊團管理域）

**職責**：

- 旅遊團生命週期管理
- 行程規劃與排程
- 團員資訊管理
- 旅遊資源調配

**核心實體**：

- Tour（聚合根）
- Itinerary（行程）
- TourMember（團員）
- Destination（目的地）

**對外介面**：

```typescript
interface ITourManagement {
  createTour(data: CreateTourData): Promise<Tour>
  publishTour(tourId: string): Promise<void>
  cancelTour(tourId: string, reason: string): Promise<void>
  getTourAvailability(tourId: string): Promise<Availability>
}
```

#### 2. Order Processing Context（訂單處理域）

**職責**：

- 訂單建立與確認
- 付款追蹤
- 訂單狀態管理
- 退款處理

**核心實體**：

- Order（聚合根）
- OrderItem（訂單項目）
- Payment（付款）
- Refund（退款）

**對外介面**：

```typescript
interface IOrderProcessing {
  placeOrder(data: CreateOrderData): Promise<Order>
  confirmOrder(orderId: string): Promise<void>
  cancelOrder(orderId: string): Promise<Refund>
  processPayment(orderId: string, payment: PaymentData): Promise<Payment>
}
```

#### 3. Financial Context（財務結算域）

**職責**：

- 財務報表生成
- 應收應付管理
- 成本核算
- 帳務對帳

**核心實體**：

- Invoice（發票）
- FinancialReport（財務報表）
- CostItem（成本項目）
- Settlement（結算單）

#### 4. Customer Relationship Context（客戶關係域）

**職責**：

- 客戶資料管理
- VIP 等級管理
- 客戶歷史追蹤
- 行銷活動管理

**核心實體**：

- Customer（聚合根）
- CustomerHistory（客戶歷史）
- VipLevel（VIP等級）
- MarketingCampaign（行銷活動）

### Aggregates 設計

#### Tour Aggregate

```typescript
class TourAggregate {
  private tour: Tour
  private members: TourMember[]
  private itinerary: Itinerary

  // 聚合根保證一致性
  addMember(member: TourMember): void {
    if (this.members.length >= this.tour.maxCapacity) {
      throw new BusinessError('旅遊團已滿')
    }
    if (this.tour.status !== 'active') {
      throw new BusinessError('旅遊團未開放報名')
    }
    this.members.push(member)
  }

  publish(): void {
    if (!this.itinerary.isComplete()) {
      throw new BusinessError('行程未完整')
    }
    if (this.members.length < this.tour.minCapacity) {
      throw new BusinessError('報名人數未達最低標準')
    }
    this.tour.status = 'published'
  }
}
```

#### Order Aggregate

```typescript
class OrderAggregate {
  private order: Order
  private payments: Payment[]
  private refunds: Refund[]

  calculateRemainingAmount(): number {
    const totalPaid = this.payments.reduce((sum, p) => sum + p.amount, 0)
    const totalRefund = this.refunds.reduce((sum, r) => sum + r.amount, 0)
    return this.order.totalAmount - totalPaid + totalRefund
  }

  processPayment(payment: Payment): void {
    this.payments.push(payment)
    this.updatePaymentStatus()
  }

  private updatePaymentStatus(): void {
    const remaining = this.calculateRemainingAmount()
    if (remaining === 0) {
      this.order.paymentStatus = 'paid'
    } else if (remaining < this.order.totalAmount) {
      this.order.paymentStatus = 'partial'
    }
  }
}
```

### Domain Events

```typescript
// 領域事件基礎介面
interface DomainEvent {
  eventId: string
  aggregateId: string
  eventType: string
  occurredAt: string
  userId: string
  payload: unknown
}

// 旅遊團領域事件
class TourCreatedEvent implements DomainEvent {
  eventType = 'TourCreated'
  constructor(
    public eventId: string,
    public aggregateId: string,
    public occurredAt: string,
    public userId: string,
    public payload: { tour: Tour }
  ) {}
}

class TourPublishedEvent implements DomainEvent {
  eventType = 'TourPublished'
  // 觸發：通知客戶、更新庫存、發送郵件
}

class TourCancelledEvent implements DomainEvent {
  eventType = 'TourCancelled'
  // 觸發：退款流程、通知客戶、釋放資源
}

// 訂單領域事件
class OrderPlacedEvent implements DomainEvent {
  eventType = 'OrderPlaced'
  // 觸發：扣減庫存、發送確認信、建立待付款紀錄
}

class PaymentReceivedEvent implements DomainEvent {
  eventType = 'PaymentReceived'
  // 觸發：更新訂單狀態、發送收據、觸發財務記帳
}
```

### 領域邊界通訊

**Anti-Corruption Layer（防腐層）**:

```typescript
// Tour Context 呼叫 Order Context 需要透過防腐層
class TourToOrderAdapter {
  async createOrderFromTour(tour: Tour, customer: Customer): Promise<Order> {
    // 轉換 Tour 領域模型為 Order 所需格式
    const orderData: CreateOrderData = {
      tourId: tour.id,
      customerId: customer.id,
      totalAmount: tour.price,
      items: [
        {
          name: tour.name,
          quantity: 1,
          unitPrice: tour.price,
        },
      ],
    }

    return await orderService.placeOrder(orderData)
  }
}
```

---

## 📡 事件驅動架構

### Event Bus 設計

```typescript
// 事件總線核心
class EventBus {
  private subscribers: Map<string, EventHandler[]> = new Map()
  private eventStore: DomainEvent[] = []

  // 訂閱事件
  subscribe(eventType: string, handler: EventHandler): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, [])
    }
    this.subscribers.get(eventType)!.push(handler)
  }

  // 發布事件
  async publish(event: DomainEvent): Promise<void> {
    // 1. 儲存事件（Event Sourcing）
    this.eventStore.push(event)
    await this.persistEvent(event)

    // 2. 通知所有訂閱者
    const handlers = this.subscribers.get(event.eventType) || []
    await Promise.all(handlers.map(handler => handler(event)))

    // 3. 記錄日誌
    console.log(`[EventBus] Published: ${event.eventType}`, event)
  }

  // 事件重播（用於恢復狀態）
  async replay(from: Date, to: Date): Promise<void> {
    const events = this.eventStore.filter(e => {
      const occurredAt = new Date(e.occurredAt)
      return occurredAt >= from && occurredAt <= to
    })

    for (const event of events) {
      await this.publish(event)
    }
  }

  // 持久化事件
  private async persistEvent(event: DomainEvent): Promise<void> {
    await localDB.create('events', event)
  }
}

// 全域事件總線實例
export const eventBus = new EventBus()
```

### 事件處理器範例

```typescript
// 訂單建立事件處理器
eventBus.subscribe('OrderPlaced', async (event: OrderPlacedEvent) => {
  const { order } = event.payload

  // 1. 扣減旅遊團庫存
  await tourService.decreaseAvailability(order.tourId, order.quantity)

  // 2. 發送確認郵件
  await emailService.sendOrderConfirmation(order)

  // 3. 建立待付款記錄
  await paymentService.createPendingPayment(order.id, order.totalAmount)
})

// 付款完成事件處理器
eventBus.subscribe('PaymentReceived', async (event: PaymentReceivedEvent) => {
  const { payment } = event.payload

  // 1. 更新訂單狀態
  await orderService.updatePaymentStatus(payment.orderId)

  // 2. 發送收據
  await emailService.sendReceipt(payment)

  // 3. 觸發財務記帳
  await financialService.recordRevenue(payment)
})

// 旅遊團取消事件處理器
eventBus.subscribe('TourCancelled', async (event: TourCancelledEvent) => {
  const { tour, reason } = event.payload

  // 1. 查詢所有相關訂單
  const orders = await orderService.getOrdersByTour(tour.id)

  // 2. 批次退款
  for (const order of orders) {
    await refundService.processRefund(order.id, reason)
  }

  // 3. 通知所有客戶
  await notificationService.notifyTourCancellation(tour.id, reason)
})
```

### Event Sourcing 預留設計

```typescript
// 事件溯源：從事件重建聚合狀態
class TourEventSourcing {
  async rebuildTourFromEvents(tourId: string): Promise<Tour> {
    // 1. 取得所有相關事件
    const events = await localDB.filter<DomainEvent>('events', [
      { field: 'aggregateId', operator: 'eq', value: tourId },
    ])

    // 2. 按時間排序
    events.sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime())

    // 3. 重播事件重建狀態
    let tour: Tour = {} as Tour

    for (const event of events) {
      tour = this.applyEvent(tour, event)
    }

    return tour
  }

  private applyEvent(tour: Tour, event: DomainEvent): Tour {
    switch (event.eventType) {
      case 'TourCreated':
        return { ...(event.payload as any).tour }

      case 'TourUpdated':
        return { ...tour, ...(event.payload as any).updates }

      case 'TourPublished':
        return { ...tour, status: 'published' }

      case 'TourCancelled':
        return { ...tour, status: 'cancelled' }

      default:
        return tour
    }
  }
}
```

---

## 🚀 快取策略

> ⚠️ **架構更新 (2026-01)**：系統已升級為純雲端架構，以下「三層快取」中的 L2 (IndexedDB) 已棄用。
>
> **現行架構**：
>
> - SWR 快取（React Query 層級快取）
> - Supabase 即時查詢（唯一資料來源）

### ~~三層快取架構~~ (歷史參考)

```
┌─────────────────────────────────┐
│  L1: Memory Cache (SWR)        │ ← React Query 層級快取
│  - 自動 revalidation            │
│  - stale-while-revalidate      │
└─────────────────────────────────┘
              ↓ miss
┌─────────────────────────────────┐
│  ~~L2: IndexedDB Cache~~ 已棄用 │
└─────────────────────────────────┘
              ↓
┌─────────────────────────────────┐
│  L3: Supabase Database          │ ← 唯一資料來源
│  - RLS 資料隔離                  │
│  - Realtime 支援                 │
└─────────────────────────────────┘
```

### L1: Memory Cache 實作

```typescript
// LRU Cache 實作
class LRUCache<T> {
  private cache: Map<string, { value: T; timestamp: number }> = new Map()
  private maxSize: number = 100
  private ttl: number = 10000 // 10 秒

  get(key: string): T | null {
    const item = this.cache.get(key)

    if (!item) return null

    // 檢查是否過期
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }

    // LRU: 移到最後（最近使用）
    this.cache.delete(key)
    this.cache.set(key, item)

    return item.value
  }

  set(key: string, value: T): void {
    // 達到上限，刪除最久未使用
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    })
  }

  clear(): void {
    this.cache.clear()
  }
}

// 全域 Memory Cache
export const memoryCache = new LRUCache()
```

### ~~L2: IndexedDB Cache 實作~~ (已棄用)

> ⚠️ **已棄用**：以下代碼僅為歷史參考，現行架構不使用 IndexedDB。
>
> 取而代之，請使用 SWR 的 `mutate` 進行快取管理：
>
> ```typescript
> import useSWR from 'swr'
>
> // 使用 SWR 快取
> const { data, mutate } = useSWR('tours', fetcher)
>
> // 樂觀更新
> await mutate(async (current) => {
>   const updated = await api.updateTour(id, data)
>   return current.map(t => t.id === id ? updated : t)
> }, { optimisticData: ... })
> ```

### Cache-Aside Pattern（旁路快取）

```typescript
// 統一快取查詢模式
async function getCachedTour(tourId: string): Promise<Tour> {
  // L1: Memory Cache
  let tour = memoryCache.get<Tour>(`tour:${tourId}`)
  if (tour) {
    console.log('[Cache] L1 Hit')
    return tour
  }

  // L2: IndexedDB Cache
  tour = await indexedDBCache.get<Tour>(`tour:${tourId}`)
  if (tour) {
    console.log('[Cache] L2 Hit')
    memoryCache.set(`tour:${tourId}`, tour) // 回填 L1
    return tour
  }

  // L3: Database
  console.log('[Cache] Miss - Fetching from DB')
  tour = await localDB.read<Tour>('tours', tourId)

  // 回填所有快取層
  memoryCache.set(`tour:${tourId}`, tour)
  await indexedDBCache.set(`tour:${tourId}`, tour)

  return tour
}
```

### Cache Invalidation（快取失效）

```typescript
// 當資料更新時，清除相關快取
class CacheInvalidator {
  // 策略 1: 刪除特定快取
  async invalidateTour(tourId: string): Promise<void> {
    memoryCache.clear() // 簡單粗暴：清空所有
    await indexedDBCache.invalidate(`tour:${tourId}`)
  }

  // 策略 2: 刪除相關模式
  async invalidateTourList(): Promise<void> {
    await indexedDBCache.invalidate('tours:list:')
  }

  // 策略 3: 事件驅動失效
  setupEventListeners(): void {
    eventBus.subscribe('TourUpdated', async event => {
      await this.invalidateTour(event.aggregateId)
    })

    eventBus.subscribe('TourDeleted', async event => {
      await this.invalidateTour(event.aggregateId)
      await this.invalidateTourList()
    })
  }
}

export const cacheInvalidator = new CacheInvalidator()
cacheInvalidator.setupEventListeners()
```

### HTTP Cache（未來擴充）

```typescript
// API 回應加入 Cache-Control
app.get('/api/tours/:id', async (req, res) => {
  const tour = await tourService.getById(req.params.id)

  // 設定快取頭
  res.set({
    'Cache-Control': 'public, max-age=300', // 5 分鐘
    ETag: generateETag(tour),
    'Last-Modified': tour.updatedAt,
  })

  res.json(tour)
})

// 客戶端請求時附帶 If-None-Match
const response = await fetch(`/api/tours/${id}`, {
  headers: {
    'If-None-Match': lastETag,
  },
})

if (response.status === 304) {
  // 使用本地快取
  return cachedTour
}
```

---

## 📊 監控與可觀測性

### 監控架構

```
┌─────────────────────────────────────────┐
│         Application Layer               │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │ Metrics │  │  Logs   │  │ Traces  │ │
│  └─────────┘  └─────────┘  └─────────┘ │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Observability Platform          │
│  ┌──────────┐  ┌──────────┐            │
│  │  Sentry  │  │ Analytics│            │
│  │ (Errors) │  │(Business)│            │
│  └──────────┘  └──────────┘            │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│           Dashboards & Alerts           │
│  - Error Rate Dashboard                 │
│  - Performance Dashboard                │
│  - Business Metrics Dashboard           │
└─────────────────────────────────────────┘
```

### 錯誤追蹤（Sentry）

```typescript
// lib/monitoring/sentry.ts
import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // 設定取樣率
  tracesSampleRate: 1.0, // 100% in dev, 0.1 in prod

  // 整合效能監控
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // 過濾敏感資料
  beforeSend(event) {
    // 移除敏感資訊
    if (event.request) {
      delete event.request.cookies
      delete event.request.headers?.Authorization
    }
    return event
  },
})

// 自訂錯誤追蹤
export function captureError(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    tags: {
      section: context?.section || 'unknown',
      severity: context?.severity || 'error',
    },
    extra: context,
  })
}

// 效能追蹤
export function trackPerformance(name: string, operation: () => Promise<any>) {
  const transaction = Sentry.startTransaction({ name })

  return operation().finally(() => transaction.finish())
}
```

### 效能監控

```typescript
// lib/monitoring/performance.ts

// 1. Core Web Vitals 監控
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

function sendToAnalytics(metric: Metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
  })

  // 發送到分析服務
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics', body)
  }
}

getCLS(sendToAnalytics)
getFID(sendToAnalytics)
getFCP(sendToAnalytics)
getLCP(sendToAnalytics)
getTTFB(sendToAnalytics)

// 2. API 回應時間監控
class APIPerformanceMonitor {
  private metrics: Map<string, number[]> = new Map()

  track(endpoint: string, duration: number): void {
    if (!this.metrics.has(endpoint)) {
      this.metrics.set(endpoint, [])
    }
    this.metrics.get(endpoint)!.push(duration)
  }

  getStats(endpoint: string) {
    const durations = this.metrics.get(endpoint) || []
    return {
      count: durations.length,
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      p95: this.percentile(durations, 95),
      p99: this.percentile(durations, 99),
    }
  }

  private percentile(arr: number[], p: number): number {
    const sorted = [...arr].sort((a, b) => a - b)
    const index = Math.ceil((p / 100) * sorted.length) - 1
    return sorted[index]
  }
}

export const apiMonitor = new APIPerformanceMonitor()

// 3. 資料庫查詢效能
class DBPerformanceMonitor {
  async trackQuery<T>(operation: string, query: () => Promise<T>): Promise<T> {
    const start = performance.now()

    try {
      const result = await query()
      const duration = performance.now() - start

      // 記錄慢查詢（> 100ms）
      if (duration > 100) {
        console.warn(`[Slow Query] ${operation}: ${duration}ms`)
        captureError(new Error(`Slow query: ${operation}`), {
          duration,
          operation,
        })
      }

      return result
    } catch (error) {
      captureError(error as Error, { operation })
      throw error
    }
  }
}

export const dbMonitor = new DBPerformanceMonitor()
```

### 業務指標監控

```typescript
// lib/monitoring/business-metrics.ts

class BusinessMetrics {
  // 追蹤關鍵業務事件
  async trackTourCreated(tour: Tour): Promise<void> {
    await this.track('tour.created', {
      tourId: tour.id,
      destination: tour.destination,
      price: tour.price,
      capacity: tour.maxCapacity,
    })
  }

  async trackOrderPlaced(order: Order): Promise<void> {
    await this.track('order.placed', {
      orderId: order.id,
      amount: order.totalAmount,
      tourId: order.tourId,
    })
  }

  async trackPaymentReceived(payment: Payment): Promise<void> {
    await this.track('payment.received', {
      paymentId: payment.id,
      amount: payment.amount,
      method: payment.method,
    })
  }

  // 統一追蹤方法
  private async track(event: string, properties: Record<string, any>) {
    const data = {
      event,
      properties,
      timestamp: new Date().toISOString(),
      userId: getCurrentUser()?.id,
    }

    // 發送到分析平台
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  }

  // 即時儀表板數據
  async getDashboardMetrics() {
    const today = new Date()
    const startOfDay = new Date(today.setHours(0, 0, 0, 0))

    return {
      todayRevenue: await this.getTodayRevenue(startOfDay),
      todayOrders: await this.getTodayOrders(startOfDay),
      activeTours: await this.getActiveTours(),
      pendingPayments: await this.getPendingPayments(),
    }
  }

  private async getTodayRevenue(startOfDay: Date): Promise<number> {
    const payments = await localDB.filter<Payment>('payments', [
      { field: 'createdAt', operator: 'gte', value: startOfDay.toISOString() },
    ])
    return payments.reduce((sum, p) => sum + p.amount, 0)
  }

  private async getTodayOrders(startOfDay: Date): Promise<number> {
    const orders = await localDB.filter<Order>('orders', [
      { field: 'createdAt', operator: 'gte', value: startOfDay.toISOString() },
    ])
    return orders.length
  }

  private async getActiveTours(): Promise<number> {
    const tours = await localDB.filter<Tour>('tours', [
      { field: 'status', operator: 'eq', value: 'active' },
    ])
    return tours.length
  }

  private async getPendingPayments(): Promise<number> {
    const payments = await localDB.filter<Payment>('payments', [
      { field: 'status', operator: 'eq', value: 'pending' },
    ])
    return payments.reduce((sum, p) => sum + p.amount, 0)
  }
}

export const businessMetrics = new BusinessMetrics()
```

---

## 🔒 安全性設計

### 資料加密策略

```typescript
// lib/security/encryption.ts
import { AES, enc } from 'crypto-js'

class DataEncryption {
  private readonly key = process.env.ENCRYPTION_KEY!

  // 加密敏感資料
  encrypt(data: string): string {
    return AES.encrypt(data, this.key).toString()
  }

  // 解密
  decrypt(encrypted: string): string {
    const bytes = AES.decrypt(encrypted, this.key)
    return bytes.toString(enc.Utf8)
  }

  // 加密物件
  encryptObject<T>(obj: T): string {
    return this.encrypt(JSON.stringify(obj))
  }

  // 解密物件
  decryptObject<T>(encrypted: string): T {
    return JSON.parse(this.decrypt(encrypted))
  }
}

export const encryption = new DataEncryption()

// 使用範例：儲存敏感資料
async function saveCustomerWithEncryption(customer: Customer) {
  const encryptedData = {
    ...customer,
    // 加密敏感欄位
    idNumber: encryption.encrypt(customer.idNumber),
    creditCard: customer.creditCard ? encryption.encrypt(customer.creditCard) : undefined,
  }

  await localDB.create('customers', encryptedData)
}
```

### PII 資料遮罩

```typescript
// lib/security/masking.ts

class PIIMasking {
  // 遮罩身分證字號
  maskIDNumber(id: string): string {
    if (id.length < 4) return '****'
    return id.slice(0, 2) + '****' + id.slice(-2)
  }

  // 遮罩信用卡號
  maskCreditCard(card: string): string {
    const cleaned = card.replace(/\s/g, '')
    if (cleaned.length < 4) return '****'
    return '**** **** **** ' + cleaned.slice(-4)
  }

  // 遮罩電話號碼
  maskPhone(phone: string): string {
    if (phone.length < 4) return '****'
    return phone.slice(0, 4) + '****' + phone.slice(-2)
  }

  // 遮罩 Email
  maskEmail(email: string): string {
    const [name, domain] = email.split('@')
    if (name.length <= 2) return '**@' + domain
    return name[0] + '***' + name.slice(-1) + '@' + domain
  }
}

export const piiMasking = new PIIMasking()

// 日誌輸出時自動遮罩
function logWithMasking(message: string, data: any) {
  const masked = {
    ...data,
    idNumber: data.idNumber ? piiMasking.maskIDNumber(data.idNumber) : undefined,
    phone: data.phone ? piiMasking.maskPhone(data.phone) : undefined,
    email: data.email ? piiMasking.maskEmail(data.email) : undefined,
  }

  console.log(message, masked)
}
```

### XSS/CSRF 防護

```typescript
// lib/security/xss-protection.ts
import DOMPurify from 'isomorphic-dompurify'

// XSS 防護
export function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target'],
  })
}

// CSRF Token 生成
import { randomBytes } from 'crypto'

class CSRFProtection {
  private tokens: Map<string, number> = new Map()

  generateToken(): string {
    const token = randomBytes(32).toString('hex')
    this.tokens.set(token, Date.now())
    return token
  }

  validateToken(token: string): boolean {
    const timestamp = this.tokens.get(token)
    if (!timestamp) return false

    // Token 有效期 1 小時
    const isValid = Date.now() - timestamp < 3600000

    if (!isValid) {
      this.tokens.delete(token)
    }

    return isValid
  }

  cleanupExpiredTokens(): void {
    const now = Date.now()
    for (const [token, timestamp] of this.tokens.entries()) {
      if (now - timestamp > 3600000) {
        this.tokens.delete(token)
      }
    }
  }
}

export const csrfProtection = new CSRFProtection()

// 定期清理過期 Token
setInterval(() => csrfProtection.cleanupExpiredTokens(), 600000) // 10 分鐘
```

### Rate Limiting

```typescript
// lib/security/rate-limit.ts

class RateLimiter {
  private requests: Map<string, number[]> = new Map()

  // 檢查是否超過限制
  isAllowed(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now()
    const timestamps = this.requests.get(key) || []

    // 過濾掉超出時間窗口的請求
    const validTimestamps = timestamps.filter(timestamp => now - timestamp < windowMs)

    if (validTimestamps.length >= limit) {
      return false
    }

    validTimestamps.push(now)
    this.requests.set(key, validTimestamps)
    return true
  }

  // 清理舊資料
  cleanup(): void {
    const now = Date.now()
    for (const [key, timestamps] of this.requests.entries()) {
      const valid = timestamps.filter(t => now - t < 3600000)
      if (valid.length === 0) {
        this.requests.delete(key)
      } else {
        this.requests.set(key, valid)
      }
    }
  }
}

export const rateLimiter = new RateLimiter()

// 使用範例
async function apiHandler(req: Request, res: Response) {
  const userId = req.user?.id || req.ip

  // 限制：每分鐘 60 次請求
  if (!rateLimiter.isAllowed(userId, 60, 60000)) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: '請求過於頻繁，請稍後再試',
    })
  }

  // 處理請求...
}

// 定期清理
setInterval(() => rateLimiter.cleanup(), 300000) // 5 分鐘
```

### Audit Logging（稽核日誌）

```typescript
// lib/security/audit-log.ts

interface AuditLog {
  id: string
  userId: string
  action: string
  resource: string
  resourceId: string
  changes?: Record<string, { before: any; after: any }>
  ipAddress?: string
  userAgent?: string
  timestamp: string
}

class AuditLogger {
  async log(params: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    const auditLog: AuditLog = {
      ...params,
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
    }

    // 儲存到專用的稽核資料表
    await localDB.create('audit_logs', auditLog)

    // 重要操作額外記錄到遠端
    if (this.isCriticalAction(params.action)) {
      await this.sendToRemoteLog(auditLog)
    }
  }

  private isCriticalAction(action: string): boolean {
    const critical = ['delete', 'update_permission', 'export_data']
    return critical.some(a => action.includes(a))
  }

  private async sendToRemoteLog(log: AuditLog): Promise<void> {
    // 發送到遠端日誌服務
    await fetch('/api/audit-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log),
    })
  }

  // 查詢稽核日誌
  async query(filters: {
    userId?: string
    action?: string
    resource?: string
    startDate?: string
    endDate?: string
  }): Promise<AuditLog[]> {
    const conditions = []

    if (filters.userId) {
      conditions.push({ field: 'userId', operator: 'eq', value: filters.userId })
    }
    if (filters.action) {
      conditions.push({ field: 'action', operator: 'eq', value: filters.action })
    }
    if (filters.startDate) {
      conditions.push({ field: 'timestamp', operator: 'gte', value: filters.startDate })
    }
    if (filters.endDate) {
      conditions.push({ field: 'timestamp', operator: 'lte', value: filters.endDate })
    }

    return await localDB.filter<AuditLog>('audit_logs', conditions)
  }
}

export const auditLogger = new AuditLogger()

// 使用範例
async function deleteTour(tourId: string, userId: string) {
  const tour = await localDB.read<Tour>('tours', tourId)

  // 刪除前記錄
  await auditLogger.log({
    userId,
    action: 'tour.delete',
    resource: 'tour',
    resourceId: tourId,
    changes: {
      status: { before: tour.status, after: 'deleted' },
    },
  })

  await localDB.delete('tours', tourId)
}
```

---

## 🚀 CI/CD 與 DevOps

### CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  # 1. 程式碼品質檢查
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check

  # 2. 測試
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:coverage
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3

  # 3. 建置
  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build
          path: .next

  # 4. 部署到 Staging
  deploy-staging:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/develop'
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel Staging
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

  # 5. 部署到 Production
  deploy-production:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel Production
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### 程式碼品質標準

```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "prefer-const": "error",
    "no-var": "error"
  }
}

// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

### Code Review 檢查清單

```markdown
## Code Review Checklist

### 功能性

- [ ] 程式碼符合需求規格
- [ ] 所有測試通過
- [ ] 邊界條件已處理
- [ ] 錯誤處理完整

### 程式碼品質

- [ ] 遵循專案命名規範
- [ ] 無重複代碼（DRY）
- [ ] 函數職責單一（SRP）
- [ ] 無 magic numbers
- [ ] 有適當註解
- [ ] 防禦性程式設計完整（見下方規範）

### 安全性

- [ ] 無 SQL Injection 風險
- [ ] 無 XSS 風險
- [ ] 敏感資料已加密
- [ ] 權限檢查完整

### 效能

- [ ] 無 N+1 查詢
- [ ] 有適當快取
- [ ] 無記憶體洩漏
- [ ] 資料庫索引正確

### 測試

- [ ] 單元測試覆蓋率 > 80%
- [ ] 整合測試完整
- [ ] 測試案例有意義
- [ ] Mock 使用正確
```

## 防禦性程式設計規範 🛡️

> **核心原則**: 永遠假設資料可能是 null、undefined 或不符預期格式

### 1. 陣列操作防護

```typescript
// ❌ 錯誤：直接操作可能 undefined 的陣列
const tourEvents = tours.map(tour => {...})

// ✅ 正確：加入空陣列預設值
const tourEvents = (tours || []).map(tour => {...})

// ✅ 更好：使用 optional chaining + nullish coalescing
const tourEvents = (tours ?? []).map(tour => {...})
```

### 2. 物件屬性存取防護

```typescript
// ❌ 錯誤：直接存取可能不存在的屬性
const userName = user.profile.name

// ✅ 正確：使用 optional chaining
const userName = user?.profile?.name

// ✅ 更好：提供預設值
const userName = user?.profile?.name || '未知使用者'
```

### 3. 函數參數檢查

```typescript
// ❌ 錯誤：假設參數一定存在
function calculateTotal(items: Item[]) {
  return items.reduce((sum, item) => sum + item.price, 0)
}

// ✅ 正確：完整的參數檢查
function calculateTotal(items?: Item[] | null): number {
  // 1. 參數檢查
  if (!items || !Array.isArray(items)) {
    console.warn('calculateTotal: items is invalid', items)
    return 0
  }

  // 2. 安全的計算
  return items.reduce((sum, item) => {
    // 3. 每個項目也要檢查
    const price = typeof item?.price === 'number' ? item.price : 0
    return sum + price
  }, 0)
}
```

### 4. 日期處理防護

```typescript
// ❌ 錯誤：假設日期格式正確
const birthMonth = new Date(member.birthday).getMonth()

// ✅ 正確：try-catch 包裝
function getBirthMonth(birthday?: string | null): number | null {
  if (!birthday) return null

  try {
    const date = new Date(birthday)
    // 檢查是否為有效日期
    if (isNaN(date.getTime())) {
      console.error('Invalid date:', birthday)
      return null
    }
    return date.getMonth()
  } catch (error) {
    console.error('Date parsing error:', error)
    return null
  }
}
```

### 5. API 回應處理

```typescript
// ❌ 錯誤：假設 API 一定成功
async function fetchUsers() {
  const response = await fetch('/api/users')
  const data = await response.json()
  return data.users
}

// ✅ 正確：完整的錯誤處理
async function fetchUsers(): Promise<User[]> {
  try {
    const response = await fetch('/api/users')

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    // 檢查資料格式
    if (!data || !Array.isArray(data.users)) {
      console.error('Invalid API response format:', data)
      return []
    }

    return data.users
  } catch (error) {
    console.error('Failed to fetch users:', error)
    return [] // 提供 fallback
  }
}
```

### 6. Store 資料存取防護

```typescript
// ❌ 錯誤：直接存取 store 資料
const { tours, orders } = useTourStore()
const tourOrders = orders.filter(o => o.tourId === tour.id)

// ✅ 正確：防禦性存取
const { tours, orders } = useTourStore()
const tourOrders = (orders || []).filter(o => o?.tourId === tour?.id)
```

### 7. 執行任務時的檢查清單

每次執行任務時必須：

#### 1. **防禦性程式設計檢查**

- [ ] 所有陣列操作加 `|| []` 或 `?? []`
- [ ] 所有物件存取用 `?.` optional chaining
- [ ] 所有函數參數檢查 null/undefined
- [ ] 數字運算前檢查 `typeof === 'number'`
- [ ] 日期解析用 try-catch 包裝

#### 2. **完整錯誤處理**

- [ ] async 函數有 try-catch
- [ ] 錯誤訊息明確且可追蹤
- [ ] 提供 fallback 或預設值
- [ ] 使用 console.warn 記錄異常情況

#### 3. **程式碼驗證**

- [ ] 列出可能的邊界情況
- [ ] 提供測試案例（至少 3 個）
- [ ] 確認 TypeScript 型別正確
- [ ] 無 `any` 型別（除非必要）

#### 4. **交付清單**

- [ ] 修改的檔案列表
- [ ] 修改內容摘要
- [ ] 潛在風險說明
- [ ] 測試建議

### 8. 完整範例：防禦性函數

```typescript
/**
 * 取得本月生日的成員
 * @param members 成員陣列（可能為 null/undefined）
 * @param currentMonth 當前月份（0-11）
 * @returns 生日事件陣列
 */
const getBirthdaysThisMonth = (
  members?: Member[] | null,
  currentMonth: number = new Date().getMonth()
): BirthdayEvent[] => {
  // 1. 參數檢查
  if (!members || !Array.isArray(members)) {
    console.warn('getBirthdaysThisMonth: members is invalid', members)
    return []
  }

  // 2. 月份檢查
  if (typeof currentMonth !== 'number' || currentMonth < 0 || currentMonth > 11) {
    console.warn('getBirthdaysThisMonth: invalid month', currentMonth)
    currentMonth = new Date().getMonth()
  }

  // 3. 安全的陣列操作
  const birthdays = members
    .filter(member => {
      // 4. 每個項目都檢查
      if (!member?.birthday) return false

      try {
        // 5. 日期解析也要 try-catch
        const birthDate = new Date(member.birthday)

        // 6. 檢查是否為有效日期
        if (isNaN(birthDate.getTime())) {
          console.error('Invalid birthday format:', member.birthday)
          return false
        }

        return birthDate.getMonth() === currentMonth
      } catch (error) {
        console.error('Birthday parsing error:', error)
        return false
      }
    })
    .map(member => {
      // 7. 確保必要欄位存在
      return {
        id: member.id || 'unknown',
        name: member.name || '未知姓名',
        date: member.birthday!, // 上面已檢查
        type: 'birthday' as const,
      }
    })

  return birthdays
}

// 測試案例
console.assert(getBirthdaysThisMonth(undefined).length === 0, 'Should handle undefined')
console.assert(getBirthdaysThisMonth(null).length === 0, 'Should handle null')
console.assert(getBirthdaysThisMonth([]).length === 0, 'Should handle empty array')
console.assert(
  getBirthdaysThisMonth([{ id: '1', name: 'Test', birthday: 'invalid' }]).length === 0,
  'Should handle invalid date'
)
```

### 9. 常見錯誤模式與修正

| 錯誤模式        | 修正方式                              |
| --------------- | ------------------------------------- | --- | ---------- |
| `data.map()`    | `(data                                |     | []).map()` |
| `obj.prop`      | `obj?.prop`                           |
| `new Date(str)` | `try { new Date(str) } catch { ... }` |
| `arr[0]`        | `arr?.[0]`                            |
| `func(param)`   | `func(param ?? defaultValue)`         |
| `await api()`   | `try { await api() } catch { ... }`   |

### 10. TypeScript 嚴格模式配置

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

---

### 環境變數管理

```bash
# .env.example
# 資料庫
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# 認證
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...

# 監控
NEXT_PUBLIC_SENTRY_DSN=...
SENTRY_AUTH_TOKEN=...

# 加密
ENCRYPTION_KEY=...

# API Keys
OPENAI_API_KEY=...
SENDGRID_API_KEY=...

# 功能開關
NEXT_PUBLIC_FEATURE_ANALYTICS=true
NEXT_PUBLIC_FEATURE_EVENT_BUS=true
```

---

## 🎯 架構成熟度路線圖

### Level 1: MVP（當前）

```
✅ 基本 CRUD
✅ 本地儲存（IndexedDB）
✅ 單一用戶
✅ 型別系統
✅ 業務邏輯層
⏳ 基礎測試
```

### Level 2: Production（未來擴充）

```
⏳ 多用戶協作
⏳ 後端 API（Supabase）
⏳ 基礎監控（Sentry）
⏳ 資料備份策略
⏳ 權限系統
⏳ CI/CD Pipeline
```

### Level 3: Scale（6個月後）

```
⏳ 事件驅動架構
⏳ 三層快取策略
⏳ 完整監控儀表板
⏳ 自動擴展
⏳ A/B Testing
⏳ Feature Flags
```

### Level 4: Enterprise（1年後）

```
⏳ 微服務架構
⏳ Event Sourcing
⏳ CQRS 模式
⏳ Multi-tenant
⏳ 領域驅動設計完整實踐
⏳ 災難恢復計劃
```

### 遷移路徑

#### 雲端同步準備工作

1. **資料遷移**
   - 匯出 IndexedDB 資料
   - 建立 Supabase schema
   - 批次上傳資料
   - 驗證資料一致性

2. **Service Layer 實作**
   - 建立 API 服務類別
   - Hook 層整合 Service
   - 錯誤處理標準化
   - API 快取策略

3. **監控部署**
   - Sentry 整合
   - 效能監控設置
   - 業務指標追蹤
   - Dashboard 建置

#### 進階功能準備工作

1. **事件驅動改造**
   - 實作 Event Bus
   - 領域事件定義
   - 事件處理器開發
   - Event Sourcing 預留

2. **快取優化**
   - Memory Cache 實作
   - IndexedDB Cache
   - HTTP Cache Headers
   - Cache Invalidation

3. **擴展性準備**
   - API Gateway 設計
   - 微服務邊界劃分
   - 訊息佇列評估
   - 資料庫分片策略

---

## 📝 版本歷史

| 版本  | 日期       | 變更內容                                                                   |
| ----- | ---------- | -------------------------------------------------------------------------- |
| 5.2.0 | 2025-01-06 | 🚀 企業級架構完成：DDD、事件驅動、快取策略、監控、安全性、CI/CD            |
| 5.1.0 | 2025-01-06 | 🎉 升級為專業五層架構，新增測試策略、權限系統、錯誤處理、API設計、資料遷移 |
| 5.0.6 | 2025-01-06 | 完成 Hook 層（6個檔案，業務邏輯完整）                                      |
| 5.0.5 | 2025-01-06 | 完成 Store 系統（簡化版，2個檔案）                                         |
| 5.0.3 | 2025-01-06 | 完成 IndexedDB 層（3個檔案）                                               |
| 5.0.2 | 2025-01-06 | 完成型別系統（9個檔案）                                                    |
| 5.0.1 | 2025-01-06 | 加入文檔使用指南                                                           |
| 5.0.0 | 2025-01-06 | 初始架構設計                                                               |
| 4.0.0 | 2025-01-03 | 離線架構嘗試（未完成）                                                     |
| 3.0.0 | 2024-12    | Supabase 整合（問題多）                                                    |
| 2.0.0 | 2024-11    | localStorage 版本                                                          |
| 1.0.0 | 2024-10    | 初始原型                                                                   |

---

## 🎓 給開發者的話

### 為什麼這樣設計？

- **不是偷懶**：是階段性策略
- **不是技術債**：是計劃內的簡化
- **不是沒想到**：是刻意延後

### 記住原則

1. 先讓它動 → 再讓它對 → 最後讓它快
2. 不要預先優化
3. 不要過度設計
4. 保持簡單

### 下一位接手時

請先讀這份文檔，理解設計決策，不要急著重構。系統正在按計劃演進。

---

## 📞 聯絡資訊

**專案負責人**: William Chien
**技術顧問**: Claude AI Team
**文檔維護**: 每週更新

---

**最後更新**: 2025-01-07 01:00
**文檔版本**: 5.3.1
**狀態**: ✅ 資料庫統一修復完成

---

## 📋 完整章節索引

### 基礎架構

1. **型別系統** (9 檔案) - 完整 TypeScript 定義
2. **資料庫層** (3 檔案) - IndexedDB 管理
3. **狀態管理** (2 檔案) - Zustand Store 工廠
4. **業務邏輯** (6 檔案) - Custom Hooks

### 專業架構

5. **五層架構** - UI → Hook → Service → Store → DB
6. **測試策略** - 單元、整合、E2E
7. **權限系統** - RBAC 權限矩陣
8. **錯誤處理** - 5 種錯誤分類
9. **API 設計** - RESTful 規範

### 企業級功能

10. **領域驅動設計** - 4 個 Bounded Contexts
11. **事件驅動架構** - Event Bus + Event Sourcing
12. **快取策略** - 三層快取架構
13. **監控系統** - Sentry + Analytics
14. **安全性** - 加密、遮罩、防護
15. **CI/CD** - GitHub Actions Pipeline
16. **DevOps** - Code Review + 環境管理

### 實作指南

17. **資料遷移** - Schema 升級與雲端同步策略
18. **架構成熟度路線圖** - MVP → Enterprise
19. **技術決策記錄** - 12 個關鍵決策

**總計**: 3400+ 行專業系統設計文檔

---

## 🔧 ~~v5.3.1 資料庫統一修復詳細記錄~~ (歷史參考)

> ⚠️ **歷史參考 (2026-01)**：以下是 IndexedDB 時期的除錯記錄。
>
> 系統已於 2026-01 升級為純雲端架構（Supabase），不再使用 IndexedDB。
> 以下內容僅作為歷史參考，不適用於現行架構。

**執行日期**: 2025-01-07 01:00
**執行者**: Claude AI
**版本**: 5.3.1

### ~~問題背景~~ (已解決)

在系統合規檢查中發現**嚴重的雙資料庫問題**（現已不適用）：

#### 問題現象

- 用戶可以登入（使用 `VenturoOfflineDB`）
- 但 HR 頁面顯示無員工資料（查詢 `VenturoLocalDB`）
- 兩個資料庫實例各自獨立，資料不同步

#### 根本原因

v4.0 → v5.0 遷移未完成，舊的 `offline-database.ts` 未移除，導致：

```typescript
// 登入系統使用
import { getOfflineDB } from '@/lib/offline/offline-database'
const db = getOfflineDB() // → VenturoOfflineDB

// HR 系統使用
import { localDB } from '@/lib/db'
await localDB.getAll('users') // → VenturoLocalDB
```

---

### 修復內容摘要

✅ **已完成全部 7 項任務**

| 任務                          | 狀態 | 檔案數 | 說明               |
| ----------------------------- | ---- | ------ | ------------------ |
| 1. 修復 accounting-store 混用 | ✅   | 1      | 統一使用 localDB   |
| 2. 修復 calendar-store        | ✅   | 1      | 統一使用 localDB   |
| 3. 停用 create-complex-store  | ✅   | 1      | 標記 @deprecated   |
| 4. user-store 確認            | ✅   | 1      | 已正確使用 localDB |
| 5. 檢查頁面防衛性程式碼       | ✅   | 3      | 修復 15 個問題     |
| 6. 標記 VenturoOfflineDB      | ✅   | 1      | 加入遷移指南       |
| 7. 更新 5.0 MANUAL            | ✅   | 1      | 本文檔             |

---

### 詳細修復清單

#### 1. offline-auth.service.ts

**問題**: 登入驗證使用錯誤的資料庫

**修復前**:

```typescript
const { getOfflineDB } = await import('@/lib/offline/offline-database')
const db = getOfflineDB()
const employees = await db.getAll('users')
const employee = employees.find((emp: any) => emp.employeeNumber === employeeNumber)
```

**修復後**:

```typescript
import { localDB } from '@/lib/db'
import { User } from '@/types'
const employees = await localDB.getAll<User>('users')
const employee = employees.find(emp => emp.employeeNumber === employeeNumber)
```

**影響**: 登入系統現在查詢正確的資料庫

---

#### 2. init-admin-user.ts

**問題**: 初始化系統主管寫入錯誤的資料庫

**修復前**:

```typescript
import { getOfflineDB } from './offline-database'
const db = getOfflineDB()
const existingUsers = await db.getAll('users')
await db.add('users', adminUser)
```

**修復後**:

```typescript
import { localDB } from '@/lib/db'
import { User } from '@/types'
const existingUsers = await localDB.getAll<User>('users')
await localDB.create<User>('users', adminUser)
```

**影響**: 系統主管資料正確寫入 VenturoLocalDB

---

#### 3. create-complex-store.ts (工廠函數)

**問題**: 所有使用此工廠的 Store 都調用錯誤資料庫

**修復**: 統一替換 6 處資料庫調用

```typescript
// 修改前
import { getOfflineDB } from '@/lib/offline/offline-database'
const db = getOfflineDB()
await db.getAll(tableName)
await db.getById(tableName, id)
await db.create(tableName, data)
await db.update(tableName, id, data)
await db.delete(tableName, id)

// 修改後
import { localDB } from '@/lib/db'
await localDB.getAll(tableName)
await localDB.getById(tableName, id)
await localDB.create(tableName, data)
await localDB.update(tableName, id, data)
await localDB.delete(tableName, id)
```

**同時加入棄用標記**:

```typescript
/**
 * @deprecated 此工廠函數已停止開發，請使用 `createStore` 代替
 *
 * 維護狀態：僅修復 bug，不新增功能
 * 遷移計劃：Phase 3 時評估是否需要遷移到 createStore
 */
```

**影響範圍**: 自動修復所有使用此工廠的 Store

- ✅ accounting-store.ts (4 個子實體)
- ✅ 其他使用 createComplexStore 的 Store

---

#### 4. accounting-store.ts

**問題**: 自訂業務方法中直接調用 getOfflineDB

**修復**: 替換 5 處直接調用

```typescript
// 修改前（createTransaction 方法）
const { getOfflineDB } = await import('@/lib/offline/offline-database')
const localDB = getOfflineDB() // ❌ 變數名誤導
await localDB.create('transactions', transaction)

// 修改後
import { localDB } from '@/lib/db'
await localDB.create('transactions', transaction)
```

**修復位置**:

1. Line 73-74: createTransaction
2. Line 111-113: updateTransaction
3. Line 151-153: deleteTransaction
4. Line 191-193: deleteAccount
5. Line 230-232: deleteCategory

**影響**: 會計 Store 的所有 CRUD 操作現在使用正確資料庫

---

#### 5. calendar-store.ts

**問題**: 4 處調用錯誤資料庫

**修復**:

```typescript
// 修改前
import { getOfflineDB } from '@/lib/offline/offline-database'
const db = getOfflineDB()
await db.add('calendarEvents', newEvent)
await db.get<CalendarEvent>('calendarEvents', id)
await db.update('calendarEvents', updatedEvent)
await db.delete('calendarEvents', id)
await db.getAll<CalendarEvent>('calendarEvents')

// 修改後
import { localDB } from '@/lib/db'
await localDB.create('calendarEvents', newEvent)
await localDB.getById<CalendarEvent>('calendarEvents', id)
await localDB.update('calendarEvents', id, updatedData)
await localDB.delete('calendarEvents', id)
await localDB.getAll<CalendarEvent>('calendarEvents')
```

**修復位置**:

1. Line 64: addEvent
2. Line 84-91: updateEvent
3. Line 107: deleteEvent
4. Line 138: loadEvents

**影響**: 行事曆功能現在正確讀寫資料

---

#### 6. 頁面防衛性程式碼修復

**執行**: 使用 Task Agent 自動掃描並修復

**檢查範圍**: 10 個頁面
**發現問題**: 3 個頁面，15 個缺陷
**已修復**: 全部

##### 修復的頁面:

**hr/page.tsx** (4 處)

```typescript
// Before
getUsersByStatus(...).filter(...)
filteredEmployees.map(employee => ...)

// After
(getUsersByStatus(...) || []).filter(...)
(filteredEmployees || []).map(employee => {
  if (!employee) return null;
  ...
})
```

**finance/payments/page.tsx** (7 處)

```typescript
// Before
orderAllocations.map(...)
paymentItems.forEach(...)

// After
(orderAllocations || []).map(item => {
  if (!item) return null;
  ...
})
(paymentItems || []).forEach(item => {
  if (!item) return;
  ...
})
```

**finance/requests/page.tsx** (4 處)

```typescript
// Before
suppliers.find(s => s.id === id)
requestItems.map(...)

// After
(suppliers || []).find(s => s && s.id === id)
(requestItems || []).map(item => {
  if (!item) return null;
  ...
})
```

---

#### 7. offline-database.ts 標記棄用

**加入遷移指南**:

````typescript
/**
 * @deprecated 此檔案已棄用，請使用 @/lib/db 中的 localDB 代替
 *
 * 遷移指南：
 * ```typescript
 * // ❌ 舊寫法（已棄用）
 * import { getOfflineDB } from '@/lib/offline/offline-database';
 * const db = getOfflineDB();
 * await db.add('users', user);
 * await db.get('users', id);
 * await db.update('users', updatedUser);
 *
 * // ✅ 新寫法
 * import { localDB } from '@/lib/db';
 * await localDB.create('users', user);
 * await localDB.getById('users', id);
 * await localDB.update('users', id, updates);
 * ```
 *
 * 主要差異：
 * - create() 替代 add()
 * - getById() 替代 get()
 * - update() 需要 id 參數
 * - 統一的 API 介面
 *
 * 維護狀態：僅修復 critical bugs，不新增功能
 * 移除計劃：未來完全移除此檔案
 */
````

---

### 修復成果

#### 解決的問題

✅ 登入系統與 HR 系統資料同步
✅ 所有 Store 統一使用 localDB
✅ 移除資料庫混用情況
✅ 加入完整的遷移指南
✅ 15 個陣列操作防衛性問題
✅ 清晰的棄用標記和文檔

#### 資料庫架構現況

```
✅ VenturoLocalDB (主要資料庫)
   ├─ users (員工資料)
   ├─ tours (旅遊團)
   ├─ orders (訂單)
   ├─ quotes (報價)
   ├─ paymentRequests (請款)
   ├─ calendarEvents (行事曆)
   ├─ accounts (會計帳戶)
   ├─ categories (會計分類)
   ├─ transactions (會計交易)
   ├─ budgets (預算)
   └─ ... (其他資料表)

⚠️ VenturoOfflineDB (已棄用)
   └─ 保留以維持向下相容，未來移除
```

#### 程式碼品質提升

- **Type Safety**: 所有資料庫調用現在使用 TypeScript 泛型
- **API 一致性**: 統一使用 create/getById/update/delete
- **防衛性程式碼**: 所有陣列操作加入 `|| []` 和 null 檢查
- **文檔完整性**: 所有棄用項目都有遷移指南

---

### 遷移檢查清單

**Phase 1 完成項目**:

- [x] 統一所有 Store 使用 localDB
- [x] 移除所有 getOfflineDB() 調用
- [x] 加入防衛性程式碼
- [x] 標記棄用項目
- [x] 更新文檔

**Phase 2 待辦**:

- [ ] 完全移除 offline-database.ts
- [ ] 清理 VenturoOfflineDB 實例
- [ ] 資料遷移驗證
- [ ] 單元測試更新

**Phase 3 準備**:

- [ ] Supabase 整合準備
- [ ] 雙向同步機制
- [ ] 資料一致性驗證

---

### 技術決策記錄

#### 為什麼不直接刪除 offline-database.ts？

**決策**: 保留但標記 @deprecated

**原因**:

1. **向下相容**: 可能還有未發現的調用
2. **漸進遷移**: 逐步完全移除舊系統
3. **風險控制**: 避免破壞性變更
4. **文檔價值**: 遷移指南對開發者有幫助

#### 為什麼保留 createComplexStore？

**決策**: 維護但不開發新功能

**原因**:

1. **業務邏輯複雜**: accounting-store 有複雜的餘額計算
2. **穩定性優先**: 已在使用且運作正常
3. **5.0 規範允許**: 複雜 Store 可手寫
4. **重構成本高**: 非必要重構

#### user-store 為何不用工廠？

**決策**: 保持手寫 Store

**原因**:

1. **已符合規範**: 正確使用 localDB
2. **架構清晰**: 手寫代碼可讀性高
3. **業務邏輯多**: 薪資、出勤、合約管理
4. **5.0 允許**: 複雜業務邏輯 Store 可手寫

#### Store 架構統一專案（2025-10-15）

**決策**: Quote、Order、Member、Customer Store 統一遷移至 createStore 模式

**成果**:

1. **TypeScript 錯誤減少 40.8%**: 從 184 個降至 109 個
2. **核心 Store 完成統一**: 4 個主要 Store 全部遷移
3. **三層架構確立**: Pages/Components → Hooks → Services → Stores
4. **API 標準化**: 統一使用 `items`, `create()`, `update()`, `delete()`, `fetchAll()`

**技術細節**:

- **Quote Store**: 修正型別衝突（統一使用 `@/stores/types`）
- **Order Store**: 更新所有業務方法使用 `store.items`
- **Member Store**: 從 `useTourStore()` 遷移至 `useMemberStore()`
- **Customer Store**: 從 `useTourStore()` 遷移至 `useCustomerStore()`

**Payment Store 特殊處理**:

- **決策**: 暫時保留舊架構，標記 `@deprecated`
- **原因**:
  1. 包含 PaymentRequest 和 DisbursementOrder 兩種實體
  2. 約 20+ 個自定義業務方法
  3. 需要拆分為獨立 Store + Service
- **遷移計畫**: 5 個 Phase 逐步遷移（預計 1-2 週後開始）

**架構改進**:

```typescript
// 標準 Store API
interface StoreAPI<T> {
  items: T[] // 統一資料列表名稱
  create: (data: Partial<T>) => Promise<T>
  update: (id: string, data: Partial<T>) => Promise<T>
  delete: (id: string) => Promise<void>
  fetchAll: () => Promise<T[]>
}
```

**文檔**:

- 詳細記錄：`/tmp/store-unification-summary.md`
- 修改檔案：15+ 個（Hooks、Services、Pages、Components）
- 備份檔案：4 個 `.deprecated.ts` 檔案

#### Tour Store 遷移完成（2025-10-15）

**決策**: Tour Store 遷移至 createStore 模式

**成果**:

1. **TypeScript 錯誤再減少 48.6%**: 從 109 個降至 56 個
2. **核心 Store 100% 完成**: 5/5 全部遷移（Quote、Order、Member、Customer、Tour）
3. **總錯誤減少 69.6%**: 從 184 個降至 56 個

**技術細節**:

- **useTours Hook**: 移除 orders/customers/members，改用獨立 Store
- **tour.service.ts**: 更新 getStore() 使用新 Store API
- **requests/page.tsx**: 同時使用 useTours() 和 useOrders()

**清理工作**:

- `src/hooks/useQuotes.ts` → `.deprecated.ts`
- `tsconfig.json` 排除 `**/*.deprecated.ts`
- 移除 stores/index.ts 中重複的 usePaymentStore 聲明

**剩餘工作**:

- ~52 個 Payment Store 錯誤（待處理）
- 4 個零散錯誤（型別約束、其他）

**文檔**:

- 詳細記錄：`/tmp/tour-store-migration-complete.md`
- 修改檔案：7 個（Hooks、Services、Pages、Config）

---

### 後續工作建議

#### 短期（本週）

1. ✅ 測試登入功能
2. ✅ 測試 HR 頁面員工顯示
3. ✅ 測試會計功能
4. ✅ 測試行事曆功能

#### 中期（下週）

1. 完整功能測試
2. 效能監控
3. 錯誤追蹤
4. 使用者反饋

#### 長期計劃

1. 移除 offline-database.ts
2. 評估是否重構 createComplexStore
3. 準備 Supabase 整合
4. 資料遷移策略

---

### 經驗教訓

#### ✅ 做對的事

1. **系統性檢查**: 使用 SYSTEM_COMPLIANCE_CHECK.md 發現問題
2. **自動化修復**: Task Agent 批次修復防衛性程式碼
3. **完整文檔**: 每個修復都有清晰記錄
4. **漸進遷移**: 不做破壞性變更

#### ⚠️ 未來注意

1. **版本升級檢查**: v4 → v5 應該要完整移除舊檔案
2. **資料庫實例管理**: 單一真相來源原則
3. **型別安全**: 避免使用 `any`
4. **測試覆蓋**: 關鍵路徑需要測試

---

**修復完成時間**: 2025-01-07 01:00
**總修改檔案**: 8 個
**總修復問題**: 27 個
**測試狀態**: ✅ 通過
**部署狀態**: ✅ 可部署

---

## 📱 工作空間功能（v5.5.0）

**完成時間**: 2025-10-07 02:00
**代碼量**: 1,020 行
**參考架構**: Slack 風格協作平台

---

### 🎯 功能總覽

工作空間是 Venturo 的團隊協作中心，提供：

- **頻道系統**：固定頻道、旅遊團頻道、自訂頻道
- **訊息功能**：發送、反應、釘選、回覆串
- **Canvas 協作**：待辦清單、文件、檔案庫
- **任務整合**：與旅遊團管理雙向同步

---

### 📂 檔案架構

```
src/
├─ stores/
│  └─ workspace-store.ts          (200行) - 工作空間狀態管理
│
├─ app/
│  └─ workspace/
│     └─ page.tsx                 (120行) - 工作空間主頁面
│
└─ components/
   └─ workspace/
      ├─ channel-list.tsx         (70行)  - 頻道列表
      ├─ channel-view.tsx         (200行) - 頻道視圖
      ├─ canvas-view.tsx          (120行) - Canvas 視圖
      ├─ workspace-task-list.tsx  (250行) - 任務清單
      └─ create-channel-dialog.tsx (60行) - 新增頻道對話框

已修改：
└─ components/tours/tour-task-assignment.tsx (加入「前往工作空間」按鈕)
```

---

### 🔑 核心設計決策

#### 1. 頻道類型設計

```typescript
type ChannelType = 'fixed' | 'tour' | 'custom';

// 固定頻道（系統）
- 📢 公告
- 🏢 常用空間
特性：不可刪除、所有人自動加入

// 旅遊團頻道（自動）
- #TYO240815-東京賞櫻團
- #OKI240820-沖繩度假團
特性：從旅遊團自動建立、結案後封存、業務/助理/威廉自動加入

// 自訂頻道（手動）
- 🔒 設計團隊
- 🔒 技術討論
特性：完全自由建立、創建者邀請成員
```

#### 2. 資料統一架構

```typescript
// 唯一資料來源
useTodoStore
  ↓
旅遊團管理（監控視圖）  ←→  工作空間（協作視圖）

// 無需同步邏輯
- 建立任務 → 即時顯示兩邊
- 更新狀態 → 自動同步兩邊
- 完成任務 → 即時更新兩邊
```

#### 3. Canvas 設計理念

**Canvas 是頻道內的工作區，分三種類型：**

```typescript
type CanvasType = 'checklist' | 'document' | 'files';

// 📋 待辦清單（已實作）
- 與 useTodoStore 整合
- 列表式設計（緊湊顯示）
- 可展開查看子任務和討論
- 直接勾選完成

// 📄 文件（架構已預留）
- 富文本編輯器
- 會議記錄、SOP 文件
- 協作編輯

// 📁 檔案庫（架構已預留）
- 檔案上傳/下載
- 版本管理
- 快速分享
```

---

### 💡 實作細節

#### 1. 待辦清單設計（重點功能）

**設計原則：高資訊密度 + 可展開詳情**

```
列表視圖（收起）：
┌─────────────────────────────────────────────┐
│ ☐ ★★★★☆ 確認機票訂位  @李助理  01/15  3/5 ▼│
│ ☑ ★★★☆☆ 收齊護照影本  @李助理  01/10 15/20▼│
│ ☐ ★★☆☆☆ 準備行程手冊  @王業務  01/18  0/3 ▼│
└─────────────────────────────────────────────┘
  ↑   ↑      ↑           ↑        ↑      ↑   ↑
  完  緊急   任務名      負責人   期限   進度 展開
  成  程度

展開視圖：
┌─────────────────────────────────────────────┐
│ ☑ ★★★☆☆ 收齊護照影本  @李助理  01/10 15/20▲│
│                                             │
│ 子任務：                                    │
│ ☑ 發送通知給所有團員                       │
│ ☑ 收集15份護照影本                         │
│ ☐ 催繳剩餘5份                              │
│                                             │
│ 討論 (2):                                   │
│ 💬 王業務  2小時前                          │
│    王小明還沒給，他說護照在老婆那          │
│                                             │
│ 💬 李助理  1小時前                          │
│    好的我再催一次                          │
│                                             │
│ [💬 新增回覆... (Enter 送出)]              │
└─────────────────────────────────────────────┘
```

**功能特色：**

- ✅ 一次可看 10+ 個任務（列表式）
- ✅ 點擊展開看詳情
- ✅ 直接勾選完成（主任務 + 子任務）
- ✅ 即時新增討論回覆
- ✅ Enter 快速送出
- ✅ 已完成的任務半透明顯示

#### 2. 跳轉流程實作

```typescript
// 在旅遊團管理 > 任務分頁
<Button onClick={() => {
  router.push(`/workspace?channel=${tourId}&tab=canvas`);
}}>
  前往工作空間協作
</Button>

// 工作空間接收參數
const searchParams = useSearchParams();
const channelId = searchParams.get('channel');
const tab = searchParams.get('tab');

// 自動選擇頻道 + 切換到 Canvas
useEffect(() => {
  if (channelId) setActiveChannel(channelId);
  if (tab === 'canvas') setActiveTab('canvas');
}, [channelId, tab]);
```

#### 3. 旅遊團頻道自動建立

```typescript
// 在 tour-store.ts 或 workspace-store.ts
function createTourChannel(tour: Tour) {
  // 只為「確認」「執行中」狀態建立頻道
  if (tour.status === '提案') return

  const channel: Channel = {
    id: tour.id,
    name: `#${tour.tourCode}-${tour.tourName}`,
    type: 'tour',
    tourId: tour.id,
    members: [
      tour.salesPersonId, // 業務
      tour.assistantId, // 助理
      'william-uuid', // 威廉（系統系統主管）
    ],
    isArchived: tour.status === '結案',
  }

  // 同時建立 Canvas
  createCanvas(channel.id, 'checklist')
}
```

---

### 🎨 介面設計

#### 整體佈局（Slack 風格）

```
┌────────────┬────────────────────────────────────┐
│            │ #TYO240815-東京賞櫻團      [⚙️]   │
│ 工作空間   │ ─────────────────────────────────  │
│ [+新增頻道]│ [💬 訊息] [📋 Canvas] [⚙️ 設定]   │
│            │                                     │
│ 固定頻道   │ ┌─────────────────────────────────┐│
│ # 📢 公告  ││ Canvas > 待辦清單                ││
│ # 🏢 常用  ││                                   ││
│            ││ ☐ ★★★★☆ 確認機票訂位 @李 01/15  ││
│ 旅遊團     ││ ☑ ★★★☆☆ 收齊護照影本 @李 01/10  ││
│ # #TYO... ◄││ ☐ ★★☆☆☆ 準備行程手冊 @王 01/18  ││
│ # #OKI...  ││                                   ││
│            │└─────────────────────────────────┘│
│ 私人頻道   │                                     │
│ 🔒 設計團隊││                                   │
│            ││                                   │
└────────────┴────────────────────────────────────┘
```

---

### 🔄 資料流程

#### 任務建立流程

```
1. 威廉在「旅遊團管理」建立任務
   ↓
2. 寫入 useTodoStore
   ↓
3. 兩邊同時看到：
   - 旅遊團管理 > 任務分頁（表格式）
   - 工作空間 > Canvas（列表式）
```

#### 任務完成流程

```
1. 李助理在「工作空間」勾選完成子任務
   ↓
2. 更新 useTodoStore
   ↓
3. 兩邊同時更新：
   - 進度：2/3 → 3/3
   - 狀態：進行中 → 已完成
```

#### 訊息流程

```
1. 用戶在頻道發送訊息
   ↓
2. 寫入 workspace-store (messages)
   ↓
3. 即時顯示在頻道內
   ↓
4. （未來）觸發通知給頻道成員
```

---

### 🚀 使用場景

#### 場景 1：處理旅遊團任務

```
步驟 1 - 威廉指派任務
  位置：旅遊團管理 > #TYO240815 > 任務分頁
  操作：新增任務「確認機票訂位」→ 指派給李助理

步驟 2 - 李助理收到通知
  位置：工作空間
  顯示：#TYO240815 頻道有新任務（紅點通知）

步驟 3 - 李助理處理任務
  位置：工作空間 > #TYO240815 > Canvas
  操作：
    - 展開任務「確認機票訂位」
    - 勾選完成子任務「查詢航班」
    - 在討論區回覆「已查到 CI100」

步驟 4 - 威廉監控進度
  位置：旅遊團管理 > 任務分頁
  看到：
    - 進度：1/3
    - 可點「前往工作空間」看討論內容

步驟 5 - 任務完成
  位置：工作空間 > Canvas
  操作：李助理勾選主任務完成
  結果：
    - 任務變半透明
    - 進度：3/3
    - 兩邊都更新為「已完成」
```

#### 場景 2：團隊討論

```
步驟 1 - 建立私人頻道
  位置：工作空間
  操作：點擊「+ 新增頻道」→ 輸入「設計團隊」

步驟 2 - 邀請成員
  （架構已預留，UI 待實作）

步驟 3 - 發送訊息
  位置：#設計團隊頻道
  操作：
    - 輸入訊息「新模板設計討論」
    - 上傳檔案（架構已預留）
    - 表情反應 👍

步驟 4 - 釘選重要訊息
  操作：懸停訊息 → 點擊釘選按鈕
  結果：訊息出現在頂部「釘選區域」
```

---

### 📊 技術實作

#### Store 設計

```typescript
// workspace-store.ts (200行)
interface WorkspaceStore {
  // 頻道管理
  channels: Channel[]
  activeChannelId: string | null
  createChannel: (data: CreateChannelData) => void
  archiveChannel: (channelId: string) => void

  // 訊息管理
  messages: Message[]
  sendMessage: (channelId: string, content: string) => void
  addReaction: (messageId: string, emoji: string) => void
  togglePin: (messageId: string) => void

  // Canvas 管理
  canvasDocuments: CanvasDocument[]
  createCanvas: (channelId: string, type: CanvasType) => void

  // 檔案管理（預留）
  files: ChannelFile[]
  uploadFile: (channelId: string, file: File) => void
}
```

#### 型別定義

```typescript
// Channel 頻道
interface Channel {
  id: string
  name: string
  type: 'fixed' | 'tour' | 'custom'
  tourId?: string // 旅遊團頻道專用
  members: string[] // 成員 UUID 列表
  isArchived: boolean // 是否封存
  createdAt: string
  createdBy: string
}

// Message 訊息
interface Message {
  id: string
  channelId: string
  content: string
  senderId: string
  senderName: string
  senderAvatar: string
  createdAt: string
  reactions: { emoji: string; users: string[] }[]
  isPinned: boolean
  threadId?: string // 回覆串（預留）
}

// Canvas 文件
interface CanvasDocument {
  id: string
  channelId: string
  type: 'checklist' | 'document' | 'files'
  title: string
  content?: string // 富文本內容（預留）
  createdAt: string
  updatedAt: string
}
```

---

### ✨ 已實作功能清單

#### ✅ 頻道系統

- [x] 固定頻道（公告、常用空間）
- [x] 旅遊團頻道（自動建立）
- [x] 自訂頻道（手動建立）
- [x] 頻道封存（旅遊團結案後）
- [x] 顯示/隱藏封存頻道開關

#### ✅ 訊息功能

- [x] 發送文字訊息
- [x] Enter 送出，Shift+Enter 換行
- [x] 表情符號反應
- [x] 釘選訊息
- [x] 釘選區域顯示
- [x] 智能時間格式化
- [x] 頭像和用戶名稱顯示
- [x] 自動滾動到最新訊息

#### ✅ Canvas 功能

- [x] 待辦清單類型
- [x] 列表式設計
- [x] 展開/收起詳情
- [x] 勾選完成（主任務 + 子任務）
- [x] 新增討論回覆
- [x] 星級緊急度顯示
- [x] 進度條顯示
- [x] 負責人和期限顯示
- [x] 已完成任務半透明

#### ✅ 任務整合

- [x] 與 useTodoStore 統一資料
- [x] 旅遊團管理顯示任務（表格式）
- [x] 工作空間顯示任務（列表式）
- [x] 「前往工作空間」跳轉按鈕
- [x] 自動選擇對應頻道
- [x] 自動切換到 Canvas 分頁
- [x] 雙向即時同步

---

### 🔮 待實作功能（架構已預留）

#### 📝 富文本編輯器

```typescript
// 架構：Canvas 文件類型已預留
// 需要：整合 Tiptap 或 Slate
type: 'document'

功能：
- 會議記錄
- SOP 文件
- 協作編輯
```

#### 📁 檔案上傳

```typescript
// 架構：Store 方法已預留
uploadFile: (channelId: string, file: File) => void

功能：
- 拖拽上傳
- 圖片預覽
- 檔案版本管理
```

#### 💬 回覆串

```typescript
// 架構：Message.threadId 已預留
interface Message {
  threadId?: string;
}

功能：
- 點擊訊息開啟側邊欄
- 顯示回覆串
- 未讀回覆提示
```

#### 🔔 通知系統

```typescript
// 架構：可監聽 Store 變化
功能：
- @提及通知
- 新訊息通知
- 任務指派通知
- 瀏覽器推送通知
```

#### 👥 成員管理

```typescript
// 架構：Channel.members 已預留
功能：
- 邀請成員對話框
- 成員列表顯示
- 權限設定（擁有者/成員）
```

#### 💰 快速請款單

```typescript
// 架構：可在訊息區加按鈕
功能：
- 快速表單彈窗
- 一鍵送出請款
- 關聯到旅遊團
```

---

### 🎯 設計亮點

#### 1. 資料統一，無需同步

```typescript
// ❌ 錯誤做法：雙向同步
旅遊團任務 ←同步邏輯→ 工作空間任務

// ✅ 正確做法：單一資料來源
useTodoStore
  ↓
旅遊團（監控視圖）+ 工作空間（協作視圖）
```

#### 2. 列表式設計，資訊密度高

```
✅ 一次可看 10+ 個任務
✅ 點擊展開看詳情
✅ 收起時保持簡潔
✅ 不浪費螢幕空間
```

#### 3. 智能跳轉

```
旅遊團 → 點擊按鈕 → 工作空間
  ↓
自動選擇對應頻道
  ↓
自動切換到 Canvas 分頁
  ↓
立即看到任務列表
```

#### 4. 無縫整合

```
建立任務（旅遊團）→ 即時顯示（工作空間）
完成任務（工作空間）→ 即時更新（旅遊團）
討論任務（工作空間）→ 可查看進度（旅遊團）
```

---

### 🚦 開發檢查清單

#### 核心功能

- [x] workspace-store.ts
- [x] workspace/page.tsx
- [x] channel-list.tsx
- [x] channel-view.tsx
- [x] canvas-view.tsx
- [x] workspace-task-list.tsx
- [x] create-channel-dialog.tsx
- [x] tour-task-assignment.tsx（加入跳轉按鈕）

#### 測試驗證

- [ ] 測試旅遊團頻道自動建立
- [ ] 測試任務同步
- [ ] 測試訊息發送
- [ ] 測試 Canvas 任務清單
- [ ] 測試跳轉流程
- [ ] 測試封存功能

#### Phase 3: 進階功能 ⏳ 待實作

- [ ] 富文本編輯器整合
- [ ] 檔案上傳功能
- [ ] 成員邀請功能
- [ ] 回覆串功能
- [ ] 通知系統
- [ ] 快速請款單

---

### 📈 效能考量

#### IndexedDB 查詢優化

```typescript
// ✅ 好的做法：按頻道查詢
messages.where('channelId').equals(channelId).toArray();

// ❌ 避免：全部載入再篩選
messages.toArray().then(all => all.filter(...));
```

#### 訊息分頁載入

```typescript
// 建議：每次載入 50 則
const MESSAGES_PER_PAGE = 50

// 實作：向上滾動載入更多
onScroll(() => {
  if (scrollTop === 0) loadMoreMessages()
})
```

#### Canvas 文件快取

```typescript
// 建議：切換頻道時保留前一個頻道的 Canvas
const canvasCache = new Map<string, CanvasDocument>()
```

---

### 🔒 安全考量

#### 權限檢查（Phase 2 實作）

```typescript
// 檢查是否為頻道成員
function canAccessChannel(userId: string, channel: Channel) {
  return channel.members.includes(userId)
}

// 檢查是否可刪除訊息
function canDeleteMessage(userId: string, message: Message) {
  return message.senderId === userId || isAdmin(userId)
}

// 檢查是否可封存頻道
function canArchiveChannel(userId: string, channel: Channel) {
  if (channel.type === 'fixed') return false // 固定頻道不可封存
  if (channel.type === 'tour') return isAdmin(userId)
  return channel.createdBy === userId
}
```

#### 資料驗證

```typescript
// 訊息長度限制
const MAX_MESSAGE_LENGTH = 5000

// 頻道名稱規則
const CHANNEL_NAME_PATTERN = /^[a-zA-Z0-9\u4e00-\u9fa5-_]{1,50}$/

// 檔案大小限制
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
```

---

### 📚 參考資料

#### 設計靈感

- Slack（頻道系統、訊息介面）
- Notion（Canvas 文件、任務清單）
- Linear（任務列表式設計）

#### 技術參考

- Zustand（狀態管理）
- Dexie.js（IndexedDB）
- shadcn/ui（UI 組件）
- Tailwind CSS（樣式）

---

### 🎓 經驗教訓

#### ✅ 做對的事

1. **資料統一**：用 useTodoStore 做唯一資料來源
2. **參考現有**：使用相同的 Store 模式和組件風格
3. **列表設計**：高資訊密度，可展開詳情
4. **預留擴充**：架構支援未來功能，但不預先實作

#### ⚠️ 未來注意

1. **效能優化**：大量訊息時需要分頁載入
2. **即時同步**：多人協作時需要 WebSocket
3. **通知系統**：需要整合瀏覽器通知 API
4. **檔案管理**：需要考慮儲存空間限制

---

**工作空間實作完成時間**: 2025-10-07 02:00
**總代碼量**: 1,020 行
**總檔案數**: 8 個（7 新增 + 1 修改）
**測試狀態**: ⏳ 待測試
**部署狀態**: ⏳ 待驗證

---

## 🏗️ Store 架構定案（v5.7.0 - 2025-01-07）

### ✅ 最終決定

**定案聲明**: 此架構已定案，不再修改。混合架構是務實選擇，不是技術債。

| 決策項目       | 決定              | 原因                   |
| -------------- | ----------------- | ---------------------- |
| 新功能 Store   | 使用 create-store | 統一、簡單、可維護     |
| 複雜業務 Store | 保留個別檔案      | 特殊邏輯需要獨立管理   |
| 混合架構       | ✅ 接受           | 務實選擇，各取所長     |
| 技術債         | ❌ 不是           | 這是經過評估的設計決策 |

---

### 📁 Store 分類

#### ✅ 使用 create-store 工廠（統一架構）

**核心業務 Store**：

- `useTourStore` - 旅遊團管理
- `useOrderStore` - 訂單管理
- `useCustomerStore` - 客戶管理
- `usePaymentStore` - 付款管理
- `useQuoteStore` - 報價單管理

**財務管理 Store**：

- `usePaymentRequestStore` - 請款單
- `useDisbursementOrderStore` - 支出單
- `useReceiptOrderStore` - 收據管理

**輔助功能 Store**：

- `useTodoStore` - 待辦事項 ✅ 已統一
- `useVisaStore` - 簽證管理 ✅ 已統一
- `useSupplierStore` - 供應商管理 ✅ 已統一
- `useCalendarEventStore` - 行事曆 ✅ 已統一
- `useEmployeeStore` - 員工管理
- `useMemberStore` - 團員管理
- `useQuoteItemStore` - 報價項目

#### ⛔ 保留個別檔案（特殊邏輯）

| Store                | 檔案                | 代碼量   | 保留原因                |
| -------------------- | ------------------- | -------- | ----------------------- |
| `useAccountingStore` | accounting-store.ts | 500+ 行  | 4個子實體、複雜交易邏輯 |
| `useWorkspaceStore`  | workspace-store.ts  | 1000+ 行 | 頻道、訊息、Canvas 整合 |
| `useTimeboxStore`    | timebox-store.ts    | 400+ 行  | 計時器、狀態機邏輯      |
| `useAuthStore`       | auth-store.ts       | 300+ 行  | 認證、權限特殊處理      |
| `useUserStore`       | user-store.ts       | 200+ 行  | 人資複雜權限邏輯        |

---

### 📝 使用規範

#### 新功能開發

```typescript
// ✅ 正確：使用 create-store
export const useNewFeatureStore = createStore<NewFeature>('table_name', 'PREFIX')
```

#### 引用 Store

```typescript
// ✅ 正確：統一從 @/stores 引入
import { useTourStore, useOrderStore } from '@/stores'

// ❌ 錯誤：直接引入個別檔案
import { useTourStore } from '@/stores/tour-store' // 已刪除
```

#### 何時使用 create-store？

✅ **適合使用 create-store**：

- 簡單的 CRUD 操作
- 標準的資料表對應
- 狀態管理邏輯簡單
- 可復用的業務模式

❌ **不適合使用 create-store**：

- 複雜的業務邏輯（如會計規則）
- 特殊的狀態管理需求（如時間盒）
- 全域設定型 Store（如主題、工作空間）
- 需要特殊計算的邏輯（如行事曆）

---

### 🎯 執行完成記錄

#### 2025-01-07 統一任務

**刪除的檔案** (4個)：

- ❌ `src/stores/calendar-store.ts` → 改用 `useCalendarEventStore`
- ❌ `src/stores/todo-store.ts` → 改用 `useTodoStore`
- ❌ `src/stores/visa-store.ts` → 改用 `useVisaStore`
- ❌ `src/stores/supplier-store.ts` → 改用 `useSupplierStore`

**更新的引用** (9個檔案)：

- ✅ `src/app/todos/page.tsx`
- ✅ `src/features/todos/hooks/useTodos.ts`
- ✅ `src/features/todos/services/todo.service.ts`
- ✅ `src/components/todos/todo-card-groups.tsx`
- ✅ `src/app/visas/page.tsx`
- ✅ `src/app/database/suppliers/page.tsx`
- ✅ `src/app/finance/requests/page.tsx`
- ✅ `src/features/suppliers/hooks/useSuppliers.ts`
- ✅ `src/features/suppliers/services/supplier.service.ts`

**保留的檔案** (5個)：

- ✅ `src/stores/accounting-store.ts` - 特殊邏輯
- ✅ `src/stores/workspace-store.ts` - 特殊邏輯
- ✅ `src/stores/timebox-store.ts` - 特殊邏輯
- ✅ `src/stores/auth-store.ts` - 特殊邏輯
- ✅ `src/stores/user-store.ts` - 特殊邏輯

---

### 📊 統計數據

| 項目               | 數量  | 說明         |
| ------------------ | ----- | ------------ |
| create-store Store | 16 個 | 統一架構     |
| 個別檔案 Store     | 5 個  | 特殊邏輯保留 |
| 總 Store 數量      | 21 個 | 完整涵蓋     |
| 統一率             | 76%   | 16/21 = 76%  |
| 刪除重複檔案       | 4 個  | 減少維護負擔 |
| 更新引用           | 9 個  | 統一引用方式 |

---

### 🎓 設計理念

#### 為什麼混合架構？

1. **務實選擇**
   - 簡單的用工廠（快速開發）
   - 複雜的用獨立（靈活控制）

2. **不是技術債**
   - 這是經過評估的設計決策
   - 每個 Store 都有明確的理由

3. **未來可維護**
   - 新功能統一使用 create-store
   - 特殊需求保留獨立 Store
   - 架構清晰，職責明確

#### 不統一的 Store 是問題嗎？

**答案：不是！**

- ✅ 會計邏輯複雜，獨立管理更安全
- ✅ 工作空間 1000+ 行，需要獨立維護
- ✅ 時間盒有狀態機，create-store 不適合
- ✅ 認證系統特殊，需要獨立處理

---

### 📖 開發指南

#### 新增功能時

```typescript
// Step 1: 評估是否適合 create-store
if (業務邏輯簡單 && 標準 CRUD) {
  // 使用 create-store
  export const useNewStore = createStore<NewType>('table_name');
} else {
  // 建立獨立 Store
  // 參考 accounting-store.ts 或 workspace-store.ts
}

// Step 2: 統一引用方式
import { useNewStore } from '@/stores'; // ✅ 正確

// Step 3: 更新文檔
// - 更新 VENTURO_5.0_MANUAL.md
// - 更新 STORE_ANALYSIS.md
```

---

### ⚠️ 注意事項

1. **不要隨意修改架構**
   - 此架構已定案
   - 有問題先討論
   - 大改動需要 William 批准

2. **保持一致性**
   - 新功能統一用 create-store（除非有特殊需求）
   - 引用統一從 @/stores 引入
   - 命名統一使用 useXxxStore

3. **文檔同步**
   - 新增 Store 要更新文檔
   - 重要變更要記錄原因
   - 保持 MANUAL 和代碼一致

---

**定案日期**: 2025-01-07 21:00
**決策者**: William & Claude
**狀態**: ✅ 已定案，開始衝刺
**下一階段**: 專注功能開發，不再糾結架構

---

## 📖 開發規範

### 核心原則

#### 1. 簡單優先

- 不過度設計
- 夠用就好
- 避免預先優化

#### 2. 漸進增強

- 先讓它動
- 再讓它對
- 最後讓它快

#### 3. 保持彈性

- 預留擴充空間
- 但不預先實作
- 按需調整

---

### 絕對禁止

#### 禁止 1: 直接修改 Store 架構

**錯誤示範**：

```typescript
// ❌ 直接修改 create-store.ts
export function createStore<T>(tableName: string) {
  // 新增一堆自己的邏輯
}
```

**正確做法**：

1. 先在團隊群組討論
2. 評估影響範圍
3. 更新文檔
4. 逐步遷移

#### 禁止 2: 混用資料庫

**錯誤示範**：

```typescript
// ❌ 直接使用 Supabase（應該透過 Store）
import { supabase } from '@/lib/supabase/client'
const { data } = await supabase.from('tours').select()

// ❌ 直接使用 localStorage
localStorage.setItem('tour-data', JSON.stringify(tours))
```

**正確做法**：

```typescript
// ✅ 統一使用 localDB
import { localDB } from '@/lib/db'
const tours = await localDB.getAll('tours')
```

#### 禁止 3: 跳過規格直接寫程式碼

**錯誤流程**：

```
接到需求 → 立刻寫程式碼 → 發現問題 → 重寫 → 浪費時間
```

**正確流程**：

```
接到需求 → 寫規格文檔 → 討論確認 → 開始實作 → 測試 → 上線
```

#### 禁止 4: 不更新文檔

**錯誤示範**：

- 改了程式碼但不更新 README
- 新增功能但不寫規格
- 修 Bug 但不記錄

**正確做法**：

- 每次 commit 都確認文檔是否需要更新
- 每週五固定更新 WORK_LOG.md
- 重要變更立即更新 SYSTEM_STATUS.md

---

### 資料庫規範

> ⚠️ **架構更新 (2026-01)**：系統已升級為純雲端架構，以下 `localDB` 範例已棄用。

#### ~~統一使用 localDB~~ (已棄用)

**現行架構：使用 Supabase + Zustand Store**

```typescript
// ✅ 正確：使用 Store（內部使用 Supabase）
import { useTourStore } from '@/stores'

const { items, fetchAll, create, update, delete: remove } = useTourStore()

// 取得所有資料
await fetchAll()

// 建立
await create(tourData)

// 更新
await update(id, { name: '新名稱' })

// 刪除
await remove(id)

// 查詢（使用 SWR）
const { data } = useSWR('tours', async () => {
  const { data } = await supabase.from('tours').select('*')
  return data
})
```

#### 欄位命名規範

```typescript
// ✅ 統一使用 snake_case（前後端一致）
interface Tour {
  id: string
  code: string
  name: string
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// ❌ 不要使用 camelCase
interface BadTour {
  tourId: string // ❌
  tourName: string // ❌
  startDate: string // ❌
  createdAt: string // ❌
}
```

**重要說明：**

- VENTURO 系統統一使用 **snake_case** 命名
- 與資料庫（IndexedDB/Supabase）保持一致
- 避免前後端欄位名稱轉換

---

### Store 使用規範

#### 何時使用 create-store？

```typescript
// ✅ 適合：簡單 CRUD
import { useTourStore } from '@/stores/tour-store'

const tours = useTourStore(state => state.items)
const addTour = useTourStore(state => state.add)
```

#### 何時使用獨立 Store？

```typescript
// ✅ 適合：複雜業務邏輯
import { useAccountingStore } from '@/stores/accounting-store'

// 複雜的會計計算邏輯
const calculateTax = useAccountingStore(state => state.calculateTax)
```

---

### 新功能開發流程

```markdown
1. 需求討論（團隊會議）
   - 確認需求範圍
   - 評估技術可行性
   - 預估開發時間

2. 撰寫規格文檔（docs/features/FEATURE_NAME.md）
   - 功能描述
   - 資料結構
   - UI 設計
   - API 設計
   - 測試計畫

3. Code Review 檢查點
   - 檢查資料庫使用正確
   - 檢查 Store 架構正確
   - 檢查命名規範
   - 檢查文檔更新

4. 測試驗收
   - 功能測試
   - 資料驗證
   - 錯誤處理

5. 文檔更新
   - 更新 SYSTEM_STATUS.md
   - 更新 WORK_LOG.md
   - 更新 API 文檔（如果有）
```

---

### Git Commit 規範

```bash
# ✅ 正確的 commit message
feat: 新增旅遊團篩選功能
fix: 修正訂單金額計算錯誤
docs: 更新系統架構文檔
refactor: 重構 tour-store 架構
test: 新增客戶管理測試

# ❌ 錯誤的 commit message
update
fix bug
修改
test
```

---

### 檔案命名規範

```
✅ 正確：
  - tour-store.ts
  - customer-page.tsx
  - use-tour-data.ts
  - format-currency.ts

❌ 錯誤：
  - TourStore.ts
  - CustomerPage.tsx
  - useTourData.ts
  - FormatCurrency.ts
```

---

## 📋 Code Review 檢查清單

### 資料層檢查

- [ ] 透過 Store 操作資料（不直接使用 Supabase 或 IndexedDB）
- [ ] 沒有使用 localStorage 儲存業務資料
- [ ] 所有欄位命名統一使用 snake_case
- [ ] 沒有混用 camelCase 和 snake_case

### Store 檢查

- [ ] 選擇正確的 Store 架構（create-store vs 獨立）
- [ ] 沒有修改 create-store.ts 核心邏輯
- [ ] Store 命名符合規範（useXxxStore）

### TypeScript 型別

- [ ] 所有函數都有型別定義
- [ ] 沒有使用 `any` 型別（除非必要）
- [ ] interface/type 命名清楚
- [ ] 有匯出需要共用的型別

### 程式碼品質

- [ ] 變數命名清楚易懂
- [ ] 函數單一職責
- [ ] 沒有重複程式碼
- [ ] 有必要的註解說明
- [ ] 移除 console.log（除非必要）
- [ ] 移除註解掉的程式碼

### UI/UX

- [ ] 使用 shadcn/ui 組件
- [ ] 響應式設計（手機/平板/桌面）
- [ ] Loading 狀態處理
- [ ] 錯誤訊息友善
- [ ] 成功提示清楚

### 測試

- [ ] 手動測試功能正常
- [ ] 測試邊界情況
- [ ] 測試錯誤處理
- [ ] 有測試資料（在 init-local-data.ts）

### 文檔

- [ ] 更新相關文檔
- [ ] 新功能有規格文檔
- [ ] 重大變更記錄在 WORK_LOG.md
- [ ] README 需要更新的已更新

### Git

- [ ] Commit message 符合規範
- [ ] 沒有包含不必要的檔案
- [ ] 沒有包含敏感資訊（密碼、API Key）
- [ ] Branch 命名清楚（feature/xxx, fix/xxx）

---

### 正確示範

#### 資料庫操作

```typescript
// ✅ 正確：使用 Supabase（現行架構 2026-01）
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'

async function getTours() {
  try {
    const { data: tours, error } = await supabase
      .from('tours')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data: tours }
  } catch (error) {
    logger.error('取得旅遊團失敗:', error)
    return { success: false, error: '無法取得資料' }
  }
}
```

#### Store 使用

```typescript
// ✅ 正確：使用 create-store
import { useTourStore } from '@/stores/tour-store';

function TourList() {
  const tours = useTourStore(state => state.items);
  const fetchTours = useTourStore(state => state.fetchAll);

  useEffect(() => {
    fetchTours();
  }, [fetchTours]);

  return (
    <div>
      {tours.map(tour => (
        <TourCard key={tour.id} tour={tour} />
      ))}
    </div>
  );
}
```

#### 型別定義

```typescript
// ✅ 正確：清楚的型別定義
interface Tour {
  id: string
  name: string
  start_date: string
  end_date: string
  price: number
  status: 'draft' | 'published' | 'archived'
}

interface TourListProps {
  tours: Tour[]
  onSelect: (tour: Tour) => void
}
```

#### 錯誤處理

```typescript
// ✅ 正確：完整的錯誤處理（現行架構 2026-01）
import { useTourStore } from '@/stores'
import { logger } from '@/lib/utils/logger'

async function createTour(tourData: CreateTourInput) {
  try {
    // 驗證資料
    if (!tourData.name || !tourData.start_date) {
      throw new Error('必填欄位不可為空')
    }

    // 透過 Store 建立（內部使用 Supabase）
    const tour = await useTourStore.getState().create(tourData)

    return { success: true, data: tour }
  } catch (error) {
    logger.error('建立旅遊團失敗:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '建立失敗',
    }
  }
}
```

---

### 錯誤示範

#### 資料庫操作

```typescript
// ❌ 錯誤：使用已棄用的 localDB（2026-01 已棄用）
import { localDB } from '@/lib/db'
const tours = await localDB.getAll('tours') // 不再支援

// ❌ 錯誤：使用 localStorage 儲存業務資料
function saveTour(tour: Tour) {
  localStorage.setItem('current-tour', JSON.stringify(tour))
}

// ✅ 正確：使用 Store（內部使用 Supabase）
import { useTourStore } from '@/stores'
const { items } = useTourStore()
```

#### Store 使用

```typescript
// ❌ 錯誤：直接修改 state
function TourList() {
  const tours = useTourStore(state => state.items)

  // ❌ 直接修改
  tours.push(newTour)

  // ✅ 應該使用 action
  useTourStore.getState().add(newTour)
}
```

#### 型別定義

```typescript
// ❌ 錯誤：使用 any
function processTour(data: any) {
  return data.name
}

// ❌ 錯誤：缺少型別
function getTourPrice(tour) {
  return tour.price
}
```

---

## 🆘 遇到問題怎麼辦？

### 資料庫相關問題

**問題**：資料沒有儲存

```typescript
// 檢查步驟：
1. 訪問 /system-health 查看資料表狀態
2. 確認使用 localDB.create() 而非其他方式
3. 檢查 console 是否有錯誤訊息
4. 嘗試重新初始化資料庫
```

**問題**：找不到資料

```typescript
// 檢查步驟：
1. 確認資料確實存在（/system-health）
2. 檢查查詢條件是否正確
3. 確認欄位名稱（snake_case）
4. 使用 console.log 除錯
```

### Store 相關問題

**問題**：Store 狀態不更新

```typescript
// 檢查步驟：
1. 確認使用正確的 Store
2. 檢查是否有 async/await 遺漏
3. 確認 Store 的 action 有正確呼叫
4. 檢查 React 組件是否有訂閱 Store
```

---

## 📚 參考文檔

- `PROJECT_PRINCIPLES.md` - 專案原則與設計理念
- `SYSTEM_STATUS.md` - 系統現況
- `FEATURE_SPECIFICATIONS.md` - 功能規格
- `WORK_LOG.md` - 工作日誌

---

**最後更新**：2025-01-21
**維護者**：William Chien
