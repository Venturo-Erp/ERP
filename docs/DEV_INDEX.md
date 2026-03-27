# 開發文件目錄索引

**用途**：根據任務類型，只讀取需要的文件，減少 token 消耗

---

## 🎯 快速對照表

| 任務類型 | 必讀文件 | 可選文件 |
|---------|---------|---------|
| **新 UI 頁面** | `UI_DESIGN_SYSTEM.md` | - |
| **修改現有 UI** | - | `UI_DESIGN_SYSTEM.md`（不確定時才讀） |
| **表格功能** | `UI_DESIGN_SYSTEM.md` → 表格章節 | - |
| **新 API** | `docs/DEV_STANDARDS.md` | `ecc-security-review` |
| **Supabase Query** | `src/data/README.md` | - |
| **DB Migration** | `ecc-database-migrations` | - |
| **列印功能** | `src/lib/print/README.md` | - |
| **SWR/快取** | `docs/SWR_BEST_PRACTICES.md` | - |
| **純邏輯修改** | 不需讀任何文件 | - |
| **Bug 修復** | 不需讀任何文件 | 看 error 相關的 |

---

## 📁 文件分類

### 1. UI 規範
```
UI_DESIGN_SYSTEM.md          # UI 聖經（新頁面必讀）
├── 表格（EnhancedTable）
├── 浮動窗（Dialog）
├── 按鈕規範
├── 顏色系統（Morandi）
└── 間距系統
```

### 2. 程式碼規範
```
docs/DEV_STANDARDS.md        # 開發標準
docs/SWR_BEST_PRACTICES.md   # SWR 樂觀更新（CRUD 必讀）
```

### 3. 資料層
```
src/data/README.md           # Entity layer 用法
TOOLS.md → Supabase 章節    # API token、常用查詢
```

### 4. 特定功能
```
src/lib/print/README.md      # 列印功能
```

### 5. ECC Skills（安全/品質）
```
~/.openclaw/workspace-william/skills/
├── ecc-coding-standards/    # 程式碼品質（開發時）
├── ecc-security-review/     # 安全審查（上線前）
└── ecc-database-migrations/ # DB 變更（migration 前）
```

### 6. 業務邏輯記憶
```
memory/2026-03-24-ai-office-workflow.md   # AI Office 工作流
memory/2026-03-23-supplier-system.md      # 供應商系統
memory/2026-03-21-transport-complete.md   # 遊覽車流程
memory/2026-03-20-erp-core-flow.md        # ERP 核心流程
memory/2026-03-16-requirements-flow.md    # 需求單流程
```

---

## 🚦 決策流程

```
收到開發任務
    │
    ├─ 是全新 UI 頁面？
    │   └─ ✅ 讀 UI_DESIGN_SYSTEM.md
    │
    ├─ 是修改現有功能？
    │   └─ ❌ 不讀 UI（除非不確定樣式）
    │
    ├─ 涉及 CRUD 操作？
    │   └─ ✅ 讀 SWR_BEST_PRACTICES.md
    │
    ├─ 涉及 DB 欄位變更？
    │   └─ ✅ 讀 ecc-database-migrations
    │
    ├─ 涉及列印？
    │   └─ ✅ 讀 src/lib/print/README.md
    │
    ├─ 涉及特定業務邏輯？
    │   └─ ✅ memory_search 找相關記憶
    │
    └─ 純 bug 修復 / 小改動？
        └─ ❌ 不讀任何文件，直接改
```

---

## 💡 最佳實踐

1. **先判斷任務類型**，再決定讀什麼
2. **不確定時**用 `memory_search` 找關鍵字
3. **純邏輯修改**不需要讀 UI 規範
4. **已經知道怎麼做**就不要重複讀文件
5. **大功能**可能需要讀多個文件，但分階段讀

---

## 📊 Token 節省估算

| 情境 | 以前 | 現在 |
|------|------|------|
| 小 bug 修復 | 讀全部 ~50k | 不讀 ~0 |
| UI 調整 | 讀全部 ~50k | 只讀 UI ~8k |
| 新 CRUD 功能 | 讀全部 ~50k | 讀 UI + SWR ~12k |
| 純後端 API | 讀全部 ~50k | 讀 DEV ~5k |

---

**更新時間**：2026-03-27
