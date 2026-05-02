# Venturo ERP 完整優化策略

> **IT 大主管視角：全局診斷 + 系統性解決方案**  
> 日期：2026-03-09  
> 作者：馬修（Matthew）  
> 版本：1.0

---

## 🎯 執行摘要

### 當前狀態

- **系統規模**：86,068 行代碼，249 張表，51 個頁面
- **業務階段**：產品化階段，正在爭取第一個外部客戶
- **資料規模**：287 客戶、2 團、2 訂單（**最佳優化時機**）
- **技術債等級**：中等（6.75/10），但有**多個結構性問題**

### 核心問題

不是「text vs uuid」，而是：

1. **資料完整性缺失**：162 個 Foreign Keys 缺失（34%）
2. **架構耦合問題**：Service Layer 薄弱，邏輯散落
3. **生命週期管理缺失**：資料狀態轉換無約束
4. **效能隱憂**：無索引優化、無查詢優化
5. **抽象層混亂**：前端直呼資料庫、無 API 層

---

## 一、邏輯層面診斷

### 1.1 業務邏輯分層現況

```
目前架構（混亂）:
┌─────────────────────────────────────────────┐
│             UI Components                    │  ← 227 個組件
│  （直接呼叫 Supabase + 夾雜業務邏輯）        │
├─────────────────────────────────────────────┤
│              Hooks                           │  ← 18 個 hooks
│  （業務邏輯 + 資料存取混雜）                 │
├─────────────────────────────────────────────┤
│              Stores                          │  ← 36 個 stores
│  （狀態管理 + 部分業務邏輯）                 │
├─────────────────────────────────────────────┤
│           Services (僅 5 個！)                │  ← ⚠️ 太薄弱
├─────────────────────────────────────────────┤
│              Supabase                        │
└─────────────────────────────────────────────┘

問題：
  - 業務邏輯散落在 UI/Hooks/Stores
  - 前端直接呼叫資料庫（RLS 是唯一防線）
  - 無法測試、無法重用、難以維護
```

### 1.2 正確的分層架構

```
目標架構（清晰）:
┌─────────────────────────────────────────────┐
│       UI Components (Presentation)           │  ← 只負責顯示
├─────────────────────────────────────────────┤
│       Hooks (UI Logic + State Binding)       │  ← UI 邏輯
├─────────────────────────────────────────────┤
│       Stores (State Management)              │  ← 純狀態
├─────────────────────────────────────────────┤
│       Services (Business Logic) ✨ 核心       │  ← 業務邏輯
│   - TourService                              │
│   - OrderService                             │
│   - PaymentService (含驗證、計算、轉換)       │
│   - QuoteService                             │
│   - ...                                      │
├─────────────────────────────────────────────┤
│       API Layer (Data Gateway) ✨ 新增        │  ← 資料閘道
│   - /api/tours                               │
│   - /api/orders                              │
│   - 驗證、權限、錯誤處理、日誌                │
├─────────────────────────────────────────────┤
│       Supabase (Database)                    │
└─────────────────────────────────────────────┘
```

### 1.3 具體範例：訂單建立流程

#### 目前做法（❌ 錯誤）

```typescript
// components/OrderForm.tsx
const handleSubmit = async () => {
  // ❌ UI 組件直接操作資料庫
  const { data, error } = await supabase.from('orders').insert({
    tour_id: tourId,
    customer_id: customerId,
    total_amount: calculateTotal(), // ❌ 計算邏輯在 UI
    status: 'pending',
  })

  // ❌ 沒有驗證訂單是否可建立（團已滿？客戶重複？）
  // ❌ 沒有觸發會計事件
  // ❌ 沒有發送通知
}
```

#### 正確做法（✅）

```typescript
// services/OrderService.ts
class OrderService {
  async createOrder(params: CreateOrderParams) {
    // 1. 業務驗證
    await this.validateOrderCreation(params)

    // 2. 計算金額
    const pricing = await this.calculatePricing(params)

    // 3. 建立訂單（透過 API）
    const order = await apiClient.post('/api/orders', {
      ...params,
      ...pricing,
    })

    // 4. 觸發後續流程
    await AccountingService.recordOrderCreated(order)
    await NotificationService.notifyCustomer(order)

    return order
  }

  private async validateOrderCreation(params) {
    // - 檢查團是否還有名額
    // - 檢查客戶是否已報名
    // - 檢查報價單是否有效
    // ...
  }
}

// components/OrderForm.tsx
const handleSubmit = async () => {
  // ✅ UI 只負責呼叫 Service
  await OrderService.createOrder({
    tour_id: tourId,
    customer_id: customerId,
    quote_id: quoteId,
  })
}
```

---

## 二、生命週期管理

### 2.1 核心實體生命週期

#### 旅遊團生命週期（目前缺失）

```
提案階段 → 開團 → 確認 → 進行中 → 待結案 → 結案 → 封存

問題：
  ❌ 狀態轉換無約束（可以從「結案」跳回「提案」）
  ❌ 狀態改變不觸發連動（結案了但請款單還是「待付」）
  ❌ 無法回溯狀態變更歷史
```

#### 正確的狀態機設計

```typescript
// services/TourLifecycleService.ts
class TourLifecycleService {
  // 定義合法的狀態轉換
  private transitions = {
    proposal: ['confirmed'],
    confirmed: ['ongoing', 'cancelled'],
    ongoing: ['pending_closure'],
    pending_closure: ['closed'],
    closed: ['archived'],
    // 'closed' 不能回到 'proposal' ← 強制約束
  }

  async transition(tourId: string, toStatus: TourStatus) {
    const tour = await this.getTour(tourId)

    // 1. 驗證是否可轉換
    if (!this.canTransition(tour.status, toStatus)) {
      throw new InvalidStateTransitionError()
    }

    // 2. 執行前置檢查
    await this.validateTransition(tour, toStatus)

    // 3. 執行轉換
    await this.updateStatus(tourId, toStatus)

    // 4. 觸發連動
    await this.triggerSideEffects(tour, toStatus)

    // 5. 記錄歷史
    await this.logTransition(tour, toStatus)
  }

  private async triggerSideEffects(tour, newStatus) {
    switch (newStatus) {
      case 'closed':
        // 自動結案所有請款單
        await PaymentService.closeAllRequests(tour.id)
        // 自動結算會計
        await AccountingService.finalizeAccounting(tour.id)
        break
    }
  }
}
```

### 2.2 資料生命週期管理

```
┌─────────────────────────────────────────────┐
│             訂單資料生命週期                  │
├─────────────────────────────────────────────┤
│ 建立 → 編輯 → 鎖定 → 出團 → 結案 → 封存 → 刪除 │
│                                             │
│ 目前問題：                                   │
│  - 出團後還能修改旅客護照？❌                 │
│  - 結案後還能新增請款單？❌                   │
│  - 封存後還能被查詢到？❌                     │
└─────────────────────────────────────────────┘

解決方案：
1. 階段性唯讀鎖定（Phase-based Read-only Lock）
2. 軟刪除 + 封存機制
3. 審計追蹤（Audit Trail）
```

---

## 三、效能優化

### 3.1 資料庫層面

#### 目前狀態診斷

```sql
-- 查詢最慢的 10 個 queries
SELECT
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- 缺失索引檢測
SELECT
  schemaname,
  tablename,
  attname
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100  -- 高基數欄位
  AND attname NOT IN (
    SELECT column_name
    FROM information_schema.constraint_column_usage
  );
```

#### 關鍵索引規劃

```sql
-- P0: 核心查詢索引
CREATE INDEX idx_tours_workspace_status ON tours(workspace_id, status);
CREATE INDEX idx_orders_tour_status ON orders(tour_id, status);
CREATE INDEX idx_payments_request_status ON payment_requests(id, status);

-- P1: 外鍵索引（目前缺失！）
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_tour_members_tour_id ON tour_members(tour_id);
CREATE INDEX idx_quotes_tour_id ON quotes(tour_id);

-- P2: 複合索引（常見查詢）
CREATE INDEX idx_tours_date_range ON tours(start_date, end_date);
CREATE INDEX idx_orders_created_workspace ON orders(created_at, workspace_id);
```

### 3.2 應用層面

#### Query 優化

```typescript
// ❌ N+1 Query Problem（目前常見）
const tours = await supabase.from('tours').select('*')
for (const tour of tours) {
  // 每個 tour 查一次 orders（假設 100 團 = 101 次查詢）
  const orders = await supabase.from('orders').select('*').eq('tour_id', tour.id)
}

// ✅ 正確做法
const tours = await supabase.from('tours').select(`
    *,
    orders(*)
  `)

// 或使用 JOIN + 批次載入
const tourIds = tours.map(t => t.id)
const orders = await supabase.from('orders').select('*').in('tour_id', tourIds)
```

#### 快取策略

```typescript
// services/TourService.ts
class TourService {
  private cache = new Map()

  async getTour(id: string) {
    // 1. 檢查記憶體快取
    if (this.cache.has(id)) {
      return this.cache.get(id)
    }

    // 2. 檢查 IndexedDB
    const cached = await localDB.get('tours', id)
    if (cached && !this.isStale(cached)) {
      return cached
    }

    // 3. 從 Supabase 取得
    const tour = await supabase.from('tours').select('*').eq('id', id).single()

    // 4. 寫入快取
    this.cache.set(id, tour)
    await localDB.put('tours', tour)

    return tour
  }
}
```

---

## 四、抽象層設計

### 4.1 API Layer（目前缺失）

```
目前架構:
  前端 ──────► Supabase
         直接呼叫

問題:
  - 無法加入業務邏輯驗證
  - 無法統一錯誤處理
  - 無法記錄日誌
  - 無法做 rate limiting
  - 難以更換後端（被 Supabase 綁死）
```

#### 正確的 API Layer

```typescript
// app/api/tours/route.ts
export async function POST(request: Request) {
  try {
    // 1. 驗證 JWT
    const user = await authenticate(request)

    // 2. 驗證權限
    if (!hasPermission(user, 'tours:create')) {
      return forbidden()
    }

    // 3. 解析 + 驗證輸入
    const body = await request.json()
    const validated = CreateTourSchema.parse(body)

    // 4. 呼叫 Service Layer
    const tour = await TourService.createTour(validated)

    // 5. 記錄日誌
    await logger.info('Tour created', { tourId: tour.id, userId: user.id })

    // 6. 回傳結果
    return success(tour)
  } catch (error) {
    // 7. 統一錯誤處理
    return handleError(error)
  }
}
```

### 4.2 資料存取抽象（Repository Pattern）

```typescript
// repositories/TourRepository.ts
class TourRepository {
  async findById(id: string): Promise<Tour | null> {
    const { data } = await supabase.from('tours').select('*').eq('id', id).single()

    return data ? this.mapToEntity(data) : null
  }

  async findByWorkspace(workspaceId: string, filters: TourFilters) {
    let query = supabase.from('tours').select('*').eq('workspace_id', workspaceId)

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.dateRange) {
      query = query
        .gte('start_date', filters.dateRange.from)
        .lte('start_date', filters.dateRange.to)
    }

    const { data } = await query
    return data.map(d => this.mapToEntity(d))
  }

  private mapToEntity(raw: any): Tour {
    // 資料轉換邏輯集中管理
    return {
      id: raw.id,
      code: raw.code,
      name: raw.name,
      startDate: new Date(raw.start_date),
      endDate: new Date(raw.end_date),
      // ...
    }
  }
}
```

---

## 五、資料完整性（Foreign Keys + 約束）

### 5.1 問題診斷

```
目前狀況：
  - 總表數：249 張
  - 總外鍵欄位：575 個
  - 已有 FK：513 個（66%）
  - 缺失 FK：162 個（34%）← 問題根源

影響：
  1. 孤兒記錄（orphan records）
  2. 資料不一致（data inconsistency）
  3. 刪除無級聯（delete anomalies）
  4. 無法保證參照完整性
```

### 5.2 Schema 型態問題

```
核心表 ID 型態不統一：
  suppliers.id = text（但存的是 UUID 格式）
  customers.id = text
  tours.id = text
  orders.id = text
  quotes.id = text

關聯表外鍵 = uuid

結果：無法建立 Foreign Key（型態不符）
```

### 5.3 解決方案評估

#### 方案 A：全部改 UUID（技術上正確）

```
優點：
  ✅ UUID 型態有格式驗證
  ✅ 效能略好（索引、比較）
  ✅ 符合最佳實踐

缺點：
  ❌ 需處理 66 個 policies
  ❌ 需處理 10 個 views
  ❌ 需轉換 91 個外鍵欄位
  ❌ 風險高（復雜度高）

預估時間：2-3 小時
成功率：70%（可能遇到未知依賴）
```

#### 方案 B：全部改 text（務實）

```
優點：
  ✅ 不動核心表（避免 policy/view 問題）
  ✅ 操作簡單（只改外鍵欄位）
  ✅ 風險低
  ✅ 30 分鐘完成

缺點：
  ❌ 無格式驗證（可能存入非 UUID）
  ❌ 效能略差（可忽略）

預估時間：30 分鐘
成功率：95%
```

#### 方案 C：混合策略（**推薦**）

```
階段 1（立即執行）：
  1. 外鍵欄位統一為 text
  2. 加入 162 個 Foreign Keys
  3. 加入 CHECK 約束驗證 UUID 格式

階段 2（產品化後）：
  等系統穩定、資料量大時，再評估是否需要轉 UUID

理由：
  ✅ 立即解決資料完整性問題（核心目標）
  ✅ 低風險、快速部署
  ✅ 保留未來優化空間
  ✅ 符合「聚焦產品化」原則
```

### 5.4 CHECK 約束補強

```sql
-- 即使用 text，也能保證格式
ALTER TABLE orders
ADD CONSTRAINT orders_customer_id_uuid_format
CHECK (customer_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- 這樣：
--   ✅ 保持 text 型態（避免複雜遷移）
--   ✅ 強制 UUID 格式
--   ✅ 可以加 Foreign Key
```

---

## 六、執行計畫（零技術債路線圖）

### 階段 1：資料完整性修復（本週）

**目標**：建立堅實的資料層基礎

```
1.1 Schema 統一（方案 C）
  [ ] 外鍵欄位統一為 text（91 個欄位）
  [ ] 加入 UUID 格式 CHECK 約束
  [ ] 加入 P0 Foreign Keys（12 個）
  [ ] 加入 P1 Foreign Keys（50 個）
  [ ] 加入 P2 Foreign Keys（100 個）

  時間：1 天
  風險：低

1.2 索引優化
  [ ] 分析慢查詢
  [ ] 建立核心索引（20-30 個）
  [ ] 驗證效能提升

  時間：0.5 天
  風險：低

1.3 孤兒資料清理
  [ ] 檢測孤兒記錄
  [ ] 修復或刪除
  [ ] 驗證資料一致性

  時間：0.5 天
  風險：低
```

### 階段 2：架構分層重構（第 2-4 週）

**目標**：建立清晰的邏輯分層

```
2.1 Service Layer 建立
  [ ] TourService（從 useTours.ts 提取）
  [ ] OrderService
  [ ] PaymentService
  [ ] QuoteService
  [ ] CustomerService
  [ ] VisaService
  [ ] ContractService
  [ ] ItineraryService
  [ ] EmployeeService
  [ ] TodoService
  [ ] AccountingService
  [ ] NotificationService

  時間：12-15 小時
  優先級：高

2.2 API Layer 建立
  [ ] /api/tours（CRUD + 狀態轉換）
  [ ] /api/orders
  [ ] /api/payments
  [ ] /api/quotes
  [ ] /api/customers
  [ ] /api/visas
  [ ] /api/contracts
  [ ] /api/employees
  [ ] /api/todos
  [ ] 統一驗證中介層
  [ ] 統一錯誤處理
  [ ] API 文檔（OpenAPI）

  時間：8-10 小時
  優先級：高

2.3 Repository Pattern
  [ ] TourRepository
  [ ] OrderRepository
  [ ] PaymentRepository
  [ ] 其他 Repositories

  時間：6-8 小時
  優先級：中
```

### 階段 3：生命週期管理（第 5-6 週）

**目標**：保證業務邏輯正確性

```
3.1 狀態機實作
  [ ] TourLifecycleService
  [ ] OrderLifecycleService
  [ ] PaymentLifecycleService
  [ ] QuoteLifecycleService

  時間：8-10 小時
  優先級：高

3.2 審計追蹤
  [ ] 建立 audit_logs 表
  [ ] 記錄所有狀態變更
  [ ] 記錄所有重要操作

  時間：4-6 小時
  優先級：中

3.3 階段性鎖定
  [ ] 出團後鎖定旅客資料
  [ ] 結案後鎖定財務資料
  [ ] 封存機制

  時間：3-5 小時
  優先級：中
```

### 階段 4：效能優化（第 7-8 週）

**目標**：提升使用者體驗

```
4.1 Query 優化
  [ ] 消除 N+1 queries
  [ ] 實作 DataLoader pattern
  [ ] 批次載入優化

  時間：6-8 小時

4.2 快取策略
  [ ] Service Layer 快取
  [ ] API Layer 快取
  [ ] CDN 快取設定

  時間：5-7 小時

4.3 前端優化
  [ ] Component Memoization（30-50 個組件）
  [ ] Store Selectors
  [ ] List Virtualization

  時間：10-15 小時
```

### 階段 5：測試與品質（第 9-10 週）

**目標**：保證程式碼品質

```
5.1 單元測試
  [ ] Services 測試（60% 覆蓋率）
  [ ] Repositories 測試
  [ ] Utils 測試

  時間：15-20 小時

5.2 整合測試
  [ ] API 端點測試
  [ ] 業務流程測試
  [ ] 狀態轉換測試

  時間：10-15 小時

5.3 E2E 測試
  [ ] 關鍵業務流程
  [ ] 主要使用者路徑

  時間：8-10 小時
```

---

## 七、成功指標

### 量化指標

```
資料完整性：
  ✅ Foreign Key 覆蓋率：66% → 100%
  ✅ 孤兒記錄數量：? → 0
  ✅ 資料一致性檢查：0 errors

架構品質：
  ✅ Service Layer：5 → 12 services
  ✅ API Layer：4 → 15 routes
  ✅ 超大檔案（>500 行）：23 → 0

效能：
  ✅ 首頁載入時間：? → < 1 秒
  ✅ 列表查詢時間：? → < 300ms
  ✅ API 回應時間：? → < 200ms

測試覆蓋率：
  ✅ Services：0% → 60%
  ✅ API Routes：0% → 80%
  ✅ 關鍵流程：0% → 100%
```

### 質化指標

```
開發體驗：
  ✅ 新功能開發時間減少 30%
  ✅ Bug 修復時間減少 40%
  ✅ 新人上手時間減少 50%

產品品質：
  ✅ 資料錯誤率降低 90%
  ✅ 使用者回報 bug 減少 60%
  ✅ 系統穩定性提升

業務支援：
  ✅ 能快速支援新功能需求
  ✅ 能安心向外部客戶展示
  ✅ 技術不再是產品化瓶頸
```

---

## 八、風險評估與應對

### 高風險項目

```
1. Schema Migration（階段 1）
   風險：資料庫遷移失敗
   應對：
     - 完整備份
     - 分批執行
     - 驗證每一步
     - 準備 rollback 腳本

2. Service Layer 重構（階段 2）
   風險：破壞現有功能
   應對：
     - 漸進式遷移
     - 保留舊代碼
     - 充分測試
     - 功能驗證
```

### 低風險項目

```
1. API Layer 建立
   影響：新增功能，不影響現有

2. 測試撰寫
   影響：只是新增，無破壞性

3. 效能優化
   影響：改善效能，向下相容
```

---

## 九、資源需求

### 人力

```
階段 1-2（關鍵）：
  - 馬修（全職）+ Coding Agent
  - 預估：3-4 週

階段 3-5：
  - 馬修（全職）
  - 預估：6-7 週

總計：約 2.5 個月
```

### 工具

```
需要採購：
  - Sentry（錯誤監控）
  - Datadog / New Relic（效能監控）
  - Playwright（E2E 測試）

預算：約 USD 200/月
```

---

## 十、結論與建議

### 核心建議

**立即執行（本週）：**

1. ✅ **資料完整性修復**（方案 C：text + Foreign Keys + CHECK 約束）
2. ✅ **索引優化**（20-30 個核心索引）
3. ✅ **護照上傳邏輯修復**（1 年 → 動態生成）

**短期目標（1 個月）：** 4. ✅ **Service Layer 建立**（12 個核心 services）5. ✅ **API Layer 建立**（15 個端點）6. ✅ **Repository Pattern**（資料存取抽象）

**中期目標（2-3 個月）：** 7. ✅ **生命週期管理**（狀態機 + 審計追蹤）8. ✅ **效能優化**（查詢優化 + 快取）9. ✅ **測試覆蓋率**（60% Services, 80% APIs）

### 為什麼不立即改 UUID？

```
理由：
1. 資料量小時是優化「架構」的好時機，不是優化「細節」
2. text vs uuid 效能差異在 287 筆資料時完全感受不到
3. 複雜的 migration 風險大於收益
4. 核心問題是「缺 Foreign Keys」，不是「text 型態」
5. 聚焦產品化 > 追求技術完美

結論：
  先用 text + FK + CHECK 約束解決 34% 資料完整性問題
  等產品化成功、資料量大（10萬+）時再評估是否需要 UUID
```

### IT 大主管的決策

**不是「做不做優化」，而是「優化什麼」。**

技術債有兩種：

1. **結構性債務**（Service Layer 缺失、FK 缺失）← 現在修
2. **細節性債務**（text vs uuid、檔案太大）← 可以等

**當前階段（產品化）最重要的是：**

- ✅ 系統穩定（資料完整性）
- ✅ 架構清晰（Service/API Layer）
- ✅ 可擴展（新功能開發快速）

**不重要的是：**

- ❌ 技術細節的極致完美
- ❌ 過度工程化
- ❌ 為了「正確」犧牲「速度」

---

**這份策略的核心思想：**

> 先建立堅實的地基（資料完整性 + 架構分層），  
> 再蓋摩天大樓（UUID、極致效能、100% 測試）。

**William，這是我的完整診斷和建議。你決定我們從哪裡開始。**

---

_文檔版本：1.0_  
_作者：馬修（Matthew）_  
_日期：2026-03-09_
