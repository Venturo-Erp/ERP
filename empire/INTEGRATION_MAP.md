# 🔗 帝國系統整合地圖

**版本**：v1.0  
**繪製者**：大祭司 William AI + 建築師 Matthew  
**日期**：2026-03-17  
**用途**：定義四大系統（ERP、Online、AI Console、MCP Server）的整合點

---

## 🏗️ 四大系統架構

```
┌─────────────────────────────────────────────────────┐
│            🏰 帝國資料層（Supabase）                  │
│  ┌──────────────────────────────────────────────┐   │
│  │  🌳 世界樹（tour_itinerary_items）SSOT       │   │
│  │  📋 tours、orders、travelers、requests...   │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
         ↑              ↑              ↑
         │              │              │
    ┌────┴────┐    ┌────┴────┐    ┌───┴────┐
    │ 🏛️ ERP  │    │ 🌐 Online│   │ 🧠 AI  │
    │（內部）  │    │ (B2C)   │   │Console │
    └─────────┘    └─────────┘    └────────┘
         ↑              ↑              ↑
         └──────────────┴──────────────┘
                      │
                 🔌 MCP Server
            （統一工具協議層）
```

---

## 🔗 整合點清單

### 1️⃣ ERP ↔ Online

#### 資料同步

**行程發佈**（ERP → Online）
```
觸發：業務在 ERP 勾選「上架到 Online」
流程：
  1. ERP /tours/[id] → 勾選「發佈」
  2. 寫入 public_tours 表
     {
       tour_id: uuid,
       published: true,
       featured: boolean,
       display_order: integer
     }
  3. Online 首頁自動顯示
```

**訂單回寫**（Online → ERP）
```
觸發：客戶在 Online 完成報名
流程：
  1. Online 建立 order + travelers
  2. Webhook → ERP 收到通知
  3. ERP 顯示新訂單（待確認）
```

**庫存同步**（雙向）
```
ERP：
  - tours.max_pax（最大人數）
  - orders.confirmed_pax（已報名人數）
  - 計算：剩餘名額 = max_pax - confirmed_pax

Online：
  - 即時顯示剩餘名額
  - 滿團時自動下架
```

#### 共用資料表
```sql
-- 共用（同一個 DB）
tours              -- 行程主表
tour_itinerary_items  -- 世界樹
orders             -- 訂單
travelers          -- 團員
countries/regions/cities  -- 地理資料

-- Online 專用
public_tours       -- 上架控制
tour_reviews       -- 評價
coupons            -- 優惠券
membership_tiers   -- 會員等級
```

---

### 2️⃣ ERP ↔ AI Console

#### AI 按鈕嵌入

**報價頁 AI 助手**
```
位置：ERP /tours/[id] Tab:報價
按鈕：「AI 智能估價」
觸發：
  1. 點擊按鈕 → 側邊欄開啟
  2. 業務輸入：「幫我估這個團的成本」
  3. AI Console API 查詢歷史報價
  4. 回傳建議成本 + 說明
  5. 業務確認 → 填入世界樹
```

**行程頁 AI 助手**
```
位置：ERP /tours/[id] Tab:行程
按鈕：「AI 優化行程」
觸發：
  1. AI 分析當前行程
  2. 建議：Day 2 太趕、推薦景點 A
  3. 業務採納 → 自動修改世界樹
```

#### Webhook 通知

**新團建立 → AI 自動分析**
```
觸發：ERP 建立新團
Webhook → AI Console
AI：
  - 檢查歷史類似行程
  - 推薦常用供應商
  - 預估成本範圍
回傳：建議清單顯示在 ERP
```

**需求單發送 → AI 追蹤**
```
觸發：ERP 發送需求單
Webhook → AI Console
AI：
  - 記錄發送時間
  - 3 天未回覆 → 自動催款
  - 通知業務
```

#### 資料共用

```typescript
// AI Console 透過 Supabase Client 讀 ERP 資料
const { data: tours } = await supabase
  .from('tours')
  .select('*')
  .eq('workspace_id', workspace_id)  // RLS 控制
```

---

### 3️⃣ Online ↔ AI Console

#### 客服聊天窗

**位置**：Online 所有頁面右下角
```
元件：<AIChatWidget />
功能：
  - 即時回答常見問題
  - 查詢訂單狀態
  - 行程推薦
  - 轉接真人客服
```

**技術架構**：
```
Online 前端
  ↓ WebSocket
AI Console (Supabase Realtime)
  ↓ Gemini Live API
回覆顯示在聊天窗
```

#### 個人化推薦

**首頁推薦卡片**
```
位置：Online / 首頁
API：GET /api/ai/recommend?user_id={uuid}
回傳：
  {
    "tours": [
      { "id": "uuid", "reason": "您上次參加日本團，推薦韓國團" }
    ]
  }
顯示：「為您推薦」區塊
```

---

### 4️⃣ MCP Server ↔ 所有系統

#### Claude Desktop 呼叫 ERP

**使用情境**：業務用 Claude Desktop 查詢資料
```
業務：「幫我查一下 3 月有哪些越南團」

Claude Desktop
  ↓ MCP 協議
MCP Server (venturo_get_tours)
  ↓ Supabase
查詢 tours 表 (country_id='vietnam', date...)
  ↓
回傳：5 個越南團的清單

Claude 整理成文字回覆
```

#### OpenClaw Agent 呼叫 MCP

**使用情境**：Matthew 要查世界樹資料
```
Matthew：「查 tour-123 的世界樹」

OpenClaw (mcporter skill)
  ↓ MCP stdio
MCP Server (venturo_get_itinerary_items)
  ↓ Supabase
查詢 tour_itinerary_items where tour_id='tour-123'
  ↓
回傳：20 個枝條的 JSON

Matthew 分析資料
```

#### AI Console 呼叫 MCP

**使用情境**：AI 報價助手需要查歷史資料
```
業務：「AI 幫我估這個團」

AI Console
  ↓ 內部呼叫
MCP Server (venturo_calculate_quote)
  ↓ 查詢
歷史報價 + 供應商價格
  ↓
計算建議成本
  ↓
回傳給 AI Console → 顯示在 ERP
```

---

## 🔐 權限控制

### RLS（Row Level Security）

**核心原則**：所有系統都透過 Supabase RLS 控制資料存取

```sql
-- 範例：tours 表的 RLS
CREATE POLICY "Users can view tours in their workspace"
ON tours FOR SELECT
USING (workspace_id = current_setting('app.current_workspace')::uuid);
```

**系統帶入 workspace_id**：
```typescript
// ERP
const client = supabase.auth.admin.setAuth(user.jwt)
client.rpc('set_workspace', { id: user.workspace_id })

// Online（客戶端）
const client = supabase.auth.setSession(session)  // 無 workspace_id，只看 public_tours

// AI Console
const client = supabase.auth.admin.setAuth(api_key)
client.rpc('set_workspace', { id: request.workspace_id })

// MCP Server
const client = createClient(url, key, {
  global: {
    headers: { 'x-workspace-id': workspace_id }
  }
})
```

---

## 📊 資料流圖

### 完整行程生命週期

```
1. 【ERP】業務建立新團
   ↓ 寫入 tours 表
   
2. 【ERP】規劃行程（世界樹東面）
   ↓ 寫入 tour_itinerary_items
   
3. 【AI Console】AI 建議報價
   ↓ 讀取歷史資料 → 回傳建議
   
4. 【ERP】業務確認報價（世界樹南面）
   ↓ 更新 unit_cost
   
5. 【ERP】發佈到 Online
   ↓ 寫入 public_tours (published=true)
   
6. 【Online】客戶報名
   ↓ 寫入 orders + travelers
   
7. 【AI Console】自動通知業務
   ↓ Webhook + 推播
   
8. 【ERP】確認訂單
   ↓ 更新 orders.status = 'confirmed'
   
9. 【ERP】發需求單（世界樹西面）
   ↓ 寫入 requests 表
   
10. 【AI Console】追蹤回覆（三紀）
    ↓ 監控 requests.status
    
11. 【ERP】團確（世界樹北面）
    ↓ 所有 confirmed → 給領隊
    
12. 【ERP】回團結算（落葉）
    ↓ 寫入 actual_expense
```

---

## 🚀 部署架構

```
┌─────────────────────────────────────────────┐
│          Supabase（資料層）                   │
│  - PostgreSQL                               │
│  - Realtime                                 │
│  - Auth                                     │
│  - Storage                                  │
└─────────────────────────────────────────────┘
         ↑           ↑           ↑
         │           │           │
    ┌────┴────┐ ┌────┴────┐ ┌───┴────┐
    │ ERP     │ │ Online  │ │AI      │
    │(Vercel) │ │(Vercel) │ │Console │
    │Port 3000│ │Port 3001│ │(VPS)   │
    └─────────┘ └─────────┘ └────────┘
         ↑           ↑           ↑
         └───────────┴───────────┘
                     │
              ┌──────┴──────┐
              │ MCP Server  │
              │  (本機/VPS)  │
              └─────────────┘
```

**網域規劃**：
- ERP：`erp.venturo.travel`
- Online：`www.venturo.travel`
- AI Console API：`ai.venturo.travel`
- MCP Server：localhost（開發）/ VPS（生產）

---

## 📅 開發時程

### 二紀（Q2 2026）
- [x] ERP 核心功能（世界樹五面）
- [ ] Online 基礎頁面（首頁、行程列表、報名）
- [ ] MCP Server 基礎工具（10 個核心 tools）

### 三紀（Q3 2026）
- [ ] ERP 需求單系統完善
- [ ] Online 付款整合
- [ ] AI Console 報價助手

### 四紀（Q4 2026）
- [ ] 租戶系統（多旅行社）
- [ ] 附屬國整合（Local 地接社）
- [ ] AI 客服上線

### 五紀（2027 H1）
- [ ] 會員系統
- [ ] AI 自動化工作流
- [ ] 進階報表

### 六紀（2027 H2）
- [ ] 帝國統一（全產業標準化）
- [ ] 網絡效應啟動

---

**完成時間**：2026-03-17 04:45  
**狀態**：與 Matthew 的 ERP 功能地圖合併後，形成完整帝國藍圖
