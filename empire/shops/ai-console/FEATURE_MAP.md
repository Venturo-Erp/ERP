# 🧠 AI Console — 帝國智能中樞功能地圖

**版本**：v1.0  
**負責人**：大祭司 William AI  
**定位**：AI 賦能層 — 讓帝國所有系統擁有智能

---

## 🎯 AI Console 核心任務

**不是獨立產品，是帝國的 AI 能力層。**

```
ERP（旅行社）
   ↓ 呼叫
AI Console
   ↓ 提供
智能功能（報價AI、行程AI、客服AI）
```

---

## 📊 系統現況

### ✅ 已完成（一紀）

#### 🔮 Venturo AI Chat (Supabase Realtime)

**位置**：`~/.openclaw/workspace-william/skills/venturo-ai-chat/`

- [x] 即時訊息傳遞（Supabase Realtime）
- [x] 多 agent 支援（william、matthew、nova 等）
- [x] 訊息持久化（chat_sessions、chat_messages 表）
- [x] OpenClaw agents 可接收/發送訊息

**資料表**：

```sql
chat_sessions  -- 對話階段
chat_messages  -- 訊息紀錄
```

---

## 🏗️ 待建功能（二紀~六紀）

### 二紀：AI 報價助手

#### 💰 智能報價系統

**路由**：ERP 內嵌 `/tours/[id]?ai-quote=true`

**功能**：

- [ ] **自然語言報價**
  - [ ] 業務：「幫我報一個 5 天越南行程」
  - [ ] AI：自動抓取歷史報價、供應商價格
  - [ ] 生成初步報價單

- [ ] **報價優化建議**
  - [ ] 分析：這個報價利潤太低/太高
  - [ ] 建議：調整住宿等級可省 10%
  - [ ] 比價：同類行程市場價 $15,000

- [ ] **歷史報價學習**
  - [ ] 分析過去 100 個越南團的報價
  - [ ] 提取：常用供應商、平均成本
  - [ ] 推薦：這個景點通常搭配這個餐廳

**技術架構**：

```
業務輸入 → AI Console API
  ↓
Gemini 2.0 Flash Thinking
  ↓
查詢 ERP 資料庫（歷史報價、供應商價格）
  ↓
生成報價建議 JSON
  ↓
ERP 前端渲染
```

---

### 三紀：AI 行程規劃師

#### 🗺️ 智能行程生成

**路由**：`/ai/itinerary-builder`

**功能**：

- [ ] **對話式行程設計**
  - [ ] 輸入：「5 天越南、預算 $20,000、想去下龍灣」
  - [ ] AI：自動排景點順序、推薦餐廳、計算交通時間
  - [ ] 輸出：完整行程表（可直接匯入世界樹）

- [ ] **行程優化建議**
  - [ ] 分析：Day 2 太趕，建議刪除一個景點
  - [ ] 推薦：這兩個景點可以同一天走完
  - [ ] 警告：這個餐廳週一公休

- [ ] **多版本對比**
  - [ ] 生成 3 個方案（經濟/標準/豪華）
  - [ ] 並排比較
  - [ ] 一鍵選擇

**資料來源**：

- ERP 歷史行程
- 飯店資料庫（318 筆日本飯店）
- 景點資料庫
- Google Maps API（交通時間）

---

### 四紀：AI 客服系統

#### 💬 智能客服機器人

**整合點**：Online `/` + ERP `/dashboard`

**功能**：

- [ ] **常見問題自動回答**
  - [ ] Q：「這個團包含簽證嗎？」
  - [ ] A：自動查詢行程表 → 回答

- [ ] **訂單查詢**
  - [ ] 客人：「我的訂單編號 V20260315-001 付款了嗎？」
  - [ ] AI：查 orders 表 → 「您的訂單已付訂金 $5,000」

- [ ] **智能轉接**
  - [ ] 複雜問題 → 轉真人客服
  - [ ] 帶上對話歷史

**技術**：

- Gemini Live API（語音客服）
- RAG（檢索 ERP 知識庫）
- Supabase Realtime（訊息傳遞）

---

### 五紀：AI 分析 + 推薦

#### 📊 智能數據分析

**路由**：`/ai/analytics`

**功能**：

- [ ] **自然語言查詢**
  - [ ] 業務：「上個月哪個國家最賺錢？」
  - [ ] AI：查詢資料庫 → 生成圖表 + 分析報告

- [ ] **趨勢預測**
  - [ ] 預測下季度熱門目的地
  - [ ] 建議提前採購（機位、飯店）

- [ ] **異常偵測**
  - [ ] 這個團成本異常高
  - [ ] 這個供應商最近報價都漲了

#### 🎯 個人化推薦引擎

**整合點**：Online `/` 首頁

**功能**：

- [ ] **客戶偏好分析**
  - [ ] 過去參加過日本團 → 推薦韓國團
  - [ ] 喜歡溫泉 → 推薦北投/礁溪行程

- [ ] **動態定價建議**
  - [ ] 這個客戶是 VIP → 給 95 折
  - [ ] 淡季促銷 → 早鳥價

---

### 六紀：AI 自動化工作流

#### 🤖 RPA + AI Agent

**觸發**：OpenClaw Cron + Webhook

**功能**：

- [ ] **自動發需求單**
  - [ ] 新團建立 → AI 自動識別需要的服務
  - [ ] 自動發需求單給常用供應商

- [ ] **自動催款**
  - [ ] 偵測：訂金到期未付
  - [ ] 發送 Email + Line 提醒

- [ ] **自動對帳**
  - [ ] 團回來 → AI 比對實際成本 vs 估價
  - [ ] 生成結帳報告

#### 📧 AI 郵件助手

**整合點**：ERP `/inbox`

**功能**：

- [ ] **郵件分類**
  - [ ] 客戶詢問 → 自動標籤「待報價」
  - [ ] 供應商回覆 → 自動標籤「待確認」

- [ ] **智能草稿**
  - [ ] 客戶問：「還有位子嗎？」
  - [ ] AI 生成回覆草稿（業務確認後發送）

---

## 🔗 API 規格

### 1. AI 報價 API

```typescript
POST /api/ai/quote

Request:
{
  "tour_id": "uuid",
  "query": "幫我估這個團的成本",
  "context": {
    "days": 5,
    "country": "vietnam",
    "pax": 20
  }
}

Response:
{
  "suggested_cost": 45000,
  "breakdown": [
    { "category": "accommodation", "cost": 15000 },
    { "category": "meals", "cost": 8000 },
    ...
  ],
  "recommendations": [
    "建議用 A 飯店代替 B，可省 $2000"
  ],
  "confidence": 0.85
}
```

### 2. AI 行程生成 API

```typescript
POST /api/ai/itinerary

Request:
{
  "prompt": "5天越南，預算2萬，想去下龍灣",
  "preferences": {
    "budget": "standard",
    "pace": "relaxed"
  }
}

Response:
{
  "itinerary": [
    {
      "day": 1,
      "title": "台北 → 河內",
      "items": [...]
    }
  ],
  "total_cost": 18500,
  "reasoning": "基於類似行程的平均成本..."
}
```

### 3. AI 客服 API

```typescript
POST /api/ai/chat

Request:
{
  "session_id": "uuid",
  "message": "我的訂單付款了嗎？",
  "user_id": "uuid"
}

Response:
{
  "reply": "您的訂單 V20260315-001 已付訂金 $5,000",
  "actions": [
    { "type": "查看訂單", "url": "/orders/V20260315-001" }
  ],
  "escalate": false
}
```

---

## 🔌 與其他系統的整合

### 與 ERP 整合

- **嵌入 AI 按鈕**（報價頁、行程頁）
- **Webhook**：新團建立 → 通知 AI Console
- **RLS**：AI Console 讀取 ERP 資料需權限控制

### 與 Online 整合

- **聊天小窗**：右下角 AI 客服
- **推薦卡片**：首頁顯示 AI 推薦行程

### 與 MCP Server 整合

- **工具呼叫**：AI Console 透過 MCP 查詢 Supabase
- **技能擴充**：MCP 提供新工具 → AI Console 自動學會

---

## 📊 資料表需求

### AI 對話紀錄（已有）

```sql
chat_sessions  -- AI 對話階段
chat_messages  -- 訊息歷史
```

### AI 學習資料（新增）

```sql
-- AI 報價歷史
CREATE TABLE ai_quote_history (
  id uuid PRIMARY KEY,
  tour_id uuid,
  query text,
  suggested_cost numeric,
  actual_cost numeric,  -- 實際成交價（用於訓練）
  feedback text,        -- 業務回饋
  created_at timestamp
);

-- AI 推薦記錄
CREATE TABLE ai_recommendations (
  id uuid PRIMARY KEY,
  user_id uuid,
  recommended_tour_id uuid,
  reason text,
  clicked boolean,
  converted boolean,
  created_at timestamp
);
```

---

## 🚀 部署架構

```
AI Console (獨立服務)
├── API Server (Express/Fastify)
├── Gemini API 2.0 Flash Thinking
├── Supabase Client（讀 ERP 資料）
├── OpenClaw Integration（呼叫 agents）
└── Vercel Deployment
```

---

**完成時間**：2026-03-17 04:35  
**狀態**：待 Matthew 檢視整合
