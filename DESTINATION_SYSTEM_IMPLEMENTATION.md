# 清邁景點選擇系統 - 實作報告

**專案名稱**：清邁景點選擇系統（角落旅行社內部版）  
**開發者**：Matthew 🔧  
**日期**：2026-04-03  
**狀態**：✅ Day 1-2 完成（80%），等待 SQL 執行後可測試

---

## 📋 系統概述

### 核心目標
讓客戶從 50 個景點自己選 → 減少來回溝通 → 降低 token 浪費

### 使用流程

```
客戶在 LINE：「我想去清邁 5 天」
  ↓
Bot：「清邁很棒！我們有 50 個精選景點，你想看：
🏛️ 文化古蹟（素帖寺、白廟...）
🌿 自然風光（大象營、茵他儂...）
👨‍👩‍👧 親子活動（夜間動物園...）
💑 浪漫悠閒（寧曼路、咖啡廳...）
或者我幫你推薦 5 個？」
  ↓
客戶選擇「幫我推薦」或「我自己選」
  ↓
Bot 顯示景點 Carousel（含圖片、簡介、地圖連結）
  ↓
客戶點選景點（可多選）
  ↓
Bot：「收到！你選了 8 個景點：
- 素帖寺
- 大象營
- ...

我幫你建立需求單，稍後客服會聯絡報價 😊」
  ↓
系統自動建立需求單 + 記錄景點選擇
```

---

## 🏗️ 系統架構

### 1. 資料庫設計

#### destinations 表（景點資料庫）
```sql
CREATE TABLE public.destinations (
  id UUID PRIMARY KEY,
  city TEXT NOT NULL DEFAULT '清邁',
  name TEXT NOT NULL,
  name_en TEXT,
  category TEXT,  -- 文化古蹟/自然風光/親子活動/浪漫悠閒/美食購物
  description TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  tags TEXT[],
  image_url TEXT,
  priority INTEGER DEFAULT 50,  -- 1-20 必去，21-50 推薦
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### customer_destination_picks 表（客戶選擇記錄）
```sql
CREATE TABLE public.customer_destination_picks (
  id UUID PRIMARY KEY,
  line_user_id TEXT NOT NULL,
  destination_id UUID REFERENCES destinations(id),
  session_id TEXT,  -- 同一次選擇的會話 ID
  selected_at TIMESTAMP
);
```

### 2. TypeScript 類型定義

**檔案**：`src/features/destinations/types.ts`

```typescript
export interface Destination {
  id: string
  city: string
  name: string
  name_en?: string
  category?: string  // 文化古蹟/自然風光/親子活動...
  description?: string
  latitude?: number
  longitude?: number
  tags?: string[]
  image_url?: string
  priority: number  // 1-20 必去，21-50 推薦
  created_at: string
  updated_at: string
}

export interface CustomerDestinationPick {
  id: string
  line_user_id: string
  destination_id: string
  session_id?: string
  selected_at: string
  destination?: Destination  // Join 欄位
}
```

### 3. Entity Hooks（資料存取層）

**檔案**：
- `src/data/entities/destinations.ts`
- `src/data/entities/customer-destination-picks.ts`

```typescript
// 使用範例
import { useDestinations, createDestination } from '@/data/entities/destinations'
import { useCustomerDestinationPicks } from '@/data/entities/customer-destination-picks'

// 載入景點
const { data: destinations } = useDestinations()

// 載入客戶選擇
const { data: picks } = useCustomerDestinationPicks({
  filters: { line_user_id: 'U1234567890' }
})
```

### 4. LINE Bot 互動邏輯

**檔案**：`src/lib/line/destination-selection.ts`

#### 核心函數

| 函數 | 功能 |
|------|------|
| `detectChiangMaiIntent(message)` | 偵測「清邁」關鍵字 |
| `sendCategorySelection(replyToken)` | 顯示類別選擇按鈕 |
| `loadDestinations(category?, topOnly?)` | 載入景點（可篩選類別或 Top 20） |
| `sendDestinationCarousel(userId, destinations, sessionId)` | 顯示景點 Carousel |
| `saveDestinationPick(userId, destId, sessionId)` | 記錄選擇 |
| `getUserPicks(userId, sessionId)` | 取得已選景點 |
| `sendPicksSummary(replyToken, picks)` | 顯示選擇摘要 |
| `generateSessionId()` | 產生會話 ID |

### 5. LINE Webhook 整合

**檔案**：`src/app/api/line/webhook/route.ts`

**新增處理流程**：
1. **文字訊息**：偵測「清邁」→ 顯示類別選擇
2. **Postback 事件**：處理按鈕點擊
   - `action=view_destinations&category=文化古蹟` → 顯示文化景點
   - `action=recommend_top20` → 推薦 Top 20
   - `action=pick_destination&destination_id=xxx` → 記錄選擇
3. **完成指令**：輸入「完成」→ 顯示摘要

---

## 📦 已建立的檔案

### 資料庫 Migration
```
supabase/migrations/
  └── 20260403000000_create_destination_selection.sql
```

### 腳本
```
scripts/
  ├── import-chiangmai-destinations.mjs        # 匯入 50 個景點
  └── apply-destination-migration.mjs          # 執行 migration（備用）
```

### 類型定義
```
src/features/destinations/
  └── types.ts                                  # Destination, CustomerDestinationPick
```

### Entity Hooks
```
src/data/entities/
  ├── destinations.ts                           # useDestinations, createDestination
  └── customer-destination-picks.ts             # useCustomerDestinationPicks
```

### LINE Bot 邏輯
```
src/lib/line/
  └── destination-selection.ts                  # 景點選擇核心邏輯
```

### API 路由
```
src/app/api/line/
  └── webhook/route.ts                          # 整合景點選擇流程
```

### 文件
```
/
  ├── DESTINATION_SYSTEM_SETUP.md              # 設定指南
  └── DESTINATION_SYSTEM_IMPLEMENTATION.md     # 本文件
```

---

## 🚀 部署步驟

### Step 1：執行 SQL 建表

**請手動執行**（Supabase 不支援 API 執行 DDL）

1. 前往：https://supabase.com/dashboard/project/pfqvdacxowpgfamuvnsn/sql/new
2. 複製 `supabase/migrations/20260403000000_create_destination_selection.sql` 內容
3. 點擊「Run」

### Step 2：匯入景點資料

```bash
cd ~/Projects/venturo-erp
node scripts/import-chiangmai-destinations.mjs
```

預期輸出：
```
✅ [1] 素帖寺/雙龍寺
✅ [2] 契迪龍寺
...
✅ [50] 帝王餐體驗

📊 完成統計:
✅ 成功: 50 個
```

### Step 3：部署程式碼

```bash
git add .
git commit -m "feat: 清邁景點選擇系統 (Day 1-2)"
git push origin main
```

**自動部署**：Push 到 GitHub 即完成部署

### Step 4：測試

1. 加入 LINE Bot 好友
2. 傳送：「我想去清邁」
3. 點擊類別按鈕
4. 選擇景點
5. 輸入「完成」查看摘要

---

## 📊 景點資料統計

### Top 20 必去景點（priority 1-20）

| 優先級 | 景點名稱 | 類別 |
|--------|---------|------|
| 1 | 素帖寺/雙龍寺 | 文化古蹟 |
| 2 | 契迪龍寺 | 文化古蹟 |
| 3 | 帕辛寺 | 文化古蹟 |
| 4 | 清邁週日夜市 | 美食購物 |
| 5 | 清邁週六夜市 | 美食購物 |
| 6 | 塔佩門 | 文化古蹟 |
| 7 | 清邁夜間動物園 | 親子活動 |
| 8 | 大象保育營 | 親子活動 |
| 9 | 白廟（龍昆寺） | 文化藝術 |
| 10 | 藍廟（龍蘇町寺） | 文化藝術 |
| ... | ... | ... |

### 類別分布

| 類別 | 景點數 | Emoji |
|------|--------|-------|
| 🏛️ 文化古蹟 | 12 | 🏛️ |
| 🌿 自然風光 | 8 | 🌿 |
| 👨‍👩‍👧 親子活動 | 7 | 👨‍👩‍👧 |
| 💑 浪漫悠閒 | 5 | 💑 |
| 🛍️ 美食購物 | 10 | 🛍️ |
| 🎨 文創藝術 | 4 | 🎨 |
| 🏃 冒險活動 | 2 | 🏃 |
| 🧘 文化體驗 | 8 | 🧘 |

---

## 💡 設計亮點

### 1. 簡化架構（內部工具優先）
- ❌ 不需要 workspace_id（只有角落用）
- ❌ 不需要複雜權限控制
- ✅ RLS 全開（`FOR SELECT USING (true)`）
- ✅ 快速開發、立即上線

### 2. Session 管理
- 每次選擇產生唯一 `session_id`
- 同一次選擇的景點綁定同一個 session
- 方便追蹤客戶選擇歷程

### 3. LINE Bot 互動優化
- **類別按鈕**：減少選擇負擔
- **Carousel 顯示**：圖片 + 簡介 + 地圖連結
- **多選機制**：不限選擇數量
- **即時回饋**：每選一個就顯示已選數量

### 4. 資料結構優化
- `priority` 欄位區分必去（1-20）和推薦（21-50）
- `tags` 陣列支援多標籤搜尋
- `latitude/longitude` 支援地圖標記
- `image_url` 提升視覺體驗

---

## 📈 預期效益

### 成本節省（每月）
```
假設每天 10 個清邁詢問：
- 舊流程：來回 3 次確認景點（~1,500 tokens/次）
- 新流程：客戶自己選（~300 tokens）
- 節省：1,200 tokens × 10 次/天 × 30 天 = 360K tokens/月
- 約省 $15-30/月
```

### 核心價值（更重要）
✅ **客服效率提升**：不用重複問「你想去哪裡？」  
✅ **客戶體驗更好**：自己選、有參與感、視覺化  
✅ **轉換率提升**：降低流失、提高成交率  
✅ **資料累積**：了解客戶偏好、優化景點推薦

---

## 🔄 下一步開發（Day 3-4）

### Day 3：需求單整合

#### 1. 完成選擇摘要優化
```typescript
// src/lib/line/destination-selection.ts
async function handleFinishSelection(userId: string, sessionId: string) {
  const picks = await getUserPicks(userId, sessionId)
  
  // 計算類型分布
  const categoryCount = picks.reduce((acc, dest) => {
    const cat = dest.category || '其他'
    acc[cat] = (acc[cat] || 0) + 1
    return acc
  }, {})
  
  // 建議天數（平均每天 3 個景點）
  const suggestedDays = Math.ceil(picks.length / 3)
  
  // 顯示摘要
  await sendPicksSummary(replyToken, picks, categoryCount, suggestedDays)
}
```

#### 2. 自動建立需求單（或連結 tours）
```typescript
// 如果有 inquiries 表
const inquiry = await createInquiry({
  line_user_id: userId,
  destination: '清邁',
  days: suggestedDays,
  destination_picks_session_id: sessionId,
  status: 'pending',
})

// 或連結到 tours
const tour = await createTour({
  customer_line_id: userId,
  destination: '清邁',
  estimated_days: suggestedDays,
})
```

### Day 4：ERP 整合

#### 1. 需求單頁面顯示客戶選擇
```typescript
// src/features/inquiries/components/InquiryDestinationPicks.tsx
export function InquiryDestinationPicks({ sessionId }: { sessionId: string }) {
  const { data: picks } = useCustomerDestinationPicks({
    filters: { session_id: sessionId }
  })
  
  return (
    <div>
      <h3>客戶選擇的景點（{picks?.length}）</h3>
      
      {/* 地圖標記 */}
      <DestinationMap destinations={picks.map(p => p.destination)} />
      
      {/* 類型分布圓餅圖 */}
      <CategoryChart picks={picks} />
      
      {/* 景點列表 */}
      <DestinationList picks={picks} />
      
      {/* 建議天數 */}
      <div>建議天數：{Math.ceil(picks.length / 3)}-{Math.ceil(picks.length / 3) + 1} 天</div>
    </div>
  )
}
```

#### 2. 地圖標記組件
```typescript
// src/features/destinations/components/DestinationMap.tsx
export function DestinationMap({ destinations }: { destinations: Destination[] }) {
  // 使用 Google Maps / Leaflet 顯示景點位置
  // 標記優先級（必去用紅色、推薦用藍色）
}
```

#### 3. 類型分布圖表
```typescript
// src/features/destinations/components/CategoryChart.tsx
export function CategoryChart({ picks }: { picks: CustomerDestinationPick[] }) {
  // 使用 Recharts 顯示圓餅圖
  const data = picks.reduce((acc, pick) => {
    const cat = pick.destination?.category || '其他'
    acc[cat] = (acc[cat] || 0) + 1
    return acc
  }, {})
  
  return <PieChart data={Object.entries(data)} />
}
```

---

## ⚠️ 已知限制與後續改進

### 目前限制
1. ❌ Carousel 只能顯示 10 個景點（LINE 限制）
2. ❌ Session 管理簡單（未持久化到用戶狀態）
3. ❌ 未整合需求單系統（需確認現有 inquiries/tours 結構）
4. ❌ 未做去重（客戶可能重複選同一個景點）

### 後續改進
1. ✅ 分頁顯示景點（超過 10 個時提供「下一頁」）
2. ✅ Session 持久化（儲存到 Redis 或 DB）
3. ✅ 整合需求單（自動建立 inquiry 或 tour）
4. ✅ 去重邏輯（檢查 line_user_id + destination_id + session_id）
5. ✅ 後台管理 UI（新增/編輯景點）
6. ✅ 多城市支援（曼谷、普吉島...）

---

## ✅ 完成檢查清單

### Day 1：資料庫 + 資料匯入
- [x] 資料表設計
- [x] Migration SQL
- [x] 景點資料整理（50 個）
- [x] 匯入腳本
- [x] TypeScript 類型
- [x] Entity Hooks

### Day 2：LINE Bot 互動
- [x] 景點選擇處理器
- [x] 清邁關鍵字偵測
- [x] 類別選擇按鈕
- [x] 景點 Carousel
- [x] 多選功能
- [x] 選擇記錄儲存
- [x] Webhook 整合

### Day 3：需求單整合（待完成）
- [ ] 完成選擇摘要
- [ ] 自動建立需求單
- [ ] 客戶通知

### Day 4：ERP 整合（待完成）
- [ ] ERP 顯示客戶選擇
- [ ] 地圖標記
- [ ] 類型分布圖表
- [ ] 景點順序調整

---

## 📞 聯絡與支援

**開發者**：Matthew 🔧  
**系統狀態**：✅ 開發完成 80%，等待 SQL 執行後可測試  
**預計完成時間**：2026-04-05（Day 3-4 完成後）

---

**建立時間**：2026-04-03 17:44 GMT+8  
**版本**：v1.0  
**狀態**：🚧 開發中（Day 1-2 完成）
