# 架構升級會議報告

## 會議日期：2026-04-16

## 參與角色：系統架構師、DevOps

---

### 執行摘要（3 句話總結）

Venturo ERP 已升級至 Next.js 16 + React 19，技術棧相當前沿，核心框架無急迫升級需求。最大的架構優勢在於 `createEntityHook` 統一資料層 + Supabase Realtime 即時同步的設計，67 個 entity 全部走同一套 CRUD/快取/workspace 隔離模式，一致性極高。主要技術債集中在 ESLint 規則過度放寬（`react-hooks/rules-of-hooks` 設為 off）、部分元件過大（超過 1000 行）、以及 3 個遺留備份檔案未清理。

---

### 技術棧現況

| 技術                     | 目前版本 | 最新穩定版（2026-04） | 是否需升級                    |
| ------------------------ | -------- | --------------------- | ----------------------------- |
| **Next.js**              | ^16.0.10 | 16.x                  | 否（已是最新大版本）          |
| **React**                | ^19.2.1  | 19.x                  | 否（已是最新大版本）          |
| **TypeScript**           | ^5       | 5.8.x                 | 建議鎖定小版本（如 ~5.8.0）   |
| **Tailwind CSS**         | ^4       | 4.x                   | 否（已是最新大版本）          |
| **SWR**                  | ^2.3.8   | 2.x                   | 否（穩定版）                  |
| **Zustand**              | ^5.0.9   | 5.x                   | 否（已是最新大版本）          |
| **Supabase JS**          | ^2.89.0  | 2.x                   | 否（保持更新即可）            |
| **Zod**                  | ^4.2.1   | 4.x                   | 否（已升級到 v4）             |
| **TanStack React Query** | ^5.90.21 | 5.x                   | 注意：與 SWR 重複（見技術債） |
| **TanStack React Table** | ^8.21.3  | 8.x                   | 否                            |
| **React Hook Form**      | ^7.69.0  | 7.x                   | 否                            |
| **Sentry**               | ^10.32.1 | 10.x                  | 否                            |
| **ESLint**               | ^9.36.0  | 9.x（flat config）    | 否（已使用 flat config）      |
| **Vitest**               | ^4.0.18  | 4.x                   | 否                            |
| **Playwright**           | ^1.56.0  | 1.x                   | 否                            |

---

### 架構優缺點分析

#### 優點

1. **統一資料層（createEntityHook）**
   - 67 個 entity 全部透過同一個 factory 產生，保證一致的 CRUD、快取策略、workspace 隔離、樂觀更新
   - 支援 `useList`、`useListSlim`、`useDetail`、`usePaginated`、`useDictionary` 五種查詢模式
   - IndexedDB 二級快取 + SWR 內存快取，離線體驗佳
   - Supabase Realtime 自動刷新，不靠 polling

2. **核心表設計（tour_itinerary_items 一 row 走到底）**
   - 從行程規劃到結團，同一筆資料不另開表，避免資料分散
   - 各階段填不同欄位，下游功能（報價、需求、分房）各自讀取所需欄位

3. **目錄結構清晰**
   - `src/app/` — 路由層（134 個頁面）
   - `src/features/` — 32 個業務模組，各自包含 components/hooks/services
   - `src/data/` — 統一資料層
   - `src/stores/` — 全域狀態（Zustand）
   - `src/components/ui/` — 44 個共用 UI 元件
   - `src/lib/` — 工具函式與第三方整合

4. **安全配置完善**
   - Middleware 實作 JWT 驗證 + Quick-Login Token 支援
   - CSP Header 配置完整（X-Frame-Options, X-Content-Type-Options 等）
   - 公開路由白名單明確列舉，非白名單一律需認證
   - standalone 輸出模式，適合容器化部署

5. **開發工具鏈完整**
   - Turbopack（Next.js 16 預設）
   - Bundle Analyzer 整合
   - Sentry 錯誤追蹤
   - Vitest + Playwright（單元 + E2E）
   - Husky pre-commit hooks
   - 自訂 ESLint 規則（venturo-design-system）

6. **國際化架構**
   - 已整合 next-intl，配置在 `src/i18n/`

#### 缺點

1. **ESLint 規則過度放寬**
   - `react-hooks/rules-of-hooks: 'off'` — 這是 React 最基本的安全規則，關閉可能導致難以追蹤的 hook 錯誤
   - `react-hooks/exhaustive-deps: 'off'` — 可能產生閉包 stale value 的 bug
   - `@typescript-eslint/no-explicit-any: 'off'` — 無法防止 any 的濫用
   - `@typescript-eslint/no-unused-vars: 'off'` — 死碼無法被檢測

2. **SWR 與 React Query 共存**
   - `swr` 和 `@tanstack/react-query` 同時存在於依賴中
   - createEntityHook 使用 SWR，但部分功能可能使用 React Query
   - 兩套快取機制並行，增加維護成本和 bundle size

3. **部分元件過大**
   - `RequirementsList.tsx` — 2,190 行
   - `tour-itinerary-tab.tsx` — 1,967 行
   - `AddRequestDialog.tsx` — 1,512 行
   - `OrderMembersExpandable.tsx` — 1,491 行
   - 超過 1,000 行的元件共 12 個

4. **Workspace 隔離硬編碼**
   - `WORKSPACE_SCOPED_TABLES` 是一個硬編碼的字串陣列（40+ 個表名）
   - 新增表格時容易忘記加入，應改為資料庫層級（RLS）或配置驅動

5. **`as never` 強制轉型**
   - createEntityHook 中大量使用 `tableName as never` 來繞過 Supabase 的型別檢查
   - 應利用 `SupabaseTableName` 泛型約束改善

---

### 技術債清單

| #   | 項目                                      | 嚴重度 | 影響範圍           | 說明                                                                  |
| --- | ----------------------------------------- | ------ | ------------------ | --------------------------------------------------------------------- |
| 1   | ESLint `react-hooks` 規則關閉             | **高** | 全域               | `rules-of-hooks` 和 `exhaustive-deps` 被關閉，可能隱藏嚴重 bug        |
| 2   | SWR + React Query 雙重依賴                | **中** | Bundle size + 維護 | 應統一為一套，建議保留 SWR（因 createEntityHook 已深度整合）          |
| 3   | 12 個超過 1000 行的元件                   | **中** | 可維護性           | 需逐步拆分為子元件                                                    |
| 4   | 備份檔案未清理                            | **低** | 程式碼整潔         | 3 個 .bak/.before-fix 檔案（PrintDisbursementPreview）                |
| 5   | `@typescript-eslint/no-explicit-any` 關閉 | **中** | 型別安全           | 20 處 `any` 使用，應逐步修復後開啟規則                                |
| 6   | `@ts-ignore`/`@ts-nocheck`                | **低** | 2 處               | 數量很少，但應逐步消除                                                |
| 7   | TODO/FIXME 註解                           | **低** | 25 個檔案，53 處   | 應定期清理或轉為 issue                                                |
| 8   | `deprecated` 標記                         | **低** | 8 個檔案           | 應安排移除已棄用的程式碼                                              |
| 9   | Workspace 隔離硬編碼                      | **中** | 資料安全           | 新表容易遺漏，應改為 RLS 或配置驅動                                   |
| 10  | `no-console: 'off'`                       | **低** | 生產環境           | 開發階段可接受，上線前應改為 warn                                     |
| 11  | syncToCore delete-then-insert             | **中** | 行程資料           | carry-over 靠 day_number+category 匹配，大幅調整可能丟失報價/需求狀態 |
| 12  | Build 需要 8GB 記憶體                     | **中** | CI/CD              | `--max-old-space-size=8192`，顯示 bundle 過大                         |

---

### 升級路線建議

#### 不需要升級的項目

- **Next.js 16** — 已是最新大版本，Turbopack 已啟用
- **React 19** — 已是最新大版本，可使用 Server Components、Actions 等新特性
- **Tailwind CSS 4** — 已是最新大版本
- **Zustand 5** — 已是最新大版本
- **Zod 4** — 已升級到 v4

#### 建議的架構改善路線

| 階段              | 項目                                                     | 預估工時 | 優先級 |
| ----------------- | -------------------------------------------------------- | -------- | ------ |
| Phase 1（1-2 週） | 開啟 `react-hooks/rules-of-hooks: 'error'`，修復所有違規 | 3-5 天   | P0     |
| Phase 1（1-2 週） | 開啟 `react-hooks/exhaustive-deps: 'warn'`，逐步修復     | 2-3 天   | P0     |
| Phase 1（1-2 週） | 清理備份檔案 + 移除未使用依賴                            | 0.5 天   | P1     |
| Phase 2（2-4 週） | 統一為 SWR（移除 @tanstack/react-query），或反之         | 3-5 天   | P1     |
| Phase 2（2-4 週） | 拆分 5 個最大元件（>1500 行）                            | 5-8 天   | P1     |
| Phase 3（1-2 月） | 逐步開啟 `no-explicit-any: 'warn'`，修復 any 使用        | 持續     | P2     |
| Phase 3（1-2 月） | Workspace 隔離改為 RLS 驅動                              | 5-8 天   | P2     |
| Phase 3（1-2 月） | syncToCore 改為 upsert 模式（取代 delete-then-insert）   | 3-5 天   | P2     |
| Phase 4（長期）   | 優化 bundle size（目標：build 不需要 8GB）               | 持續     | P2     |
| Phase 4（長期）   | 清理 TODO/FIXME（53 處）                                 | 持續     | P3     |

---

### 具體建議（按優先級）

#### P0 — 立即處理

1. **開啟 React Hooks ESLint 規則**
   - 修改 `eslint.config.mjs`，將 `react-hooks/rules-of-hooks` 改為 `'error'`
   - 將 `react-hooks/exhaustive-deps` 改為 `'warn'`
   - 逐一修復報錯，這是 React 應用最基本的安全網

2. **鎖定 TypeScript 版本**
   - 目前 `"typescript": "^5"` 範圍太寬，TS 5.x 的不同小版本可能有行為差異
   - 建議改為 `"typescript": "~5.8.0"`（或目前實際使用的版本）

#### P1 — 本季度內

3. **統一狀態管理/資料獲取方案**
   - `swr` + `@tanstack/react-query` 不應共存
   - createEntityHook 已深度使用 SWR，建議移除 React Query
   - 或者評估是否全面遷移到 React Query（功能更豐富但遷移成本高）

4. **拆分超大元件**
   - 優先處理 `RequirementsList.tsx`（2,190 行）和 `tour-itinerary-tab.tsx`（1,967 行）
   - 抽取子元件、自訂 hook、常數定義到獨立檔案

5. **清理遺留檔案**
   - 刪除 `src/features/disbursement/components/PrintDisbursementPreview.tsx.bak*`
   - 刪除 `src/features/disbursement/components/PrintDisbursementPreview.tsx.before-fix`

#### P2 — 下季度

6. **強化型別安全**
   - 逐步開啟 `@typescript-eslint/no-explicit-any: 'warn'`
   - 改善 createEntityHook 的 `as never` 轉型，利用泛型約束

7. **Workspace 隔離改善**
   - 將 `WORKSPACE_SCOPED_TABLES` 遷移到資料庫 RLS 策略
   - 或改為從配置檔/環境變數讀取，避免硬編碼

8. **syncToCore 穩定性改善**
   - 將 delete-then-insert 改為 upsert（基於 tour_id + day_number + category + resource_id）
   - 避免行程調整時丟失已填入的報價和需求狀態

---

### 下一步行動

| 行動項目                                | 負責人        | 截止日期   | 備註                   |
| --------------------------------------- | ------------- | ---------- | ---------------------- |
| 開啟 react-hooks ESLint 規則並修復違規  | 前端開發      | 2026-04-30 | P0，影響程式碼品質     |
| 確認 React Query 使用範圍，決定統一方案 | 系統架構師    | 2026-04-23 | 需盤點哪些模組用了 RQ  |
| 清理備份檔案                            | 任何人        | 2026-04-18 | 5 分鐘可完成           |
| 制定元件拆分計畫（前 5 大檔案）         | 前端開發      | 2026-05-15 | 配合功能迭代逐步拆分   |
| 評估 RLS 遷移方案                       | DevOps + 後端 | 2026-05-30 | 需與 Supabase RLS 整合 |

---

### 附錄：專案規模統計

| 指標                     | 數值                             |
| ------------------------ | -------------------------------- |
| TypeScript/TSX 檔案數    | 2,162                            |
| 總程式碼行數             | 445,552                          |
| 頁面數（page.tsx）       | 134                              |
| API 路由數（route.ts）   | 133                              |
| Entity Hook 數           | 67                               |
| Feature 模組數           | 32                               |
| UI 共用元件數            | 44                               |
| Zustand Store 數         | 12+                              |
| 最大單檔（排除型別定義） | RequirementsList.tsx（2,190 行） |

---

_報告產出時間：2026-04-16_
_產出工具：Claude Opus 4.6 架構分析_
