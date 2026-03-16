# 🎮 Venturo ERP 遊戲攻略本

**版本**：v3.0  
**最後更新**：2026-03-17  
**攻略作者**：馬修（Matthew）— 遊戲工程師

---

## 📖 攻略本使用說明

這不只是技術文檔，這是一本**遊戲攻略**。

把 Venturo ERP 當成一個 RPG 遊戲：
- **世界地圖**：77 個路由（地點）→ [ARCHITECTURE_MAP.md](./ARCHITECTURE_MAP.md)
- **戰鬥系統**：核心功能（技能）
- **任務流程**：完整生命週期（主線任務）
- **數據面板**：核心表結構（角色屬性）
- **技能樹**：每個功能的觸發條件（技能解鎖）
- **快速參考卡**：1 頁快查（節省 token）→ [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)

---

## ⚡ 快速開始（新手必讀）

### 開發時只需要這 2 頁

1. **[快速參考卡](./QUICK_REFERENCE.md)** ⭐
   - 1 頁 A4（~800 tokens）
   - 核心概念、檢查清單、程式碼範本
   - 節省 92% token

2. **[架構地圖](./ARCHITECTURE_MAP.md)** 🗺️
   - 系統全景圖
   - 模組分類、依賴關係
   - 資料流向、改進路線圖

**其他文檔按需查閱，不用全讀。** 🎯

---

## 🗺️ 世界地圖（網站地圖）

### **主城區（主要功能）**

#### 🏰 旅遊團管理區
```
/tours
  ├─ /tours/[id]               主線任務：旅遊團詳細頁
  │   ├─ Tab: 總覽             關卡 1：基本資訊
  │   ├─ Tab: 行程表           關卡 2：規劃路線（核心表寫入點）
  │   ├─ Tab: 報價單           關卡 3：計算成本（核心表讀取）
  │   ├─ Tab: 需求單           關卡 4：發送任務（核心表 JOIN）
  │   ├─ Tab: 確認單           關卡 5：確認訂單
  │   └─ Tab: 結帳單           關卡 6：完成結算
  │
  ├─ 狀態：draft/active/completed
  └─ 核心數據：tour_itinerary_items（唯一真相來源）
```

#### 💰 報價管理區
```
/quotes
  ├─ /quotes/[id]              支線任務：報價單編輯
  │   ├─ 分類：交通/住宿/餐食/活動/其他
  │   ├─ 個人分攤計算
  │   └─ 寫回核心表
  │
  └─ 數據來源：tour_itinerary_items
```

#### 📋 訂單管理區
```
/orders
  ├─ /orders/[id]              支線任務：訂單處理
  │   ├─ 團員管理
  │   ├─ 收款記錄
  │   └─ 代收轉付
  │
  └─ 關聯：tour_id → tours
```

#### 🏢 供應商管理區
```
/suppliers
  ├─ /suppliers/[id]           NPC 資料庫
  │   ├─ 基本資料
  │   ├─ 需求單收件匣
  │   └─ 回覆管理
  │
  └─ 類型：hotel/restaurant/transport/attraction
```

---

## ⚔️ 戰鬥系統（核心功能）

### **技能 1：報價系統**

```
技能名稱：個人分攤計算
等級要求：Lv.1
消耗 MP：無

技能效果：
  1. 從核心表讀取項目
  2. 計算個人成本
     - 餐廳：unit_price（固定 quantity=1）
     - 活動：unit_price（固定 quantity=1）
     - 住宿：unit_price ÷ quantity（幾人房）
     - Local：階梯報價（人數自動切換）
  3. 寫回核心表

觸發條件：
  - 行程表有資料
  - 進入報價單 Tab

數據流向：
  tour_itinerary_items（讀取）
    ↓ 計算
  tour_itinerary_items（寫回 unit_price, quantity）
```

---

### **技能 2：需求單系統**

```
技能名稱：從核心表產生需求單
等級要求：Lv.2
消耗 MP：無

技能效果：
  1. 從核心表 JOIN 讀取
     - tour_itinerary_items
     - restaurants（地址、電話）
     - hotels（地址、電話）
  2. 帶入訂單總人數
  3. 產生 PDF（桌數/房間數空白）
  4. 更新核心表狀態
     - request_status = 'sent'
     - request_sent_at = now()

觸發條件：
  - 報價單已填寫
  - 點擊「列印需求單」按鈕

數據流向：
  tour_itinerary_items（JOIN 讀取）
    ↓ 產生 PDF
  tour_itinerary_items（更新 request_status）
```

---

### **技能 3：Local 報價**

```
技能名稱：階梯報價自動切換
等級要求：Lv.2
消耗 MP：無

技能效果：
  1. 輸入階梯報價
     - 10人：$5,000/人
     - 20人：$4,000/人
     - 30人：$3,333/人
  2. 自動判斷適用階梯
  3. 顯示多列項目
  4. 禁止直接編輯

觸發條件：
  - 點擊「Local 報價」按鈕
  - 輸入階梯資訊

數據流向：
  LocalPricingDialog（輸入）
    ↓ 產生多個 CostItem
  categories（顯示）
    ↓ 寫回
  tour_itinerary_items（核心表）
```

---

## 🎯 主線任務（完整生命週期）

### **主線 1：開團流程**

```
步驟 1：建立旅遊團
  位置：/tours
  操作：點擊「新增旅遊團」→ 選擇「開團」
  資料：tours 表

步驟 2：規劃行程
  位置：/tours/[id] → 行程表 Tab
  操作：
    - 選餐廳（從 restaurants 表）
    - 選飯店（從 hotels 表）
    - 選景點（從 attractions 表）
  資料：tour_itinerary_items（核心表）← 寫入點

步驟 3：填寫報價
  位置：/tours/[id] → 報價單 Tab
  操作：
    - 填寫每個項目的價格
    - 餐廳：$1,000/人（quantity 固定=1）
    - 住宿：$3,500/2人房（quantity=2）
    - Local：階梯報價
  資料：tour_itinerary_items（核心表）← 寫回

步驟 4：產生需求單
  位置：/tours/[id] → 需求單 Tab
  操作：
    - 選擇供應商
    - 點擊「列印需求單」
    - 桌數/房間數助理手動填
  資料：tour_itinerary_items（核心表）← JOIN 讀取
         request_status ← 更新狀態

步驟 5：供應商回覆
  位置：/supplier/requests
  操作：
    - 供應商填寫確認價格
    - 回覆系統
  資料：tour_itinerary_items（核心表）← 更新 quoted_cost

步驟 6：確認訂單
  位置：/tours/[id] → 確認單 Tab
  操作：
    - 確認最終價格
    - 產生確認單給領隊
  資料：tour_itinerary_items（核心表）← 讀取

步驟 7：領隊回填
  位置：/tours/[id] → 結帳單 Tab
  操作：
    - 領隊填寫實際費用
    - 上傳收據
  資料：tour_itinerary_items（核心表）← 更新 actual_expense
```

---

## 📊 數據面板（核心表結構）

### **核心表：tour_itinerary_items**

這是整個遊戲的**角色屬性表**，所有數據的唯一真相來源。

```sql
tour_itinerary_items {
  -- 基本屬性
  id UUID                      -- 唯一 ID
  tour_id UUID                 -- 所屬團
  day_number INT               -- 第幾天
  category TEXT                -- 分類
  sub_category TEXT            -- 子分類
  title TEXT                   -- 項目名稱
  
  -- 戰鬥屬性（報價資訊）
  unit_price DECIMAL           -- 單價（ATK）
  quantity INT                 -- 數量（Combo）
  total_cost DECIMAL           -- 小計（DMG）
  adult_price DECIMAL          -- 成人價
  child_price DECIMAL          -- 兒童價
  infant_price DECIMAL         -- 嬰兒價
  
  -- 任務狀態
  quote_status TEXT            -- drafted/quoted/confirmed
  request_status TEXT          -- none/sent/replied
  confirmation_status TEXT     -- none/confirmed
  leader_status TEXT           -- none/filled/reviewed
  
  -- 回覆屬性
  quoted_cost DECIMAL          -- 供應商報價
  confirmed_cost DECIMAL       -- 確認價格
  actual_expense DECIMAL       -- 實際費用
  
  -- 時間戳
  request_sent_at TIMESTAMP    -- 需求單發送時間
  request_reply_at TIMESTAMP   -- 供應商回覆時間
  confirmed_at TIMESTAMP       -- 確認時間
  expense_at TIMESTAMP         -- 結帳時間
}
```

---

### **狀態機（State Machine）**

```
quote_status:
  none → drafted → quoted → confirmed
  
request_status:
  none → sent → replied → confirmed
  
confirmation_status:
  none → pending → confirmed
  
leader_status:
  none → filled → reviewed
```

---

## 🔧 技能樹（功能觸發條件）

### **行程表 → 報價單**

```
前置條件：
  ✓ tour_itinerary_items 有資料
  ✓ 至少有 1 個項目

觸發：
  進入報價單 Tab

效果：
  coreItemsToCostCategories()
    → 從核心表讀取
    → 轉換成報價單格式
    → 顯示在 UI
```

---

### **報價單 → 需求單**

```
前置條件：
  ✓ quote_status = 'quoted'
  ✓ unit_price 已填寫

觸發：
  點擊「列印需求單」

效果：
  useCoreRequestItems()
    → JOIN restaurants/hotels
    → useTotalPax()（帶入總人數）
    → 產生 PDF
    → 更新 request_status = 'sent'
```

---

### **需求單 → 確認單**

```
前置條件：
  ✓ request_status = 'replied'
  ✓ quoted_cost 已填寫

觸發：
  確認供應商回覆

效果：
  更新 confirmation_status = 'confirmed'
    → confirmed_cost = quoted_cost
    → 產生確認單給領隊
```

---

## 🐛 已知 Bug（需要修復的問題）

### **Bug #1：Local 報價階梯切換**
```
問題：人數變動時，適用階梯不會自動更新
狀態：待修復
優先級：P2
```

### **Bug #2：需求單 PDF 格式**
```
問題：桌數/房間數欄位格式需確認
狀態：待測試
優先級：P1
```

---

## 📝 開發日誌

### **2026-03-14**
- ✅ Local 報價禁止直接編輯
- ✅ Local 報價多列顯示
- ✅ 需求單核心表模式
- ✅ 移除 is_from_core（簡化）
- ✅ 建立遊戲攻略本 v1.0
- ⏳ 深度研究每個功能
- ⏳ 完善攻略內容

---

## 🎓 新手教學

### **如何理解這個系統？**

```
核心概念：
  tour_itinerary_items = 唯一真相來源
  
  其他表都是「視圖」：
    - tours：團的基本資料
    - quotes：報價單（從核心表計算）
    - orders：訂單（關聯核心表）
    - tour_requests：需求單狀態（核心表記錄）

資料流向：
  行程表（寫入）
    → tour_itinerary_items
    → 報價單（讀取 + 寫回）
    → tour_itinerary_items
    → 需求單（JOIN 讀取）
    → tour_itinerary_items（更新狀態）
```

---

## 🎒 裝備系統（JSONB vs 關聯表）

### **為什麼用關聯表而不是全部塞進 JSONB？**

想像你在玩 RPG：

---

### **方案 A：雜物袋（JSONB）**

```json
{
  "tour_id": "T001",
  "name": "日本賞櫻團",
  "members": [
    {"name": "王小明", "room": "101", "meal": "素食"},
    {"name": "李大華", "room": "101", "meal": "葷食"}
  ],
  "requests": [
    {"supplier": "飯店A", "items": ["房間x2"], "status": "confirmed"},
    {"supplier": "餐廳B", "items": ["晚餐x2"], "status": "pending"}
  ],
  "payments": [
    {"date": "2026-03-01", "amount": 10000, "status": "paid"}
  ]
}
```

**遊戲比喻**：
- 就像你把**所有物品都塞進「雜物袋」**
- 劍、藥水、食物、任務道具全部混在一起
- 要找東西？得把整個袋子倒出來翻

**問題**：

1. 🔍 **找不到東西** 
   - 「咦，我的藥水在哪？」（查詢困難）
   - SQL: `WHERE payments::jsonb @> '[{"status": "pending"}]'` ← 慢

2. ⚠️ **拿錯東西**
   - 誤把毒藥當藥水（資料驗證困難）
   - 可以塞任何奇怪的資料進去

3. 📊 **無法分類**
   - 不能按「武器」「藥水」分類（無法 JOIN）
   - 想計算「每個供應商的總需求」？幾乎不可能

4. 🐢 **袋子太重**
   - 每次打開袋子都要載入所有物品（效能差）
   - 即使只要看付款記錄，也得載入整個 tour

---

### **方案 B：分類倉庫（關聯表）**

```
tours (主表)
├── tour_members (團員倉庫)
├── tour_requests (需求倉庫)
└── tour_payments (付款倉庫)
```

**遊戲比喻**：
- 就像你有**「武器倉庫」「藥水倉庫」「食物倉庫」**
- 每個倉庫有專屬管理員（foreign key）
- 要找劍？去武器倉庫。要找藥水？去藥水倉庫

**優點**：

1. ⚡ **快速查找**
   ```sql
   -- ✅ 找所有還沒付款的團
   SELECT t.* FROM tours t
   JOIN tour_payments p ON p.tour_id = t.id
   WHERE p.status = 'pending'
   ```

2. 🛡️ **強制規則**
   - 不能把毒藥放進藥水倉庫（foreign key 驗證）
   - `tour_members.tour_id REFERENCES tours(id)`

3. 🔗 **彈性查詢**
   ```sql
   -- ✅ 找出所有欠款團的業務員
   SELECT s.name, COUNT(*) 
   FROM tours t
   JOIN tour_payments p ON p.tour_id = t.id
   JOIN staff s ON s.id = t.salesperson_id
   WHERE p.status = 'pending'
   GROUP BY s.name
   ```

4. 🚀 **省空間**
   - 只載入需要的倉庫（效能好）
   - 查付款記錄不用載入團員資料

---

### **你擔心的「資料不同步」問題**

**擔心**：
> 「多個表會造成資料不同步，例如改了 tours 但忘記改 tour_members」

**遊戲解釋**：
- 就像你在 RPG 裡刪除了「公會」，但成員還在成員倉庫
- 不是「多倉庫」的錯，是**「沒設好門禁」**

**解決方案**：Foreign Key + Cascade

```sql
CREATE TABLE tour_members (
  id UUID PRIMARY KEY,
  tour_id TEXT REFERENCES tours(id) ON DELETE CASCADE
)
```

**遊戲比喻**：
- `ON DELETE CASCADE` = 「公會解散時，自動清空成員倉庫」
- `REFERENCES` = 「不能加入不存在的公會」

**你現有的表已經有這個**：
```sql
tour_members.tour_id REFERENCES tours(id) ON DELETE CASCADE ✅
tour_requests.tour_id REFERENCES tours(id) ON DELETE CASCADE ✅
```

**所以不會不同步**。刪除團時，所有關聯資料會自動刪除。

---

### **什麼時候用 JSONB？**

**✅ 用 JSONB**：
- **彈性欄位**（每個團的「自訂欄位」不一樣）
- **不需查詢的設定**（UI 偏好設定、顏色主題）
- **版本記錄**（保存舊版報價單的快照）

**你現有的設計已經很聰明**：
```sql
tours.features (JSONB) ✅           -- 團體特色（彈性）
tours.quote_cost_structure (JSONB) ✅  -- 報價快照（版本記錄）
tours.confirmed_requirements (JSONB) ✅ -- 確認需求（版本記錄）
```

**❌ 不用 JSONB**：
- **需要查詢的資料**（團員、付款、需求單）
- **需要計算的資料**（總金額、數量）
- **需要關聯的資料**（供應商、訂單）

---

### **結論：你現有的設計是對的**

```
tours (核心表) 
├── 基本欄位（團號、名稱、日期）
├── JSONB 欄位（features, quote_cost_structure, confirmed_requirements）
└── 關聯表（tour_members, tour_requests, tour_payments）
```

**這就是最佳實踐**：
- ✅ 核心資料用欄位（快速查詢）
- ✅ 彈性設定用 JSONB（不需查詢）
- ✅ 關聯資料用關聯表（保持一致性）

**不建議改成「全部 JSONB」**：
- ❌ 查詢慢（找欠款團要掃描所有 JSON）
- ❌ 無法驗證（可以塞錯誤資料）
- ❌ 無法計算（總金額、統計報表）
- ❌ 無法關聯（JOIN 供應商、業務員）

---

## 🏰 帝國擴張篇：附屬國（Local 租戶）系統

**更新日期**：2026-03-17  
**解鎖條件**：完成主線任務第 4 關（需求單系統）

---

### **世界觀：冒險公會 ↔ 附屬國**

```
🏰 帝國（Venturo 平台）
├── 🏛️ 冒險公會（我們 — 旅行社）
│   ├── 接案（開團）
│   ├── 規劃路線（行程表）
│   ├── 計算報酬（報價單）
│   ├── 發布委託（需求單）← 現在在做的
│   └── 驗收成果（確認單/結帳單）
│
└── 🏘️ 附屬國（Local — 地接社）
    ├── 收到委託（從冒險公會）
    ├── 回報估價（報價回覆）
    ├── 執行任務（逐項預訂）
    ├── 回報成果（確認狀態）
    └── 請領報酬（請款/收款）
```

---

### **技能 4：委託發布系統（勾選發給供應商）**

```
技能名稱：多項目打包委託
等級要求：Lv.3
消耗 MP：無

技能效果：
  1. 勾選需要委託的項目（checkbox）
  2. 指定委託對象（搜尋供應商/Local）
  3. 產生統一委託書（需求單 PDF）
  4. 支援混合打包（住宿+餐廳+活動→同一個 Local）

觸發條件：
  - 需求頁有項目
  - 勾選至少 1 項

UI 元件：
  - RequirementsList.tsx — 每列 checkbox
  - AssignSupplierDialog.tsx — 搜尋供應商 + 列印
  - 浮動操作列：「已選 N 項 → 發給供應商」

數據流向：
  勾選項目
    → AssignSupplierDialog（選擇供應商）
    → 產生 PDF（我方+供應商資訊+項目明細+回覆欄）
    → tour_requests（記錄誰發給誰）
```

---

### **技能 5：委託書分類列印**

```
技能名稱：依類型自動產生委託書
等級要求：Lv.3

四種委託類型：
  🏨 住宿：填房型×間數 → 列印（RoomRequirementDialog）
  🍽️ 餐食：直接列印（不需 Dialog）
  🎯 活動：直接列印（不需 Dialog）
  🚌 交通：勾選天數 → 帶行程內容列印（TransportRequirementDialog）

所有委託書共用欄位：
  - 我方資訊：公司/團號/團名/出發日/總人數/年齡分類
  - 供應商資訊：名稱/窗口/電話/Email
  - 需求明細表
  - 供應商回覆欄 + 簽章欄

年齡分類自動計算：
  tour_members JOIN customers.birth_date
  → 滿12歲以上 / 6~12歲 / 2~6歲 / 未滿2歲
```

---

### **附屬國任務流程（Local 視角）**

```
📩 收到委託
  位置：/requests（附屬國的收件匣）
  觸發：冒險公會發出委託書
  效果：
    - 自動建立案件（case）
    - Fork 行程資料到附屬國 workspace
    - 核心表複製一份（不同 workspace_id，同結構）

💰 回報估價
  位置：/cases/[id] → 報價 Tab
  操作：
    - 逐項填寫報價
    - 或整包報價
  效果：
    - 更新 quoted_cost
    - 冒險公會收到通知

✅ 執行任務
  位置：/cases/[id] → 作業進度 Tab
  操作：
    - 預訂飯店 → 標記 confirmed
    - 預訂餐廳 → 標記 confirmed
    - 可微調行程（餐廳公休→換順序）
  效果：
    - 逐項更新 request_status
    - 冒險公會即時看到進度

🧾 請領報酬
  位置：/billing
  操作：
    - 向冒險公會請款
    - 付給當地供應商
  效果：
    - 應收帳款（向旅行社）
    - 應付帳款（給飯店/餐廳）
```

---

### **附屬國側邊欄（路由）**

```
📊 /dashboard          總覽（活躍案件、待處理）
📩 /requests           收到委託（各旅行社發來的）
📋 /cases              案件管理（每團 = 一個案件）
📋 /cases/[id]         案件詳情
    ├── Tab: 行程       行程總覽（可編輯，fork 自冒險公會）
    ├── Tab: 報價       回報估價給旅行社
    ├── Tab: 作業       逐項預訂追蹤
    └── Tab: 請款       向旅行社請款
💰 /quotes             報價管理
✅ /operations         作業進度（所有案件）
🧾 /billing            請款/收款
🏨 /suppliers          當地供應商資料庫
```

---

### **關鍵架構：同一套系統，不同視角**

```
冒險公會（旅行社）              附屬國（Local）
┌─────────────────┐     ┌─────────────────┐
│ workspace_id: A  │     │ workspace_id: B  │
│                  │     │                  │
│ 行程表（編輯）    │ ──→ │ 行程（fork 編輯）  │
│ 報價單（估價）    │ ←── │ 報價（回報）       │
│ 需求單（發委託）  │ ──→ │ 收件匣（收委託）   │
│ 確認單（驗收）    │ ←── │ 作業進度（回報）   │
│ 結帳單（付款）    │ ──→ │ 請款/收款         │
└─────────────────┘     └─────────────────┘
         │                       │
         └───── 同一套核心表結構 ────┘
              tour_itinerary_items
```

---

### **成本修正系統（價格只有一個欄位）**

```
技能名稱：成本即時修正
等級要求：Lv.2

規則：
  成本欄位只有一個（unit_cost），從頭到尾修正到最終

流程：
  業務估價 $5,000 → 填入 unit_cost
  助理訂好 $4,983 → 直接覆蓋 unit_cost
  系統提示：「成本更新 -$17（多賺 $17）」

注意：
  不分「估價」和「實際價」兩個欄位
  同一欄位一路修正，業務看到的永遠是最新真實成本
```

---

### **住宿變更警示系統**

```
技能名稱：行程表換飯店警報
等級要求：Lv.3

觸發條件：
  行程表儲存時，核心表的住宿項與目前行程不同

效果：
  🟡 黃色警示：報價單已有成本（⚠ 報價單影響）
  🔴 紅色警示：需求單已發出（🚨 需求單影響，需通知供應商取消）
  ⚪ 無警示：都沒有 → 直接換

UI 元件：
  AccommodationChangeDialog.tsx
```

---

## 🚀 進階攻略（待補完）

- [ ] 每個按鈕的詳細行為
- [ ] 欄位之間的計算關係
- [ ] 錯誤處理機制
- [ ] 效能優化技巧
- [ ] 常見問題 FAQ
- [ ] 附屬國 DB 遷移腳本
- [ ] 行程 fork + diff 機制

---

**攻略持續更新中...**  
**有問題隨時問遊戲工程師 Matthew！** 🎮
