# Venturo 優化指南

> 版本：1.0
> 最後更新：2025-10-26
> 狀態：進行中

---

## 📊 當前健康狀態

```
整體健康評分:  6.75/10
目標評分:      8.5/10
總代碼量:      86,068 行
檔案總數:      489 個
測試覆蓋率:    ~0%
```

### 代碼分布

```
components/    1.6M  (185 files)  57% - UI 組件
app/          768K  ( 51 pages)  27% - 頁面路由
features/     560K  ( 88 files)  20% - 功能模組
stores/       312K  ( 36 files)  11% - 狀態管理
lib/          404K  ( 29 files)  14% - 工具函式
hooks/        104K  ( 18 files)   4% - 自定義 Hooks
types/        108K  ( 20 files)   4% - 型別定義
services/      40K  (  5 files)   1% - 業務服務 ⚠️
```

---

## 🎯 優化路線圖

### Phase 1: 緊急優化 (第 1 週)

**目標**: 解決最緊急的代碼品質問題
**預估時間**: 8-11 小時
**優先級**: 🔴 高

#### 1. Console.log 清理 ✅ 部分完成

**狀態**: 已完成 6 個核心檔案，剩餘 ~535 個

**已完成**:

```
✅ src/stores/user-store.ts
   - Line 62: console.log → logger.debug
   - Line 94: console.log → logger.info

✅ src/services/storage/index.ts
   - Line 77: console.warn → logger.warn
   - Line 87: console.log → logger.info
   - Line 97: console.warn → logger.warn
   - Line 102: console.log → logger.info
```

**待完成**: 批量處理剩餘 535 個 console 使用

**建議腳本**:

```bash
# 自動替換 console.log → logger.info
find src/ -name "*.ts" -o -name "*.tsx" | \
  xargs sed -i '' 's/console\.log(/logger.info(/g'

# 替換 console.error → logger.error
find src/ -name "*.ts" -o -name "*.tsx" | \
  xargs sed -i '' 's/console\.error(/logger.error(/g'

# 替換 console.warn → logger.warn
find src/ -name "*.ts" -o -name "*.tsx" | \
  xargs sed -i '' 's/console\.warn(/logger.warn(/g'
```

#### 2. 型別斷言修復 🔄 準備開始

**問題**: 188 個 `as any` / `as unknown` 型別繞過
**目標**: 減少到 50 個以下
**預估時間**: 30-40 分鐘 (Top 5 檔案)

**優先修復檔案**:

1. **src/components/workspace/ChannelChat.tsx** (Lines 48-49)

   ```typescript
   // ❌ 錯誤
   const [selectedOrder, setSelectedOrder] = useState<unknown>(null)
   const [selectedAdvanceItem, setSelectedAdvanceItem] = useState<unknown>(null)

   // ✅ 修正
   const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
   const [selectedAdvanceItem, setSelectedAdvanceItem] = useState<AdvanceItem | null>(null)
   ```

2. **src/components/workspace/AdvanceListCard.tsx** (Line 11)

   ```typescript
   // ❌ 錯誤
   item: unknown

   // ✅ 修正
   item: AdvanceItem
   ```

3. **src/app/customers/page.tsx**

   ```typescript
   // ❌ 錯誤
   (o: any) => o.customer_id === customer.id

   // ✅ 修正
   (o: Order) => o.customer_id === customer.id
   ```

4. **src/stores/index.ts** (Line 116)

   ```typescript
   // ❌ 錯誤
   'tour_addons' as unknown

   // ✅ 修正
   使用正確的 table 型別
   ```

5. **src/lib/db/database-initializer.ts**
   - 多處 unknown 型別需要明確定義

#### 3. State 重構 🔄 規劃中

**檔案**: `src/components/workspace/ChannelChat.tsx`
**問題**: 11 個獨立 boolean states
**預估時間**: 45 分鐘

**重構方案**:

```typescript
// ❌ 之前：11 個獨立 states
const [showMemberSidebar, setShowMemberSidebar] = useState(false);
const [showShareQuoteDialog, setShowShareQuoteDialog] = useState(false);
const [showShareTourDialog, setShowShareTourDialog] = useState(false);
// ... 8 more states

// ✅ 之後：合併為單一物件
interface DialogState {
  memberSidebar: boolean;
  shareQuote: boolean;
  shareTour: boolean;
  createPaymentRequest: boolean;
  editAdvanceList: boolean;
  viewOrder: boolean;
  editOrder: boolean;
  viewQuote: boolean;
  viewTour: boolean;
  editMessage: boolean;
  deleteMessage: boolean;
}

const [dialogs, setDialogs] = useState<DialogState>({
  memberSidebar: false,
  shareQuote: false,
  shareTour: false,
  createPaymentRequest: false,
  editAdvanceList: false,
  viewOrder: false,
  editOrder: false,
  viewQuote: false,
  viewTour: false,
  editMessage: false,
  deleteMessage: false,
});

// 統一的 toggle 函數
const toggleDialog = useCallback((key: keyof DialogState) => {
  setDialogs(prev => ({ ...prev, [key]: !prev[key] }));
}, []);

// 使用
<Dialog open={dialogs.shareQuote} onOpenChange={() => toggleDialog('shareQuote')}>
```

**相同模式的檔案**:

- `src/app/finance/payments/page.tsx`
- `src/app/visas/page.tsx`

#### 4. Inline 常數提取 🔄 規劃中

**問題**: 多個檔案在組件內定義大型常數陣列
**影響**: 每次 render 都重新建立物件，浪費記憶體
**預估時間**: 20 分鐘

**優先處理檔案**:

1. **src/components/layout/sidebar.tsx** (Lines 41-128)

   ```typescript
   // ❌ 錯誤：組件內定義
   export function Sidebar() {
     const menuItems = [
       { label: '首頁', href: '/', icon: Home },
       { label: '旅遊團', href: '/tours', icon: Plane },
       // ... 20+ items
     ]
   }

   // ✅ 正確：提取到組件外
   const SIDEBAR_MENU_ITEMS = [
     { label: '首頁', href: '/', icon: Home },
     { label: '旅遊團', href: '/tours', icon: Plane },
     // ... 20+ items
   ] as const

   export function Sidebar() {
     // 直接使用 SIDEBAR_MENU_ITEMS
   }
   ```

2. **src/components/workspace/ChannelSidebar.tsx** (Lines 58-79)

   ```typescript
   // 提取 ROLE_LABELS, STATUS_LABELS 到組件外
   const ROLE_LABELS = {
     admin: '系統主管',
     member: '成員',
     guest: '訪客',
   } as const

   const STATUS_LABELS = {
     active: '活躍',
     inactive: '停用',
   } as const
   ```

#### 5. 建立 useDialogState Hook 🔄 規劃中

**目標**: 統一 Dialog 狀態管理
**預估時間**: 30 分鐘

**實作**:

```typescript
// src/hooks/useDialogState.ts

export function useDialogState<K extends string>(keys: readonly K[]) {
  const [openDialogs, setOpenDialogs] = useState<Set<K>>(new Set());

  const isOpen = useCallback((key: K) => openDialogs.has(key), [openDialogs]);

  const open = useCallback((key: K) => {
    setOpenDialogs(prev => new Set(prev).add(key));
  }, []);

  const close = useCallback((key: K) => {
    setOpenDialogs(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const toggle = useCallback((key: K) => {
    setOpenDialogs(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  return { isOpen, open, close, toggle };
}

// 使用範例
const DIALOG_KEYS = ['shareQuote', 'shareTour', 'memberSidebar'] as const;
type DialogKey = typeof DIALOG_KEYS[number];

function MyComponent() {
  const { isOpen, toggle } = useDialogState<DialogKey>(DIALOG_KEYS);

  return (
    <>
      <Dialog open={isOpen('shareQuote')} onOpenChange={() => toggle('shareQuote')}>
        {/* ... */}
      </Dialog>
      <Dialog open={isOpen('shareTour')} onOpenChange={() => toggle('shareTour')}>
        {/* ... */}
      </Dialog>
    </>
  );
}
```

---

### Phase 2: 架構強化 (第 2-4 週)

**目標**: 建立更強大的服務層和 API 層
**預估時間**: 25-32 小時
**優先級**: 🟡 中

#### 1. 拆分超大檔案

**問題**: 23 個檔案超過 500 行

**優先拆分**:

```
🔴 TourPage.tsx                  897 lines → 拆成 3-4 個組件
🔴 ChannelSidebar.tsx            833 lines → 拆成 2-3 個組件
🔴 todo-expanded-view.tsx        777 lines → 拆成 2-3 個組件
🟡 enhanced-table.tsx            556 lines → 拆成 2 個組件
🟡 settings/page.tsx             484 lines → 拆成功能區塊
```

**拆分策略**:

- TourPage.tsx → TourHeader + TourTabs + TourOverview + TourMembers + TourPayments
- ChannelSidebar.tsx → ChannelHeader + MemberList + AdvanceList
- todo-expanded-view.tsx → TodoHeader + TodoContent + TodoFooter

#### 2. 擴展 Service Layer

**問題**: 只有 5 個 services，業務邏輯散落在 hooks/stores
**目標**: 建立 12-15 個專用 services

**待建立 Services**:

```typescript
// src/services/tour.service.ts
export class TourService {
  static async generateTourCode(): Promise<string>
  static async calculateFinancialSummary(tourId: string): Promise<TourFinancialSummary>
  static async updateTourStatus(tourId: string, status: TourStatus): Promise<void>
  static async archiveTour(tourId: string): Promise<void>
}

// src/services/order.service.ts
export class OrderService {
  static async generateOrderCode(): Promise<string>
  static async calculateTotals(orderId: string): Promise<OrderTotals>
  static async processPayment(orderId: string, payment: Payment): Promise<void>
}

// src/services/payment.service.ts
export class PaymentService {
  static async recordPayment(payment: Payment): Promise<void>
  static async refundPayment(paymentId: string, amount: number): Promise<void>
  static async getPaymentHistory(orderId: string): Promise<Payment[]>
}

// 其他 Services:
// - QuoteService
// - CustomerService
// - VisaService
// - ContractService
// - ItineraryService
// - EmployeeService
// - TodoService
```

#### 3. 建立完整 API Layer

**問題**: 只有 4 個 API routes，大部分直接呼叫 Supabase
**目標**: 建立 15-20 個 API routes

**待建立 API Routes**:

```
/api/tours
├── GET /api/tours
├── POST /api/tours
├── GET /api/tours/[id]
├── PUT /api/tours/[id]
├── DELETE /api/tours/[id]
└── GET /api/tours/[id]/financial-summary

/api/orders
├── GET /api/orders
├── POST /api/orders
├── GET /api/orders/[id]
├── PUT /api/orders/[id]
├── DELETE /api/orders/[id]
└── POST /api/orders/[id]/payments

/api/workspace
├── GET /api/workspace/channels
├── POST /api/workspace/channels
├── GET /api/workspace/channels/[id]/messages
└── POST /api/workspace/channels/[id]/messages
```

---

### Phase 3: 品質提升 (第 5-7 週)

**目標**: 提升測試覆蓋率和程式碼品質
**預估時間**: 30-40 小時
**優先級**: 🟢 低

#### 1. 測試覆蓋率

**目標**: 從 ~0% 提升到 60-80%

**優先測試**:

```typescript
// 1. Stores (狀態管理邏輯)
describe('TourStore', () => {
  it('should create tour with TBC code when offline')
  it('should sync tour to Supabase when online')
  it('should resolve conflicts using last-write-wins')
})

// 2. Services (業務邏輯)
describe('TourService', () => {
  it('should generate unique tour code')
  it('should calculate financial summary correctly')
  it('should update tour status')
})

// 3. API Routes (驗證 & 錯誤處理)
describe('/api/tours', () => {
  it('should validate required fields')
  it('should return 401 when unauthorized')
  it('should handle database errors')
})

// 4. Critical Hooks
describe('useTours', () => {
  it('should load tours from database')
  it('should filter tours by status')
  it('should search tours by name')
})
```

#### 2. 效能優化

**React.memo 優化** (30-50 個組件)

```typescript
export const TourCard = React.memo(
  function TourCard({ tour }: Props) {
    // ...
  },
  (prevProps, nextProps) => {
    return (
      prevProps.tour.id === nextProps.tour.id &&
      prevProps.tour.updated_at === nextProps.tour.updated_at
    )
  }
)
```

**Store Selectors** (避免不必要重新渲染)

```typescript
// ❌ 錯誤：整個 state 改變時都重新渲染
const store = useTourStore()

// ✅ 正確：只在特定值改變時重新渲染
const tours = useTourStore(state => state.items)
const loading = useTourStore(state => state.loading)
```

**List Virtualization** (大列表)

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

export function TourList({ tours }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: tours.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <TourCard key={virtualRow.key} tour={tours[virtualRow.index]} />
        ))}
      </div>
    </div>
  );
}
```

---

## 📋 優化檢查清單

### 已完成 ✅

- [x] Console.log 部分清理 (6 個核心檔案)
- [x] 未使用 imports 清理
- [x] Build 驗證通過
- [x] Phase 1/2 組件重構完成
- [x] 規範文件更新 (.claude/CLAUDE.md)

### 進行中 🔄

- [ ] 文件整合計劃執行
  - [x] DEVELOPMENT_GUIDE.md
  - [x] ARCHITECTURE.md
  - [x] DATABASE.md (docs/)
  - [x] OPTIMIZATION.md
  - [ ] 移動歷史文件到 archive/
  - [ ] 更新 README.md 導航

### 待執行 ⏳

#### 本週 (高優先級)

- [ ] 型別斷言修復 - 前 5 個檔案 (40min)
- [ ] ChannelChat.tsx State 重構 (45min)
- [ ] 提取 inline 常數 (20min)
- [ ] 建立 useDialogState hook (30min)

#### 下週 (中優先級)

- [ ] Console.log 批量清理 (剩餘 535 個)
- [ ] 拆分 TourPage.tsx (897 lines)
- [ ] 拆分 ChannelSidebar.tsx (833 lines)
- [ ] 建立 TourService
- [ ] 建立 OrderService

#### 本月 (長期目標)

- [ ] 建立完整 Service Layer (12-15 services)
- [ ] 擴展 API Layer (15-20 routes)
- [ ] 測試覆蓋率提升 (60-80%)
- [ ] 效能優化 (Component Memo, Store Selectors)

---

## ✅ 驗證與測試

### 每次優化後執行

```bash
# 1. TypeScript 型別檢查
npm run build

# 2. ESLint 檢查
npm run lint

# 3. 搜尋殘留問題
grep -r "console\." src/ | wc -l         # 目標: < 10
grep -r "as any" src/ | wc -l            # 目標: < 50
grep -r "as unknown" src/ | wc -l        # 目標: < 30
grep -r "useState<unknown>" src/ | wc -l # 目標: 0
```

### Build 成功驗證

```bash
✓ Compiled successfully in 118s
✓ Generating static pages (51/51)
✓ No errors
✓ No warnings

Status: HEALTHY ✅
```

---

## 📊 預期成果

### 優化前後對比

| 指標          | 優化前  | 優化後  | 改善    |
| ------------- | ------- | ------- | ------- |
| 健康評分      | 6.75/10 | 8.5/10  | +26%    |
| Console.log   | 541 個  | < 10 個 | -98%    |
| 型別繞過      | 188 個  | < 50 個 | -73%    |
| 超大檔案      | 23 個   | < 5 個  | -78%    |
| Service Layer | 5 個    | 15 個   | +200%   |
| API Routes    | 4 個    | 20 個   | +400%   |
| 測試覆蓋率    | ~0%     | 60-80%  | +60-80% |
| 檔案組織      | 良好    | 優秀    | +30%    |

### 投資報酬率

```
總投資時間: 78-103 小時 (6-10 週)
預期收益:
  - 維護成本降低 40%
  - 新功能開發速度提升 30%
  - Bug 發生率降低 50%
  - 新人上手時間縮短 60%
```

---

## 📚 相關文檔

- [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) - 開發指南
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 系統架構
- [DATABASE.md](./docs/DATABASE.md) - 資料庫文檔
- [PROJECT_PRINCIPLES.md](./docs/PROJECT_PRINCIPLES.md) - 設計原則

---

**文檔版本**: 1.0
**最後更新**: 2025-10-26
**維護者**: William Chien
**狀態**: 🔄 進行中
