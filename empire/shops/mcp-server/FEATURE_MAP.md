# 🔌 MCP Server — 帝國工具協議功能地圖

**版本**：v1.0  
**負責人**：大祭司 William AI  
**定位**：AI 工具層 — Model Context Protocol 標準介面

---

## 🎯 MCP Server 核心任務

**讓所有 AI（Claude、Gemini、OpenClaw agents）都能用標準協議操作帝國資料。**

```
AI Agent（Claude Desktop、OpenClaw）
   ↓ MCP 協議
MCP Server (Venturo Tools)
   ↓ 查詢/寫入
Supabase（帝國資料庫）
```

---

## 📊 系統現況

### ✅ 已完成（一紀）

#### 🛠️ 基礎架構

- [x] MCP Server 骨架（Node.js / Python）
- [x] Supabase 連接（讀取權限）
- [x] 基本認證（RLS）

**參考**：

- Anthropic MCP SDK
- mcporter CLI（OpenClaw skill）

---

## 🏗️ 待建功能（二紀~六紀）

### 二紀：核心工具（Supabase CRUD）

#### 📊 世界樹工具

**工具名稱**：`venturo_get_itinerary_items`

**功能**：讀取世界樹枝條

```typescript
{
  "name": "venturo_get_itinerary_items",
  "description": "取得行程的世界樹枝條（tour_itinerary_items）",
  "inputSchema": {
    "tour_id": "uuid",
    "day_number": "integer（可選）",
    "category": "string（可選：accommodation, meal, activity...）"
  }
}
```

**工具名稱**：`venturo_update_itinerary_item`

**功能**：修改枝條資料

```typescript
{
  "name": "venturo_update_itinerary_item",
  "description": "更新世界樹枝條（成本、描述等）",
  "inputSchema": {
    "item_id": "uuid",
    "updates": {
      "unit_cost": "number",
      "description": "string",
      ...
    }
  }
}
```

#### 🗂️ 團務工具

**工具名稱**：`venturo_get_tours`

**功能**：查詢旅遊團

```typescript
{
  "name": "venturo_get_tours",
  "description": "查詢旅遊團列表",
  "inputSchema": {
    "status": "string（可選：planning, confirmed, completed）",
    "country": "string（可選）",
    "date_from": "date（可選）",
    "date_to": "date（可選）"
  }
}
```

**工具名稱**：`venturo_create_tour`

**功能**：建立新團

```typescript
{
  "name": "venturo_create_tour",
  "description": "建立新的旅遊團",
  "inputSchema": {
    "title": "string",
    "country_id": "string",
    "departure_date": "date",
    "days": "integer"
  }
}
```

#### 📋 訂單工具

**工具名稱**：`venturo_get_orders`

**功能**：查詢訂單

```typescript
{
  "name": "venturo_get_orders",
  "description": "查詢訂單列表",
  "inputSchema": {
    "tour_id": "uuid（可選）",
    "status": "string（可選）",
    "customer_name": "string（可選）"
  }
}
```

---

### 三紀：進階工具（業務邏輯）

#### 💰 報價工具

**工具名稱**：`venturo_calculate_quote`

**功能**：自動計算報價

```typescript
{
  "name": "venturo_calculate_quote",
  "description": "根據世界樹枝條自動計算總報價",
  "inputSchema": {
    "tour_id": "uuid",
    "pax": {
      "adult": "integer",
      "child": "integer",
      "infant": "integer"
    }
  },
  "output": {
    "total_cost": "number",
    "breakdown": [...],
    "suggested_price": "number"
  }
}
```

#### 📦 需求單工具

**工具名稱**：`venturo_create_request`

**功能**：發送需求單給供應商

```typescript
{
  "name": "venturo_create_request",
  "description": "建立需求單並發送給供應商",
  "inputSchema": {
    "tour_id": "uuid",
    "item_ids": ["uuid", "uuid"],
    "supplier_id": "uuid",
    "due_date": "date"
  }
}
```

**工具名稱**：`venturo_get_request_status`

**功能**：查詢需求單狀態

```typescript
{
  "name": "venturo_get_request_status",
  "description": "查詢需求單的回覆狀態（三紀）",
  "inputSchema": {
    "request_id": "uuid"
  },
  "output": {
    "status": "draft | sent | replied | confirmed",
    "items": [...]
  }
}
```

#### 👥 團員工具

**工具名稱**：`venturo_get_travelers`

**功能**：查詢團員名單

```typescript
{
  "name": "venturo_get_travelers",
  "description": "取得某團的所有團員資料",
  "inputSchema": {
    "tour_id": "uuid"
  },
  "output": {
    "travelers": [
      {
        "name": "string",
        "passport_number": "string",
        "birthday": "date",
        ...
      }
    ]
  }
}
```

---

### 四紀：智能工具（AI 輔助）

#### 🧠 AI 分析工具

**工具名稱**：`venturo_analyze_profitability`

**功能**：分析行程獲利性

```typescript
{
  "name": "venturo_analyze_profitability",
  "description": "分析這個團的成本結構和利潤率",
  "inputSchema": {
    "tour_id": "uuid"
  },
  "output": {
    "total_revenue": "number",
    "total_cost": "number",
    "profit_margin": "number",
    "suggestions": ["string"]
  }
}
```

**工具名稱**：`venturo_suggest_alternatives`

**功能**：推薦替代方案

```typescript
{
  "name": "venturo_suggest_alternatives",
  "description": "推薦成本更低的替代飯店/餐廳",
  "inputSchema": {
    "item_id": "uuid",
    "budget": "number（可選）"
  },
  "output": {
    "alternatives": [
      {
        "name": "string",
        "cost": "number",
        "reason": "string"
      }
    ]
  }
}
```

#### 📊 報表工具

**工具名稱**：`venturo_generate_report`

**功能**：生成各類報表

```typescript
{
  "name": "venturo_generate_report",
  "description": "生成月度/季度報表",
  "inputSchema": {
    "report_type": "sales | profit | supplier",
    "period": "2024-Q1"
  },
  "output": {
    "report_url": "string（PDF）",
    "summary": {...}
  }
}
```

---

### 五紀：跨系統整合工具

#### 🌐 Online 整合

**工具名稱**：`venturo_publish_tour_online`

**功能**：上架行程到 Online

```typescript
{
  "name": "venturo_publish_tour_online",
  "description": "將 ERP 行程發佈到 Online（B2C）",
  "inputSchema": {
    "tour_id": "uuid",
    "public_price": "number",
    "featured": "boolean"
  }
}
```

**工具名稱**：`venturo_sync_online_orders`

**功能**：同步 Online 訂單到 ERP

```typescript
{
  "name": "venturo_sync_online_orders",
  "description": "將 Online 新訂單同步到 ERP",
  "inputSchema": {}
}
```

#### 📧 通訊整合

**工具名稱**：`venturo_send_notification`

**功能**：發送通知（Email/Line/簡訊）

```typescript
{
  "name": "venturo_send_notification",
  "description": "發送通知給客戶/供應商",
  "inputSchema": {
    "to": "string（email 或 phone）",
    "type": "email | line | sms",
    "template": "payment_reminder | tour_confirmation",
    "data": {...}
  }
}
```

---

### 六紀：自動化工作流工具

#### 🤖 Workflow 工具

**工具名稱**：`venturo_trigger_workflow`

**功能**：觸發自動化流程

```typescript
{
  "name": "venturo_trigger_workflow",
  "description": "觸發預設的自動化工作流",
  "inputSchema": {
    "workflow_name": "auto_send_requests | auto_reminder",
    "tour_id": "uuid"
  }
}
```

**工具名稱**：`venturo_schedule_task`

**功能**：排程任務

```typescript
{
  "name": "venturo_schedule_task",
  "description": "排程未來執行的任務",
  "inputSchema": {
    "task_type": "send_reminder | generate_report",
    "execute_at": "timestamp",
    "params": {...}
  }
}
```

---

## 🔐 安全與權限

### RLS 整合

```typescript
// 每個 MCP 工具都帶 workspace_id
const client = supabase.auth.admin.createClient({
  headers: {
    'x-workspace-id': context.workspace_id,
  },
})
```

### API Key 認證

```typescript
// MCP Server 啟動時需要
{
  "supabase_url": "https://...",
  "supabase_anon_key": "...",
  "workspace_id": "uuid"
}
```

---

## 📦 部署方式

### 本機開發

```bash
# 使用 mcporter（OpenClaw skill）
mcporter add venturo-mcp-server stdio

# 或直接啟動
node venturo-mcp-server/index.js
```

### Claude Desktop 整合

```json
// claude_desktop_config.json
{
  "mcpServers": {
    "venturo": {
      "command": "node",
      "args": ["/path/to/venturo-mcp-server/index.js"],
      "env": {
        "SUPABASE_URL": "...",
        "SUPABASE_KEY": "..."
      }
    }
  }
}
```

### OpenClaw 整合

```bash
# 透過 mcporter skill
cd ~/.openclaw/workspace-william/skills/mcporter
python3 scripts/mcporter.py add venturo stdio \
  --command "node /path/to/server.js"
```

---

## 🛠️ 開發優先順序

### Phase 1（二紀）

1. `venturo_get_itinerary_items`
2. `venturo_get_tours`
3. `venturo_update_itinerary_item`

### Phase 2（三紀）

1. `venturo_calculate_quote`
2. `venturo_create_request`
3. `venturo_get_request_status`

### Phase 3（四紀~六紀）

- AI 分析工具
- 跨系統整合
- 自動化工作流

---

## 📚 參考資料

- [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [OpenClaw mcporter skill](~/.openclaw/workspace-william/skills/mcporter/)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript)

---

**完成時間**：2026-03-17 04:40  
**狀態**：待 Matthew 檢視整合
