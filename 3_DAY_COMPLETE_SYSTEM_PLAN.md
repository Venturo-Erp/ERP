# 🚀 清邁完整選擇系統 - 3 天開發計畫

**目標**：景點 + 餐廳 + 酒店 完整系統  
**時程**：3 天（2026-04-03 ~ 2026-04-05）  
**策略**：最大化複用、並行開發、AI 輔助

---

## 📊 Day 1：景點系統（已完成 80%）

### ✅ 完成項目
- [x] 資料庫設計（destinations、customer_destination_picks）
- [x] Migration SQL
- [x] 50 個景點資料整理
- [x] 資料匯入腳本
- [x] TypeScript 類型定義
- [x] Entity Hooks
- [x] LINE Bot 互動流程
- [x] Webhook 整合

### ⏳ 剩餘工作（2-3 小時）
- [ ] 執行 SQL 建表
- [ ] 匯入景點資料
- [ ] LINE 實機測試
- [ ] 完成選擇摘要優化
- [ ] Git 提交

---

## 🍽️ Day 2：餐廳系統（並行開發）

### Phase 1：資料庫 + 資料匯入（2 小時）
- [x] 資料庫設計（restaurants、customer_restaurant_picks）
- [x] Migration SQL
- [x] 30 個餐廳資料整理
- [x] 資料匯入腳本
- [x] TypeScript 類型定義
- [x] Entity Hooks

### Phase 2：LINE Bot 邏輯（2 小時）
- [ ] 複製景點選擇邏輯
- [ ] 修改為餐廳選擇
- [ ] 新增餐型選擇（早/午/晚/下午茶）
- [ ] 新增價格篩選（💰/💰💰/💰💰💰）
- [ ] Carousel 顯示餐廳（必點菜色、價格）
- [ ] Webhook 整合

### Phase 3：整合測試（1 小時）
- [ ] 景點 + 餐廳一起測試
- [ ] 摘要顯示優化
- [ ] 建立需求單邏輯

**預計完成時間**：Day 2 結束（5 小時）

---

## 🏨 Day 3：酒店系統 + 整合

### Phase 1：資料庫 + 資料匯入（2 小時）
- [ ] 資料庫設計（hotels、customer_hotel_picks）
- [ ] Migration SQL
- [ ] 20 個酒店資料整理
  - 五星級酒店（5 個）
  - 精品酒店（5 個）
  - 平價酒店（5 個）
  - 民宿/Hostel（5 個）
- [ ] 資料匯入腳本
- [ ] TypeScript 類型定義
- [ ] Entity Hooks

### Phase 2：LINE Bot 邏輯（2 小時）
- [ ] 複製景點選擇邏輯
- [ ] 修改為酒店選擇
- [ ] 新增星級篩選（⭐⭐⭐⭐⭐）
- [ ] 新增價格範圍
- [ ] 新增住宿天數
- [ ] Carousel 顯示酒店（房型、設施）
- [ ] Webhook 整合

### Phase 3：完整整合（2 小時）
- [ ] 景點 + 餐廳 + 酒店 統一流程
- [ ] 建立完整需求單
  - 景點列表
  - 餐廳列表（分早/午/晚）
  - 酒店資訊
  - 建議天數
  - 預估預算
- [ ] ERP 顯示整合（客服查看客戶選擇）
- [ ] 完整測試

**預計完成時間**：Day 3 結束（6 小時）

---

## 🎯 總時程估算

| 階段 | 預估時間 | 完成時間 |
|------|---------|---------|
| **Day 1：景點系統** | 8 小時 | ✅ 已完成 80% |
| 剩餘工作 | 2-3 小時 | 2026-04-03 晚上 |
| **Day 2：餐廳系統** | 5 小時 | 2026-04-04 下午 |
| **Day 3：酒店系統 + 整合** | 6 小時 | 2026-04-05 下午 |
| **總計** | ~20 小時 | 3 天完成 |

---

## 🔧 技術架構（複用）

### 1. 資料表設計（統一結構）

```sql
-- 景點
CREATE TABLE destinations (
  id UUID PRIMARY KEY,
  city TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  priority INTEGER,
  ...
);

-- 餐廳（複製景點結構）
CREATE TABLE restaurants (
  id UUID PRIMARY KEY,
  city TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  priority INTEGER,
  price_range TEXT,  -- 新增
  must_try_dish TEXT, -- 新增
  ...
);

-- 酒店（複製景點結構）
CREATE TABLE hotels (
  id UUID PRIMARY KEY,
  city TEXT NOT NULL,
  name TEXT NOT NULL,
  star_rating INTEGER, -- 新增
  price_range TEXT,    -- 新增
  room_types JSONB,    -- 新增
  ...
);

-- 客戶選擇記錄（統一結構）
CREATE TABLE customer_destination_picks (...);
CREATE TABLE customer_restaurant_picks (...);
CREATE TABLE customer_hotel_picks (...);
```

### 2. TypeScript 類型（複用）

```typescript
// 基礎類型
interface BaseSelection {
  id: string
  city: string
  name: string
  category?: string
  priority: number
  image_url?: string
  ...
}

// 延伸
interface Destination extends BaseSelection { ... }
interface Restaurant extends BaseSelection {
  price_range?: string
  must_try_dish?: string
  ...
}
interface Hotel extends BaseSelection {
  star_rating?: number
  room_types?: string[]
  ...
}
```

### 3. Entity Hooks（複製）

```typescript
// destinations.ts → restaurants.ts → hotels.ts
export const xxxEntity = createEntityHook<XXX>('xxx', {
  list: { select: '*', orderBy: { column: 'priority', ascending: true } },
  ...
})
```

### 4. LINE Bot 邏輯（複製）

```typescript
// destination-selection.ts → restaurant-selection.ts → hotel-selection.ts
export async function loadXXX(category?, topOnly?) { ... }
export async function sendXXXCarousel(userId, items, sessionId) { ... }
export async function saveXXXPick(userId, itemId, sessionId) { ... }
```

---

## 📦 檔案結構（統一）

```
supabase/migrations/
  ├── 20260403000000_create_destination_selection.sql  ✅
  ├── 20260403000001_create_restaurant_selection.sql   ✅
  └── 20260403000002_create_hotel_selection.sql        [ ]

scripts/
  ├── import-chiangmai-destinations.mjs  ✅
  ├── import-chiangmai-restaurants.mjs   ✅
  └── import-chiangmai-hotels.mjs        [ ]

src/features/
  ├── destinations/
  │   └── types.ts  ✅
  ├── restaurants/
  │   └── types.ts  ✅
  └── hotels/
      └── types.ts  [ ]

src/data/entities/
  ├── destinations.ts                     ✅
  ├── customer-destination-picks.ts       ✅
  ├── restaurants.ts                      ✅
  ├── customer-restaurant-picks.ts        ✅
  ├── hotels.ts                           [ ]
  └── customer-hotel-picks.ts             [ ]

src/lib/line/
  ├── destination-selection.ts  ✅
  ├── restaurant-selection.ts   [ ]
  └── hotel-selection.ts        [ ]
```

---

## 🚀 加速策略

### 1. 最大化複用
- ✅ 資料表結構 80% 相同
- ✅ TypeScript 類型直接複製
- ✅ Entity Hooks 幾乎一模一樣
- ✅ LINE Bot 邏輯改幾個變數名

### 2. 並行開發
- ✅ Day 1 晚上：景點收尾 + 餐廳資料準備
- ✅ Day 2 上午：餐廳 SQL + 資料匯入
- ✅ Day 2 下午：餐廳 LINE Bot
- ✅ Day 3 上午：酒店 SQL + 資料匯入
- ✅ Day 3 下午：酒店 LINE Bot + 整合

### 3. AI 輔助
- ✅ 用 Coding Agent 生成重複程式碼
- ✅ 複製 `destination-selection.ts` → AI 改成 `restaurant-selection.ts`
- ✅ 複製 Migration SQL → AI 改欄位

### 4. 測試優化
- ✅ 每個系統獨立測試
- ✅ 最後整合測試
- ✅ 先不做 ERP UI（Day 4 再做）

---

## 📊 資料準備（已準備）

### 景點（50 個）
- ✅ Top 20 必去景點
- ✅ Top 21-50 推薦景點
- ✅ 含座標、圖片、描述

### 餐廳（30 個）
- ✅ Top 20 必吃餐廳
- ✅ Top 21-30 推薦餐廳
- ✅ 含價格、必點菜色

### 酒店（20 個，待準備）
- [ ] 五星級（5 個）
- [ ] 精品酒店（5 個）
- [ ] 平價酒店（5 個）
- [ ] 民宿/Hostel（5 個）

---

## ✅ 完成檢查清單

### Day 1：景點系統
- [x] 資料庫設計
- [x] 資料匯入
- [x] TypeScript 類型
- [x] Entity Hooks
- [x] LINE Bot 邏輯
- [x] Webhook 整合
- [ ] 執行 SQL
- [ ] 實機測試

### Day 2：餐廳系統
- [x] 資料庫設計
- [x] 資料準備
- [x] TypeScript 類型
- [x] Entity Hooks
- [ ] LINE Bot 邏輯
- [ ] Webhook 整合
- [ ] 實機測試

### Day 3：酒店系統
- [ ] 資料庫設計
- [ ] 資料準備
- [ ] TypeScript 類型
- [ ] Entity Hooks
- [ ] LINE Bot 邏輯
- [ ] Webhook 整合
- [ ] 實機測試
- [ ] 完整整合

---

## 🎯 成功指標

### 功能完整度
- ✅ 景點選擇（50 個）
- ✅ 餐廳選擇（30 個）
- ✅ 酒店選擇（20 個）
- ✅ 統一需求單

### 用戶體驗
- ✅ LINE Bot 流暢操作
- ✅ 圖片 + 描述清晰
- ✅ 分類清楚（類別/價格/星級）
- ✅ 摘要完整

### 系統效能
- ✅ 每次查詢 < 1 秒
- ✅ Carousel 載入 < 2 秒
- ✅ 選擇記錄即時儲存

---

**作者**：Matthew 🔧  
**建立時間**：2026-04-03 17:49 GMT+8  
**狀態**：🚧 執行中（Day 1 完成 80%、Day 2 已準備 50%）
