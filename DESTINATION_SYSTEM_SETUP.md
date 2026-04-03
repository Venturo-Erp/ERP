# 清邁景點選擇系統 - 設定指南

## 📋 系統概述

**目標**：讓客戶從 50 個景點自己選 → 減少來回溝通 → 降低 token 浪費

**進度**：✅ Day 1 完成 80%

---

## ⚡ 快速設定步驟

### Step 1：建立資料表（必須手動執行）

請到 **Supabase Dashboard** → **SQL Editor** 執行：

👉 https://supabase.com/dashboard/project/pfqvdacxowpgfamuvnsn/sql/new

```sql
-- 清邁景點選擇系統 - 資料表

-- ============================================
-- 1. destinations 表（景點資料庫）
-- ============================================
CREATE TABLE IF NOT EXISTS public.destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL DEFAULT '清邁',
  name TEXT NOT NULL,
  name_en TEXT,
  category TEXT,
  description TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  tags TEXT[],
  image_url TEXT,
  priority INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 索引優化
CREATE INDEX IF NOT EXISTS idx_destinations_city ON public.destinations(city);
CREATE INDEX IF NOT EXISTS idx_destinations_category ON public.destinations(category);
CREATE INDEX IF NOT EXISTS idx_destinations_priority ON public.destinations(priority);

-- ============================================
-- 2. customer_destination_picks 表（客戶選擇記錄）
-- ============================================
CREATE TABLE IF NOT EXISTS public.customer_destination_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id TEXT NOT NULL,
  destination_id UUID REFERENCES public.destinations(id) ON DELETE CASCADE,
  session_id TEXT,
  selected_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_picks_line_user ON public.customer_destination_picks(line_user_id);
CREATE INDEX IF NOT EXISTS idx_picks_session ON public.customer_destination_picks(session_id);
CREATE INDEX IF NOT EXISTS idx_picks_destination ON public.customer_destination_picks(destination_id);

-- ============================================
-- 3. RLS 政策
-- ============================================
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_destination_picks ENABLE ROW LEVEL SECURITY;

-- destinations 全部可讀
DROP POLICY IF EXISTS destinations_public_read ON public.destinations;
CREATE POLICY destinations_public_read ON public.destinations
  FOR SELECT USING (true);

-- picks 全部可讀寫（內部工具）
DROP POLICY IF EXISTS picks_user_read ON public.customer_destination_picks;
CREATE POLICY picks_user_read ON public.customer_destination_picks
  FOR SELECT USING (true);

DROP POLICY IF EXISTS picks_insert ON public.customer_destination_picks;
CREATE POLICY picks_insert ON public.customer_destination_picks
  FOR INSERT WITH CHECK (true);

-- ============================================
-- 4. 觸發器：自動更新 updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_destinations_updated_at ON public.destinations;
CREATE TRIGGER update_destinations_updated_at
  BEFORE UPDATE ON public.destinations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

### Step 2：匯入 50 個景點

執行 SQL 後，在終端機執行：

```bash
cd ~/Projects/venturo-erp
node scripts/import-chiangmai-destinations.mjs
```

預期輸出：
```
🚀 開始匯入清邁 50 個精選景點...

✅ [1] 素帖寺/雙龍寺
✅ [2] 契迪龍寺
...
✅ [50] 帝王餐體驗

📊 完成統計:
✅ 成功: 50 個
❌ 失敗: 0 個

🎉 清邁景點匯入完成！共匯入 50 個景點
```

---

## 📁 已建立的檔案

### 資料庫 Migration
- `supabase/migrations/20260403000000_create_destination_selection.sql`

### 資料匯入腳本
- `scripts/import-chiangmai-destinations.mjs` — 匯入 50 個景點

### TypeScript 類型定義
- `src/features/destinations/types.ts` — Destination、CustomerDestinationPick 型別

### Entity Hooks
- `src/data/entities/destinations.ts` — `useDestinations`、`createDestination` 等
- `src/data/entities/customer-destination-picks.ts` — `useCustomerDestinationPicks` 等

---

## 🔄 下一步（Day 2）

### LINE Bot 景點選擇流程

1. **修改 LINE Webhook**（`src/app/api/line/webhook/route.ts`）
   - 偵測「清邁」關鍵字
   - 顯示類別選擇按鈕

2. **建立景點選擇處理器**
   - `src/lib/line/destination-selection.ts`
   - 分類顯示景點（文化/自然/親子/浪漫/美食）
   - 多選景點
   - 儲存選擇記錄

3. **建立需求單整合**
   - 自動建立需求單（或連結現有 tour）
   - 記錄客戶選擇

---

## 📊 資料結構

### destinations 表
```typescript
{
  id: UUID,
  city: '清邁',
  name: '素帖寺/雙龍寺',
  name_en: 'Wat Phra That Doi Suthep',
  category: '文化古蹟',
  description: '清邁地標，俯瞰全城...',
  latitude: 18.8047,
  longitude: 98.9217,
  tags: ['寺廟', '地標', '必遊'],
  image_url: 'https://...',
  priority: 1  // 1-20 必去，21-50 推薦
}
```

### customer_destination_picks 表
```typescript
{
  id: UUID,
  line_user_id: 'U1234567890abcdef',
  destination_id: UUID,  // FK → destinations
  session_id: 'session_xxx',  // 同一次選擇
  selected_at: '2026-04-03T09:45:00Z'
}
```

---

## 🎯 景點分類

| 類別 | 景點數 | 範例 |
|------|--------|------|
| 🏛️ 文化古蹟 | 12 | 素帖寺、契迪龍寺、帕辛寺 |
| 🌿 自然風光 | 8 | 茵他儂國家公園、清邁峽谷 |
| 👨‍👩‍👧 親子活動 | 7 | 夜間動物園、大象保育營 |
| 💑 浪漫悠閒 | 5 | 寧曼路、Baan Kang Wat |
| 🛍️ 美食購物 | 10 | 週日夜市、週六夜市 |
| 🎨 文創藝術 | 4 | 白廟、藍廟、黑屋博物館 |
| 🏃 冒險活動 | 2 | 叢林飛索 |
| 🧘 文化體驗 | 8 | Lila 按摩、料理教室 |

---

## ✅ Day 1-2 完成項目

### Day 1：資料庫 + 資料匯入
- [x] 資料表設計（destinations、customer_destination_picks）
- [x] Migration SQL 撰寫
- [x] 景點資料整理（50 個）
- [x] 匯入腳本撰寫
- [x] TypeScript 類型定義
- [x] Entity Hooks 建立

### Day 2：LINE Bot 互動流程
- [x] 景點選擇處理器（`src/lib/line/destination-selection.ts`）
- [x] 清邁關鍵字偵測
- [x] 類別選擇按鈕（文化/自然/親子/浪漫/美食）
- [x] 景點 Carousel 顯示
- [x] 多選景點功能
- [x] 選擇記錄儲存
- [x] LINE Webhook 整合

## ⏳ 待完成（Day 3-4）

- [ ] 「完成」指令處理（顯示摘要）
- [ ] 自動建立需求單（連結 tours 或 inquiries）
- [ ] ERP 顯示客戶選擇
- [ ] 地圖標記
- [ ] 類型分布圖表
- [ ] Session 管理優化

---

**作者**：Matthew 🔧  
**日期**：2026-04-03  
**狀態**：✅ Day 1 完成 80%（等待 SQL 執行）
