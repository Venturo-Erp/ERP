# 作戰會議室 - 開發與維護指南

**建立日期**：2026-03-18  
**負責人**：Matthew（IT Lead）  
**維護者**：William AI + Matthew

---

## 📍 位置

**ERP 路由**：`http://localhost:3000/war-room`  
**側邊欄菜單**：作戰會議室（🎯 圖標）  
**權限**：只有 William + 超級管理員可見

---

## 🏗️ 系統架構

### 四個分頁

| Tab | 說明 | 數據表 | 負責人 |
|-----|------|--------|--------|
| 📚 魔法塔圖書館 | 追蹤所有開源魔法 | `magic_library` | Matthew |
| 🤖 機器人管理中心 | 管理所有 Bot | `bot_registry` + `bot_groups` | Matthew |
| 📋 獨立任務 | 單一任務 | `tasks` (task_type=individual) | William AI |
| 🔄 工作流任務 | n8n 工作流 | `tasks` (task_type=workflow) | William AI |

---

## 📊 數據庫表結構

### 1. magic_library（魔法塔圖書館）

**位置**：Supabase `magic_library` 表

**欄位**：
```sql
- id (UUID)
- workspace_id (UUID) -- Venturo workspace
- name (TEXT) -- 魔法名稱（例如：@hello-pangea/dnd）
- category (TEXT) -- 分類（task_management, memory, search, ai_framework, dev_tool）
- layer (TEXT) -- 層級（layer1_creative, layer2_opensource, layer3_internal）
- source_type (TEXT) -- 來源（npm, github, internal, api）
- official_url (TEXT) -- 官網網址
- github_url (TEXT) -- GitHub 網址
- current_version (TEXT) -- 當前版本
- latest_version (TEXT) -- 最新版本
- update_status (TEXT) -- 更新狀態（latest, update_available, outdated, unknown）
- last_checked_at (TIMESTAMPTZ) -- 最後檢查時間
- description (TEXT) -- 描述
- check_frequency (TEXT) -- 檢查頻率（weekly, monthly, quarterly, half_yearly）
```

**範例數據**：
```json
{
  "workspace_id": "8ef05a74-1f87-48ab-afd3-9bfeb423935d",
  "name": "@hello-pangea/dnd",
  "category": "task_management",
  "layer": "layer2_opensource",
  "source_type": "npm",
  "official_url": "https://www.npmjs.com/package/@hello-pangea/dnd",
  "github_url": "https://github.com/hello-pangea/dnd",
  "current_version": "17.0.0",
  "latest_version": "17.0.0",
  "update_status": "latest",
  "description": "拖拽功能庫（React DnD 繼任者）",
  "check_frequency": "quarterly"
}
```

---

### 2. bot_registry（機器人註冊表）

**位置**：Supabase `bot_registry` 表

**欄位**：
```sql
- id (UUID)
- workspace_id (UUID)
- bot_name (TEXT) -- 機器人名稱
- bot_username (TEXT) -- 用戶名（例如：@VENTURO_BOT）
- platform (TEXT) -- 平台（line, telegram, discord, slack）
- status (TEXT) -- 狀態（active, inactive, offline）
- webhook_url (TEXT) -- Webhook URL
- description (TEXT) -- 描述
- managed_by (TEXT) -- 負責人（eddie）
```

**範例數據**：
```json
{
  "workspace_id": "8ef05a74-1f87-48ab-afd3-9bfeb423935d",
  "bot_name": "Venturo 播報員",
  "bot_username": "VENTURO_NEW_BOT",
  "platform": "telegram",
  "status": "active",
  "webhook_url": null,
  "description": "主要通知機器人",
  "managed_by": "eddie"
}
```

---

### 3. bot_groups（機器人群組）

**位置**：Supabase `bot_groups` 表

**欄位**：
```sql
- id (UUID)
- bot_id (UUID) -- 關聯到 bot_registry
- group_id (TEXT) -- 群組 ID
- group_name (TEXT) -- 群組名稱
- group_type (TEXT) -- 類型（group, channel, dm）
- joined_at (TIMESTAMPTZ) -- 加入時間
- is_new (BOOLEAN) -- 是否新加入（高亮顯示）
- member_count (INTEGER) -- 成員數量
```

---

### 4. tasks（任務表）

**位置**：Supabase `tasks` 表  
**說明**：由 William AI 管理，Matthew 不需要手動操作

---

## 🚀 Matthew 的工作清單

### 第一階段：填充魔法塔圖書館（預計 30 分鐘）

**參考文件**：`/MAGIC_LIBRARY.md`

**步驟**：
```bash
# 1. 進入 Supabase Dashboard
open https://supabase.com/dashboard/project/pfqvdacxowpgfamuvnsn/editor

# 2. 選擇 magic_library 表

# 3. 點「Insert」→「Insert row」

# 4. 填入數據（參考下方列表）
```

**要添加的魔法項目**（13 個）：

#### 任務管理（3 個）
1. **@hello-pangea/dnd**
   - category: `task_management`
   - layer: `layer2_opensource`
   - source_type: `npm`
   - official_url: `https://www.npmjs.com/package/@hello-pangea/dnd`
   - github_url: `https://github.com/hello-pangea/dnd`
   - current_version: `17.0.0`
   - latest_version: `17.0.0`
   - update_status: `latest`
   - description: `拖拽功能庫（React DnD 繼任者）`
   - check_frequency: `quarterly`

2. **Plane**
   - category: `task_management`
   - layer: `layer2_opensource`
   - source_type: `github`
   - official_url: `https://plane.so`
   - github_url: `https://github.com/makeplane/plane`
   - current_version: `2026-03-18 snapshot`
   - latest_version: `v1.2.3`
   - update_status: `update_available`
   - description: `任務看板架構參考`
   - check_frequency: `quarterly`

3. **venturo-online 卡片設計**
   - category: `task_management`
   - layer: `layer3_internal`
   - source_type: `internal`
   - official_url: `null`
   - github_url: `null`
   - current_version: `2026-02-23`
   - latest_version: `2026-02-23`
   - update_status: `latest`
   - description: `內部卡片設計系統`
   - check_frequency: `monthly`

#### 記憶系統（1 個）
4. **OpenViking**
   - category: `memory`
   - layer: `layer2_opensource`
   - source_type: `github`
   - official_url: `null`
   - github_url: `https://github.com/your/openviking`
   - current_version: `unknown`
   - latest_version: `unknown`
   - update_status: `unknown`
   - description: `向量搜索引擎`
   - check_frequency: `half_yearly`

#### 搜尋魔法（2 個）
5. **Tavily Search API**
   - category: `search`
   - layer: `layer2_opensource`
   - source_type: `api`
   - official_url: `https://tavily.com`
   - github_url: `null`
   - current_version: `API v1`
   - latest_version: `API v1`
   - update_status: `latest`
   - description: `AI 優化的網頁搜索`
   - check_frequency: `monthly`

6. **agent-reach**
   - category: `search`
   - layer: `layer2_opensource`
   - source_type: `github`
   - official_url: `null`
   - github_url: `https://github.com/your/agent-reach`
   - current_version: `unknown`
   - latest_version: `unknown`
   - update_status: `unknown`
   - description: `16 平台搜索整合`
   - check_frequency: `monthly`

#### AI 框架（2 個）
7. **AutoGen**
   - category: `ai_framework`
   - layer: `layer2_opensource`
   - source_type: `github`
   - official_url: `https://microsoft.github.io/autogen/`
   - github_url: `https://github.com/microsoft/autogen`
   - current_version: `0.7.5`
   - latest_version: `python-v0.7.5`
   - update_status: `latest`
   - description: `多 Agent 自動對話框架`
   - check_frequency: `quarterly`

8. **OpenClaw**
   - category: `ai_framework`
   - layer: `layer2_opensource`
   - source_type: `github`
   - official_url: `https://docs.openclaw.ai`
   - github_url: `https://github.com/openclaw/openclaw`
   - current_version: `2026.3.2`
   - latest_version: `2026.3.2`
   - update_status: `latest`
   - description: `Agent 運行環境`
   - check_frequency: `weekly`

#### 開發工具（4 個）
9. **Next.js**
   - category: `dev_tool`
   - layer: `layer2_opensource`
   - source_type: `npm`
   - official_url: `https://nextjs.org`
   - github_url: `https://github.com/vercel/next.js`
   - current_version: `13.x`
   - latest_version: `14.x`
   - update_status: `update_available`
   - description: `React 框架`
   - check_frequency: `half_yearly`

10. **Supabase**
    - category: `dev_tool`
    - layer: `layer2_opensource`
    - source_type: `api`
    - official_url: `https://supabase.com`
    - github_url: `https://github.com/supabase/supabase`
    - current_version: `2.89.0`
    - latest_version: `2.99.2`
    - update_status: `update_available`
    - description: `數據庫 + Realtime`
    - check_frequency: `monthly`

11. **Tailwind CSS**
    - category: `dev_tool`
    - layer: `layer2_opensource`
    - source_type: `npm`
    - official_url: `https://tailwindcss.com`
    - github_url: `https://github.com/tailwindlabs/tailwindcss`
    - current_version: `3.x`
    - latest_version: `3.x`
    - update_status: `latest`
    - description: `CSS 框架`
    - check_frequency: `half_yearly`

12. **framer-motion**
    - category: `dev_tool`
    - layer: `layer2_opensource`
    - source_type: `npm`
    - official_url: `https://www.framer.com/motion/`
    - github_url: `https://github.com/framer/motion`
    - current_version: `11.x`
    - latest_version: `11.x`
    - update_status: `latest`
    - description: `動畫庫`
    - check_frequency: `half_yearly`

#### 數據處理（1 個）
13. **n8n**
    - category: `data_processing`
    - layer: `layer2_opensource`
    - source_type: `github`
    - official_url: `https://n8n.io`
    - github_url: `https://github.com/n8n-io/n8n`
    - current_version: `待部署`
    - latest_version: `unknown`
    - update_status: `unknown`
    - description: `工作流自動化`
    - check_frequency: `quarterly`

**重要**：每個項目的 `workspace_id` 都是：`8ef05a74-1f87-48ab-afd3-9bfeb423935d`

---

### 第二階段：填充機器人數據（預計 15 分鐘）

**步驟**：
```bash
# 1. 進入 Supabase Dashboard
# 2. 選擇 bot_registry 表
# 3. 添加以下機器人
```

**要添加的機器人**（2 個）：

1. **Venturo 播報員**
   - bot_name: `Venturo 播報員`
   - bot_username: `VENTURO_NEW_BOT`
   - platform: `telegram`
   - status: `active`
   - webhook_url: `null`
   - description: `主要通知機器人`
   - managed_by: `eddie`

2. **William AI**
   - bot_name: `William AI`
   - bot_username: `william_ai_bot`
   - platform: `telegram`
   - status: `active`
   - webhook_url: `null`
   - description: `William 的 AI 替身`
   - managed_by: `eddie`

**（可選）添加群組數據**：
- 如果知道 bot 加入了哪些群組，可以在 `bot_groups` 表添加
- 需要 bot_id（先查 bot_registry 拿到 UUID）

---

## 🔄 定期更新流程

### 自動更新檢查

**腳本位置**：`~/Projects/venturo-erp/scripts/check-magic-updates.sh`

**執行方式**：
```bash
# 手動執行
bash ~/Projects/venturo-erp/scripts/check-magic-updates.sh

# OpenClaw Cron（每週日 22:00 自動執行）
# 會自動回報更新狀況到 Telegram
```

**更新流程**：
1. 每週日 22:00 自動檢查
2. 發現更新 → Telegram 通知 William
3. William 評估是否升級
4. Matthew 更新 Supabase 的版本號

---

### 手動更新魔法版本

**場景**：發現 Next.js 有更新（13.x → 14.x）

**步驟**：
1. 進入 Supabase Dashboard
2. 找到 `magic_library` 表
3. 找到 `Next.js` 那一行
4. 編輯：
   - `latest_version`: 改成 `14.x`
   - `update_status`: 改成 `update_available`
   - `last_checked_at`: 改成現在時間
5. 儲存

---

## 📁 檔案結構

```
~/Projects/venturo-erp/
├── MAGIC_LIBRARY.md              # 魔法塔圖書館完整文檔
├── scripts/
│   └── check-magic-updates.sh   # 自動檢查腳本
├── supabase/migrations/
│   └── 20260318_war_room.sql    # 數據庫表結構
└── src/
    ├── app/(main)/war-room/
    │   └── page.tsx              # 路由入口
    └── features/war-room/
        ├── README.md             # 本文件
        ├── index.tsx             # 導出
        └── components/
            ├── WarRoomPage.tsx          # 主頁面
            ├── WarRoomHeader.tsx        # 標題欄
            ├── MagicLibraryView.tsx     # 魔法塔視圖
            ├── BotManagementView.tsx    # 機器人視圖
            └── TasksView.tsx            # 任務視圖
```

---

## 🎯 快速開始（Matthew）

### 1. 訪問作戰會議室
```
http://localhost:3000/war-room
```

### 2. 填充數據（按順序）
1. ✅ 魔法塔圖書館（13 個項目）
2. ✅ 機器人註冊表（2 個 bot）
3. ⏸️ 任務系統（William AI 管理，暫時不用填）

### 3. 驗證
- 每個 Tab 都能正常顯示
- 表格數據正確
- 鏈接可以點擊

### 4. 完成後通知 William

---

## 🔗 相關文件

- **三層魔法架構**：`src/features/adventurer-guild/ARCHITECTURE.md`
- **魔法塔圖書館**：`MAGIC_LIBRARY.md`
- **自動檢查腳本**：`scripts/check-magic-updates.sh`

---

## ❓ 常見問題

**Q: workspace_id 是什麼？**  
A: Venturo 的工作空間 ID：`8ef05a74-1f87-48ab-afd3-9bfeb423935d`

**Q: 如何知道最新版本？**  
A: 執行 `bash scripts/check-magic-updates.sh` 或查看官網

**Q: update_status 怎麼判斷？**  
A: 
- `latest`: 當前版本 = 最新版本
- `update_available`: 有新版本可用
- `outdated`: 版本太舊
- `unknown`: 不確定

**Q: 任務系統需要我填數據嗎？**  
A: 不用，由 William AI 透過 Telegram 自動創建

---

**建立時間**：2026-03-18 08:56  
**維護者**：Matthew（IT Lead）  
**審核者**：William AI
