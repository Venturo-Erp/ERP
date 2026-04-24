# Database 基礎資料模組體檢報告

**掃描日期**：2026-04-23  
**範圍**：6 個頁面 + API + 資料層 + DB schema  
**掃描者**：Explore agent  
**掃描時間**：45 分鐘

---

## 一句話狀況

Database 模組整體乾淨，但有 **3 個設計債** 和 **1 個幽靈功能**（company-assets 頁面在 menu 但無實作）；**硬編中文 label、重複 CRUD hook pattern、tour-leaders 缺稽核欄位** 是上線前務必處理的小債。

---

## 🔴 真問題（上線前處理）

### 1. **幽靈功能：company-assets 頁面參考但不存在**

- **檔案**：`src/app/(main)/database/page.tsx:40-47`
- **問題**：Database 首頁在功能卡片列出 `company-assets` 模組，但 `/database/company-assets` 路由完全未實作
- **證據**：
  ```
  - page.tsx 定義 href: '/database/company-assets'，但目錄不存在
  - 無對應的 /src/features/company-assets folder
  - 無 page.tsx、API route
  ```
- **影響**：使用者點擊卡片會 404、造成困惑
- **修復**：刪除卡片定義 或 補完實作

---

### 2. **tour-leaders 表缺稽核欄位（created_by / updated_by）**

- **檔案**：`supabase/migrations/20251216120000_create_tour_leaders.sql`
- **問題**：
  - tour-leaders 表**無** `created_by`、`updated_by`、`workspace_id` 欄位
  - 其他基礎資料表（attractions、suppliers）都有這些欄位
  - CLAUDE.md §8 規定：「審計欄位 FK 一律指 employees(id)」
- **DB schema**（tour_leaders 目前的欄位）：
  ```sql
  CREATE TABLE public.tour_leaders (
    id UUID PRIMARY KEY,
    code VARCHAR(20) UNIQUE,
    name VARCHAR(100) NOT NULL,
    phone, email, address, -- 共用欄位
    created_at, updated_at  -- ✓ 有時間戳
    -- ✗ 無 created_by, updated_by, workspace_id
  )
  ```
- **預期設計**（對齊 attractions / suppliers）：
  ```sql
  ALTER TABLE tour_leaders
    ADD COLUMN created_by TEXT REFERENCES employees(id) ON DELETE SET NULL,
    ADD COLUMN updated_by TEXT REFERENCES employees(id) ON DELETE SET NULL,
    ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
  ```
- **影響**：
  - 無法追蹤誰建立/修改領隊資料
  - 不符合多租戶隔離要求（沒有 workspace_id filter）
  - 未來合規性風險
- **掃描 code 層**：
  - `src/features/tour-leaders/components/TourLeadersPage.tsx` 無 workspace 過濾邏輯
  - 所有使用者看到的是**全局領隊列表**，不區分租戶
- **必做**：migration 新增 3 欄，並在 RLS policy 加 `eq(workspace_id, auth.jwt.user.workspace_id)`

---

### 3. **transportation_rates 直查 Supabase、無 entity hook 封裝**

- **檔案**：`src/app/(main)/database/transportation-rates/page.tsx:18-35`
- **問題**：

  ```typescript
  // ❌ 直接 supabase.from('transportation_rates').select(...)
  const fetchRates = async (): Promise<TransportationRate[]> => {
    const { data, error } = await supabase
      .from('transportation_rates')
      .select('id, country_id, country_name, ...')
      .order('category')
      .order('supplier')
      .order('route')
      .limit(500)
  }
  ```

  - Page 層直查 DB，違反 **SSOT（Single Source of Truth）**
  - 其他頁面（suppliers、attractions）用 `useSuppliers()` / `useAttractions()` hook
  - transportation_rates 有 entity hook `useTransportationRates` 卻不用，反而手寫

- **對比**：
  - ✓ `src/features/suppliers/components/SuppliersPage.tsx` 用 `useSuppliers()`
  - ✓ `src/features/attractions/components/DatabaseManagementPage.tsx` 用 `useAttractions()`
  - ✗ transportation-rates page 直查、無 useTransportationRates 呼叫
- **影響**：
  - Cache 失效、每次重新載入
  - 若要修改欄位選擇或 filter 邏輯，要改 page 層而不是統一的 entity hook
  - 跨模組不一致
- **必做**：
  ```typescript
  const { data: rates = [] } = useTransportationRates()
  ```

---

## 🟡 小債（上線後優先）

### 1. **硬編中文 label（沒入 constants）**

- **位置**：
  - `src/features/suppliers/components/SuppliersDialog.tsx:21-30`
    ```typescript
    const SUPPLIER_TYPE_OPTIONS = [
      { value: 'hotel', label: '飯店' }, // ← 硬編
      { value: 'restaurant', label: '餐廳' },
      { value: 'transport', label: '交通' },
      // ...
    ]
    ```
  - `src/features/attractions/components/DatabaseManagementPage.tsx:99-100`
    ```typescript
    { value: DATABASE_MANAGEMENT_PAGE_LABELS.景點, label: '景點' },  // ← 半混合
    { value: 'hotels', label: '飯店', icon: Hotel },  // ← 硬編
    ```
  - `src/features/attractions/components/tabs/RegionsTab.tsx`：`'其他'` 硬編

- **對齐方案**：
  - attractions 已有 `DATABASE_MANAGEMENT_PAGE_LABELS.景點` 等常數
  - 供應商應新增到 `src/features/suppliers/constants/labels.ts`
  - attractions 應檢查所有 label 是否都在 `constants` 內

---

### 2. **重複 CRUD hook pattern（5 個幾乎一樣）**

- **現象**：
  - `src/features/suppliers/`
  - `src/features/attractions/`
  - `src/features/tour-leaders/`
  - `src/data/entities/suppliers.ts`
  - `src/data/entities/attractions.ts`
  - `src/data/entities/tour-leaders.ts`

  都用 `createEntityHook('table_name', { list, slim, detail, cache })` 模式

- **重複代碼**：
  - SuppliersPage / AttractionsDialog / TourLeadersDialog 的架構 90% 一樣
    - useState + isEditMode / isAddDialogOpen
    - useSuppliers / useAttractions / useTourLeaders
    - handleOpenAddDialog / handleEdit 邏輯完全相同
  - 各自有獨立的 form state 管理、validation 邏輯

- **檔案大小警示**：
  - `SuppliersDialog.tsx`: 237 行
  - `TourLeadersDialog.tsx`: 339 行
  - `ImportSuppliersDialog.tsx`: 541 行 (最肥)
  - `LeaderAvailabilityDialog.tsx`: 373 行

- **上線後優化**（非阻礙）：
  - 考慮 generic `useEntityDialog<T>()` hook
  - 或抽 `<GenericFormDialog>` 元件
  - 但現階段功能正常、無 bug

---

### 3. **attractions 有冗餘的 tab 邏輯（hardcoded workspace 判別）**

- **檔案**：`src/features/attractions/components/DatabaseManagementPage.tsx:19-40`
- **問題**：

  ```typescript
  const CORNER_WORKSPACE_ID = '8ef05a74-1f87-48ab-afd3-9bfeb423935d'

  const isCorner = user?.workspace_id === CORNER_WORKSPACE_ID
  const validTabs: readonly TabValue[] = isCorner
    ? ALL_TABS
    : (['regions', 'attractions', 'hotels', 'restaurants'] as const)
  ```

  - 專屬 workspace (`CORNER_WORKSPACE_ID`) 有額外 tab（米其林、頂級體驗）
  - ID 寫死在代碼，應該在 DB or env
  - 若要給別家租戶開放，要改代碼

- **上線後**：移到 `workspace_settings` or env config

---

### 4. **Archive Management 混淆職責**

- **檔案**：`src/app/(main)/database/archive-management/page.tsx`
- **問題**：
  - 名義上是「Database 檔案管理」
  - 實際查詢的是 **tours 表的 archived flag**（屬於業務邏輯、不是基礎資料）
  - 按鈕有「還原」和「永久刪除」，涉及 tour_itinerary_items、channels、orders 等複雜刪除邏輯
  - 與其他 Database 模組頁面（景點、供應商、領隊）性質不同

- **設計問題**：
  - 應該叫「Tour Archive Management」而不是 Database 的子頁面
  - 或應歸屬「Tours 模組」而非 Database

---

### 5. **PageLayout 無統一的 workspace filter**

- **現象**：
  - attractions / suppliers 各自在 useAttractions() / useSuppliers() 透過 createEntityHook 實現 workspace filter（RLS 層）
  - tour-leaders 無任何 workspace_id 欄位、無 filter

- **隱患**：未來有新開發者可能在 page 層忘記加 filter

---

## 🟢 健康面向

### ✓ 整體架構乾淨

- 6 個頁面路由清晰：attractions / suppliers / tour-leaders / transportation-rates / archive-management / （company-assets 缺）
- 無死 import、無孤兒組件
- 功能完整、無重大 bug

### ✓ Entity Hook 統一化

- `src/data/entities/` 下 attractions、suppliers、tour-leaders、transportation-rates 都用統一 createEntityHook
- Cache 預設值恰當（low / medium）
- slim / detail 選擇合理

### ✓ Label 中央化（部分）

- attractions 做得最好：210 行 constants
- suppliers / tour-leaders 也有獨立 labels.ts
- 尚有零星硬編但比例小

### ✓ 多租戶隔離（部分）

- attractions、suppliers 的 entity hook 透過 RLS 實現 workspace 隔離
- tour-leaders 缺這功能（見紅問題 #2）

### ✓ 無死功能殘骸

- 未見 `@/features/accommodation` 或已砍功能的引用
- 導入邏輯（ImportSuppliersDialog）獨立、邏輯完整

### ✓ API 層最小化

- `/api/suppliers` 有基本 GET/POST（GET 目前 stub、但結構對）
- 其他實體都用 client-side entity hook，不走 API route（符合設計）

---

## 跨模組 pattern 候選

### 1. **Generic CRUD Dialog Pattern（可共享給 Tours / Orders / Customers 等）**

- Database 模組的 SuppliersDialog / TourLeadersDialog 可抽象為
- `<EntityFormDialog<T> schema={schema} />` 元件
- 與其他模組共享這個基礎元件

### 2. **Entity Hook Factory 已成熟**

- `createEntityHook()` 的實現已被各 Database 表複用
- 建議文檔化（如何為新表加 hook）、推廣給 Tours / Orders / Finance 等模組

### 3. **Label 中央化規範**

- 各功能模組應有 `src/features/{module}/constants/labels.ts`
- Database 模組做得好，可作範本

---

## 掃描清單附錄

### 欄位層（DB Schema）

- ✓ 無死欄位（每個欄位都有代碼讀寫）
- ✗ **tour-leaders 缺 created_by / updated_by / workspace_id**（紅問題 #2）
- ✓ 無重複概念欄位（name vs display_name 無衝突）
- ✓ 同概念欄位型態一致（country_id 都是 TEXT）
- ✓ Nullable 設定合理（phone / email optional 等）
- ✓ RLS policy 設定（除 tour-leaders 無 workspace 隔離）

### 程式碼層（TS/TSX）

- ✓ 無 dead import（掃全範圍無未使用引用）
- ✗ **company-assets 幽靈功能**（紅問題 #1）
- ⚠ **transportation-rates 直查 Supabase**（紅問題 #3）
- ⚠ 硬編 label（小債 #1）
- ✓ 無巨型檔案 >600 行（最大 541 行）
- ✓ 無舊 feature 殘骸引用

### 邏輯層（API / Hook / Logic）

- ✓ Entity hook 統一實作
- ⚠ CRUD pattern 90% 重複（小債 #2，功能正常）
- ✓ Import/Export（supplier import 邏輯完整、無重複）
- ✓ API endpoint 結構對（GET/POST）

---

## 建議優先次序

| 優先度 | 項目                           | 何時       | 預估工時              |
| ------ | ------------------------------ | ---------- | --------------------- |
| P0     | tour-leaders 新增 3 欄 + RLS   | **上線前** | 1h (migration + test) |
| P1     | 移除或實作 company-assets      | **上線前** | 0.5h                  |
| P2     | transportation-rates 改用 hook | **上線前** | 0.5h                  |
| P3     | 硬編 label 移到 constants      | 上線後     | 1h                    |
| P4     | generic dialog / hook pattern  | 上線後     | 2-3h (可選)           |

---

## 已列 BACKLOG 項（無需重複）

✅ Wave 2 Batch 5：Database layout 系統主管 guard  
✅ Wave 1b：FK index CONCURRENTLY  
✅ Wave 6：CASCADE → RESTRICT  
✅ Wave 1：Restaurants/Hotels city_id nullable  
✅ page 直查、spread 寫 DB、Magic string filter（已清查）
