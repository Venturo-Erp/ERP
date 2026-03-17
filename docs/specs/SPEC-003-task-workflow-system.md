# SPEC-003: 任務看板 + 工作流系統

**建立日期**：2026-03-18 04:43  
**發起人**：William 🔱  
**優先級**：P1  
**預計時間**：13 天（2026-03-31 完成）

---

## 🎯 目標

建立整合的任務管理與工作流系統，讓 William 可以：
1. 可視化看到所有任務狀態
2. 拖曳調整優先級
3. 快速發任務
4. 一鍵發起工作流（自動流轉）
5. 結案自動歸檔記憶

---

## 核心功能

### 1. 任務看板（可視化）

**UI 要求**：
- ✨ 好看的界面（Tailwind + 漸層色）
- 🎯 拖曳排序（React DnD）
- 📊 進度條（可手動調整）
- 👥 多人協作（顯示負責人頭像）

**功能**：
- 快速發任務（彈出表單）
- 調整支援（加人/換人）
- 整合任務（合併相關任務）
- 更新進度（拖動或輸入百分比）
- 結案歸檔（自動記憶整理）

---

### 2. 工作流引擎（自動化）

**基於**：n8n

**功能**：
- 預設流程範本（數字人開發、活動企劃、功能開發）
- 自動流轉（完成 Step 1 → 自動通知 Step 2 負責人）
- 進度追蹤（顯示當前在哪一步）
- 中途調整（加人、暫停、恢復）

**整合點**：
- 任務看板 → 一鍵發起工作流
- n8n 執行 → 狀態回傳任務看板
- Telegram 通知每一步負責人

---

### 3. 結案歸檔（記憶整理）

**觸發**：點任務卡片的 [結案] 按鈕

**執行**：
1. 提取任務相關記憶（3-5 條）
2. 存入記憶烏托邦（citizen-memory.py）
3. 清理 session 不相關對話
4. 記錄教訓到 LESSONS.md
5. 更新任務狀態 → 已完成
6. 移到歷史區

**通知**：
```
✅ 任務已結案
📝 3 條記憶已歸檔
🧹 Session 已清理
📊 統計已更新
```

---

## 工作流範本

### 範本 1：數字人開發

```
流程:
  1. 技術討論 (Matthew + Nova, 1天)
  2. 行銷腳本 (Nova, 2天)
  3. 腳本審查 (William/DONKI, 1天)
  4. 生成圖片 (IG, 1天)
  5. 廣告排程 (廣告經理, 1天)

總時長: 5-7天
```

### 範本 2：活動企劃

```
流程:
  1. 活動設計 (Ben + Nova)
  2. 預算審查 (Eddie)
  3. 素材製作 (IG + 短視頻)
  4. 廣告投放 (廣告經理)

總時長: 3-5天
```

### 範本 3：功能開發

```
流程:
  1. 需求設計 (Caesar)
  2. 技術設計 (Matthew)
  3. 前端開發 (前端工程師) [平行]
  4. 後端開發 (Matthew) [平行]
  5. 代碼審查 (代碼審查員)
  6. 安全檢查 (安全工程師)
  7. 部署 (Matthew)

總時長: 3-10天
```

---

## 技術架構

### 前端
- Next.js 14
- React DnD（拖曳）
- Tailwind CSS（樣式）
- Supabase Realtime（即時更新）

### 後端
- Supabase（資料庫）
- n8n（工作流引擎）
- OpenClaw API（記憶整理）

### 整合
- 任務看板 ←→ n8n webhooks
- n8n ←→ Telegram Bot
- 結案歸檔 ←→ 記憶烏托邦

---

## 資料庫設計

### tasks 表
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK (priority IN ('P0', 'P1', 'P2')),
  status TEXT CHECK (status IN ('todo', 'in_progress', 'completed', 'archived')),
  assignees JSONB DEFAULT '[]', -- ['matthew', 'nova']
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  workflow_id TEXT, -- n8n execution ID
  workflow_template TEXT, -- 'digital_human', 'event_planning', etc.
  session_id TEXT, -- OpenClaw session
  memories JSONB DEFAULT '[]', -- 結案時提取的記憶
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by TEXT NOT NULL
);

CREATE INDEX idx_tasks_workspace ON tasks(workspace_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
```

### workflow_steps 表
```sql
CREATE TABLE workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  assignees JSONB NOT NULL,
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  output JSONB, -- 該步驟的產出
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflow_steps_task ON workflow_steps(task_id);
```

---

## 開發階段

### Phase 1: n8n 基礎（3 天）

**負責人**：Matthew 🔧

**任務**：
1. 安裝 n8n（Docker 或 npm）
2. 設定 Telegram Bot 整合
3. 建立第一個工作流：數字人開發
4. 測試自動通知

**產出**：
- n8n 運行中
- 數字人開發流程可用
- Telegram 通知正常

**驗收標準**：
- William 發起流程 → Matthew 收到通知
- Matthew 完成 → Nova 收到通知
- 全流程走完 → 通知 William

---

### Phase 2: 任務看板基礎（5 天）

**負責人**：前端工程師 🖥️ + Matthew 🔧

**任務**：
1. 設計 UI（參考 Linear/ClickUp）
2. 實作任務列表（P0/P1/P2 分類）
3. 實作拖曳排序（React DnD）
4. 快速發任務（彈出表單）
5. 進度更新（拖動條或輸入）

**產出**：
- `/tasks` 頁面
- 基礎任務管理功能

**驗收標準**：
- 可以建立任務
- 可以拖曳調整優先級
- 可以更新進度
- 即時更新（Supabase Realtime）

---

### Phase 3: 工作流整合（3 天）

**負責人**：Matthew 🔧

**任務**：
1. n8n webhooks 設定
2. 任務看板呼叫 n8n API
3. n8n 執行結果回傳看板
4. 顯示工作流進度

**產出**：
- 任務看板 ←→ n8n 整合完成
- 一鍵發起工作流

**驗收標準**：
- 點「發起數字人開發」→ n8n 開始執行
- n8n 每步完成 → 看板更新進度
- 全流程走完 → 任務自動結案

---

### Phase 4: 結案歸檔（2 天）

**負責人**：Matthew 🔧

**任務**：
1. 實作記憶提取邏輯（呼叫 OpenClaw API）
2. 整合記憶烏托邦（citizen-memory.py）
3. Session 清理（刪除不相關對話）
4. 記錄教訓（LESSONS.md）

**產出**：
- 結案歸檔功能完整

**驗收標準**：
- 點「結案」→ 3-5 條記憶提取
- 記憶存入烏托邦
- Session 清理完成
- 通知 William

---

## 時程總覽

| 階段 | 時間 | 開始日期 | 完成日期 | 負責人 |
|------|------|---------|---------|--------|
| Phase 1: n8n 基礎 | 3 天 | 2026-03-18 | 2026-03-20 | Matthew |
| Phase 2: 任務看板 | 5 天 | 2026-03-21 | 2026-03-25 | 前端 + Matthew |
| Phase 3: 工作流整合 | 3 天 | 2026-03-26 | 2026-03-28 | Matthew |
| Phase 4: 結案歸檔 | 2 天 | 2026-03-29 | 2026-03-31 | Matthew |
| **總計** | **13 天** | | **2026-03-31** | |

---

## 成功標準

### 功能完整性
- ✅ 任務看板基礎功能（建立、拖曳、更新）
- ✅ n8n 工作流（3 個範本）
- ✅ 工作流整合（一鍵發起）
- ✅ 結案歸檔（記憶整理）

### 使用者體驗
- ✅ 介面好看（Tailwind + 漸層）
- ✅ 拖曳流暢（60fps）
- ✅ 即時更新（<1 秒）
- ✅ 通知及時（Telegram）

### 效率提升
- ✅ William 每天只需 10-15 分鐘管理任務
- ✅ 90% 的流程自動化
- ✅ 記憶自動歸檔（不浪費 token）

---

## 風險與應對

### 風險 1：n8n 學習曲線
**應對**：Matthew 先看官方文件 + 範例，1 天熟悉

### 風險 2：拖曳效能問題
**應對**：用 React DnD（業界標準），效能有保證

### 風險 3：記憶提取不準確
**應對**：用 Claude 提取，準確度高；可手動調整

---

## 後續優化（Phase 5+）

### 1. AI 自動排程
- AI 預測任務時長
- 自動安排最佳執行順序

### 2. 語音輸入
- William 語音發任務
- AI 自動解析並分配

### 3. 移動端優化
- 手機也能拖曳
- Telegram Mini App 整合

---

**建立時間**：2026-03-18 04:43  
**最後更新**：2026-03-18 04:43  
**狀態**：待審查
