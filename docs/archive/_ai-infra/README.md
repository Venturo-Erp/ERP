# /ai — AI 協作文件

> 讓任何 AI（OpenClaw、Claude Code、Codex）第一次碰 codebase 就知道在幹嘛。
>
> **所有 AI 在開始工作前，必須先讀這個資料夾。**

---

## 📁 結構

```
/ai
├── README.md              ← 你在這裡
├── maps/
│   ├── SYSTEM_MAP.md      ← 系統骨架：domains, modules, libraries
│   ├── ROUTES_MAP.md      ← 每個頁面在幹嘛
│   ├── DB_SCHEMA.md       ← 資料庫 schema（自動生成）
│   └── COMPONENT_INDEX.md ← 各模組元件數量與警告
├── rules/
│   └── DOMAIN_RULES.md    ← ⭐ 業務邏輯（AI 猜不到的，必讀）
├── tasks/
│   └── CURRENT_TASK.md    ← 目前任務定義
└── reports/
    └── OPENCLAW_REPORT.md ← AI 執行結果回報
```

---

## 🔄 工作流程

### Step 1: William + Yuzuki 討論

- 定義任務 → 寫入 `tasks/CURRENT_TASK.md`

### Step 2: Coding Agent 讀

1. `maps/SYSTEM_MAP.md` — 知道系統長什麼樣
2. `maps/ROUTES_MAP.md` — 知道頁面在哪
3. `maps/DB_SCHEMA.md` — 知道資料表結構
4. `rules/DOMAIN_RULES.md` — 知道業務規則（最重要）
5. `tasks/CURRENT_TASK.md` — 知道要做什麼

### Step 3: Coding Agent 產出

- 改 code
- 寫 `reports/OPENCLAW_REPORT.md`

### Step 4: Review

- William 或 Yuzuki 看 report，決定是否 merge

---

## ⚠️ 注意事項

- `DB_SCHEMA.md` 是自動生成的，不要手動編輯
- `DOMAIN_RULES.md` 只有 William 能確認，AI 不要自己加規則
- `CURRENT_TASK.md` 每次只放一個任務
- 改動 tours 模組前務必讀完 DOMAIN_RULES.md
