# ⚡ 快速參考卡

**用途**：開發時的 1 頁快查，節省 token

---

## 🏗️ Modular Monolith 核心概念（5條）

```
1. 模組劃分 → 按 Bounded Context（業務領域）
2. 3層架構 → Domain（業務邏輯）/ Application（用例）/ Infrastructure（技術）
3. CQRS → Command（寫）/ Query（讀）分離
4. 模組通訊 → Events（解耦）不直接 import
5. DDD → Aggregate（聚合根）/ Entity（實體）/ Value Object（值物件）
```

---

## 🎯 Venturo ERP 快速改進表

| 現狀 | 問題 | 改進方向 | 優先級 |
|------|------|---------|--------|
| hooks 混合讀寫 | 職責不清 | CQRS 分開 queries/ + commands/ | P1 |
| 直接 import | 耦合高 | EventBus 解耦 | P2 |
| 缺 Domain 層 | 業務邏輯散落 | 建立 domain/ 封裝 | P1 |
| 測試不完整 | 品質風險 | 補充 Unit + Integration Tests | P3 |
| 缺架構文檔 | 難以維護 | 建立模組地圖 + 通訊規範 | P2 |

---

## ✅ 新模組檢查清單

開發新模組前：
```
□ 定義 Bounded Context（模組邊界）
□ 建立 3 層結構
  □ domain/（業務邏輯）
  □ hooks/（分 queries/ 和 commands/）
  □ services/（API 呼叫）
□ CQRS 分離
  □ queries/（讀取 hooks）
  □ commands/（寫入 hooks）
□ 事件定義
  □ events/（領域事件）
  □ 透過 EventBus 通訊
□ 測試
  □ domain/ 的 unit tests
  □ hooks/ 的 integration tests
```

---

## 🔄 模組間通訊（不直接 import）

### ❌ 錯誤做法
```typescript
// tours/hooks/useCreateTour.ts
import { createOrder } from '@/features/orders/services'  // ❌ 直接依賴

async function createTour(data) {
  await createTourAPI(data)
  await createOrder(tour.id)  // ❌ 耦合
}
```

### ✅ 正確做法
```typescript
// tours/hooks/useCreateTour.ts
import { eventBus } from '@/lib/events'

async function createTour(data) {
  const tour = await createTourAPI(data)
  eventBus.emit('TourCreated', { tourId: tour.id })  // ✅ 事件
}

// orders/hooks/useOrderSubscriptions.ts
eventBus.on('TourCreated', async ({ tourId }) => {
  await createOrder(tourId)  // ✅ 訂閱處理
})
```

---

## 📐 CQRS 快速範本

### 資料夾結構
```
features/tours/hooks/
├── queries/          # 讀取（Query）
│   ├── useToursQuery.ts
│   ├── useTourDetailsQuery.ts
│   └── useTourStatsQuery.ts
└── commands/         # 寫入（Command）
    ├── useCreateTour.ts
    ├── useUpdateTour.ts
    └── useDeleteTour.ts
```

### 程式碼範本
```typescript
// queries/useToursQuery.ts（讀取）
export function useToursQuery(filters) {
  return useSWR(['tours', filters], () => fetchTours(filters))
}

// commands/useCreateTour.ts（寫入）
export function useCreateTour() {
  const mutate = useSWRMutation('tours', createTourAPI)
  
  return {
    createTour: async (data) => {
      // 1. 驗證
      validateTourData(data)
      
      // 2. 呼叫 API
      const tour = await mutate.trigger(data)
      
      // 3. 發出事件
      eventBus.emit('TourCreated', { tourId: tour.id })
      
      return tour
    }
  }
}
```

---

## 🎨 Domain 層範本

```typescript
// features/tours/domain/Tour.ts
export class Tour {
  constructor(
    private id: string,
    private name: string,
    private status: TourStatus
  ) {}
  
  // 業務邏輯封裝在這裡
  canBeCancelled(): boolean {
    return this.status !== 'completed'
  }
  
  cancel(): void {
    if (!this.canBeCancelled()) {
      throw new Error('已完成的團無法取消')
    }
    this.status = 'cancelled'
  }
}

// features/tours/domain/TourRules.ts
export class TourRules {
  static validateDates(start: Date, end: Date): void {
    if (end <= start) {
      throw new Error('結束日期必須晚於開始日期')
    }
  }
}
```

---

## 🗺️ Venturo ERP 模組地圖（快速版）

```
核心模組（Core）：
  tours → 旅遊團管理（主線）
  orders → 訂單管理
  quotes → 報價管理

支援模組（Support）：
  payments → 收款管理
  disbursement → 請款管理
  confirmations → 確認單
  
資源模組（Resources）：
  suppliers → 供應商
  attractions → 景點
  hotels → 飯店
  restaurants → 餐廳

通訊流程：
  tours 建立 → TourCreated 事件
    ↓
  orders 訂閱 → 自動建立訂單
    ↓
  payments 訂閱 → 建立收款記錄
```

---

## 🔍 快速診斷（發現問題）

### 模組耦合度檢查
```bash
# 檢查模組間直接 import
grep -r "from '@/features/" features/tours/ | grep -v "tours"
# 如果有結果 → 模組耦合了
```

### CQRS 分離檢查
```bash
# 檢查 hooks 是否混合讀寫
ls features/tours/hooks/
# 如果沒有 queries/ 和 commands/ → 需要重構
```

### Domain 層檢查
```bash
# 檢查是否有 domain/
ls features/tours/domain/
# 如果沒有 → 業務邏輯散落在 hooks
```

---

## 📊 優先級建議

### P0（立刻做）
- 核心表原則（已做 ✅）
- 資料流向清晰（已做 ✅）

### P1（本週）
- CQRS 分離（queries/ + commands/）
- Domain 層封裝（建立 domain/）

### P2（本月）
- EventBus 建立
- 模組通訊解耦
- 架構文檔

### P3（未來）
- 完整測試覆蓋
- 架構驗證工具
- 模組獨立部署

---

## 🎓 學習路徑（快速版）

```
Day 1-2：理解概念
  → Modular Monolith 是什麼
  → 為什麼適合我們
  
Day 3-5：研究範例
  → kgrzybek/modular-monolith-with-ddd
  → 對比 Venturo ERP
  
Day 6-7：開始應用
  → CQRS 重構
  → Domain 層建立
  
Week 2+：深入優化
  → EventBus 實作
  → 測試補充
  → 架構文檔
```

---

## 💡 記住這些

1. **核心表是唯一真相** → tour_itinerary_items
2. **模組要解耦** → 用 Events 不用 import
3. **讀寫要分開** → CQRS
4. **業務邏輯封裝** → Domain 層
5. **簡單勝過複雜** → 不過度設計

---

**這 1 頁就夠了。開發時看這個，不用讀長篇文檔。** ⚡

**Token 消耗**：~800 tokens（vs 完整文檔 ~10,000 tokens）

**節省**：92% 🎯
