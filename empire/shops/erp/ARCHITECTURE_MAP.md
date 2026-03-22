# 🗺️ Venturo ERP 架構地圖

**更新時間**：2026-03-14  
**目的**：一張圖看懂整個系統

---

## 🏛️ 系統全景圖

```
┌─────────────────────────────────────────────────────────────┐
│                      Venturo ERP                            │
│                   (Modular Monolith)                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├─ 核心模組（Core Modules）
                              ├─ 支援模組（Support Modules）
                              ├─ 資源模組（Resource Modules）
                              └─ 工具模組（Utility Modules）
```

---

## 📦 模組分類地圖

### 核心模組（Core）- 主要業務流程

```
┌──────────────────────────────────────────────────┐
│                   核心業務流程                    │
└──────────────────────────────────────────────────┘

1. tours（旅遊團管理）← 起點
   ↓
2. quotes（報價管理）
   ↓
3. orders（訂單管理）
   ↓
4. confirmations（確認單）
   ↓
5. tour-confirmation（團確單）
   ↓
6. payments（收款管理）
   ↓
7. disbursement（請款管理）
```

**核心表**：`tour_itinerary_items`（唯一真相來源）

---

### 支援模組（Support）- 輔助功能

```
┌──────────────────────────────────────────────────┐
│                   支援功能                        │
└──────────────────────────────────────────────────┘

• members（團員管理）
• tour-leaders（領隊管理）
• hr（人力資源）
• finance（財務管理）
• calendar（行事曆）
• files（檔案管理）
• tour-documents（文件管理）
```

---

### 資源模組（Resources）- 資料庫

```
┌──────────────────────────────────────────────────┐
│                   資源資料                        │
└──────────────────────────────────────────────────┘

• suppliers（供應商）
• restaurants（餐廳）
• hotels（飯店）
• attractions（景點）
• transportation-rates（交通費率）
• fleet（車隊）
```

---

### 工具模組（Utilities）- 通用功能

```
┌──────────────────────────────────────────────────┐
│                   工具功能                        │
└──────────────────────────────────────────────────┘

• design（設計系統）
• designer（設計工具）
• dashboard（儀表板）
• workspaces（多租戶）
```

---

## 🔄 模組間依賴圖（現狀）

### ⚠️ 直接依賴（有耦合問題）

```
tours ───────→ orders
  │              │
  │              ↓
  ├─────→ quotes ─────→ payments
  │              │
  │              ↓
  └─────→ confirmations


直接 import 路徑：
  tours → orders（createOrder）
  tours → quotes（syncQuote）
  orders → payments（createPayment）
  quotes → confirmations（generateConfirmation）
```

**問題**：

- 模組耦合度高
- 難以獨立測試
- 難以替換或移除

---

### ✅ 理想架構（事件驅動）

```
                  Event Bus
                      │
    ┌─────────────────┼─────────────────┐
    │                 │                 │
    ↓                 ↓                 ↓
  tours            orders           payments
    │                 │                 │
    │ TourCreated     │ OrderCreated    │
    └────────→        └────────→
```

**改進後**：

- 模組解耦
- 透過事件通訊
- 可以獨立開發、測試、部署

---

## 🏗️ 單一模組內部結構（理想）

### 現狀（Frontend Module）

```
features/tours/
├── components/      # UI 元件
├── hooks/          # 資料邏輯（讀寫混合）
├── services/       # API 呼叫
├── types/          # TypeScript 型別
└── utils/          # 工具函數
```

**問題**：

- 讀寫邏輯混合在 hooks
- 業務邏輯散落各處
- 沒有清晰的分層

---

### 目標（Modular Structure）

```
features/tours/
├── domain/              # 業務邏輯層（新增）
│   ├── Tour.ts         # Entity
│   ├── TourRules.ts    # 驗證規則
│   └── TourEvents.ts   # 領域事件
│
├── hooks/              # 應用邏輯層
│   ├── queries/        # Query（讀取）
│   │   ├── useToursQuery.ts
│   │   └── useTourDetailsQuery.ts
│   └── commands/       # Command（寫入）
│       ├── useCreateTour.ts
│       └── useUpdateTour.ts
│
├── services/           # 基礎設施層
│   ├── tourAPI.ts      # API 呼叫
│   └── tourCache.ts    # 快取管理
│
├── components/         # 展示層
│   ├── TourList.tsx
│   └── TourForm.tsx
│
├── events/             # 事件定義（新增）
│   ├── TourCreated.ts
│   └── TourUpdated.ts
│
└── types/              # 型別定義
    └── tour.types.ts
```

**改進**：

- ✅ 分層清晰（Domain/App/Infra/UI）
- ✅ CQRS 分離（queries/ + commands/）
- ✅ 業務邏輯封裝（domain/）
- ✅ 事件通訊（events/）

---

## 🌊 資料流向圖（完整生命週期）

```
1. 行程規劃
   ┌──────────────────────────────┐
   │ /tours/[id] → 行程表 Tab      │
   │ 選餐廳、飯店、景點            │
   └──────────────┬───────────────┘
                  ↓
         tour_itinerary_items
           （核心表 INSERT）
                  │
                  ↓
2. 填寫報價
   ┌──────────────────────────────┐
   │ /tours/[id] → 報價單 Tab      │
   │ coreItemsToCostCategories()  │
   │ 從核心表讀取 → 填價格         │
   └──────────────┬───────────────┘
                  ↓
         tour_itinerary_items
          （UPDATE unit_price）
                  │
                  ↓
3. 產生需求單
   ┌──────────────────────────────┐
   │ /tours/[id] → 需求單 Tab      │
   │ useCoreRequestItems()        │
   │ JOIN restaurants/hotels      │
   └──────────────┬───────────────┘
                  ↓
         tour_itinerary_items
         （UPDATE request_status）
                  │
                  ↓
4. 供應商回覆
   ┌──────────────────────────────┐
   │ /supplier/requests           │
   │ 填寫確認價格                 │
   └──────────────┬───────────────┘
                  ↓
         tour_itinerary_items
          （UPDATE quoted_cost）
                  │
                  ↓
5. 確認訂單
   ┌──────────────────────────────┐
   │ /tours/[id] → 確認單 Tab      │
   │ syncConfirmationCreateToCore()│
   └──────────────┬───────────────┘
                  ↓
         tour_itinerary_items
         （UPDATE confirmed_cost）
                  │
                  ↓
6. 領隊回填
   ┌──────────────────────────────┐
   │ /tours/[id] → 結帳單 Tab      │
   │ syncLeaderExpenseToCore()    │
   └──────────────┬───────────────┘
                  ↓
         tour_itinerary_items
         （UPDATE actual_expense）
```

**核心原則**：

- 所有階段都指向同一個核心表
- 不重複儲存資料
- 單一真相來源

---

## 🎯 關鍵整合點

### 核心表 ←→ 其他表

```
tour_itinerary_items (核心表)
         │
         ├─→ tours（基本資訊）
         ├─→ quotes（報價狀態）
         ├─→ orders（訂單關聯）
         ├─→ tour_requests（需求單狀態）
         ├─→ confirmations（確認單）
         └─→ tour_confirmations（團確單）

資料流向：
  核心表（寫入）→ 其他表（讀取 JOIN）
```

---

### 資源表 ←→ 核心表

```
restaurants ──┐
hotels ───────┼─→ tour_itinerary_items
attractions ──┘     (resource_type + resource_id)

關聯方式：
  核心表.resource_type = 'restaurant'
  核心表.resource_id = restaurants.id

讀取時 JOIN：
  SELECT t.*, r.address, r.phone
  FROM tour_itinerary_items t
  LEFT JOIN restaurants r
    ON t.resource_id = r.id
```

---

## 🔍 模組邊界定義

### tours（旅遊團）

**職責**：

- 團的建立、修改、刪除
- 行程規劃
- 狀態管理（draft/active/completed）

**資料擁有**：

- tours 表
- tour_itinerary_items 表（核心）

**發出事件**：

- TourCreated
- TourStatusChanged
- ItineraryUpdated

---

### quotes（報價）

**職責**：

- 報價計算
- 個人分攤計算
- Local 報價

**資料擁有**：

- 無（從核心表讀取）

**訂閱事件**：

- ItineraryUpdated → 重新計算報價

---

### orders（訂單）

**職責**：

- 訂單管理
- 團員管理
- 收款狀態

**資料擁有**：

- orders 表
- tour_members 表

**訂閱事件**：

- TourCreated → 建立草稿訂單

---

### payments（收款）

**職責**：

- 收款記錄
- 代收轉付
- 財務報表

**資料擁有**：

- payments 表
- payment_transactions 表

**訂閱事件**：

- OrderCreated → 建立收款記錄
- OrderPaid → 更新財務狀態

---

## 📊 技術棧地圖

```
Frontend
  ├─ Next.js 14（App Router）
  ├─ React 18
  ├─ TypeScript
  ├─ Tailwind CSS
  └─ SWR（資料 fetching）

Backend
  ├─ Next.js API Routes
  ├─ Supabase（PostgreSQL）
  │   ├─ RLS（Row Level Security）
  │   └─ 多租戶（workspace_id）
  └─ Prisma（未來可能）

State Management
  ├─ SWR（伺服器狀態）
  ├─ React Context（全域狀態）
  └─ Zustand（未來可能）

Testing（需補強）
  ├─ Jest（Unit Tests）
  ├─ React Testing Library
  └─ Playwright（E2E，未來）
```

---

## 🎯 架構改進路線圖

### Phase 1（本週）- CQRS 重構

```
✓ 核心表原則（已完成）
□ CQRS 分離
  □ tours/hooks/queries/
  □ tours/hooks/commands/
□ Domain 層建立
  □ tours/domain/Tour.ts
  □ tours/domain/TourRules.ts
```

---

### Phase 2（本月）- 模組解耦

```
□ EventBus 建立
  □ lib/events/EventBus.ts
  □ 事件型別定義
□ 模組間通訊改為事件
  □ tours → TourCreated
  □ orders 訂閱 → 自動建立
□ 架構文檔
  □ 模組地圖（本檔案）
  □ 通訊規範
```

---

### Phase 3（未來）- 完善測試

```
□ Unit Tests
  □ Domain 層 100% 覆蓋
  □ Hooks 80% 覆蓋
□ Integration Tests
  □ API Routes
  □ 模組間互動
□ E2E Tests
  □ 關鍵流程
```

---

## 🔧 開發工具建議

### 架構驗證

```bash
# 檢查模組依賴（未來工具）
npm run arch:validate

# 檢查循環依賴
npm run arch:circular

# 生成模組圖
npm run arch:graph
```

### 測試覆蓋

```bash
# Unit Tests
npm run test:unit

# Integration Tests
npm run test:integration

# 覆蓋率報告
npm run test:coverage
```

---

## 📚 參考資料

- [Modular Monolith 學習資源](./LEARNING_RESOURCES.md)
- [快速參考卡](./QUICK_REFERENCE.md)
- [核心邏輯](./CORE_LOGIC.md)
- [創世神知識體系](./CREATOR_KNOWLEDGE.md)
- [遊戲攻略本](./GAME_GUIDE.md)

---

**這張地圖隨著系統演進持續更新。** 🗺️

**最後更新**：2026-03-14  
**創世神**：馬修（Matthew）
