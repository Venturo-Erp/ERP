# 🏪 Venturo ERP 商店

**B2B 旅行社後台系統**

這是 Venturo 帝國的第一個商店，為威拓旅行社提供完整的行程管理、報價、需求單、供應商、財務等功能。

---

## 🗺️ 快速導航

### 新手必讀

- [遊戲攻略](GAME_GUIDE.md) — 用遊戲語言理解 ERP（600 行）
- [核心邏輯](CORE_LOGIC.md) — 行程/報價/需求的核心邏輯（685 行）
- [快速參考](../../QUICK_REFERENCE.md) — 常用指令、API

### 我要做什麼？

- **建立新功能** → [遊戲攻略#新手村](GAME_GUIDE.md#新手村)
- **修 Bug** → [遊戲攻略#除錯指南](GAME_GUIDE.md#除錯指南)
- **改報表** → [遊戲攻略#報表系統](GAME_GUIDE.md#報表系統)
- **重構** → [遊戲攻略#重構戰術](GAME_GUIDE.md#重構戰術)

### 深入了解系統

- **架構** → [架構地圖](ARCHITECTURE_MAP.md)
- **資料流** → [資料流地圖](DATA_FLOW_COMPLETE.md)
- **業務規則** → [業務規則快速參考](BUSINESS_RULES_QUICK_REF.md)

---

## 📖 核心概念（3 句話）

1. **`tour_itinerary_items` = 唯一真相來源**  
   所有行程資料都從這張表讀寫

2. **關聯表 = 分類倉庫（vs JSONB 雜物袋）**  
   永遠用關聯表，不用 JSONB

3. **報價單/需求單 = 從核心表讀 + 寫回**  
   不是獨立系統，是核心表的視圖

---

## 🗂️ 文檔索引

### 開發攻略

| 文檔                                                       | 行數 | 用途                 |
| ---------------------------------------------------------- | ---- | -------------------- |
| [GAME_GUIDE.md](GAME_GUIDE.md)                             | 607  | 開發攻略（遊戲語言） |
| [CORE_LOGIC.md](CORE_LOGIC.md)                             | 685  | 核心邏輯詳解         |
| [BUSINESS_RULES_QUICK_REF.md](BUSINESS_RULES_QUICK_REF.md) | 420  | 業務規則快查         |

### 系統架構

| 文檔                                               | 行數 | 用途           |
| -------------------------------------------------- | ---- | -------------- |
| [ARCHITECTURE_MAP.md](ARCHITECTURE_MAP.md)         | 510  | 系統架構地圖   |
| [DATA_FLOW_COMPLETE.md](DATA_FLOW_COMPLETE.md)     | 557  | 資料流完整地圖 |
| [COMPLETE_SYSTEMS_MAP.md](COMPLETE_SYSTEMS_MAP.md) | 712  | 完整系統地圖   |

### 程式碼索引

| 文檔                                     | 行數 | 用途                |
| ---------------------------------------- | ---- | ------------------- |
| [FUNCTIONS_INDEX.md](FUNCTIONS_INDEX.md) | 1977 | 所有函式索引        |
| [HOOKS_INDEX.md](HOOKS_INDEX.md)         | 409  | React Hooks 索引    |
| [BUTTONS_INDEX.md](BUTTONS_INDEX.md)     | 283  | 按鈕元件索引        |
| [ROUTES_MAP.md](ROUTES_MAP.md)           | 143  | 路由地圖            |
| [SERVICES_INDEX.md](SERVICES_INDEX.md)   | 159  | API 服務索引        |
| [TYPES_INDEX.md](TYPES_INDEX.md)         | 137  | TypeScript 型別索引 |

### 業務流程

| 文檔                                                   | 行數 | 用途         |
| ------------------------------------------------------ | ---- | ------------ |
| [QUOTE_REQUEST_FLOW.md](QUOTE_REQUEST_FLOW.md)         | 416  | 報價需求流程 |
| [QUOTE_REQUEST_REFACTOR.md](QUOTE_REQUEST_REFACTOR.md) | 380  | 報價重構計畫 |
| [TOUR_CREATION_LOGIC.md](TOUR_CREATION_LOGIC.md)       | 259  | 行程建立邏輯 |

### 其他

| 文檔                                                                       | 行數 | 用途           |
| -------------------------------------------------------------------------- | ---- | -------------- |
| [SITEMAP.md](SITEMAP.md)                                                   | 389  | 網站地圖       |
| [DATABASE_USAGE.md](DATABASE_USAGE.md)                                     | 154  | 資料庫使用指南 |
| [COMPLETE_UNDERSTANDING_CHECKLIST.md](COMPLETE_UNDERSTANDING_CHECKLIST.md) | 418  | 完整理解清單   |

---

## 🎮 遊戲語言速查

### 裝備系統

- **關聯表** = 分類倉庫（快速、可查、可追蹤）
- **JSONB** = 雜物袋（慢、難找、難維護）

### 副本攻略

- **報價單副本** = 從 `tour_itinerary_items` 讀取 → 寫回 `tour_quotes`
- **需求單副本** = JOIN 核心表 → 更新狀態

### 技能樹

- **useQuoteForm** = 報價單技能
- **useTourForm** = 行程技能
- **useSupplierForm** = 供應商技能

---

## 🚀 快速開始

### 1. 理解核心概念（15 分鐘）

閱讀 [GAME_GUIDE.md#新手村](GAME_GUIDE.md#新手村)

### 2. 了解資料流（15 分鐘）

閱讀 [CORE_LOGIC.md#資料流](CORE_LOGIC.md#資料流)

### 3. 動手開發（∞）

參考 [FUNCTIONS_INDEX.md](FUNCTIONS_INDEX.md) 找到需要的函式

---

**準備好了？選擇你的攻略。**
