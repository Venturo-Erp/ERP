# Feature: 威拓 AI 會議辯論系統

## Status: 基礎建設已完成，核心功能測試模式

## 設計日期

2026-03-04 ~ 03-06

---

## 核心概念

**問題**：William 管理多個 AI，一個個問浪費時間
**解法**：AI 自己開會討論 → William 只看結論 + 審核

**創新點**：

- AI 定時開會（不等人問）
- 角色動態切換（業務會議 vs 技術會議）
- 會議記錄完整保留
- 晨報彙整結論 + 待辦

---

## 實體 AI（3 個）

| AI             | 位置                 | 角色     |
| -------------- | -------------------- | -------- |
| 🌙 Yuzuki      | Mac mini (CORNER)    | 技術開發 |
| 👔 Carson AI   | Mac mini（同辦公室） | 行政協調 |
| 💰 會計姐姐 AI | Mac mini（同辦公室） | 財務管理 |

## 虛擬 AI 庫存（4 個，由 Yuzuki spawn）

| 虛擬 AI       | 個性     | 用途                 |
| ------------- | -------- | -------------------- |
| 📊 業務分析師 | 穩健謹慎 | 業務會議提供數據觀點 |
| 📱 行銷專員   | 樂觀進取 | 行銷會議主導討論     |
| 🤔 批判質疑者 | 悲觀反駁 | 任何會議提出質疑     |
| 🔧 技術審查員 | 謹慎細節 | 技術會議審查方案     |

## 預設會議室（4 間）

| 會議室      | 時間         | 參與者                     |
| ----------- | ------------ | -------------------------- |
| 📊 業務會議 | 每日 00:00   | Yuzuki, Carson, 業務分析師 |
| 📱 行銷會議 | 每日 00:30   | Yuzuki, 行銷專員           |
| 💻 技術會議 | 每日 01:00   | Yuzuki, 技術審查員         |
| 💰 財務會議 | 每週一 00:00 | Yuzuki, 會計姐姐, Carson   |

---

## 資料庫 Schema（4 張新表）

```sql
-- AI 機器人表
CREATE TABLE ai_bots (
  id UUID PRIMARY KEY,
  bot_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '🤖',
  bot_type TEXT NOT NULL,  -- 'real' | 'virtual'
  personality TEXT,
  expertise TEXT[],
  default_role TEXT,  -- 'leader' | 'participant' | 'observer'
  soul_config JSONB,
  instance_url TEXT,
  location TEXT,
  workspace_id UUID REFERENCES workspaces(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 會議室表
CREATE TABLE meeting_rooms (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  topic TEXT,
  schedule JSONB,
  workspace_id UUID REFERENCES workspaces(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 會議參與者表
CREATE TABLE meeting_participants (
  id UUID PRIMARY KEY,
  meeting_room_id UUID REFERENCES meeting_rooms(id) ON DELETE CASCADE,
  bot_id TEXT REFERENCES ai_bots(bot_id),
  role TEXT,
  decision_weight INTEGER,
  added_at TIMESTAMPTZ DEFAULT NOW()
);

-- 會議記錄表
CREATE TABLE meeting_records (
  id UUID PRIMARY KEY,
  meeting_room_id UUID REFERENCES meeting_rooms(id),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  messages JSONB[],
  decisions TEXT[],
  action_items JSONB[],
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## ERP 前端結構

```
src/features/ai-meeting/
├── components/
│   ├── AIBotList.tsx
│   ├── CreateBotChat.tsx        # 對話式建立虛擬 AI
│   ├── MeetingRoomList.tsx
│   ├── CreateMeetingModal.tsx
│   ├── InviteAIModal.tsx
│   └── MeetingRecordView.tsx
├── hooks/
│   ├── useAIBots.ts
│   ├── useCreateBot.ts
│   ├── useMeetingRooms.ts
│   └── useMeetingRecords.ts
└── types/index.ts

路由：
- /settings/ai-bots         ← AI 機器人管理
- /settings/ai-bots/create  ← 對話式建立
- /game（加「會議」分頁）   ← 會議室列表 + 記錄
```

## 通訊機制

- Supabase Realtime Presence（即時狀態）
- Supabase Realtime Channel（會議訊息）

---

---

## 已完成的部分

### ERP 前端（已有 code）

- ✅ `/meeting` 聊天室頁面（WebSocket 即時通訊）
- ✅ `/api/meeting/send` API（訊息 + AI 回應）
- ✅ `/api/meeting/summary` API（會議摘要）
- ✅ `src/lib/meeting/ai-endpoints.ts`（AI 端點設定）
- ⚠️ AI 回應目前是**硬編碼測試模式**，未真正呼叫 OpenClaw

### OpenClaw 側

- ✅ `venturo-ai-chat` skill 已建立
- ✅ Yuzuki 端點已設定（http://100.89.92.46:3067）
- ✅ Carson workspace 存在（~/.openclaw/workspace-carson/）

### 基礎建設（2026-03-06 完成）

- ✅ 播報員 Bot 架構（一個大腦，兩張嘴）
- ✅ LaunchAgent 排程系統（6 個定時任務）
- ✅ Cron jobs 全部改用 Haiku（不搶 Sonnet 額度）
- ✅ `/ai` 協作文件系統（maps, rules, specs, tasks, reports）

---

## 下一步（待開發）

### Phase 1: 打通 AI 真實回應 ← 現在

- [ ] `/api/meeting/send` 改成真正呼叫 `ai-endpoints.ts` 的 `callAI()`
- [ ] 測試 Yuzuki 能從 ERP 會議室收到訊息並回覆
- [ ] `/meeting` 加入側邊選單（一般 UI 入口）
- [ ] `/game` 像素辦公室加會議室物件 → 點擊開啟 `/meeting`（Game UI 入口）

### 路由策略（William 確認 2026-03-06）

- **兩個入口、同一個功能**
- 一般 UI：側邊選單 → `/meeting`
- Game UI：像素辦公室 → 點會議室物件 → `/meeting`
- 會議室本體只有一份 code，不用維護兩套

### Phase 2: AI 機器人管理 UI

- [ ] `/settings/ai-bots` 頁面
- [ ] 對話式建立虛擬 AI
- [ ] 即時顯示 AI 在線狀態（Supabase Presence）

### Phase 3: 會議排程 + 自動開會

- [ ] 會議室排程功能
- [ ] AI 定時自動開會（Cron 觸發）
- [ ] 會議記錄存 DB

### Phase 4: 多 AI 協作

- [ ] Carson AI 上線
- [ ] 虛擬 AI spawn 機制
- [ ] 多 AI 同時討論

---

## 還沒決定

- [ ] Carson AI 是否獨立 OpenClaw instance？還是共用？
- [ ] 對話式建立用偽對話（多步驟表單）還是真對話？
- [ ] 會議記錄用獨立 DB 表還是現有 rich-document？

## 原始設計文檔

已整合自 memory/ 的 6 個檔案（共 58KB），原檔在 `memory/archive/ai-meeting/`
