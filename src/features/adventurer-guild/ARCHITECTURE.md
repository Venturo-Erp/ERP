# 冒險者公會任務系統 - 架構文檔

**建立日期**：2026-03-18  
**版本**：v1.0  
**維護者**：William AI 🔱

---

## 🎯 系統定位

**冒險者公會任務系統** = Venturo 帝國的中央任務調度與監控中心

**核心理念**：

- William = 公會會長（發布任務）
- Agents = 冒險者（執行任務）
- 系統 = 公會任務板 + 智能調度

---

## 🏗️ 三層魔法架構

### Layer 1: 我們的創意層 ⭐

**這是我們獨創的部分**（不依賴開源）

#### 功能模塊

**1. Telegram 智能派遣**

- 位置：`src/app/api/tasks/create/route.ts`
- 功能：解析 Telegram 訊息 → 自動創建任務 → 通知 agents
- 創新點：自然語言理解 + 自動分配

**2. 任務監控系統**

- 位置：`hooks/useTaskMonitor.ts`（待建立）
- 功能：
  - 檢測卡住（超過 N 分鐘沒更新）
  - Token 使用量監控
  - Agent 健康狀態
- 創新點：實時告警 + 自動干預

**3. 智能結案系統**

- 位置：`services/smartComplete.ts`（待建立）
- 功能：
  - 提取關鍵記憶（3-5 條）
  - 存入記憶烏托邦
  - 錯誤教訓記錄
  - Session 清理
- 創新點：自動學習 + 記憶管理

**4. 錯誤學習系統**

- 位置：`services/errorLearning.ts`（待建立）
- 功能：
  - 記錄每個任務的錯誤
  - 分析重複錯誤
  - 下次分配任務時提醒
- 創新點：持續學習 + 避免重複錯誤

**5. SubAgent 執行樹**

- 位置：`components/ExecutionTree.tsx`（待建立）
- 功能：
  - 顯示任務 → subagent 的完整樹狀結構
  - 追蹤每層的執行狀態
- 創新點：多層調度可視化

---

### Layer 2: 底層魔法 1 - 數據可視化 🔮

**來源**：[Plane](https://github.com/makeplane/plane)  
**版本**：參考時間 2026-03-18  
**License**：AGPL-3.0

#### 使用的部分

**1. 拖拽系統**

- 套件：`@hello-pangea/dnd@^17.0.0`
- 文件：`components/TaskBoardWithTabs.tsx`
- 用途：任務在 P0/P1/P2 之間拖拽
- 參考：Plane 的 `web/components/issues/issue-layouts/kanban/`

**2. 看板佈局**

- 文件：`components/TaskBoardWithTabs.tsx`
- 用途：三列看板（P0/P1/P2）
- 參考：Plane 的看板架構

**3. 優先級系統**

- 類型：P0/P1/P2
- 參考：Plane 的 priority 系統

#### 如何更新

**步驟**：

1. 訪問 Plane GitHub：https://github.com/makeplane/plane
2. 檢查 `@hello-pangea/dnd` 版本更新
3. 查看 Plane 的看板佈局變化
4. **只更新 Layer 2 的代碼**
5. 確保不影響 Layer 1 的創意功能

**更新頻率**：每季度檢查一次

---

### Layer 3: 底層魔法 2 - 追蹤魔法 🔮

**來源**：venturo-online (我們的 3001 項目)  
**版本**：2026-02-23 版本  
**位置**：`~/Projects/venturo-online/src/app/orders/page.tsx`

#### 使用的部分

**1. 卡片式設計**

- 文件：`components/TaskCardV2.tsx`
- 用途：任務卡片 UI
- 參考：venturo-online 的旅遊卡片設計

**2. 狀態監控 UI**

- 概念：顯示「出團中」、「N天後」等狀態
- 用途：任務狀態標籤
- 參考：venturo-online 的狀態標籤

**3. 進度追蹤 UI**

- 概念：進度條 + 時間倒數
- 用途：任務進度顯示
- 參考：venturo-online 的時間顯示邏輯

#### 如何更新

**步驟**：

1. 檢查 venturo-online 的設計更新
2. 提取新的 UI 模式
3. **只更新 Layer 3 的代碼**
4. 保持與 venturo 設計一致

**更新頻率**：跟隨 venturo-online 更新

---

## 📦 依賴套件清單

### 核心依賴

| 套件                    | 版本    | 來源  | 用途     |
| ----------------------- | ------- | ----- | -------- |
| `@hello-pangea/dnd`     | ^17.0.0 | Plane | 拖拽功能 |
| `framer-motion`         | ^11.0.0 | 通用  | 動畫效果 |
| `@supabase/supabase-js` | ^2.39.0 | 通用  | 資料庫   |

### 更新策略

**1. @hello-pangea/dnd**

- 更新頻率：每季度
- 檢查方式：`npm outdated @hello-pangea/dnd`
- 測試重點：拖拽功能是否正常

**2. framer-motion**

- 更新頻率：每半年
- 檢查方式：`npm outdated framer-motion`
- 測試重點：動畫是否正常

**3. @supabase/supabase-js**

- 更新頻率：跟隨 Supabase 更新
- 檢查方式：Supabase 官方公告
- 測試重點：Realtime 是否正常

---

## 🔄 升級流程

### 底層魔法升級（不影響創意層）

**場景**：Plane 更新了拖拽邏輯

**步驟**：

1. 檢查 Plane 的 CHANGELOG
2. 確認影響範圍（只在 Layer 2）
3. 更新 `TaskBoardWithTabs.tsx`
4. 測試拖拽功能
5. **不修改 Layer 1 的代碼**

**測試清單**：

- [ ] 拖拽 P0 → P1 正常
- [ ] 拖拽 P1 → P2 正常
- [ ] Telegram 派遣正常（Layer 1）
- [ ] 智能結案正常（Layer 1）

---

### 創意層升級（獨立於底層）

**場景**：新增「錯誤學習」功能

**步驟**：

1. 新增 `services/errorLearning.ts`
2. 修改 `components/TaskCard` 加結案按鈕
3. **不修改 Layer 2/3 的代碼**
4. 測試新功能

**測試清單**：

- [ ] 結案時提取錯誤
- [ ] 錯誤存入資料庫
- [ ] 下次分配時提醒
- [ ] 拖拽功能不受影響（Layer 2）
- [ ] 卡片樣式不受影響（Layer 3）

---

## 📊 數據庫架構

### 核心表：tasks

```sql
CREATE TABLE tasks (
  -- 基礎欄位
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,

  -- 優先級與狀態（來自 Plane 概念）
  priority TEXT CHECK (priority IN ('P0', 'P1', 'P2')),
  status TEXT CHECK (status IN ('todo', 'in_progress', 'completed')),

  -- 任務類型（我們的創新）
  task_type TEXT CHECK (task_type IN ('individual', 'workflow')),
  workflow_template TEXT,

  -- 執行追蹤（我們的創新）
  parent_task_id UUID REFERENCES tasks(id),
  execution_tree JSONB,
  last_update_at TIMESTAMPTZ,
  is_stuck BOOLEAN DEFAULT false,

  -- 控制功能（我們的創新）
  paused BOOLEAN DEFAULT false,
  pause_reason TEXT,

  -- 學習系統（我們的創新）
  error_logs JSONB DEFAULT '[]',
  lessons JSONB DEFAULT '[]',

  -- 其他欄位
  assignees JSONB DEFAULT '[]',
  progress INTEGER DEFAULT 0,
  attachments JSONB DEFAULT '[]',
  tour_code TEXT,
  is_legacy BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_by TEXT NOT NULL
);
```

**欄位來源標記**：

- ✅ **我們創新**：task_type, execution_tree, is_stuck, paused, error_logs, lessons
- 🔮 **參考 Plane**：priority, status
- 🔮 **參考 venturo**：attachments (類似旅遊附件)

---

## 🎨 UI 組件架構

### 組件樹

```
TaskBoardWithTabs (創意 + Plane)
├── Tab 切換 (創意)
│   ├── 獨立任務
│   └── 工作流任務
├── 監控面板 (創意)
│   ├── Agent Token 統計
│   └── 卡住任務列表
└── 看板區域 (Plane)
    ├── P0 列 (Plane)
    │   └── TaskCard (venturo 風格)
    ├── P1 列 (Plane)
    │   └── TaskCard (venturo 風格)
    └── P2 列 (Plane)
        └── TaskCard (venturo 風格)
```

**組件來源**：

- `TaskBoardWithTabs` — 創意（分頁） + Plane（拖拽）
- `TaskCard` — venturo 風格
- `CreateTaskModal` — Plane 概念 + venturo 風格
- `MonitorPanel` — 創意
- `ExecutionTree` — 創意

---

## 🚀 未來擴展計劃

### Phase 1（已完成）

- [x] 基礎看板（Plane）
- [x] 拖拽排序（Plane）
- [x] 卡片樣式（venturo）
- [x] 分頁系統（創意）

### Phase 2（進行中，40分鐘內）

- [ ] 監控面板（創意）
- [ ] 智能結案（創意）
- [ ] Token 統計（創意）
- [ ] 卡住檢測（創意）

### Phase 3（未來）

- [ ] 錯誤學習系統
- [ ] SubAgent 執行樹
- [ ] 語音派遣（Telegram 語音 → 任務）
- [ ] AI 任務推薦（預測下一個要做什麼）

---

## 📚 參考文件

### 開源項目

**Plane**：

- GitHub: https://github.com/makeplane/plane
- Docs: https://plane.so/docs
- 我們參考的版本：2026-03-18 snapshot

**venturo-online**：

- 位置：`~/Projects/venturo-online`
- 我們參考的版本：2026-02-23

### 內部文件

- 需求文檔：`docs/specs/SPEC-003-task-workflow-system.md`
- 開發日誌：`memory/2026-03-18.md`
- 使用指南：（待建立）

---

## 🔧 維護指南

### 每季度檢查

1. **檢查 Plane 更新**

   ```bash
   # 訪問 GitHub
   open https://github.com/makeplane/plane/releases

   # 檢查 @hello-pangea/dnd 更新
   npm outdated @hello-pangea/dnd
   ```

2. **檢查 venturo-online 更新**

   ```bash
   cd ~/Projects/venturo-online
   git log --since="3 months ago" -- src/app/orders/
   ```

3. **更新依賴**

   ```bash
   npm update @hello-pangea/dnd framer-motion
   ```

4. **測試所有功能**
   - 拖拽
   - 監控
   - 結案
   - Telegram 派遣

### 故障排除

**如果拖拽不工作**：

1. 檢查 `@hello-pangea/dnd` 版本
2. 查看 Plane 的更新日誌
3. 只修改 Layer 2 的代碼

**如果監控不工作**：

1. 檢查 Layer 1 的代碼
2. 不受底層魔法影響
3. 獨立修復

---

## ✅ 架構原則

### 黃金法則

1. **Layer 1（創意）不依賴具體實現**
   - 可以替換底層魔法
   - 不綁定特定套件

2. **Layer 2/3（底層）可獨立更新**
   - 不影響創意功能
   - 保持接口穩定

3. **清楚標記來源**
   - 每個文件註明來源
   - 方便未來維護

4. **持續優化**
   - 定期更新底層
   - 不斷創新上層

---

**建立時間**：2026-03-18 08:21  
**下次更新**：2026-06-18（季度檢查）  
**維護者**：William AI 🔱
