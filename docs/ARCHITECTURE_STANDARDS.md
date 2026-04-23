# Venturo 系統架構規範

**版本**: 1.0.0
**日期**: 2025-12-09
**目的**: 確保系統開發與修復遵循統一標準，支援規模化擴展

---

## 目錄

1. [核心原則](#核心原則)
2. [五層架構規範](#五層架構規範)
3. [資料隔離規範](#資料隔離規範)
4. [權限控制規範](#權限控制規範)
5. [Store 開發規範](#store-開發規範)
6. [數據系統規範](#數據系統規範) ⭐ 新增
7. [路由與導航規範](#路由與導航規範)
8. [錯誤處理規範](#錯誤處理規範)
9. [新功能開發檢查清單](#新功能開發檢查清單)

---

## 核心原則

### 1. 單一來源原則 (Single Source of Truth)

每個概念只在一處定義：

- 權限定義 → `src/lib/permissions.ts`
- 角色定義 → `src/lib/rbac-config.ts`
- 型別定義 → `src/types/*.ts`
- Store 工廠 → `src/stores/core/create-store.ts`

**違規範例**：

```typescript
// ❌ 錯誤：在多處定義相同的權限列表
// file1.ts
const permissions = ['系統主管', '員工', ...]
// file2.ts
const permissions = ['系統主管', '員工', ...] // 重複定義
```

### 2. 安全預設原則 (Secure by Default)

- 權限檢查：無法匹配時**預設拒絕**
- 資料查詢：無 workspace_id 時**不回傳資料**
- API 調用：無認證時**返回 401**

### 3. 層級隔離原則 (Layer Isolation)

每一層只與相鄰層溝通，禁止跨層調用：

```
UI → Hooks → Store → API/DB
     ↑
     不可直接調用 Store 或 DB
```

---

## 五層架構規範

```
┌─────────────────────────────────────────────────┐
│                  UI Layer                       │
│  React Components, Shadcn UI                    │
│  職責：顯示資料、使用者互動                     │
│  禁止：直接調用 Store 或 DB                     │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│                 Hook Layer                      │
│  Custom Hooks (useTours, useOrders...)          │
│  職責：業務邏輯、資料編排、狀態組合             │
│  禁止：直接操作 DB                              │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│                Store Layer                      │
│  Zustand + createStore 工廠                     │
│  職責：狀態管理、快取、CRUD 操作                │
│  禁止：包含業務邏輯                             │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│                 API Layer                       │
│  Supabase Client                                │
│  職責：資料查詢、同步                           │
│  禁止：包含業務規則                             │
└─────────────────────────────────────────────────┘
```

### 層級職責詳解

| 層級  | 可以做                                 | 不可以做                     |
| ----- | -------------------------------------- | ---------------------------- |
| UI    | 調用 Hooks、渲染 UI、處理用戶事件      | 直接調用 Store、處理業務邏輯 |
| Hook  | 組合多個 Store、處理業務邏輯、資料轉換 | 直接調用 Supabase、寫入 DB   |
| Store | CRUD 操作、狀態管理、快取策略          | 處理業務規則、跨 Store 操作  |
| API   | 資料查詢、同步、錯誤處理               | 業務邏輯、UI 相關操作        |

---

## 資料隔離規範

### Workspace 隔離架構

```
┌──────────────────────────────────────────────────┐
│                   API 查詢層                     │
│  🔒 workspaceScoped: true 的 Store               │
│  自動加入 .eq('workspace_id', userWorkspaceId)   │
└──────────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────┐
│                  前端過濾層                      │
│  ⚠️ 僅作為備用，不可依賴                         │
│  用於 UI 層的額外篩選                            │
└──────────────────────────────────────────────────┘
```

### Store 分類

#### 需要 Workspace 隔離的 Store（業務資料）

```typescript
// ✅ 正確：使用 workspaceScoped 配置
export const useTourStore = createStore<Tour>({
  tableName: 'tours',
  codePrefix: 'T',
  workspaceScoped: true, // 🔒 啟用隔離
})
```

已啟用隔離的 Store：

- `tours`, `itineraries`, `orders`, `customers`, `quotes`
- `payment_requests`, `disbursement_orders`, `receipt_orders`
- `members`, `quote_items`, `tour_addons`
- `todos`, `visas`, `calendar_events`

#### 不需要隔離的 Store（全局共享資料）

```typescript
// ✅ 正確：系統配置表不需要隔離
export const useSupplierStore = createStore<Supplier>('suppliers', 'S')
```

全局共享的 Store：

- `suppliers`, `supplier_categories`
- `regions`, `countries`, `cities`, `attractions`
- `cost_templates`, `vendor_costs`
- `accounting_subjects`（系統預設科目）

### 新增 Store 檢查清單

建立新 Store 時，問自己：

1. 這個資料是屬於特定公司/部門的嗎？ → 需要 `workspaceScoped: true`
2. 這個資料是全系統共享的配置嗎？ → 不需要隔離
3. 擁有平台管理資格的人 需要跨 workspace 查看嗎？ → `canCrossWorkspace` 會自動處理

---

## 權限控制規範

### 權限架構層級

```
Layer 1: Supabase Auth (登入驗證)
         ↓
Layer 2: Middleware (路由保護)
         ↓
Layer 3: hasPermissionForRoute (功能權限)
         ↓
Layer 4: workspaceScoped (資料隔離)
         ↓
Layer 5: canCrossWorkspace (跨 workspace 權限)
```

### 權限定義位置

**唯一來源**：`src/lib/permissions.ts`

```typescript
// FEATURE_PERMISSIONS 定義所有功能權限
export const FEATURE_PERMISSIONS: PermissionConfig[] = [
  {
    id: 'tours',
    label: '旅遊團管理',
    category: '業務',
    routes: ['/tours'],
  },
  // ...
]
```

**角色能力**：`src/lib/rbac-config.ts`

```typescript
// ROLE_CONFIG 定義角色能力（不是權限列表）
export const ROLE_CONFIG = {
  super_admin: {
    canCrossWorkspace: true, // 可跨 workspace
    canManageWorkspace: true, // 可管理 workspace
  },
  // ...
}
```

### 權限檢查流程

```typescript
// 1. Middleware 層：檢查是否已登入
if (!authToken) redirect('/login')

// 2. Auth Guard 層：同步 token 狀態
if (isAuthenticated && !hasAuthCookie()) logout()

// 3. 路由保護層：檢查功能權限
if (!hasPermissionForRoute(userPermissions, pathname)) {
  redirect('/unauthorized')
}

// 4. 資料層：自動過濾 workspace
// workspaceScoped: true 的 Store 會自動處理
```

### 安全原則

```typescript
// ❌ 錯誤：預設允許
if (requiredPermissions.length === 0) {
  return true // 危險！未配置的路由會被允許訪問
}

// ✅ 正確：預設拒絕
if (requiredPermissions.length === 0) {
  console.warn(`路由 ${pathname} 未配置權限，預設拒絕`)
  return false
}
```

---

## Store 開發規範

### 使用 createStore 工廠

**永遠使用工廠函數**，不要自己寫 Zustand create：

```typescript
// ✅ 正確：使用工廠函數
export const useTourStore = createStore<Tour>({
  tableName: 'tours',
  codePrefix: 'T',
  workspaceScoped: true,
})

// ❌ 錯誤：自己寫 create
export const useTourStore = create<TourState>(set => ({
  // 手動實作會遺漏快取、同步、隔離等功能
}))
```

### StoreConfig 完整配置

```typescript
interface StoreConfig {
  tableName: TableName // 必填：資料表名稱
  codePrefix?: string // 選填：編號前綴 (如 'T', 'O', 'Q')
  workspaceScoped?: boolean // 選填：是否啟用 workspace 隔離
  enableSupabase?: boolean // 選填：是否啟用 Supabase (預設 true)
  fastInsert?: boolean // 選填：是否使用快速寫入 (預設 true)
}
```

### 命名規範

```typescript
// Store 命名：use{Entity}Store
export const useTourStore = createStore<Tour>(...)
export const useOrderStore = createStore<Order>(...)

// 型別命名：PascalCase
interface Tour extends BaseEntity { ... }
interface Order extends BaseEntity { ... }

// 表格命名：snake_case (複數)
tableName: 'tours'
tableName: 'orders'
tableName: 'payment_requests'
```

---

## 數據系統規範

> **2026-01-19 新增**：統一快取、即時同步、驗證三大系統

### 系統架構總覽

```
┌─────────────────────────────────────────────────────────────────┐
│                         數據系統架構                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   快取層     │    │  即時同步層  │    │   驗證層    │         │
│  │    SWR      │◄──►│  Realtime   │    │ Validation  │         │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘         │
│         │                  │                  │                 │
│         └────────┬─────────┴─────────┬────────┘                 │
│                  │                   │                          │
│                  ▼                   ▼                          │
│         ┌─────────────────────────────────────┐                 │
│         │         createEntityHook            │                 │
│         │        (統一數據存取工廠)             │                 │
│         └─────────────────┬───────────────────┘                 │
│                           │                                     │
│                           ▼                                     │
│                  ┌─────────────────┐                            │
│                  │    Supabase     │                            │
│                  │   (資料來源)     │                            │
│                  └─────────────────┘                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 6.1 快取層（SWR）

#### 統一入口

**所有數據存取必須透過 `createEntityHook`**，禁止直接使用 SWR 或 Supabase：

```typescript
// ✅ 正確：使用 createEntityHook
import { useOrders } from '@/data'
const { items, loading } = useOrders()

// ❌ 錯誤：直接用 SWR
import useSWR from 'swr'
const { data } = useSWR('orders', fetcher)

// ❌ 錯誤：直接查 Supabase
const { data } = await supabase.from('orders').select()
```

#### SWR Key 命名規範

**統一格式**：`entity:{tableName}:{type}:{identifier?}`

| 類型     | 格式                                | 範例                            |
| -------- | ----------------------------------- | ------------------------------- |
| 列表     | `entity:{table}:list`               | `entity:orders:list`            |
| 精簡列表 | `entity:{table}:slim`               | `entity:orders:slim`            |
| 單筆詳情 | `entity:{table}:detail:{id}`        | `entity:orders:detail:abc123`   |
| 分頁     | `entity:{table}:paginated:{params}` | `entity:orders:paginated:{...}` |
| 字典     | `entity:{table}:dictionary`         | `entity:orders:dictionary`      |

**禁止使用的 Key 格式**：

```typescript
// ❌ 禁止：簡短 key（會導致 mutate 無法同步）
const SWR_KEY = 'orders'
const SWR_KEY = 'members'

// ✅ 正確：完整 key
const SWR_KEY = 'entity:orders:list'
const SWR_KEY = 'entity:order_members:list'
```

#### 快取策略

| 策略         | 適用場景                   | 設定                         |
| ------------ | -------------------------- | ---------------------------- |
| **STATIC**   | 國家、城市、景點等靜態資料 | 30 分鐘快取，不自動重新驗證  |
| **DYNAMIC**  | 訂單、成員等業務資料       | 1 分鐘快取，focus 時重新驗證 |
| **REALTIME** | 訊息、待辦等即時資料       | 3 秒快取，搭配 Realtime 推送 |

```typescript
// 在 entity 定義時指定策略
export const orderEntity = createEntityHook<Order>('orders', {
  cache: CACHE_PRESETS.high, // DYNAMIC 策略
})

export const countryEntity = createEntityHook<Country>('countries', {
  cache: CACHE_PRESETS.static, // STATIC 策略
})
```

#### 去重機制

SWR 自動去重：同一時間內相同 key 的請求只發一次。

```typescript
// 這兩個組件同時渲染，只會發一次請求
function ComponentA() {
  const { items } = useOrders() // key: entity:orders:list
}

function ComponentB() {
  const { items } = useOrders() // key: entity:orders:list（共用）
}
```

---

### 6.2 即時同步層（Realtime）

#### 核心原則

**Realtime 收到事件時，直接更新快取，不重新 fetch**：

```typescript
// ❌ 錯誤：觸發重新查詢（會越查越多）
.on('postgres_changes', ..., () => {
  mutate(swrKey)  // 這會發 HTTP 請求！
})

// ✅ 正確：直接更新快取（不發請求）
.on('postgres_changes', ..., (payload) => {
  if (payload.eventType === 'INSERT') {
    mutate(swrKey, (current) => [...current, payload.new], false)
  } else if (payload.eventType === 'UPDATE') {
    mutate(swrKey, (current) =>
      current.map(item => item.id === payload.new.id ? payload.new : item),
      false
    )
  } else if (payload.eventType === 'DELETE') {
    mutate(swrKey, (current) =>
      current.filter(item => item.id !== payload.old.id),
      false
    )
  }
})
```

#### 需要 Realtime 的表格

| 表格              | 原因                       | 優先級    |
| ----------------- | -------------------------- | --------- |
| `orders`          | 多人同時操作，付款狀態變更 | P0        |
| `tours`           | 核心實體，狀態/人數變更    | P0        |
| `receipt_orders`  | 收款確認需即時同步         | P1        |
| `visas`           | 簽證狀態流程               | P1        |
| `messages`        | 聊天訊息（已實現）         | ✅ 已完成 |
| `todos`           | 待辦事項（已實現）         | ✅ 已完成 |
| `calendar_events` | 行事曆（已實現）           | ✅ 已完成 |

#### 不需要 Realtime 的表格

| 表格                                 | 原因                         |
| ------------------------------------ | ---------------------------- |
| `countries`, `cities`, `attractions` | 靜態資料，幾乎不變           |
| `customers`                          | 低頻修改，多人同時編輯機率低 |
| `suppliers`                          | 系統配置，變更少             |

#### Realtime 訂閱管理

**同一表格只需一個訂閱**，Supabase channel 同名會自動複用：

```typescript
// Supabase 會自動管理同名 channel
const channel = supabase.channel('orders_realtime') // 同名會複用

// 組件卸載時清理
useEffect(() => {
  return () => {
    supabase.removeChannel(channel)
  }
}, [])
```

#### Realtime 配置（在 createEntityHook 中）

```typescript
// 未來：在 entity 配置中啟用 Realtime
export const orderEntity = createEntityHook<Order>('orders', {
  cache: CACHE_PRESETS.high,
  realtime: true, // 啟用 Realtime 同步
})
```

---

### 6.3 驗證層（Validation）

#### 統一驗證組件

| 組件         | 用途                               | 位置                          |
| ------------ | ---------------------------------- | ----------------------------- |
| `FieldError` | 顯示欄位錯誤訊息                   | `@/components/ui/field-error` |
| `FormField`  | 表單欄位包裝器（含 label + error） | `@/components/ui/form-field`  |
| `Label`      | 標籤（支援必填標記）               | `@/components/ui/label`       |

```typescript
// ✅ 正確：使用統一組件
import { FormField } from '@/components/ui/form-field'
import { FieldError } from '@/components/ui/field-error'

<FormField label="姓名" required error={errors.name}>
  <Input value={name} onChange={...} />
</FormField>

// ❌ 錯誤：自己寫驗證顯示
<label>姓名 *</label>
<Input />
{error && <span className="text-red-500">{error}</span>}
```

#### 驗證規則定義

**表單驗證邏輯應集中在 Hook 中**：

```typescript
// ✅ 正確：驗證邏輯在 Hook
// hooks/useOrderForm.ts
function useOrderForm() {
  const [errors, setErrors] = useState({})

  const validate = () => {
    const newErrors = {}
    if (!formData.tour_id) newErrors.tour_id = '請選擇旅遊團'
    if (!formData.contact_person) newErrors.contact_person = '請輸入聯絡人'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  return { errors, validate, ... }
}

// ❌ 錯誤：驗證邏輯散落在組件中
function OrderForm() {
  const handleSubmit = () => {
    if (!data.tour_id) {
      alert('請選擇旅遊團')  // 分散的驗證
      return
    }
  }
}
```

#### 錯誤訊息格式

| 類型     | 格式                              | 範例                 |
| -------- | --------------------------------- | -------------------- |
| 必填     | `請輸入{欄位名}`                  | 請輸入聯絡人         |
| 格式錯誤 | `{欄位名}格式不正確`              | Email 格式不正確     |
| 範圍錯誤 | `{欄位名}必須在 {min}-{max} 之間` | 人數必須在 1-50 之間 |
| 選擇     | `請選擇{欄位名}`                  | 請選擇旅遊團         |

---

### 6.4 數據系統檢查清單

#### 新增 Entity 時

- [ ] 使用 `createEntityHook` 建立
- [ ] 決定快取策略（STATIC / DYNAMIC / REALTIME）
- [ ] 決定是否需要 Realtime 同步
- [ ] SWR key 遵循命名規範

#### 使用數據時

- [ ] 透過 `@/data` 匯入 hooks，不直接查 Supabase
- [ ] 不在組件中直接使用 `useSWR`
- [ ] mutate 時使用正確的 key 格式

#### Realtime 實作時

- [ ] 收到事件直接更新快取，不 refetch
- [ ] 組件卸載時清理訂閱
- [ ] 考慮 workspace 過濾

---

## 路由與導航規範

### 統一使用 router.push

```typescript
// ✅ 正確：使用 Next.js router
import { useRouter } from 'next/navigation'

const router = useRouter()
router.push('/tours')
router.push(`/orders/${orderId}`)

// ❌ 錯誤：使用 window.location
window.location.href = '/tours' // 會造成完整頁面重載
window.location.reload() // 會丟失 React 狀態
```

### 例外情況

只有以下情況才使用 `window.location`：

1. 需要完全重置應用狀態（如登出後）
2. 跳轉到外部網站

```typescript
// 登出時可以使用 window.location
const logout = () => {
  clearAuth()
  window.location.href = '/login' // 確保完全清除狀態
}
```

### 資料刷新

```typescript
// ✅ 正確：使用 Store 的 fetchAll
await memberStore.fetchAll()

// ❌ 錯誤：重載頁面
window.location.reload()
```

---

## 錯誤處理規範

### Token 過期處理

```typescript
// Auth Guard 自動同步 token 狀態
const syncTokenState = useCallback(() => {
  // 檢查 cookie 是否被 middleware 清除
  if (isAuthenticated && !hasAuthCookie()) {
    logout() // 前端同步登出
    return true
  }
  return false
}, [isAuthenticated, logout])
```

### API 錯誤處理

```typescript
// ✅ 正確：統一錯誤處理
try {
  const { data, error } = await supabase.from('tours').select()
  if (error) throw error
  return data
} catch (error) {
  logger.error('[tours] fetchAll 失敗:', error)
  set({ error: error.message, loading: false })
  return []
}

// ❌ 錯誤：忽略錯誤
const { data } = await supabase.from('tours').select()
return data // 如果有錯誤會是 null，但不會被處理
```

### 靜默降級

```typescript
// 網路錯誤時靜默降級，不要彈出錯誤
try {
  await syncToSupabase(data)
} catch (error) {
  // 只記錄 log，不要 alert
  logger.warn('同步失敗，稍後重試')
  markForRetry(data)
}
```

---

## 架構核心哲學 (2026-01-13 定案)

> **核心原則**：資料載入的唯一標準是「使用者眼睛現在要看的」

### 核心概念：團（Tour）為中心

```
                    ┌─────────────┐
                    │    團 Tour   │
                    │  (中心實體)   │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
   ┌─────────┐       ┌─────────┐        ┌─────────┐
   │  訂單    │       │  行程    │        │  報價    │
   │ Orders  │       │Itinerary│        │ Quotes  │
   └────┬────┘       └─────────┘        └─────────┘
        │
        ▼
   ┌─────────┐
   │  成員    │
   │ Members │
   └─────────┘
```

### 獨立視角 vs 從屬視角

| 類型         | 頁面                     | 是否需要獨立路由 | 說明                               |
| ------------ | ------------------------ | ---------------- | ---------------------------------- |
| **獨立視角** | 訂單 `/orders`           | ✅ 需要          | 財務催收視角：「哪些訂單還沒付完」 |
| **獨立視角** | 簽證 `/visas`            | ✅ 需要          | 簽證流程視角：「哪些護照還沒送件」 |
| **獨立視角** | 收款 `/finance/payments` | ✅ 需要          | 會計確認視角：「哪些收款單待確認」 |
| **從屬視角** | 報價單                   | ❌ 已隱藏        | 從團的操作去找（團內建立報價）     |
| **從屬視角** | 行程管理                 | ❌ 已隱藏        | 從團的操作去找（團內編輯行程）     |

### 資料載入原則

```typescript
// ❌ 錯誤：載入所有可能需要的資料
useEffect(() => {
  fetchTours()
  fetchOrders()
  fetchMembers() // 這頁面不用
  fetchCustomers() // 這頁面也不用
  fetchRegions() // 有 denormalized 欄位
}, [])

// ✅ 正確：只載入眼睛現在要看的
useEffect(() => {
  fetchTours() // 只要團列表
}, [])

// 需要時才載入
const handleOpenDialog = () => {
  regionsStore.fetchAll() // Dialog 開啟時才需要
  setDialogOpen(true)
}
```

### 雙平台架構關係

```
venturo-erp (本專案)              venturo-online
────────────────────────────────────────────────
角色：權力中心、治理層              角色：能力釋放、信任展現
對象：員工                        對象：旅客會員
功能：建立秩序                     功能：展示秩序

                    共享
              ┌─────────────┐
              │  Supabase   │
              │  Database   │
              └─────────────┘

資料流：ERP 產生 → Online 呈現 → 會員回饋 → ERP 優化
```

### 資料流邊界系統

定義 ERP ↔ Online 的邊界：

```
ERP (權力中心)              Online (能力釋放)
─────────────────────────────────────────────
Tours, Orders, Members  →   traveler_tour_cache
Itineraries            →   行程展示
付款狀態               →   會員可見餘額
                      ←   旅客行為回饋（未來）
```

### 架構 TODO（待建立的制度）

| 優先級 | 系統           | 說明                         |
| ------ | -------------- | ---------------------------- |
| P0     | 資料流邊界系統 | 定義 ERP ↔ Online 的資料邊界 |
| P1     | 供應商治理系統 | 供應商評分、分級、黑名單     |
| P2     | 統一需求單系統 | 需求單模板、確認單追蹤       |
| P3     | C 端回饋迴路   | 旅客行為回流到 ERP           |

---

## 新功能開發檢查清單

### 建立新頁面

- [ ] 頁面使用 `h-full flex flex-col` 佈局
- [ ] 內容區使用 `flex-1 overflow-auto`
- [ ] 在 `permissions.ts` 新增路由權限配置
- [ ] 使用 `useRouter` 處理導航

### 建立新 Store

- [ ] 使用 `createStore` 工廠函數
- [ ] 決定是否需要 `workspaceScoped: true`
- [ ] 在 `src/stores/index.ts` 匯出
- [ ] 型別定義在 `src/types/*.ts`

### 建立新 API

- [ ] 使用 Supabase client
- [ ] 包含錯誤處理
- [ ] 記錄操作日誌

### 修改權限

- [ ] 只修改 `permissions.ts`（不要在多處定義）
- [ ] 測試 擁有平台管理資格的人 能跨 workspace
- [ ] 測試一般用戶只能看到自己 workspace

### 提交前檢查

- [ ] `npm run build` 成功
- [ ] 沒有 `as any` 型別繞過
- [ ] 沒有 `console.log`（用 `logger` 代替）
- [ ] 路由導航使用 `router.push`

---

## 違規處理

當發現違反規範的程式碼時：

1. **優先修復**：不要等待，立即修正
2. **記錄原因**：在 commit message 說明為什麼違反
3. **更新規範**：如果規範不合理，更新文件而不是繞過

---

## 更新歷史

| 日期       | 版本  | 變更內容                                                                      |
| ---------- | ----- | ----------------------------------------------------------------------------- |
| 2026-01-19 | 1.1.0 | 新增數據系統規範：快取層（SWR）、即時同步層（Realtime）、驗證層（Validation） |
| 2025-12-09 | 1.0.0 | 初版建立：整合資料隔離、權限控制、Store 規範                                  |
