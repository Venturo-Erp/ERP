# 記憶系統索引

**帝國記憶烏托邦 - 完整文檔導覽**

---

## 📚 核心文檔

### 1. 系統總覽
- **MEMORY_UTOPIA.md** — 完整系統說明（創世神視角）
- **MEMORY_MAGIC.md** — 雙魔法研究（技術細節）

### 2. 工作區文檔
- **~/.openclaw/workspace-william/MEMORY_UTOPIA.md** — 快速參考
- **~/.openclaw/workspace-william/AGENTS.md** — 規範（原則 3）
- **~/.openclaw/workspace-william/TOOLS.md** — 使用方式
- **~/.openclaw/workspace-william/BOOTSTRAP.md** — 啟動檢查

---

## 🗂️ 文件位置

### 系統檔案
```
~/.openclaw/empire-memory/
├── citizens/              # 14 位公民的 SQLite DB
│   ├── william.db
│   ├── matthew.db
│   └── ...
├── scripts/              # 系統腳本
│   ├── citizen-memory.py           # 公民記憶工具
│   ├── harvester-openviking.py    # 收割腳本
│   ├── init-agent-memories.py     # 初始化腳本
│   └── track-dependencies.py      # 依賴追蹤
├── embedding-proxy.py    # 本地 Embedding Server
├── dependency-registry.json       # 依賴清單
└── dependency-report.md           # 依賴報告
```

### OpenViking 檔案
```
~/.openclaw/openviking_workspace/
└── （OpenViking 內部結構）

~/.openviking/
└── ov.conf              # OpenViking 設定
```

### 執行腳本
```
~/.openclaw/workspace-william/scripts/
└── run-harvest.sh       # 收割執行 wrapper
```

---

## 🎯 快速參考

### 公民使用

**存記憶**：
```bash
python3 ~/.openclaw/empire-memory/citizen-memory.py store {agent_id} \
  "內容" "category" {importance}
```

**搜記憶**：
```bash
python3 ~/.openclaw/empire-memory/citizen-memory.py recall {agent_id} "關鍵字"
```

### 創世神使用

**查看全局**：
```bash
for db in ~/.openclaw/empire-memory/citizens/*.db; do
  python3 ~/.openclaw/empire-memory/citizen-memory.py stats $(basename $db .db)
done
```

**手動收割**：
```bash
bash ~/.openclaw/workspace-william/scripts/run-harvest.sh
```

---

## 🔄 系統流程

```
公民日常工作
    ↓
存到 SQLite（工作記憶）
    ↓
每晚 23:00 自動收割
    ↓
┌─────────┴─────────┐
↓                   ↓
重要記憶          冗餘記憶
→ OpenViking      → 刪除
```

---

## 📖 延伸閱讀

1. **GENESIS.md** — 帝國創世記（設計哲學）
2. **EMPIRE_OVERVIEW.md** — 帝國總覽（組織架構）
3. **OPENVIKING_INTEGRATION.md** — OpenViking 整合計劃

---

**更新日期**：2026-03-15  
**狀態**：✅ 已部署，每晚 23:00 自動運行
