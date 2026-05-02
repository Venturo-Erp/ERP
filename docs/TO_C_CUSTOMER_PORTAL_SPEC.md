# Venturo To C 客戶端完整規劃

**專案代號**：Customer Portal (客戶端門戶)  
**定位**：數位轉型工具（To C + To B 雙向整合）  
**日期**：2026-03-28  
**狀態**：規劃階段

---

## 🎯 核心價值

> **不只是 ERP，是數位獲客工具**

### 解決的痛點

**旅行社傳統流程**：

```
1. 設計行程（Word/Excel）
2. 複製貼上給客戶（Line/Email）
3. 客戶問東問西
4. 手動收集報名資料
5. 手動輸入系統
6. 業績難追蹤
```

**Venturo 新流程**：

```
1. 設計行程（ERP 內）
2. 一鍵生成漂亮頁面
3. 業務發專屬連結
4. 客戶自動報名
5. 系統自動匯入
6. 業績即時追蹤
```

---

## 📋 完整功能

### Phase 1：客戶端頁面（優先）

#### 1.1 漂亮行程展示頁

```
URL: https://venturo.tw/tours/{tour_code}?ref={sales_id}

頁面元素：
├─ Hero Section（主視覺）
│  ├─ 行程主圖
│  ├─ 行程名稱（大標題）
│  ├─ 目的地 + 天數
│  └─ 價格（動態顯示）
│
├─ 即時資訊
│  ├─ 📊 已報名人數 / 總人數
│  ├─ ⏰ 剩餘名額
│  ├─ 💰 目前價格（含早鳥提示）
│  └─ 🔥 限時優惠倒數
│
├─ 每日行程（卡片式）
│  ├─ Day 1: ...
│  ├─ Day 2: ...
│  └─ Day N: ...
│
├─ 費用說明
│  ├─ 包含項目
│  ├─ 不包含項目
│  └─ 注意事項
│
└─ CTA 按鈕（大）
   └─ [立刻報名] ← 固定在底部
```

**技術規範**：

- 使用 Next.js App Router
- SSR（伺服器端渲染，SEO 友好）
- RWD（手機優先設計）
- 符合 `UI_DESIGN_SYSTEM.md` 規範

---

#### 1.2 報名表單

```
點擊 [立刻報名] 後：

┌─────────────────────────────────────┐
│  報名：沖繩五日遊                   │
│  目前價格：NT$ 25,000（早鳥價）     │
│  ⚠️ 此價格將鎖定至提交報名           │
├─────────────────────────────────────┤
│  👤 姓名：_______                  │
│  📱 手機：_______                  │
│  📧 Email：_______                │
│  👥 報名人數：[1] ▼              │
│  📝 備註：_______                  │
├─────────────────────────────────────┤
│  💰 費用明細                        │
│  ├─ 團費：NT$ 25,000 × 1 人        │
│  ├─ 早鳥折扣：-NT$ 0               │
│  └─ 總計：NT$ 25,000               │
├─────────────────────────────────────┤
│  [取消]  [確認報名] ←─ 大按鈕      │
└─────────────────────────────────────┘
```

**必填欄位**：

- 姓名（中文）
- 手機
- Email
- 報名人數

**選填欄位**：

- 備註（特殊需求）

**隱藏欄位（自動填入）**：

- `referred_by`：業務 ID（從 URL `?ref=` 取得）
- `registered_price`：報名時的價格（鎖定）
- `tour_id`：旅遊團 ID
- `source`：'online'（區分線上/線下報名）

---

#### 1.3 即時更新（Realtime）

**使用 Supabase Realtime**：

```typescript
supabase
  .channel('tour_registrations')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'tour_members',
      filter: `tour_id=eq.${tourId}`,
    },
    payload => {
      // 更新報名人數
      setRegisteredCount(prev => prev + 1)
      // 重新計算價格（如果有動態定價）
      updatePrice()
    }
  )
  .subscribe()
```

**即時更新項目**：

- 報名人數
- 剩餘名額
- 目前價格（如果有動態定價）

---

### Phase 2：業務追蹤系統

#### 2.1 業務專屬連結

**生成方式**：

```tsx
// 在旅遊團詳情頁
<Button
  onClick={() => {
    const link = `${process.env.NEXT_PUBLIC_SITE_URL}/tours/${tour.code}?ref=${user.id}`
    navigator.clipboard.writeText(link)
    toast.success('專屬連結已複製')
  }}
>
  生成我的專屬連結
</Button>
```

**連結格式**：

```
https://venturo.tw/tours/OKA261223A?ref=william
                                         ↑
                                      業務 ID
```

**追蹤邏輯**：

- URL 參數 `?ref=william` 會保留在整個報名流程
- 報名時寫入 `tour_members.referred_by = 'william'`
- 即使客戶轉發連結，業績仍歸原業務

---

#### 2.2 業績追蹤報表

**後台新增「我的業績」頁面**：

```
/dashboard/my-performance

顯示：
├─ 本月總報名人數
├─ 本月總業績（報名人數 × 售價）
├─ 各團報名明細
│  ├─ OKA261223A：5 人（NT$ 125,000）
│  ├─ FUK260702A：3 人（NT$ 75,000）
│  └─ 總計：8 人（NT$ 200,000）
└─ 轉換率
   └─ 點擊 50 次 / 報名 8 人 = 16%
```

**主管可看全公司**：

```
/dashboard/team-performance

顯示：
├─ William：8 人（NT$ 200,000）
├─ Jess：10 人（NT$ 250,000）
├─ Carson：5 人（NT$ 125,000）
└─ 總計：23 人（NT$ 575,000）
```

---

#### 2.3 點擊追蹤（進階功能）

**記錄每次點擊**：

```sql
CREATE TABLE link_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID REFERENCES tours(id),
  referred_by TEXT, -- 業務 ID
  clicked_at TIMESTAMP DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  converted BOOLEAN DEFAULT FALSE -- 是否報名
);
```

**追蹤流程**：

```
1. 客戶點連結
2. 記錄 link_clicks（tour_id, referred_by, clicked_at）
3. 如果報名成功
4. 更新 link_clicks.converted = TRUE
```

---

### Phase 3：動態定價系統

#### 3.1 定價規則設定

**在旅遊團編輯頁面新增「定價規則」tab**：

```
/tours/{code}/edit?tab=pricing

設定：
├─ 基本價格：NT$ 30,000
├─ 早鳥優惠
│  ├─ 前 10 名：-NT$ 5,000（= NT$ 25,000）
│  └─ 11-20 名：-NT$ 2,000（= NT$ 28,000）
├─ 倒數加價
│  ├─ 剩 5 名：+NT$ 2,000
│  └─ 剩 3 名：+NT$ 5,000
└─ 團體折扣
   └─ 一次報名 5 人以上：-NT$ 1,000/人
```

**資料結構**：

```sql
CREATE TABLE tour_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID REFERENCES tours(id),
  rule_type TEXT, -- 'early_bird', 'countdown', 'group'
  condition JSONB, -- { "min": 1, "max": 10 }
  discount_amount NUMERIC,
  discount_type TEXT, -- 'fixed', 'percentage'
  priority INT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

#### 3.2 價格計算邏輯

**前端計算**：

```typescript
const calculatePrice = (
  basePrice: number,
  registeredCount: number,
  remainingSlots: number,
  numPeople: number
) => {
  let price = basePrice

  // 早鳥優惠
  if (registeredCount < 10) {
    price -= 5000
  } else if (registeredCount < 20) {
    price -= 2000
  }

  // 倒數加價
  if (remainingSlots <= 3) {
    price += 5000
  } else if (remainingSlots <= 5) {
    price += 2000
  }

  // 團體折扣
  if (numPeople >= 5) {
    price -= 1000
  }

  return price
}
```

**後端驗證**：

```sql
-- Supabase Function
CREATE OR REPLACE FUNCTION register_tour_with_pricing(
  p_tour_id UUID,
  p_member_data JSONB,
  p_expected_price NUMERIC
) RETURNS JSONB AS $$
DECLARE
  v_actual_price NUMERIC;
  v_registered_count INT;
BEGIN
  -- 鎖定行（防止併發）
  SELECT COUNT(*) INTO v_registered_count
  FROM tour_members
  WHERE tour_id = p_tour_id
  FOR UPDATE;

  -- 計算實際價格
  v_actual_price := calculate_tour_price(p_tour_id, v_registered_count);

  -- 驗證價格
  IF ABS(v_actual_price - p_expected_price) > 0.01 THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'price_changed',
      'actual_price', v_actual_price
    );
  END IF;

  -- 插入報名
  INSERT INTO tour_members (...)
  VALUES (...);

  RETURN jsonb_build_object('success', TRUE);
END;
$$ LANGUAGE plpgsql;
```

---

#### 3.3 併發控制（防超賣）

**問題場景**：

```
團位 30 人，目前 29 人
同時有 5 個人點「報名」
→ 應該只有 1 個成功
```

**解決方案：PostgreSQL Row Lock**

```sql
BEGIN;
  -- 鎖定行
  SELECT remaining_slots
  FROM tours
  WHERE id = p_tour_id
  FOR UPDATE;

  -- 檢查名額
  IF remaining_slots > 0 THEN
    -- 插入報名
    INSERT INTO tour_members (...) VALUES (...);
    -- 扣名額
    UPDATE tours
    SET remaining_slots = remaining_slots - 1
    WHERE id = p_tour_id;
  ELSE
    RAISE EXCEPTION 'no_slots';
  END IF;
COMMIT;
```

**前端處理**：

```typescript
try {
  const { data, error } = await supabase.rpc('register_tour_atomic', {
    tour_id: tourId,
    member_data: formData,
  })

  if (error?.message === 'no_slots') {
    toast.error('抱歉，名額已滿')
  } else {
    toast.success('報名成功')
  }
} catch (err) {
  toast.error('報名失敗，請重試')
}
```

---

### Phase 4：整合現有功能

#### 4.1 電子合約整合

**報名後自動生成合約**：

```
1. 客戶報名成功
2. 系統自動建立 tour_members
3. 觸發 Supabase Function
4. 自動生成電子合約
5. 發送 Email 給客戶簽名
```

**合約資料來源**：

```typescript
// 從 tour_members 自動填入
const contractData = {
  travelerName: member.chinese_name,
  travelerPhone: member.phone,
  travelerEmail: member.email,
  tourName: tour.tour_name,
  tourCode: tour.code,
  totalAmount: member.registered_price,
  // ...
}
```

---

#### 4.2 自動匯入 ERP

**報名資料自動進系統**：

```
1. 客戶填寫報名表單
2. 寫入 tour_members 表
3. ✅ 立刻出現在 ERP「團員列表」
4. ✅ 業務可在後台編輯
5. ✅ 自動關聯到訂單
```

**不需要額外匯入步驟，因為**：

- 客戶端和 ERP 用同一個資料庫
- `tour_members` 表是共用的
- 只是報名來源不同（`source: 'online'`）

---

#### 4.3 通知系統

**報名成功後自動通知**：

**給客戶**：

```
📧 Email：
標題：報名成功 - {行程名稱}
內容：
- 報名資訊摘要
- 付款方式
- 電子合約連結
- 聯絡窗口
```

**給業務**：

```
💬 Telegram/Line 通知：
「{客戶姓名} 報名了 {行程名稱}（來自你的連結）」
```

**給主管**：

```
📊 每日彙總：
「今日新增報名 5 筆
- William: 2 筆
- Jess: 3 筆」
```

---

## 🗂️ 資料結構

### 新增欄位（tour_members）

```sql
ALTER TABLE tour_members ADD COLUMN IF NOT EXISTS referred_by TEXT;
ALTER TABLE tour_members ADD COLUMN IF NOT EXISTS registered_price NUMERIC;
ALTER TABLE tour_members ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE tour_members ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE tour_members ADD COLUMN IF NOT EXISTS email TEXT;

COMMENT ON COLUMN tour_members.referred_by IS '推薦業務 ID（從 URL ?ref= 取得）';
COMMENT ON COLUMN tour_members.registered_price IS '報名時的價格（鎖定）';
COMMENT ON COLUMN tour_members.source IS '報名來源：online, manual, import';
```

---

### 新增表（pricing_rules）

```sql
CREATE TABLE tour_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID REFERENCES tours(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL, -- 'early_bird', 'countdown', 'group'
  condition JSONB NOT NULL, -- { "min": 1, "max": 10, "discount": 5000 }
  discount_amount NUMERIC,
  discount_type TEXT DEFAULT 'fixed', -- 'fixed', 'percentage'
  priority INT DEFAULT 0,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pricing_rules_tour ON tour_pricing_rules(tour_id);
```

---

### 新增表（link_clicks）

```sql
CREATE TABLE link_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID REFERENCES tours(id),
  referred_by TEXT,
  clicked_at TIMESTAMP DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  converted BOOLEAN DEFAULT FALSE,
  member_id UUID REFERENCES tour_members(id)
);

CREATE INDEX idx_link_clicks_tour ON link_clicks(tour_id);
CREATE INDEX idx_link_clicks_referred ON link_clicks(referred_by);
```

---

## 🎨 UI/UX 規範

**所有客戶端頁面必須符合**：

- `UI_DESIGN_SYSTEM.md` 規範
- Morandi 色系
- RWD（手機優先）
- 符合無障礙標準（WCAG 2.1 AA）

**關鍵頁面**：

1. 行程展示頁（SSR，SEO 友好）
2. 報名表單（Dialog，快速載入）
3. 報名成功頁（感謝頁 + 下一步指引）

---

## 🚀 開發順序

### Week 1（4/1-4/5）

**Matthew 開發**：

- [ ] 客戶端行程展示頁（SSR）
- [ ] 報名表單（Dialog）
- [ ] 業務專屬連結生成功能
- [ ] 自動匯入 tour_members

**Nova 設計**：

- [ ] 行程展示頁視覺設計
- [ ] 報名流程 UX 優化
- [ ] 成功頁面設計

---

### Week 2（4/8-4/12）

**Matthew 開發**：

- [ ] 即時更新（Supabase Realtime）
- [ ] 業績追蹤報表頁面
- [ ] 併發控制（防超賣）
- [ ] Email 通知系統

---

### Week 3（4/15-4/19）

**Matthew 開發**：

- [ ] 動態定價系統
- [ ] 定價規則設定頁面
- [ ] 價格計算 Function
- [ ] 電子合約整合

---

### Week 4（4/22-4/26）

**測試 + 優化**：

- [ ] 併發測試（模擬 100 人同時報名）
- [ ] 效能優化（SSR cache）
- [ ] SEO 優化（meta tags, sitemap）
- [ ] 使用者測試

---

## 📊 成功指標

**Phase 1 上線後追蹤**：

- 📈 線上報名轉換率 > 10%
- ⏱️ 平均報名時間 < 3 分鐘
- 📱 手機報名比例 > 70%
- ⚡ 頁面載入時間 < 2 秒
- 🎯 業務專屬連結使用率 > 80%

---

## ⚠️ 風險與挑戰

### 技術風險

**1. 併發超賣**

- 風險等級：高
- 緩解措施：PostgreSQL Row Lock + 單元測試

**2. 價格計算錯誤**

- 風險等級：高
- 緩解措施：前後端雙重驗證 + 測試

**3. 效能問題（高流量）**

- 風險等級：中
- 緩解措施：SSR cache + CDN

---

### 產品風險

**1. 使用者不習慣線上報名**

- 風險等級：中
- 緩解措施：提供 Line 客服按鈕、電話支援

**2. 業務不推廣專屬連結**

- 風險等級：中
- 緩解措施：業績獎金綁定線上報名比例

**3. 客戶資料填寫錯誤**

- 風險等級：低
- 緩解措施：即時驗證 + Email 確認信

---

## 🔧 技術棧

**前端**：

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui

**後端**：

- Supabase (PostgreSQL + Realtime + Edge Functions)
- Row Level Security (RLS)

**部署**：

- Vercel (前端)
- Supabase Cloud (後端)
- Cloudflare CDN (靜態資源)

---

## 📝 開發規範

**所有開發必須遵守**：

1. `UI_DESIGN_SYSTEM.md`（UI 規範）
2. `ecc-coding-standards`（程式碼品質）
3. `ecc-security-review`（安全檢查）
4. `ecc-database-migrations`（資料庫變更）

**Code Review 必檢項目**：

- [ ] 符合 UI 規範
- [ ] 沒有 `any` 型別
- [ ] 有錯誤處理
- [ ] 有 Loading 狀態
- [ ] 有空狀態
- [ ] RWD 正常
- [ ] 效能優化

---

## 🎯 下一步

**William 確認**：

1. 優先順序正確嗎？
2. 動態定價規則需要調整嗎？
3. 需要其他功能嗎？

**Matthew 準備**：

1. 讀完這份文件
2. 確認技術可行性
3. 提出問題和建議

**Nova 參與**：

1. 設計客戶端視覺
2. 優化報名流程 UX
3. 製作設計稿

---

**這是 Venturo 數位轉型的核心基石。讓我們一起打造旅遊業最強的 To C 系統！** 🚀
