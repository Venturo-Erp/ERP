# Venturo 開發文檔中心

> **最後更新**: 2026-01-22 (新增 Logan AI 文檔)
> **專案**: Venturo ERP 旅遊團管理系統
> **架構**: 純雲端架構（Supabase 為唯一資料來源）

---

## 📖 核心文檔（必讀）

| 文檔                                                       | 說明                           | 優先級 |
| ---------------------------------------------------------- | ------------------------------ | ------ |
| [**SYSTEM_STATUS.md**](SYSTEM_STATUS.md)                   | 系統當前狀態、技術棧、編號規範 | ⭐⭐⭐ |
| [**DEVELOPMENT_GUIDE.md**](DEVELOPMENT_GUIDE.md)           | 開發指南、專案架構、常用指令   | ⭐⭐⭐ |
| [**ARCHITECTURE_STANDARDS.md**](ARCHITECTURE_STANDARDS.md) | 五層架構、資料隔離、權限控制   | ⭐⭐⭐ |

---

## 🗄️ 資料庫與 Supabase

| 文檔                                                             | 說明                               |
| ---------------------------------------------------------------- | ---------------------------------- |
| [**DATABASE_DESIGN_STANDARDS.md**](DATABASE_DESIGN_STANDARDS.md) | 資料庫設計規範、表格分類、命名規則 |
| [**SUPABASE_GUIDE.md**](SUPABASE_GUIDE.md)                       | Supabase 操作指南、Migration 流程  |
| [**SUPABASE_RLS_POLICY.md**](SUPABASE_RLS_POLICY.md)             | RLS 政策、Workspace 隔離           |

---

## 🎨 設計與規範

| 文檔                                                               | 說明                              |
| ------------------------------------------------------------------ | --------------------------------- |
| [**VENTURO_UI_DESIGN_STYLE.md**](VENTURO_UI_DESIGN_STYLE.md)       | UI 設計風格、莫蘭迪色系、組件樣式 |
| [**NAMING_CONVENTION_STANDARD.md**](NAMING_CONVENTION_STANDARD.md) | 命名規範（組件、Hook、檔案）      |
| [**CODE_STANDARDS.md**](CODE_STANDARDS.md)                         | 程式碼規範                        |
| [**CODE_REVIEW_CHECKLIST.md**](CODE_REVIEW_CHECKLIST.md)           | Code Review 檢查清單              |

---

## 🤖 AI 功能

| 文檔                                       | 說明                  |
| ------------------------------------------ | --------------------- |
| [**LOGAN_AI_GUIDE.md**](LOGAN_AI_GUIDE.md) | Logan AI 助理使用指南 |

---

## 🏛️ 架構決策

| 文檔                                                     | 說明                               |
| -------------------------------------------------------- | ---------------------------------- |
| [**ARCHITECTURE_DECISIONS.md**](ARCHITECTURE_DECISIONS.md) | ADR 架構決策記錄（為什麼這樣設計）|

---

## 📋 其他文檔

| 文檔                                               | 說明         |
| -------------------------------------------------- | ------------ |
| [**PROJECT_PRINCIPLES.md**](PROJECT_PRINCIPLES.md) | 專案開發原則 |
| [**DEPLOYMENT_INFO.md**](DEPLOYMENT_INFO.md)       | 部署資訊     |

---

## 📁 目錄結構

```
docs/
├── README.md                      # 文檔索引（本檔案）
│
├── 核心文檔
│   ├── SYSTEM_STATUS.md           # 系統狀態 ⭐
│   ├── DEVELOPMENT_GUIDE.md       # 開發指南 ⭐
│   └── ARCHITECTURE_STANDARDS.md  # 架構規範 ⭐
│
├── 資料庫
│   ├── DATABASE_DESIGN_STANDARDS.md  # 設計規範
│   ├── SUPABASE_GUIDE.md             # 操作指南
│   └── SUPABASE_RLS_POLICY.md        # RLS 政策
│
├── 設計規範
│   ├── VENTURO_UI_DESIGN_STYLE.md    # UI 風格
│   ├── NAMING_CONVENTION_STANDARD.md # 命名規範
│   ├── CODE_STANDARDS.md             # 程式碼規範
│   └── CODE_REVIEW_CHECKLIST.md      # Review 清單
│
├── AI 功能
│   └── LOGAN_AI_GUIDE.md             # Logan AI 指南 🤖
│
├── 其他
│   ├── PROJECT_PRINCIPLES.md         # 專案原則
│   └── DEPLOYMENT_INFO.md            # 部署資訊
│
└── archive/                       # 歷史文檔
    ├── VENTURO_5.0_MANUAL.md      # 完整手冊（歷史參考）
    ├── fix-reports/               # 修復報告
    ├── audits/                    # 審計報告
    ├── guides/                    # 功能指南
    ├── features/                  # 功能完成報告
    └── ...                        # 其他歷史文件
```

---

## 🚀 快速開始

### 新手入門（建議閱讀順序）

1. **[SYSTEM_STATUS.md](SYSTEM_STATUS.md)** - 了解系統現狀（5 分鐘）
2. **[DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md)** - 開發環境設定（10 分鐘）
3. **[ARCHITECTURE_STANDARDS.md](ARCHITECTURE_STANDARDS.md)** - 架構規範（15 分鐘）

### 常見任務

| 我想要...    | 查看文檔                                                       |
| ------------ | -------------------------------------------------------------- |
| 修改資料庫   | [SUPABASE_GUIDE.md](SUPABASE_GUIDE.md)                         |
| 了解 RLS     | [SUPABASE_RLS_POLICY.md](SUPABASE_RLS_POLICY.md)               |
| 查看 UI 規範 | [VENTURO_UI_DESIGN_STYLE.md](VENTURO_UI_DESIGN_STYLE.md)       |
| 了解命名規則 | [NAMING_CONVENTION_STANDARD.md](NAMING_CONVENTION_STANDARD.md) |

---

## 💡 AI 助手須知

- **主要規範**：`.claude/CLAUDE.md` 包含完整的 AI 工作規範
- **架構原則**：純雲端架構，Supabase 為唯一資料來源
- **RLS 政策**：業務資料啟用 RLS 進行 Workspace 隔離
- **禁止事項**：不使用 `console.log`（改用 `logger`）、不使用 `as any`
- **內部 AI**：羅根 (Logan) 是 Venturo 的內部 AI 助理，詳見 `docs/LOGAN_AI_GUIDE.md`

---

## 🔗 外部資源

- [Supabase Dashboard](https://supabase.com/dashboard/project/pfqvdacxowpgfamuvnsn)
- [Next.js 16 文檔](https://nextjs.org/docs)
- [React 19.2 文檔](https://react.dev/)
- [Zustand 5 文檔](https://zustand-demo.pmnd.rs/)

---

**最後整理日期**: 2026-01-22
