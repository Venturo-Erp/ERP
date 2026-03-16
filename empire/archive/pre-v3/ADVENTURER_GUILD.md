# 🏛️ 冒險者工會 — OpenMOSS 任務系統

**建立日期**：2026-03-15  
**遊戲化名稱**：冒險者工會  
**技術名稱**：OpenMOSS（Multi-Agent Task System）

---

## 🎮 遊戲化概念

```
William（創世神）
    ↓ 下達神諭
William AI（大祭司）
    ↓ 發布任務到冒險者工會
冒險者工會（OpenMOSS）
    ↓ 派遣冒險者（AI Agents）
    ├─ Matthew 🔧（戰士）— 技術任務
    ├─ Caesar 🏛️（策士）— 產品任務
    ├─ Leon 📋（商人）— 營運任務
    └─ 其他 14 位冒險者
    ↓ 完成任務
回報給大祭司
    ↓ 整理戰利品
報告給創世神
```

---

## 🏗️ 系統架構

### 位置

- **Planner Skill**：`~/.openclaw/skills/openmoss-planner/`（大祭司專用）
- **Executor Skill**：`~/.openclaw/skills/openmoss-executor/`（冒險者專用）
- **API Server**：`http://localhost:6565`
- **工作目錄**：`~/.openclaw/openmoss-workspace/`

### API Key

```
ak_41978e84caccebb712db81a1bbf612e9
```

---

## 📋 William AI（大祭司）的職責

### 1. 接收神諭（William 的指令）

**範例**：
```
William: "研究小紅書競品，找出可借鑒的報價方式"
```

### 2. 拆解任務

**分析**：
- 技術部分：需要抓取小紅書內容
- 分析部分：需要競品分析
- 實作部分：需要對照 ERP

**拆分**：
- 模塊 1：技術方案
- 模塊 2：內容分析

### 3. 派遣冒險者

**子任務 1** → Matthew 🔧
- 研究工具（you-get/yt-dlp）
- 抓取內容

**子任務 2** → Caesar 🏛️
- 分析競品
- 提出建議

### 4. 監控進度

**查看狀態**：
```bash
cd ~/.openclaw/skills/openmoss-planner
python3 task-cli.py --key ak_41978e84caccebb712db81a1bbf612e9 st list --task-id <task_id>
```

**查看日誌**：
```bash
python3 task-cli.py --key ak_41978e84caccebb712db81a1bbf612e9 log list --days 1
```

### 5. 收尾交付

**當所有子任務完成**：
1. 整理交付物
2. 撰寫總結報告
3. 更新任務狀態為 `completed`
4. 回報給 William

---

## 🎯 冒險者（AI Agents）的工作流程

### Matthew 的一天

**早上醒來**：
```bash
cd ~/.openclaw/skills/openmoss-executor
python3 task-cli.py --key <API_KEY> st mine
```

**看到任務**：
```
✅ 研究小紅書抓取工具
狀態：assigned
交付物：工具選擇報告 + 安裝文檔 + 測試結果
```

**開始執行**：
```bash
python3 task-cli.py --key <API_KEY> st start <sub_task_id>
```

**執行過程**：
1. 研究 you-get 工具
2. 測試安裝
3. 寫文檔
4. 寫日誌記錄進度

**提交成果**：
```bash
python3 task-cli.py --key <API_KEY> st submit <sub_task_id>
```

**等待審查** → 審查通過 → 任務完成 ✅

---

## 📊 任務狀態流程

### 父任務（Task）

```
planning → active → in_progress → completed
              ↓
          cancelled
```

### 子任務（SubTask）

```
pending → assigned → in_progress → review → done ✅
             ↑            ↓
             └── rework ──┘
             
assigned → blocked → assigned（重新分配）
```

---

## 🎯 快速開始指南

### 創建任務（William AI 執行）

```bash
cd ~/.openclaw/skills/openmoss-planner

# 1. 創建任務
python3 task-cli.py --key ak_41978e84caccebb712db81a1bbf612e9 \
  task create "任務名稱" --desc "描述" --type once

# 2. 創建模塊
python3 task-cli.py --key ak_41978e84caccebb712db81a1bbf612e9 \
  module create <task_id> "模塊名稱" --desc "描述"

# 3. 創建子任務並分配
python3 task-cli.py --key ak_41978e84caccebb712db81a1bbf612e9 \
  st create <task_id> "子任務名稱" \
  --deliverable "交付物" \
  --acceptance "驗收標準" \
  --assign matthew

# 4. 啟動任務
python3 task-cli.py --key ak_41978e84caccebb712db81a1bbf612e9 \
  task status <task_id> active

# 5. 記錄日誌
python3 task-cli.py --key ak_41978e84caccebb712db81a1bbf612e9 \
  log create "plan" "創建任務，分配給 xxx"
```

---

## 🏆 冒險者積分系統

### 評分標準

| 分數 | 含義 | 積分影響 |
|------|------|----------|
| 5 | 超出預期 | +5 |
| 4 | 完全達標 | +5 |
| 3 | 基本達標 | 無變化 |
| 2 | 部分不足 | -5 |
| 1 | 嚴重不足 | -5 |

### 查看排行榜

```bash
python3 task-cli.py --key <API_KEY> score leaderboard
```

**用途**：
- 分配任務時參考
- 高分冒險者優先分配
- 激勵機制

---

## 📚 遊戲化術語對照

| 遊戲術語 | 技術術語 | 說明 |
|---------|---------|------|
| 創世神 | William Chien | 下達指令的人 |
| 大祭司 | William AI | 中樞神經、任務調度者 |
| 冒險者工會 | OpenMOSS | 任務管理系統 |
| 冒險者 | AI Agents | 執行任務的 agents |
| 任務發布 | task create | 創建任務 |
| 派遣冒險者 | st create --assign | 分配子任務 |
| 任務日誌 | log create | 記錄工作過程 |
| 戰利品 | deliverable | 交付物 |
| 收尾 | task completed | 任務完成 |
| 冒險者等級 | score | 積分 |

---

## 🎯 設計哲學

### 為什麼叫「冒險者工會」？

**靈感來源**：《為美好的世界獻上祝福》、《盾之勇者成名錄》

**核心概念**：
1. **創世神下神諭**：William 給指令
2. **大祭司發布任務**：William AI 拆解並派遣
3. **冒險者領取任務**：各 AI Agent 執行
4. **工會記錄功績**：積分系統
5. **大祭司匯報戰果**：整理報告給 William

### 為什麼不直接用 sessions_spawn？

**sessions_spawn 的限制**：
- 只能派遣，無法追蹤進度
- 沒有任務狀態管理
- 沒有交付物驗收
- 沒有積分系統

**OpenMOSS 的優勢**：
- ✅ 完整的任務生命週期
- ✅ 子任務狀態追蹤
- ✅ 交付物驗收機制
- ✅ 審查與返工流程
- ✅ 積分激勵系統
- ✅ 工作日誌記錄

---

## 📖 相關文檔

- **Planner Skill**：`~/.openclaw/skills/openmoss-planner/SKILL.md`
- **Executor Skill**：`~/.openclaw/skills/openmoss-executor/SKILL.md`
- **KNOWLEDGE_INDEX.md**：`~/.openclaw/workspace-william/KNOWLEDGE_INDEX.md`（第 62-66 行）

---

## 🚀 實戰案例

### 案例：小紅書競品分析（2026-03-15）

**William 下令**：
```
研究小紅書連結的旅行社報價方式，找出可借鑒的創新點
```

**William AI 執行**：
1. 創建任務：「小紅書競品分析」
2. 拆分模塊：
   - 技術方案：抓取小紅書內容
   - 內容分析：競品報價方式研究
3. 派遣冒險者：
   - Matthew（2 個子任務）：研究工具 + 抓取內容
   - Caesar（1 個子任務）：分析競品
4. 啟動任務：狀態改為 active
5. 記錄日誌：plan 類型

**任務 ID**：`c74d4653-4980-4f23-899f-d7a639a5ee44`

**結果**：團隊開始執行，William AI 監控進度

---

**建立時間**：2026-03-15 10:38 AM  
**維護者**：William 🔱  
**狀態**：✅ 運行中
