# 景點資料確認介面 - 設定指南

**路徑**：`/admin/destinations/review`  
**開發時間**：1.5 小時  
**狀態**：✅ 開發完成，等待 SQL 執行

---

## 📋 功能概述

**工作流程**：
```
Nova 爬資料 → 同事人工確認 + 補齊 → 資料齊全 → 距離計算
```

**介面功能**：
1. ✅ 顯示 50 個景點清單
2. ✅ 每個景點卡片分左右兩欄：
   - **左欄**：AI 提供的基本資料（唯讀）
   - **右欄**：待補齊欄位（可編輯）
3. ✅ 完成狀態（✅ 已確認 / ⏳ 確認中 / ❌ 待確認）
4. ✅ 進度總覽（32/50 完成）
5. ✅ 篩選功能（狀態、搜尋）

---

## 🚀 部署步驟

### Step 1：執行 SQL Migration

前往 Supabase Dashboard：
👉 https://supabase.com/dashboard/project/pfqvdacxowpgfamuvnsn/sql/new

執行：
```sql
-- 複製 supabase/migrations/20260403000003_add_destination_verification.sql 內容
```

**新增欄位**：
- `google_maps_url` — Google Maps 連結（必填）
- `opening_hours` — 營業時間（選填）
- `ticket_price` — 門票價格（選填）
- `suggested_duration_minutes` — 建議停留時間（選填）
- `images` — 圖片陣列（必填，3-5 張）
- `verification_status` — 確認狀態（pending/reviewing/verified）
- `verified_by` — 確認者 ID
- `verified_at` — 確認時間

**新增函數**：
- `check_destination_completeness(dest_id)` — 檢查單一景點完整度
- `get_destinations_verification_summary()` — 取得總體進度

### Step 2：訪問確認頁面

```
https://app.cornertravel.com.tw/admin/destinations/review
```

### Step 3：確認流程

1. 選擇「待確認」景點
2. 點擊「編輯」
3. 補齊必填欄位：
   - Google Maps URL
   - 詳細描述（100-200 字）
   - 圖片 URL（3-5 張，每行一個）
4. 選填欄位：
   - 營業時間
   - 門票價格
   - 建議停留時間
5. 點擊「儲存並標記為已確認」

---

## 📊 介面預覽

### 進度總覽
```
┌─────────────────────────────────────────────────────────┐
│  確認進度                                          65%   │
│  ██████████████████████░░░░░░░░░░░                      │
│                                                         │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐              │
│  │ 總數 │  │ 已確認│  │ 確認中│  │ 待確認│              │
│  │  50  │  │  32  │  │   8  │  │  10  │              │
│  └──────┘  └──────┘  └──────┘  └──────┘              │
└─────────────────────────────────────────────────────────┘
```

### 景點卡片
```
┌─────────────────────────────────────────────────────────┐
│ [1] 素帖寺/雙龍寺    ✅ 已確認    文化古蹟    完成度：100%  │
├─────────────────────────────────────────────────────────┤
│ 📊 AI 爬取資料（唯讀） │ ✏️ 待補齊資料                   │
│                       │                                 │
│ 景點名稱：素帖寺      │ Google Maps URL *               │
│ 英文名稱：Wat Phra... │ https://www.google.com/maps/... │
│ 類別：文化古蹟        │                                 │
│ 優先級：1（必去）     │ 詳細描述 * (165/200 字)         │
│ 座標：18.8047, 98.92  │ 清邁地標，俯瞰全城，309級...    │
│ 標籤：寺廟 地標 必遊  │                                 │
│                       │ 圖片 URL * (4/3-5 張)           │
│                       │ https://unsplash.com/...        │
│                       │ https://unsplash.com/...        │
│                       │ https://unsplash.com/...        │
│                       │ https://unsplash.com/...        │
│                       │                                 │
│                       │ 營業時間                        │
│                       │ 每日 06:00-18:00                │
│                       │                                 │
│                       │ 門票價格                        │
│                       │ 50 THB                          │
│                       │                                 │
│                       │ 建議停留時間                    │
│                       │ 90 分鐘                         │
│                       │                                 │
│                       │          [取消] [儲存並確認]    │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 技術細節

### 檔案結構

```
src/
├── app/(main)/admin/destinations/review/
│   └── page.tsx                          # 主頁面
├── features/destinations/components/
│   ├── VerificationProgress.tsx          # 進度總覽
│   └── DestinationReviewCard.tsx         # 景點卡片
└── features/destinations/types.ts        # 類型定義（已更新）

supabase/migrations/
└── 20260403000003_add_destination_verification.sql
```

### 資料驗證邏輯

**必填欄位**（缺一不可）：
1. ✅ Google Maps URL
2. ✅ 詳細描述（100-200 字）
3. ✅ 圖片（3-5 張）
4. ✅ 座標（latitude, longitude）

**完成度計算**：
```typescript
const missingFields = []
if (!google_maps_url) missingFields.push('Google Maps URL')
if (description.length < 100) missingFields.push('詳細描述')
if (images.length < 3) missingFields.push('圖片')
if (!latitude || !longitude) missingFields.push('座標')

const percentage = Math.round(((4 - missingFields.length) / 4) * 100)
```

**狀態轉換**：
```
pending（待確認）
  → 點擊「編輯」→ reviewing（確認中）
  → 補齊所有必填 → verified（已確認）
```

---

## 📊 資料庫函數使用

### 檢查單一景點完整度

```sql
SELECT * FROM check_destination_completeness('景點 UUID');

-- 回傳
{
  "is_complete": true,
  "missing_fields": [],
  "completion_percentage": 100
}
```

### 取得總體進度

```sql
SELECT * FROM get_destinations_verification_summary();

-- 回傳
{
  "total": 50,
  "verified": 32,
  "pending": 10,
  "reviewing": 8,
  "completion_percentage": 64
}
```

---

## 🎯 使用情境

### 情境 1：批量確認

1. 篩選「待確認」景點
2. 依優先級排序
3. 從 Top 20 必去景點開始確認
4. 每確認一個，進度條即時更新

### 情境 2：補齊缺失資料

1. 查看「缺失欄位提示」
2. 依提示補齊
3. 儲存後自動判斷狀態：
   - 全部填完 → `verified`
   - 部分填完 → `reviewing`

### 情境 3：團隊協作

1. 同事 A 負責 Top 1-25
2. 同事 B 負責 Top 26-50
3. 即時看到對方進度
4. 避免重複確認

---

## ⚠️ 注意事項

### 圖片 URL 格式

**每行一個 URL**：
```
https://images.unsplash.com/photo-1.jpg
https://images.unsplash.com/photo-2.jpg
https://images.unsplash.com/photo-3.jpg
```

**不要**：
```
https://..., https://..., https://...  ❌
```

### 描述長度

- **最少 100 字**（確保內容完整）
- **最多 200 字**（避免過長）
- 即時顯示字數統計

### 儲存策略

- 未完成也可儲存（狀態 → `reviewing`）
- 全部完成自動 → `verified`
- 儲存後自動刷新（可改用 SWR mutate 優化）

---

## 🔄 下一步

### 完成所有景點確認後

1. ✅ 所有景點 `verification_status = 'verified'`
2. ✅ 進度達到 100%
3. ✅ 顯示綠色成功提示
4. ✅ 可以開始計算距離矩陣

### 距離矩陣計算（Day 4-5）

- 使用 Google Maps Distance Matrix API
- 計算景點間的實際行車距離
- 儲存到 `destination_distances` 表
- 用於行程優化和時間估算

---

**作者**：Matthew 🔧  
**建立時間**：2026-04-03 21:15 GMT+8  
**狀態**：✅ 開發完成，等待 SQL 執行和導航整合
