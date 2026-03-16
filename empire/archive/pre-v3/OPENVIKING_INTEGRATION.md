# 🛡️ OpenViking 整合規劃

**用檔案系統範式管理帝國記憶**

---

## 📖 什麼是 OpenViking？

**OpenViking** 是專為 AI Agents（例如 OpenClaw）設計的開源 Context Database。

- **作者**：Volcengine（字節跳動/火山引擎）
- **GitHub**：https://github.com/volcengine/OpenViking
- **網站**：https://openviking.ai
- **Stars**：10,533+（2026-03-15）
- **授權**：Apache 2.0

---

## 🎯 核心概念

### 1. 檔案系統範式

**用 `viking://` URI 統一管理所有 context**：

```
viking://
├── resources/          # 資源（專案文檔、repo、網頁等）
│   ├── venturo-erp/
│   │   ├── docs/
│   │   │   ├── empire/
│   │   │   └── shops/
│   │   └── src/
│   └── venturo-online/
├── user/               # 使用者（個人偏好、習慣等）
│   └── memories/
│       ├── preferences/
│       │   ├── writing_style
│       │   └── coding_habits
│       └── work_history/
└── agent/              # Agent（技能、指令、任務記憶等）
    ├── skills/
    │   ├── search_code
    │   ├── analyze_data
    │   └── debug_issue
    ├── memories/
    │   ├── decisions/
    │   └── lessons/
    └── instructions/
```

---

### 2. 三層架構（L0/L1/L2）

**按需載入，節省 token**：

- **L0 (Abstract)**：一句話摘要（~100 tokens）— 快速判斷相關性
- **L1 (Overview)**：核心資訊和使用場景（~2k tokens）— Agent 規劃階段決策
- **L2 (Details)**：完整原始資料 — 需要時才深入閱讀

**範例**：
```
viking://resources/venturo-erp/
├── .abstract           # L0：「Venturo ERP 是 B2B 旅行社後台系統」
├── .overview           # L1：核心功能、技術棧、資料流
├── empire/
│   ├── .abstract       # L0：「帝國級文檔，組織架構和設計哲學」
│   ├── .overview       # L1：17 位公民、4 個產品、設計原則
│   ├── GENESIS.md      # L2：完整創世記
│   └── LAWS.md         # L2：完整憲法
└── ...
```

---

### 3. 目錄遞迴檢索

**結合語意搜尋和目錄定位**：

1. **意圖分析** — 產生多個檢索條件
2. **初步定位** — 用向量檢索快速定位高分目錄
3. **精細探索** — 在該目錄內二次檢索
4. **遞迴深入** — 如果有子目錄，遞迴重複
5. **結果聚合** — 回傳最相關的 context

**優勢**：
- 不只找到語意最匹配的片段
- 還理解資訊所在的完整 context
- 提高檢索的全域性和準確性

---

### 4. 可視化軌跡

**檢索過程完全可追蹤**：

```
Query: "如何建立報價單？"

Retrieval Path:
1. viking://resources/venturo-erp/ (score: 0.92)
2. viking://resources/venturo-erp/empire/shops/erp/ (score: 0.95)
3. viking://resources/venturo-erp/empire/shops/erp/QUOTE_REQUEST_FLOW.md (score: 0.98)

Result: Found in QUOTE_REQUEST_FLOW.md, lines 45-120
```

**優勢**：
- 清楚觀察問題根源
- 引導檢索邏輯優化
- 不再是黑盒子

---

### 5. 自動 Session 管理

**記憶自我迭代**：

每次 session 結束：
1. 分析任務執行結果和使用者反饋
2. 自動更新到 User 和 Agent 記憶目錄
3. 提取操作技巧、工具使用經驗
4. Agent 越用越聰明

---

## 📊 性能數據（OpenClaw 整合測試）

**測試資料集**：LoCoMo10 長程對話（1,540 cases）  
**模型**：seed-2.0-code  
**OpenViking 版本**：0.1.18

| 實驗組 | 任務完成率 | Input Tokens |
|--------|-----------|--------------|
| OpenClaw (原生 memory) | 35.65% | 24,611,530 |
| OpenClaw + LanceDB | 44.55% | 51,574,530 |
| **OpenClaw + OpenViking** | **52.08%** | **4,264,396** |
| **OpenClaw + OpenViking (+ memory-core)** | **51.23%** | **2,099,622** |

**結論**：
- **任務完成率提升 43%**（vs 原生）
- **Input tokens 減少 91%**（vs 原生）
- **省錢 + 更準確**

---

## 🎯 為什麼 Venturo 需要 OpenViking？

### 現在的問題

#### 1. 記憶分散
- **MEMORY.md** — 手動維護，容易過時
- **memory/*.md** — 按日期分散，難找到相關記憶
- **mem0 向量庫** — 單純語意搜尋，缺少結構

#### 2. Token 浪費
- 每次搜尋都載入完整片段
- 沒有分層（Abstract/Overview/Details）
- 重複載入相同 context

#### 3. 檢索效果差
- 單純向量檢索，缺少目錄定位
- 難以理解資訊的完整 context
- 無法追蹤檢索路徑

#### 4. 無法自我進化
- 記憶是被動記錄，不是主動提取
- 沒有任務經驗累積
- Agent 不會越用越聰明

---

### OpenViking 的解決方案

#### 1. 統一管理
```
viking://
├── resources/          # 帝國文檔（empire/*.md）
├── user/               # William 的偏好和習慣
└── agent/              # 17 位公民的技能和記憶
    ├── william/
    ├── matthew/
    ├── leon/
    └── ...
```

#### 2. 分層載入
- L0：快速判斷相關性（省 95% token）
- L1：規劃階段決策（省 80% token）
- L2：需要時才載入完整內容

#### 3. 目錄遞迴檢索
- 先定位高分目錄（empire/shops/erp/）
- 再精細探索（QUOTE_REQUEST_FLOW.md）
- 理解完整 context

#### 4. 自動提取記憶
- 每次任務結束，自動提取經驗
- 更新到 agent/{agent_name}/memories/
- Agent 越用越聰明

---

## 🏗️ 整合規劃

### Phase 1：部署 OpenViking Server（1 小時）

#### Step 1：安裝
```bash
# 安裝 Python 套件
pip install openviking --upgrade --force-reinstall

# 安裝 CLI
curl -fsSL https://raw.githubusercontent.com/volcengine/OpenViking/main/crates/ov_cli/install.sh | bash
```

#### Step 2：設定
```bash
# 建立設定檔
mkdir -p ~/.openviking
cat > ~/.openviking/ov.conf << 'EOF'
{
  "storage": {
    "workspace": "/Users/tokichin/.openclaw/openviking_workspace"
  },
  "log": {
    "level": "INFO",
    "output": "stdout"
  },
  "embedding": {
    "dense": {
      "api_base": "https://api.openai.com/v1",
      "api_key": "YOUR_OPENAI_API_KEY",
      "provider": "openai",
      "dimension": 3072,
      "model": "text-embedding-3-large"
    },
    "max_concurrent": 10
  },
  "vlm": {
    "api_base": "https://api.anthropic.com/v1",
    "api_key": "YOUR_ANTHROPIC_API_KEY",
    "provider": "litellm",
    "model": "claude-3-5-sonnet-20240620",
    "max_concurrent": 100
  }
}
EOF

# 設定環境變數
export OPENVIKING_CONFIG_FILE=~/.openviking/ov.conf
```

#### Step 3：啟動
```bash
# 前台啟動（測試）
openviking-server

# 背景啟動（正式）
nohup openviking-server > /tmp/openviking.log 2>&1 &

# 檢查狀態
ov status
```

---

### Phase 2：遷移現有記憶（2 小時）

#### Step 1：遷移帝國文檔
```bash
# 新增 resources（帝國文檔）
ov add-resource ~/Projects/venturo-erp/empire --wait

# 檢查
ov ls viking://resources/
ov tree viking://resources/empire -L 2
```

#### Step 2：遷移 MEMORY.md
```bash
# 新增 William 的記憶
ov add-memory --type user --content "$(cat ~/.openclaw/workspace-william/MEMORY.md)"

# 檢查
ov ls viking://user/memories/
```

#### Step 3：遷移 mem0 向量庫
```bash
# 匯出 mem0 記憶
python3 scripts/mem0-export.py > /tmp/mem0-memories.jsonl

# 批次匯入 OpenViking
while read line; do
  content=$(echo $line | jq -r '.text')
  category=$(echo $line | jq -r '.metadata.category')
  ov add-memory --type agent --category $category --content "$content"
done < /tmp/mem0-memories.jsonl
```

---

### Phase 3：OpenClaw 整合（1 小時）

#### Step 1：安裝 OpenClaw Plugin
```bash
# 安裝 OpenViking Memory Plugin
openclaw plugins install openviking-memory
```

#### Step 2：設定
```bash
# 編輯 openclaw.json（用 CLI）
openclaw config set openviking.enabled true
openclaw config set openviking.server_url http://localhost:1933
```

#### Step 3：測試
```bash
# 測試檢索
ov find "如何建立報價單？"
ov grep "報價單" --uri viking://resources/empire/shops/erp

# 測試 OpenClaw 整合
# （在 Telegram 問 William AI）
```

---

### Phase 4：建立 Agent 記憶結構（1 小時）

```bash
# 建立 17 位公民的記憶目錄
ov mkdir viking://agent/william/
ov mkdir viking://agent/matthew/
ov mkdir viking://agent/leon/
ov mkdir viking://agent/ben/
ov mkdir viking://agent/eddie/
ov mkdir viking://agent/caesar/
# ... 其他 13 位

# 為每個 Agent 建立子目錄
for agent in william matthew leon ben eddie caesar; do
  ov mkdir viking://agent/$agent/skills/
  ov mkdir viking://agent/$agent/memories/
  ov mkdir viking://agent/$agent/instructions/
done

# 新增 William 的 instructions
ov add-file viking://agent/william/instructions/SOUL.md \
  --content "$(cat ~/.openclaw/workspace-william/SOUL.md)"
```

---

## 📚 新的記憶管理流程

### 開發時
```bash
# 舊方式（手動）
memory_search({ query: "報價單" })

# 新方式（OpenViking）
ov find "報價單"
ov grep "報價單" --uri viking://resources/empire/shops/erp
ov tree viking://resources/empire/shops/erp -L 2
```

### 任務結束時
```bash
# 自動提取記憶（OpenViking 自動）
# 不需要手動執行，session 結束時自動觸發

# 或手動觸發
ov session extract --session-id SESSION_ID
```

### 查看記憶
```bash
# 查看 William 的記憶
ov ls viking://user/memories/
ov cat viking://user/memories/preferences/writing_style

# 查看 Matthew 的技能
ov ls viking://agent/matthew/skills/
ov cat viking://agent/matthew/skills/deploy_erp

# 查看帝國文檔
ov tree viking://resources/empire -L 3
```

---

## 🎯 預期效益

### 1. Token 節省
- **現在**：每次搜尋載入完整片段（~5k tokens）
- **OpenViking**：L0/L1 載入（~100-2k tokens）
- **節省**：60-98% token

### 2. 檢索準確性
- **現在**：單純語意搜尋，容易找錯
- **OpenViking**：目錄遞迴 + 語意搜尋
- **提升**：任務完成率 +43%（測試數據）

### 3. 記憶自我進化
- **現在**：被動記錄，手動整理
- **OpenViking**：自動提取經驗
- **效果**：Agent 越用越聰明

### 4. 可追蹤性
- **現在**：黑盒子，不知道為什麼找到這個
- **OpenViking**：可視化檢索路徑
- **效果**：容易除錯、優化

---

## 🚧 風險和挑戰

### 1. 學習曲線
- OpenViking 是新工具，需要學習
- 建議：先用 Phase 1-2（部署 + 遷移）熟悉

### 2. 額外成本
- 需要 Embedding API（OpenAI text-embedding-3-large）
- 需要 VLM API（Claude 3.5 Sonnet）
- 預估：每月 $50-100（視使用量）

### 3. 系統複雜度
- 多一個 service（OpenViking Server）
- 需要監控和維護
- 建議：先在 Dev Server 測試，穩定後再上 Production

### 4. 遷移成本
- 現有 MEMORY.md / mem0 需要遷移
- 預估：2-3 小時
- 好處：遷移後更結構化

---

## 🎯 行動計畫

### 立刻做（今天）
- [ ] 閱讀 OpenViking 文檔
- [ ] 決定：要不要整合？

### 短期（本週）
- [ ] Phase 1：部署 OpenViking Server
- [ ] Phase 2：遷移現有記憶
- [ ] Phase 3：OpenClaw 整合
- [ ] 測試 1 週

### 中期（本月）
- [ ] Phase 4：建立 Agent 記憶結構
- [ ] 為 17 位公民建立專屬記憶
- [ ] 觀察效益（token 節省、檢索準確性）

### 長期（Q2）
- [ ] 自動 Session 管理
- [ ] 記憶自我進化
- [ ] 擴展到 Online、AI Console

---

## 📖 參考資源

- **官網**：https://openviking.ai
- **GitHub**：https://github.com/volcengine/OpenViking
- **文檔**：https://www.openviking.ai/docs
- **OpenClaw Plugin 範例**：https://github.com/volcengine/OpenViking/tree/main/examples/openclaw-memory-plugin

---

**OpenViking 是帝國記憶的未來。**

**現在決定：要不要整合？**
