# Venturo ERP 開發手冊

> **建立日期**: 2026-02-27
> **維護者**: 悠月 (Yuzuki) + 羅根 (Logan)
> **適用對象**: 所有開發者（AI 或人類）
> **目的**: 把 4.5 個月建設累積的知識、規範、教訓整合成一份可查閱的手冊

---

## 📖 目錄

1. [產品是什麼](#1-產品是什麼)
2. [技術架構](#2-技術架構)
3. [開發環境](#3-開發環境)
4. [六大禁令](#4-六大禁令)
5. [命名規範](#5-命名規範)
6. [查詢規範](#6-查詢規範)
7. [安全規範](#7-安全規範)
8. [UI 規範](#8-ui-規範)
9. [資料流規範](#9-資料流規範)
10. [開發流程](#10-開發流程)
11. [血淚教訓](#11-血淚教訓)
12. [文件索引](#12-文件索引)

---

## 1. 產品是什麼

### 一句話

> Venturo 不是在做一個更快、更便宜的旅遊平台，而是在為旅遊產業建立一個即使未來十年技術持續變化，仍然站得住腳的運作結構。

### 兩個產品

| 產品               | 用戶        | 路徑                        | 端口 | 命名規範   |
| ------------------ | ----------- | --------------------------- | ---- | ---------- |
| **Venturo ERP**    | 旅行社員工  | `~/Projects/venturo-erp`    | 3000 | snake_case |
| **Venturo Online** | 旅客（PWA） | `~/Projects/venturo-online` | 3001 | camelCase  |

**共享同一個 Supabase 資料庫**。ERP 產生資料，Online 呈現資料。

### 角色模型

| 角色                      | 說明                                  |
| ------------------------- | ------------------------------------- |
| **S¹ (Travel Supplier)**  | 旅遊供應商（DMC、飯店、導遊、車公司） |
| **S² (Service Supplier)** | 產業服務商（金流、SaaS）              |
| **B (Partner)**           | 旅行社                                |

**關鍵決策：不對 S¹ 抽成。** 供應商無壓力，使用動機回到秩序。

### 團體生命週期

```
提案 → 報價 → 開團 → 訂單 → 收款/請款 → 出發 → 結團
                        ↓
                   需求單 → 供應商回覆 → 團確單
```

### 核心表：tour_itinerary_items

**「一 row 走到底」** — 行程設計、報價、需求、確認、領隊回填，全部在同一張表的同一 row。

不再有 copy 文化（行程 copy 到報價、報價 copy 到需求單），一改全改。

---

## 2. 技術架構

### Tech Stack

| 層級     | 技術                                     |
| -------- | ---------------------------------------- |
| 框架     | Next.js 16 + React 19                    |
| 語言     | TypeScript（strict）                     |
| 狀態管理 | Zustand 5                                |
| 資料庫   | Supabase（PostgreSQL）                   |
| 認證     | JWT（jose SignJWT HS256）+ Supabase Auth |
| 部署     | Vercel                                   |

### 專案規模（2026-02-27）

| 指標          | 數值                |
| ------------- | ------------------- |
| ERP 程式碼    | ~33 萬行            |
| Online 程式碼 | ~1.5 萬行           |
| DB 表         | 268 張              |
| DB 查詢       | 694 個              |
| 測試          | 1592 個（82 files） |
| Commits       | 1600+               |

### 多租戶架構

- 162 張表有 `workspace_id` 隔離（RLS）
- 31 張子表用 JOIN-based RLS
- 參考表（ref_airlines, hotels 等）保持 `authenticated` only
- `get_current_user_workspace()` 和 `is_super_admin()` 是 RLS 核心函數
- 每家旅行社看不到其他家的資料

### 抽象層（createEntityHook）

路徑：`src/data/core/createEntityHook.ts`

改一個地方，全系統生效：

- 自動注入 `workspace_id`
- 自動記錄 `created_by` / `updated_by`
- 自動處理權限檢查

---

## 3. 開發環境

### 必要環境變數（Production）

| 變數                | 用途                 | 說明                     |
| ------------------- | -------------------- | ------------------------ |
| `JWT_SECRET`        | JWT 簽名             | 必填，不設會 throw error |
| `TAISHIN_MAC_KEY`   | LinkPay webhook 驗證 | 空值 = 拒絕所有 webhook  |
| `SUPABASE_URL`      | Supabase 連線        |                          |
| `SUPABASE_ANON_KEY` | Supabase 匿名金鑰    |                          |

### Dev Server

```bash
# 啟動 ERP
cd ~/Projects/venturo-erp && npm run dev

# 啟動 Online
cd ~/Projects/venturo-online && npm run dev --port 3001
```

### 常用驗證指令

```bash
# TypeScript 型別檢查
npx tsc --noEmit

# 測試
npx vitest run

# Build（push 前必做）
npx next build

# 查詢驗證
python3 scripts/validate-queries.py
```

---

## 4. 六大禁令（Zero Tolerance）

違反任何一條 = 不准 push。

| #   | 禁令                      | 說明                                                 |
| --- | ------------------------- | ---------------------------------------------------- | --- | --- |
| 1   | **禁止 any**              | 不准 `: any`、`as any`、`<any>`                      |
| 2   | **禁止 console.log**      | 必須用 `import { logger } from '@/lib/utils/logger'` |
| 3   | **禁止 JSX 硬編碼中文**   | 放到 `constants/labels.ts`                           |
| 4   | **拆分依邏輯性**          | 不設行數門檻，根據邏輯清晰度決定                     |
| 5   | **禁止自訂版面佈局**      | 列表頁用 `ListPageLayout` / `EnhancedTable`          |
| 6   | **禁止跳過 Dialog level** | 所有 Dialog 必須設定 `level={1                       | 2   | 3}` |

### ERP 額外禁令

- **禁止忽略資料庫結構** — 修改前必須查 Supabase 表格
- **禁止盲目修改** — 先讀懂現有程式碼再動手
- **禁止詳細頁跳轉** — 不建立 `/xxx/[id]/page.tsx`，用 Dialog
- **禁止自創欄位名** — 新欄位必須查 `docs/FIELD_NAMING_STANDARDS.md`

### Online 額外禁令

- **禁止頁面縮小** — 所有頁面必須 full-width
- **禁止跳出 PWA** — 用 `router.push`，不能用 `window.location`

---

## 5. 命名規範

### 變數命名

| 層級            | ERP        | Online     |
| --------------- | ---------- | ---------- |
| 資料庫欄位      | snake_case | snake_case |
| TypeScript 變數 | snake_case | camelCase  |
| Component       | PascalCase | PascalCase |

### 編號格式

| 項目   | 格式                      | 範例              |
| ------ | ------------------------- | ----------------- |
| 團號   | `{城市代碼}{YYMMDD}{A-Z}` | `CNX250128A`      |
| 訂單   | `{團號}-O{2位數}`         | `CNX250128A-O01`  |
| 需求單 | `{團號}-RQ{2位數}`        | `CNX250128A-RQ01` |
| 請款單 | `{團號}-I{2位數}`         | `CNX250128A-I01`  |
| 收款單 | `{團號}-R{2位數}`         | `CNX250128A-R01`  |

### 資料庫欄位陷阱

| ❌ 不要用                   | ✅ 正確的      | 說明                     |
| --------------------------- | -------------- | ------------------------ |
| `birthday`                  | `birth_date`   | ERP 統一用 birth_date    |
| `name_en`                   | `english_name` | hotels 表用 english_name |
| `chinese_name`（customers） | `name`         | customers 表用 name      |
| `customer_name`（orders）   | 不存在         | orders 沒有這個欄位      |

---

## 6. 查詢規範（三鐵律）

> 完整說明見 `docs/PERFORMANCE_GUIDE.md`

### 鐵律一：列表查詢禁止 select('\*')

```typescript
// ❌
const { data } = await supabase.from('tours').select('*')

// ✅ 定義常數
const TOUR_LIST_SELECT = 'id, code, name, status, departure_date, return_date'
const { data } = await supabase.from('tours').select(TOUR_LIST_SELECT)
```

**允許 select('\*')：** `.single()`、表單編輯、insert 後回傳

### 鐵律二：所有查詢必須有 limit

| 場景     | 建議 limit |
| -------- | ---------- |
| 列表頁   | 500        |
| 下拉選單 | 200        |
| 參考表   | 2000       |
| 歷史紀錄 | 100        |

### 鐵律三：寫 query 前必須查 DB schema

```bash
# 用 Supabase API 查真實欄位
TOKEN=$(grep -o 'sbp_[a-zA-Z0-9]*' .claude/SUPABASE_CREDENTIALS.md | head -1)
curl -s -X POST "https://api.supabase.com/v1/projects/pfqvdacxowpgfamuvnsn/database/query" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"query": "SELECT column_name FROM information_schema.columns WHERE table_name = '\''TABLE_NAME'\'' ORDER BY ordinal_position"}'
```

**不信任程式碼裡的欄位名。** 只信 DB schema。

---

## 7. 安全規範

### 已完成的安全措施（2026-02-27）

| 項目         | 狀態 | 說明                            |
| ------------ | ---- | ------------------------------- |
| JWT 簽名     | ✅   | jose SignJWT HS256，取代 base64 |
| RLS 隔離     | ✅   | 162 張表 workspace 隔離         |
| 護照 Bucket  | ✅   | private + createSignedUrl       |
| 藍新金鑰     | ✅   | 依 workspace_id 取得            |
| LinkPay 驗證 | ✅   | MAC_KEY 空值拒絕                |
| Quick-Login  | ✅   | server-only（無 NEXT*PUBLIC*）  |
| API Zod 驗證 | ✅   | 所有 POST/PUT/PATCH             |

### RBAC 角色

```
平台管理資格 > 系統主管 > 團控 > 業務/會計/助理 > 領隊 > 一般員工
```

### 新 API 必做

1. 加 `withAuth` middleware
2. 檢查 `workspace_id` 過濾
3. POST/PUT/PATCH 加 Zod schema 驗證
4. 敏感操作加角色權限檢查

---

## 8. UI 規範

### 色系：Morandi

| 用途         | 色碼                | 名稱           |
| ------------ | ------------------- | -------------- |
| 金色（主色） | `morandi-gold`      | 按鈕、強調     |
| 綠色（成功） | `#7a9e7e`           | 已完成、已確認 |
| 藍色（建議） | `#7b95b0`           | 提示、建議     |
| 紅色（警告） | `#c17b6e`           | 錯誤、緊急     |
| 容器背景     | `morandi-container` | 卡片、區塊背景 |
| 文字主色     | `morandi-primary`   |                |
| 文字次色     | `morandi-secondary` |                |

**禁止用：** red-50, orange-50, yellow-50, blue-100, pink-100 等原生 Tailwind 彩色

### 頁面結構

- 列表頁：`ListPageLayout` + `EnhancedTable`
- 詳細頁：**不建立** `/xxx/[id]/page.tsx`，用 Dialog
- Dialog：必須設 `level={1|2|3}`
- 表單：inline editing > 獨立表單頁

### William 的設計偏好（記住）

- **簡約 > 花俏** — 不要精靈式流程、不要多步驟
- **功能性 > 美觀** — 員工每天用八小時，要快
- **一頁搞定** — 能在一個畫面做完的事不要跳頁
- **保持現有結構** — 改善 > 重造

---

## 9. 資料流規範

### 訂單生命週期

```
draft → pending_deposit → deposit_paid → pending_final → final_paid → completed
  ↓                                                                       ↓
expired/cancelled                                                     archived
```

### 付款生命週期

```
pending → confirmed → (refund_requested → refunded)
```

### 行程生命週期

```
draft → published → departed → completed → archived
```

### 資料流向

```
ERP 建立資料 → Supabase → Online 讀取顯示
                  ↑
           Online 只讀，不寫入 ERP 資料
```

### 核心表同步原則

- 報價單儲存 → 同步報價欄位到 `tour_itinerary_items`
- 需求單建立 → 同步需求欄位到 `tour_itinerary_items`
- 供應商回覆 → 同步確認欄位到 `tour_itinerary_items`
- **一個源頭，不 copy**

### 收款/請款計算

- **收款**：`recalculateReceiptStats` — 單一真相源
- **請款**：`recalculateExpenseStats` — 單一真相源
- 不能手動改數字，只能透過 recalculate 函數

---

## 10. 開發流程

### 修改前必做

1. **grep 影響範圍** — `grep -rn "要改的東西" src/`
2. **查 DB schema** — 用 Supabase API 確認表和欄位存在
3. **讀懂現有程式碼** — 不要猜，去讀

### 修改後必做

1. **tsc --noEmit** — 零錯誤
2. **npx vitest run** — 所有測試通過
3. **grep 驗證** — 確認修改生效
4. **同類檢查** — 同樣的問題有沒有其他地方也有
5. **因果關係** — 改了 A，有沒有漏改 A 的下游

### Push 前必做

```bash
cd ~/Projects/venturo-erp && npx next build
```

Build 失敗 = 不准 push。沒有例外。

### 子任務規則

派子任務時，指令裡必須寫明：

1. **架構決定** — 核心表一 row 走到底、不需要交接機制
2. **已確認的設計結論** — 子任務不會自己去讀 MEMORY.md
3. **禁止做的事** — 不只是 coding style，還有「不要走舊架構的路」
4. **Build 規則** — 完成後必須 `npx next build` 通過

---

## 11. 血淚教訓

### 1. 不要信程式碼裡的欄位名

> 2026-02-26：寫了 `hotels.name_en` 查詢，結果欄位叫 `english_name`。又寫了 `employees.birthday`，結果叫 `birth_date`。

**規則：有 API 就用 API 查，不要猜。**

### 2. Build 通過 ≠ 能用

> 2026-02-18：38 輪優化，build 全過，結果登入都登不進去。三個 bug 藏在 runtime。

**規則：改完之後要實際開瀏覽器測。**

### 3. Checklist 拿來用之前先確認現狀

> 2026-02-25：拿了 launch checklist 的 P0 清單派子任務，5 個裡面 3 個早就修好了。

**規則：報告寫的是那個時間點的狀態，程式碼才是現在的真相。**

### 4. 先讀自己再看外面

> 2026-02-25：派子任務研究「護照 OCR 怎麼做」，結果系統裡早就有完整的 Google Vision + MRZ parser。

**規則：任何任務開始前，先 grep codebase。家裡有什麼都不知道，研究外面的有什麼用。**

### 5. 不要順著舊架構加功能

> 2026-02-24：派了「調查交接流程」→ 子任務順著舊程式碼加了 403 檢查 → 完全違背核心表設計。

**規則：指令裡寫明「Online 直接讀 tour_itinerary_items，不需要交接」。**

### 6. select(\*) 會殺死效能

> 2026-02-27：發現 291 處 select('\*')，tours 表 63 欄但列表只用 10 欄。analytics 查 3 張全表只為了算 count。

**規則：三鐵律（見第 6 節）。**

---

## 12. 文件索引

### 核心規範

| 文件                             | 說明                 |
| -------------------------------- | -------------------- |
| `docs/VENTURO_HANDBOOK.md`       | **本文件** — 總索引  |
| `.claude/VENTURO_VISION.md`      | 雙平台願景、價值飛輪 |
| `~/Projects/VENTURO_THESIS.md`   | 創立理念（為什麼做） |
| `docs/ARCHITECTURE_STANDARDS.md` | 五層架構、資料隔離   |
| `docs/CODE_STANDARDS.md`         | 程式碼規範           |
| `docs/PERFORMANCE_GUIDE.md`      | 效能規範（含三鐵律） |

### 資料庫

| 文件                                       | 說明               |
| ------------------------------------------ | ------------------ |
| `docs/DATABASE_DESIGN_STANDARDS.md`        | 表格分類、設計原則 |
| `docs/FIELD_NAMING_STANDARDS.md`           | 欄位命名標準       |
| `docs/SUPABASE_RLS_POLICY.md`              | RLS 規範           |
| `docs/DB_SCHEMA.md`                        | Schema 概覽        |
| `docs/INDEX_RECOMMENDATIONS_2026-02-18.md` | 索引建議           |

### UI / 設計

| 文件                              | 說明                   |
| --------------------------------- | ---------------------- |
| `docs/COMPONENT_GUIDE.md`         | 元件使用指南           |
| `docs/VENTURO_UI_DESIGN_STYLE.md` | Morandi 色系、設計風格 |
| `docs/BROCHURE_COMPONENTS.md`     | 手冊設計元件           |

### 安全 / 部署

| 文件                                    | 說明           |
| --------------------------------------- | -------------- |
| `docs/API_SECURITY_AUDIT_2026-02-18.md` | API 安全審計   |
| `docs/WORKSPACE_ISOLATION_AUDIT.md`     | 多租戶隔離審計 |
| `docs/DEPLOYMENT_INFO.md`               | 部署資訊       |

### 審計報告

| 文件                               | 說明                |
| ---------------------------------- | ------------------- |
| `docs/AUDIT_INDEX_2026-02-18.md`   | 2/18 全模組審計索引 |
| `docs/AUDIT_SUMMARY_2026-02-18.md` | 審計總結            |
| `docs/V1_LAUNCH_CHECKLIST.md`      | V1 上線清單         |

---

> **這份手冊是活的。** 每次學到新教訓、建立新規範，就更新這裡。
>
> 如果你是新加入的開發者（AI 或人類），讀完這份就能開始工作。
