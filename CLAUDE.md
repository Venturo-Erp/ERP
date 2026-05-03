# CLAUDE.md — Venturo ERP

> 最後重寫：2026-05-02。把長期累積的地圖 / 必讀 / 過時報告全部清掉、只留實際在用的規則。

---

## 優先順位（William 親口、2026-05-02）

**資安 #1 → 效能 #2 → SSOT #3**

- 資安第一：洞 = 客戶資料外洩、商業終結
- 效能第二：SaaS 化讀取量 = Supabase 成本、列表預設載少、分頁固定 15 筆、不給「每頁筆數」選擇器
- SSOT 第三：不是不重要、但跟前兩者衝突時讓位

---

## 五大方向（每次動手前審視）

開發任何功能、修任何 bug、只走這五個方向。其他都不重要。

### 1. 路由連結（入路由 / HR / 租戶 / 顆粒度）

- 動到頁面 / 路由前、確認三個 layer 都對齊：
  - **路由本身**（Next.js `app/` 目錄）
  - **HR 顆粒度**（`role_capabilities`、`module.tab.action` 三段式 code）
  - **租戶開通**（`workspace_features`、租戶有沒有買這個功能）
- 路由守門 SSOT：`src/components/guards/ModuleGuard.tsx`
- Capability 推導 SSOT：`src/lib/permissions/capability-derivation.ts`
- API 守門：`src/lib/auth/require-capability.ts`

### 2. 修改程式時的前後端影響（GitNexus）

**動 symbol 前必跑 impact**。不准 grep 替代、call graph 比文字搜尋準。

```
gitnexus_impact({ target: "symbolName", direction: "upstream" })
gitnexus_context({ name: "symbolName" })
gitnexus_query({ query: "概念" })
```

- HIGH / CRITICAL 風險先報告、再決定動不動
- rename 用 `gitnexus_rename`、不要 find-and-replace
- commit 前跑 `gitnexus_detect_changes`
- 索引過期會警告、跑 `npx gitnexus analyze`

### 3. 介面 UI 架構

> 之後會整體重寫、本節暫不規範。先沿用既有：列表用 `EnhancedTable` / `ListPageLayout`、Dialog 必設 `level={1|2|3}`、莫蘭迪色系 `morandi-*`。

### 4. RLS 資安

- RLS policy 用 `has_capability_for_workspace()`、不准散刻 capability check
- Admin client 必 per-request、**不准 singleton**（`src/lib/supabase/admin.ts`）
- API route 守門：`require-capability` + RLS 雙保險
- 動 RLS migration 前跑 `tests/e2e/login-api.spec.ts`

### 5. 資料讀取連線（含防連點）

- Client cache：SWR、`revalidateOnFocus: false`、`dedupingInterval: 5min`
- Layout context SSOT：`/api/auth/layout-context` 一次抓 user/employee/workspace/capabilities/features
- Hydration race：`useLayoutContext` 必須等 `_hasHydrated`、否則空 capabilities 會誤判 redirect /unauthorized
- 列表預設 20 筆、分頁固定 15 筆、不給「每頁筆數」選擇器（SaaS 化讀取量 = 成本）
- 列表搜尋 server-side、跟 PostgREST query string 對齊
- **防連點**：所有「儲存 / 刪除 / 確認」按鈕必須 `disabled={loading}`、避免雙擊重複寫入
- 寫入失敗時 client state 還原 + toast、不要靜默失敗

---

## 紅線（違反 = 弄丟資料 / 打斷登入）

### 紅線 0（最高、無例外）：絕對不准刪 William 的檔案 / 資料

**檔案層**：
- 不准刪 `src/` 下任何既有檔案，除非 William 明說「砍掉 X」
- 不准刪 vault（`brain/wiki/`）下任何檔案
- 不准 `rm -rf`、`git clean -f`、`git checkout .` 任何形式的批次刪除
- 重構時用「新增 + 取代引用」、舊檔留著由 William 決定砍不砍

**資料層**：
- 不准 `DROP TABLE` 任何有資料的表（特別是：`payment_requests` / `payment_request_items` / `disbursement_orders` / `receipts` / `employees` / `customers` / `tours` / `orders` / `quotes` / 任何 HR 相關表）
- 不准 `DELETE FROM` 既有資料、不准 `TRUNCATE`
- 不准寫不可逆的 destructive migration（`DROP COLUMN` with data、`ALTER COLUMN type` 會 silent truncate）
- destructive migration 寫好放 `supabase/migrations/_pending_review/`、由 William 確認再 apply
- 唯一例外：純加法的 schema 增量（`ADD COLUMN`、`CREATE TABLE IF NOT EXISTS`、純 INSERT seed）可以直接寫並 apply

**為什麼是 #0**：
- 請款單 / 出納單 / 人資資料 = 真實營運資料、刪了沒救
- 砍掉的檔案 = 可能是 William 半完成的工作、不知道為什麼留著就先別動
- 相比寫錯 RLS（紅線 1）打斷登入是可救的、刪資料是無法回溯

**怎麼判斷**：
- 不確定能不能刪 → 不刪、先問 William
- 看到孤兒檔 / 沒 reference 的 code → 報告「我看到 X 沒被引用、要不要砍」、由 William 決定
- 看到表結構不合規格 → 寫 migration **加新欄位**、不要刪舊欄位

### 紅線 1：`workspaces` 不准 FORCE RLS

FORCE RLS 讓 service_role 也被 policy 擋、登入 API 用 admin client 查 workspace code 拿到空、所有人登入失敗。

- `workspaces` RLS 可以開、但 `NO FORCE`
- 動 RLS policy 的 migration 必先跑 `tests/e2e/login-api.spec.ts`
- 歷史：2026-04-20 出過事、`20260420d_fix_workspaces_force_rls.sql` 修

### 紅線 2：審計欄位 FK 一律指 `employees(id)`

front-end `currentUser?.id` 拿的是 `employees.id`、不是 `auth.users.id`。FK 指 `auth.users` insert 必炸。

- `created_by` / `updated_by` / `performed_by` / `uploaded_by` / `locked_by` / `last_unlocked_by` → `REFERENCES public.employees(id) ON DELETE SET NULL`
- 只有「這 row 就是 Supabase 用戶本身」的欄位（`user_id` / `sender_id` / `friend_id`）保留 FK 到 `auth.users`
- Client 寫入：`created_by: currentUser?.id || undefined`（不是 `|| ''`）

---

## Build / Commit 規則

```bash
npm run type-check    # commit 前必過
npm run lint          # 不能新增 console.log
./scripts/check-standards.sh --strict   # 憲法守門
```

- **NEVER** `--no-verify` / `--no-gpg-sign` 跳過 hook
- **NEVER** 新增 `as any` / `: any`
- **NEVER** push 有 type error 的程式碼
- 不要 amend 已 push 的 commit、永遠新增 commit

---

## 工具參考

| 任務 | 工具 |
|------|------|
| 路由 / 模組權限改動 | `src/components/guards/ModuleGuard.tsx` + `role_capabilities` + `workspace_features` |
| Schema 真相 | Supabase MCP（`mcp__supabase__list_tables`） |
| Migration | `npm run db:migrate` |
| 影響分析 | `gitnexus_impact` / `gitnexus_context` |
| 列表頁範本 | `src/components/layout/list-page-layout.tsx` + `EnhancedTable` |
| 認證 SSOT | `src/lib/auth/useLayoutContext.ts` |

---

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **venturo-erp**. Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

<!-- gitnexus:end -->
