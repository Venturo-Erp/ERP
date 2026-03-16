# 🔮 Venturo 帝國記憶雙魔法

**claude-mem + OpenViking = 完整記憶管理系統**

---

## 📖 兩大魔法

### 🔮 魔法一：claude-mem
**單個 Agent 的極致漸進式外腦**

**作者**：WhenMoon-afk  
**GitHub**：https://github.com/WhenMoon-afk/claude-memory-mcp  
**類型**：MCP Server  
**授權**：MIT

**核心能力**：
- ✅ 本地持久記憶（SQLite + FTS5）
- ✅ 跨 session 保留 context
- ✅ 自動摘要和實體提取
- ✅ Token budgeting（context 感知）
- ✅ 混合相關性評分（時間 + 重要性 + 頻率）

**優勢**：
- 完全本地（不需要外部 API）
- 輕量（不需要向量 embedding）
- 快速（原生 SQLite）
- 零成本

**三個工具**：
```
memory_store   — 儲存記憶（自動摘要和實體提取）
memory_recall  — 搜尋記憶（Token 感知載入）
memory_forget  — 軟刪除記憶（保留稽核軌跡）
```

---

### 🏰 魔法二：OpenViking
**一群 Agent 的協同系統**

**作者**：Volcengine（字節跳動/火山引擎）  
**GitHub**：https://github.com/volcengine/OpenViking  
**類型**：Context Database  
**授權**：Apache 2.0

**核心能力**：
- ✅ 檔案系統範式（viking:// URI）
- ✅ 三層架構（L0/L1/L2）
- ✅ 目錄遞迴檢索
- ✅ 可視化軌跡
- ✅ 自動 Session 管理

**優勢**：
- 統一管理 memories/resources/skills
- 節省 60-98% token
- 任務完成率 +43%
- 完全可追蹤

**架構**：
```
viking://
├── resources/          # 帝國文檔
├── user/               # William 的偏好
└── agent/              # 17 位公民的技能和記憶
```

---

## 🎯 雙魔法的分工

### claude-mem（單兵作戰）
**適合**：
- 單個 Agent 的日常工作記憶
- 對話歷史和 context 保留
- 快速回憶（「上次討論了什麼？」）
- 個人學習和經驗累積

**範例**：
```
Matthew 🔧 今天修了一個 Bug
  ↓
memory_store — 儲存「修 Bug 的步驟」
  ↓
明天遇到類似問題
  ↓
memory_recall — 回憶「上次怎麼修的」
```

**資料位置**：`~/.memory-mcp/memory.db`（每個 Agent 獨立）

---

### OpenViking（團隊協作）
**適合**：
- 跨 Agent 的知識共享
- 帝國文檔管理
- 長期知識累積
- 結構化資源組織

**範例**：
```
William 🔱 建立帝國文檔（empire/*.md）
  ↓
OpenViking 儲存到 viking://resources/empire/
  ↓
所有 17 位 Agent 都能查詢
  ↓
Matthew/Leon/Ben 各自閱讀需要的部分
```

**資料位置**：`/Users/tokichin/.openclaw/openviking_workspace`（所有 Agent 共享）

---

## 🏗️ 完整架構

```
┌─────────────────────────────────────────────────────────┐
│                    William 🔱                            │
│                 （帝國創始人）                            │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ↓                 ↓                 ↓
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ Matthew 🔧    │ │ Leon 📋       │ │ Ben 🤝        │
│ (IT Lead)     │ │ (營運總監)     │ │ (業務開發)     │
└───────────────┘ └───────────────┘ └───────────────┘
        │                 │                 │
        ↓                 ↓                 ↓
┌───────────────────────────────────────────────────────┐
│            claude-mem（個人記憶）                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐     │
│  │ matthew.db  │ │ leon.db     │ │ ben.db      │     │
│  │ - 修 Bug    │ │ - 供應商    │ │ - 客戶溝通   │     │
│  │ - 部署經驗  │ │ - 流程優化  │ │ - 業績追蹤   │     │
│  └─────────────┘ └─────────────┘ └─────────────┘     │
└───────────────────────────────────────────────────────┘
                          │
                          ↓
┌───────────────────────────────────────────────────────┐
│         OpenViking（團隊共享知識）                     │
│  viking://                                            │
│  ├── resources/empire/     # 帝國文檔                 │
│  ├── user/william/         # William 偏好             │
│  └── agent/                # 17 位公民                │
│      ├── matthew/memories/ # Matthew 的長期經驗       │
│      ├── leon/memories/    # Leon 的營運知識          │
│      └── ben/memories/     # Ben 的業務技巧           │
└───────────────────────────────────────────────────────┘
```

---

## 🔄 記憶流動

### 日常工作（claude-mem）

```
1. Matthew 收到任務：「修改報價單功能」
   ↓
2. memory_recall — 回憶「上次改報價單的經驗」
   ↓
3. 執行任務（開發、測試、部署）
   ↓
4. memory_store — 儲存「這次遇到的坑和解決方法」
   ↓
5. 下次遇到類似問題 → 立刻回憶
```

### 知識提煉（每晚 → OpenViking）

```
1. 每晚 23:00（自動觸發）
   ↓
2. William AI 巡邏所有 Agent 的 claude-mem
   ↓
3. 提取「重要經驗」和「決策」
   ↓
4. 儲存到 OpenViking（viking://agent/{agent_name}/memories/）
   ↓
5. 團隊共享知識累積
```

### 團隊協作（OpenViking）

```
1. William 定義新需求
   ↓
2. 儲存到 OpenViking（viking://resources/requirements/）
   ↓
3. Caesar 閱讀需求 → 規劃功能
   ↓
4. Matthew 閱讀規劃 → 開發功能
   ↓
5. Leon 閱讀文檔 → 使用功能
   ↓
6. 所有人共享同一份真相來源
```

---

## 🚀 整合計畫

### Phase 1：部署 claude-mem（30 分鐘）

#### Step 1：安裝（所有 Agent workspace）

```bash
# 方法 A：全域安裝（推薦）
npm install -g @whenmoon-afk/memory-mcp

# 找到路徑
npm root -g
# 例如：/opt/homebrew/lib/node_modules
```

#### Step 2：設定 Claude Desktop

**macOS 設定檔**：`~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "memory": {
      "command": "node",
      "args": ["/opt/homebrew/lib/node_modules/@whenmoon-afk/memory-mcp/dist/index.js"],
      "env": {
        "MEMORY_DB_PATH": "~/.memory-mcp/william.db"
      }
    }
  }
}
```

**為每個 Agent 建立獨立 DB**：
```bash
# William workspace
MEMORY_DB_PATH: ~/.memory-mcp/william.db

# Matthew workspace
MEMORY_DB_PATH: ~/.memory-mcp/matthew.db

# Leon workspace
MEMORY_DB_PATH: ~/.memory-mcp/leon.db

# ... 其他 15 位
```

#### Step 3：測試

```bash
# 重啟 Claude Desktop

# 測試儲存
memory_store("測試記憶：今天學會了 claude-mem")

# 測試回憶
memory_recall("claude-mem")
```

---

### Phase 2：部署 OpenViking（4 小時）

**詳細步驟**：見 `OPENVIKING_INTEGRATION.md`

---

### Phase 3：建立自動記憶提煉機制（2 小時）

#### 方案 A：每晚自動提煉（推薦）

**建立 Cron Job**：

```bash
# 每晚 23:00 執行
openclaw cron add \
  --name "memory-distill" \
  --schedule "0 23 * * *" \
  --command "william memory-distill-all-agents"
```

**記憶提煉腳本**：`scripts/memory-distill.sh`

```bash
#!/bin/bash
# 提煉所有 Agent 的記憶

AGENTS=("matthew" "leon" "ben" "eddie" "caesar" "frontend" "ui-designer" "ig-curator" "paid-social" "douyin")

for agent in "${AGENTS[@]}"; do
  echo "提煉 $agent 的記憶..."
  
  # 1. 從 claude-mem 讀取今天的記憶
  memories=$(claude-mem-export --agent $agent --since "1 day ago")
  
  # 2. 用 Claude 提取重要經驗和決策
  important=$(echo "$memories" | claude analyze --prompt "提取重要的經驗和決策")
  
  # 3. 儲存到 OpenViking
  ov add-memory \
    --type agent \
    --agent $agent \
    --category "experience" \
    --content "$important"
done

echo "記憶提煉完成！"
```

#### 方案 B：Agent 任務結束時自動提煉

**在每個 Agent 的 AGENTS.md 加入**：

```markdown
## 任務結束流程

1. 完成任務
2. memory_store — 儲存工作記憶到 claude-mem
3. **自動觸發**：提取重要經驗 → OpenViking
4. 回報 William
```

**觸發機制**：OpenViking 的 Session 管理功能（自動）

---

## 📊 使用場景

### 場景 1：Matthew 修 Bug

**Day 1（claude-mem）**：
```
1. 收到任務：「ERP 報價單功能有 Bug」
2. memory_recall("報價單 Bug") — 回憶上次經驗
3. 修 Bug（花 2 小時）
4. memory_store("報價單 Bug 修復步驟：...")
```

**Night 1（自動提煉 → OpenViking）**：
```
1. William AI 巡邏 matthew.db
2. 提取「重要經驗」：「報價單 Bug 根因是...」
3. 儲存到 viking://agent/matthew/memories/bug-fixes/
4. 團隊共享知識
```

**Day 2（團隊受益）**：
```
1. 前端工程師遇到類似 Bug
2. 查詢 OpenViking：「報價單 Bug」
3. 找到 Matthew 的經驗
4. 快速解決，省 2 小時
```

---

### 場景 2：Leon 優化流程

**Week 1（claude-mem）**：
```
1. Leon 每天處理供應商問題
2. memory_store("供應商 A 付款慢，要提前催")
3. memory_store("供應商 B 報價常有誤，要檢查")
4. ... 累積 20 條記憶
```

**Weekend（自動提煉 → OpenViking）**：
```
1. William AI 提煉 leon.db
2. 歸納「供應商管理最佳實踐」
3. 儲存到 viking://agent/leon/memories/best-practices/
4. 團隊共享
```

**Week 2（新人受益）**：
```
1. 新的營運 Agent 加入
2. 閱讀 viking://agent/leon/memories/
3. 立刻學會 Leon 累積的經驗
4. 避免重複犯錯
```

---

### 場景 3：William 決策

**Before（問題）**：
```
William: 「我們上次為什麼選擇 Supabase？」
William AI: 「讓我搜尋一下...」
（花 5 分鐘翻 MEMORY.md）
```

**After（解決）**：
```
William: 「我們上次為什麼選擇 Supabase？」
William AI: memory_recall("Supabase 決策")
（1 秒找到）「因為 RLS 功能和 PostgreSQL 相容性。詳見 DECISIONS.md#2025-11-20」
```

---

## 🎯 預期效益

### claude-mem
- **回憶速度**：5 分鐘 → 1 秒
- **記憶持久**：跨 session 保留
- **零成本**：本地 SQLite
- **自動整理**：FTS5 全文檢索

### OpenViking
- **團隊協作**：知識共享
- **Token 節省**：60-98%
- **任務完成率**：+43%
- **可追蹤性**：完全透明

### 雙魔法協同
- **個人記憶** + **團隊知識** = 完整記憶系統
- **短期工作記憶** + **長期經驗累積** = 持續進化
- **快速回憶** + **結構化組織** = 高效決策

---

## 🚧 挑戰和風險

### claude-mem
- 每個 Agent 需要獨立設定
- Claude Desktop 設定檔維護
- 記憶提煉需要自動化

### OpenViking
- 需要 API 費用（Embedding + VLM）
- 系統複雜度提升
- 遷移現有記憶需要時間

### 雙魔法
- 需要明確分工（哪些存 claude-mem，哪些存 OpenViking）
- 自動提煉機制需要測試和優化
- 記憶同步可能有延遲

---

## 🎯 行動計畫

### 立刻做（今天）
- [ ] 決定：要不要整合雙魔法？
- [ ] 如果要：先做哪個？（建議：claude-mem → 簡單，零成本）

### 短期（本週）
- [ ] Phase 1：部署 claude-mem（所有 Agent）
- [ ] 測試 memory_store / memory_recall
- [ ] 觀察效果（1 週）

### 中期（本月）
- [ ] Phase 2：部署 OpenViking
- [ ] 遷移現有記憶（MEMORY.md + mem0）
- [ ] Phase 3：建立自動提煉機制

### 長期（Q2）
- [ ] 優化記憶分工（claude-mem vs OpenViking）
- [ ] 觀察 Token 節省效益
- [ ] 擴展到所有 17 位 Agent

---

## 📖 參考資源

### claude-mem
- **GitHub**：https://github.com/WhenMoon-afk/claude-memory-mcp
- **npm**：https://www.npmjs.com/package/@whenmoon-afk/memory-mcp
- **教學影片**：https://www.youtube.com/watch?v=qeru0ZdudD4

### OpenViking
- **GitHub**：https://github.com/volcengine/OpenViking
- **官網**：https://openviking.ai
- **文檔**：https://www.openviking.ai/docs
- **整合規劃**：`OPENVIKING_INTEGRATION.md`

---

**雙魔法讓帝國記憶永不遺忘。**

**現在，決定從哪裡開始。**
