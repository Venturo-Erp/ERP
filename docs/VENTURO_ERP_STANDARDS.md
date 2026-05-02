# Venturo ERP 整理憲法

> **版本**：1.0
> **建立**：2026-05-02
> **目標**：ERP 必達 venturo-app 等級乾淨。半合規不通過、回去追完。
>
> **這份是規範 SSOT。** 散落在其他 docs 的舊規範如果跟這份衝突、以這份為準。

---

## Section 0 — 哲學

### 三條核心

1. **SSOT** — 一個業務概念對應**一張**主表 + 必要明細表。衍生視角靠 SQL view、不開新表。
2. **沒規範的東西不准長出來** — 新表 / 新欄位 / 新 hook 都必須對應這份憲法的條款、否則 PR 不過。
3. **半合規 ≠ 合規** — 「先這樣、之後再修」是 ERP 之所以爛的歷史教訓、不准再來。

### 跟 venturo-app 的關係

venturo-app 是「實驗室 / 規範來源」、ERP 是「商業主線」。
- venturo-app 的好東西 → backport 進 ERP（如 `has_capability` RPC、樂觀 UI 規範、`get_layout_context` 模式）
- ERP 不准帶不存在於 venturo-app 的舊概念污染（如 `magic_library` / `proposal_package` / `tour_rooms`）

---

## Section 1 — 命名約定

詳細規則見 `docs/FIELD_NAMING_STANDARDS.md`（命名 SSOT）、這裡只列**核心結論**。

### 表名

- `snake_case` **複數**（`customers`、`tour_itinerary_items`）
- 不准單數、不准混 camelCase

### 欄位名

- `snake_case` 單數
- **同概念全站同名**、見 FIELD_NAMING_STANDARDS.md 的「標準欄位對照表」
- 重點：`birth_date`（不是 `birthday`）/ `english_name`（不是 `name_en`）/ `display_name`（不是 `name`）/ `passport_number`（不是 `passport_no`）

### 應用層命名

| 層 | 規則 | 範例 |
|---|---|---|
| Hook | `use{TableSingularOrPlural}` | `useTours()`、`useMyCapabilities()` |
| API route | `/api/<module>/<plural-table>` | `/api/finance/payments` |
| Type | `{Entity}` 單數 | `Tour`、`Order` |
| Store | `use{Entity}Store` | `useTourStore` |
| Capability code | `{module}.{tab?}.{action}` | `hr.roles.write`、`tours.read` |

---

## Section 2 — 每張業務表必有

### 必要欄位

```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
created_at   timestamptz NOT NULL DEFAULT now(),
updated_at   timestamptz NOT NULL DEFAULT now(),
is_active    boolean NOT NULL DEFAULT true,
created_by   uuid REFERENCES employees(id) ON DELETE SET NULL,  -- ⚠️ 不是 auth.users
updated_by   uuid REFERENCES employees(id) ON DELETE SET NULL
```

### 必要設施

- **Index** on `workspace_id`
- **Trigger** `set_updated_at()` 自動維護 `updated_at`
- **RLS 開啟** + 三條 policy（見 Section 5）
- **Migration 命名**：`YYYYMMDDHHMMSS_descriptive_name.sql`、推完寫進 `supabase_migrations.schema_migrations`

### 例外

非業務表（如 `ref_*` 對照表、`cron_*` 系統表）可豁免 `workspace_id` 跟 `created_by`、但要在 `SCHEMA_PLAN.md` 註明「**為什麼例外**」。

**Append-only log 表**（純記事件、寫入後不再 UPDATE、如 `line_messages` / `quote_confirmation_logs`）可豁免 `updated_at` 欄位跟對應 trigger。理由：log 表只新增不更新、`updated_at` 永遠等於 `created_at`、徒增一個欄位 + 一個 trigger 而沒用途。例外條目同樣要在 `SCHEMA_PLAN.md` 註明。

### 多租戶表編號 UNIQUE 規則

> 起源：2026-04-21、御風租戶撞角落租戶 `DO260423-001`、13 張表全踩同個反模式。

**有 `workspace_id` 的表、編號 / 識別碼欄位的 UNIQUE 必須含 `workspace_id`**：

```sql
-- ❌ 錯：全域 UNIQUE、新租戶會撞到別家
CREATE TABLE disbursement_orders (
  code TEXT UNIQUE,      -- 禁止
  workspace_id UUID NOT NULL,
  ...
);

-- ✅ 對：tenant-scoped UNIQUE
CREATE TABLE disbursement_orders (
  code TEXT NOT NULL,
  workspace_id UUID NOT NULL,
  ...
  UNIQUE (workspace_id, code)
);
```

**為什麼**：客戶端 SELECT 被 RLS 擋 → 看到 0 筆 → 算 nextNum=1 → INSERT 撞別家 → 23505。retry 沒用（每次算同編號）。全域 UNIQUE 也讓租戶可以 INSERT 探測「別家今天開幾張單」、洩漏營運數量。

**例外（全域 UNIQUE 才合理）**：

- 外部系統給的識別碼、全球唯一（LINE user_id、eSIM 序號、Message-ID）
- 一個 workspace 一份的設定表（UNIQUE 就是 `workspace_id` 本身）
- 共用資料表（無 workspace_id、如 `ref_cities`）

公開 URL 用全域 key 查詢的表（如 `tours.code` / `tour_requests.code` / `contracts.code`）必須先決 URL 設計（短 UUID vs 加租戶 path）、不能用「設計取捨」當藉口保留全域 UNIQUE。

---

## Section 3 — SSOT 原則

每個業務概念在 `docs/SCHEMA_PLAN.md` 必須註明：

- **主表**（唯一）
- **明細表**（一對多、如 `payment_request_items`）
- **衍生視角**（用 SQL view、不准開新表）
- **❌ 不准建概念重疊新表**

### 違反會被打回票的反例（從 ERP 痛點來）

- ❌ `accounts` vs `chart_of_accounts`（同概念、留 chart_of_accounts、已砍 2026-05-02）
- ❌ `accounting_subjects` vs `chart_of_accounts`（v2 重建並列死表、已砍 2026-05-02）
- ❌ `tour_itinerary_days` 寄生在 `tour_itinerary_items` 之上（dual-write 災難、待砍）
- ❌ `workspace_modules` + `workspace_features` + `FEATURES` 常數 三套表達租戶開通

### SSOT 改變的流程

要把某張表升為 SSOT、其他降為衍生：

1. 在 SCHEMA_PLAN.md 標明
2. 寫一次性 migration 遷移舊表資料
3. 改所有 query 點到新主表
4. 跑 type-check + 全 grep 確認 0 殘留
5. DROP 舊表
6. **不准 dual-write 過渡期超過 1 個 PR**

---

## Section 4 — 軟刪除

**全站只用** `is_active boolean NOT NULL DEFAULT true`。

**禁止**：
- ❌ `is_deleted` boolean
- ❌ `deleted_at` timestamp
- ❌ 同表三套並存

**Query pattern**：`.eq('is_active', true)` 必須出現在所有列表 query。

**業務狀態時間戳例外**：`terminated_at` / `closed_at` / `confirmed_at` 是業務狀態的時間點、不是軟刪除、保留。

---

## Section 5 — RLS（Row Level Security）

### 三條標準 policy

每張業務表必有：

```sql
-- 1. platform_admin_all：平台管理員繞過租戶隔離
CREATE POLICY "platform_admin_all" ON table_name
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'platform_admin');

-- 2. tenant_read：workspace member + 對應 module read capability
CREATE POLICY "tenant_read" ON table_name
  FOR SELECT TO authenticated
  USING (has_capability_for_workspace(workspace_id, '{module}.read'));

-- 3. tenant_write：workspace member + 對應 module write capability
CREATE POLICY "tenant_write" ON table_name
  FOR ALL TO authenticated
  USING (has_capability_for_workspace(workspace_id, '{module}.write'));
```

### `workspaces` 表特殊

- ⚠️ 不准 `FORCE ROW LEVEL SECURITY`（會擋到 service_role 登入流程、2026-04-20 痛過一次）
- RLS 可開、但 `NO FORCE`

---

## Section 6 — 權限系統

### SSOT

- DB：`role_capabilities(role_id, capability_code, enabled)` + `workspace_features(workspace_id, feature_code, enabled)`
- RPC：`has_capability(_code text)` / `has_capability_for_workspace(_workspace_id, _code)`
- 前端：`useMyCapabilities().has(code)`
- 後端：`hasCapabilityByCode(employeeId, code)`

### 禁止

- ❌ `useAuthStore.isAdmin` flag（已拔光、不准回來）
- ❌ 直接 query `role_tab_permissions`（表已 DROP）
- ❌ 在 application code 重做權限查詢、繞過 RPC

### Capability code 命名

- 模組級：`{module}.{action}` — `tours.read` / `tours.write`
- Tab 級：`{module}.{tab}.{action}` — `hr.roles.write` / `finance.payments-confirm.write`
- 平台級：`platform.is_admin`（取代 `useAuthStore.isAdmin`）

---

## Section 7 — i18n

### 規則

- 走 `next-intl`、文字放 `messages/zh-TW.json`
- React component 內 → `const t = useTranslations('namespace')`
- Server component / API route 內 → `getTranslations()` 從 `next-intl/server`

### 禁止（從 e8d9f69e8 那次半路爛 migration 學到）

- ❌ Module top-level 用 `t(...)`：
  ```ts
  // ❌ 錯：執行時 t 還沒定義
  export const labels = { pending: t('foo') }

  // ✅ 對：包成 function、在 component 內叫
  export const getLabels = (t) => ({ pending: t('foo') })
  ```
- ❌ Service class 方法用 `t(...)`：
  ```ts
  // ❌ 錯：class method 不是 React 環境
  class OrderService {
    validate() { throw new Error(t('foo')) }
  }

  // ✅ 對：service throw key、UI 翻譯
  class OrderService {
    validate() { throw new ValidationError('foo', 'orderService.mustAssociateTour') }
  }
  ```
- ❌ 變數遮蔽 i18n 的 `t`：
  ```ts
  const t = useTranslations()  // i18n 的 t
  // ...
  const t = tour as SomeType   // ❌ 把上面的 t 蓋掉
  ```

---

## Section 8 — UI / UX

### 規則

- **樂觀 UI**：所有 mutation 用 optimistic insert/update。失敗 revert + 顯示錯誤
- **禁** `router.refresh()` 在 mutation 後（會 full refetch + 閃爍）
- **Dialog** 必設 `level={1|2|3}`（避免遮罩疊加）
- **顏色**：用 morandi-* token、禁硬編 hex
- **shadcn/ui** 為基底、業務 component 只組合不寫視覺細節

詳細見 `docs/COMPONENT_GUIDE.md`、`docs/DESIGN_SYSTEM.md`。

---

## Section 9 — API 設計

### Route 結構

每個 API route 必須：

1. **Auth check**：`getServerAuth()`、否則 401
2. **Capability check**：`hasCapabilityByCode(employeeId, code)`、否則 403
3. **Workspace filter**：所有 admin client query 必須 `.eq('workspace_id', workspace_id)`
4. **`[id]` route 特別**：workspace_id filter **必須在 id filter 之前**（防跨租戶）

### 違反 = CRITICAL（資料外洩）

`[id]` route 沒先篩 workspace_id 就 query = 跨租戶資料外洩。立即修復。

---

## Section 10 — 禁止清單（從 ERP 痛點來）

新 PR 違反 = 退回。

1. ❌ **dual-write 同概念到多表**（行程三表的悲劇、items + days + jsonb 三份同源）
2. ❌ **`isAdmin` 後門式權限**（散在 27 檔 82 處、已拔光）
3. ❌ **建概念重疊新表**（accounts vs chart_of_accounts、subjects vs chart_of_accounts）
4. ❌ **hook 在 module level 用**（i18n 半路爛）
5. ❌ **service class 用 React hook**
6. ❌ **軟刪除三套並存**（is_active / is_deleted / deleted_at）
7. ❌ **commit message 寫假的 type-check 結果**（e8d9f69e8 宣稱 tsc passes 但實際 178 errors）
8. ❌ **單數命名表**（必須 snake_case 複數）
9. ❌ **module-tabs / FEATURES / workspace_features 各建一份開通清單**
10. ❌ **root 放散文 .md / 自誇報告 / 過期 plan**
11. ❌ **audit FK 指 auth.users 而非 employees(id)**（2026-04-20 痛過、17 表 30 FK 全切過）
12. ❌ **新 migration 跳過 timestamp 命名**
13. ❌ **新業務表沒 RLS / 沒 workspace_id**
14. ❌ **新 entity 沒對應 SCHEMA_PLAN.md 條目**
15. ❌ **同類資源存兩份**：
    - 兩份 auto-generated DB types（`src/types/database.types.ts` vs `src/lib/supabase/types.ts`、2026-05-02 發現過期不同步）
    - 兩套 migration tracking 表（`_migrations` vs `supabase_migrations.schema_migrations`、2026-05-02 發現並存）
    - employees 兩個 user FK 欄位（`user_id` vs `supabase_user_id`、2026-05-02 發現 trigger 雙向同步是過渡）
    - 已存在的請看 SCHEMA_PLAN 確認哪份是 SSOT、不准再生第二份
    - 重生 types 規定：只重生 SSOT 那份、另一份要嘛刪、要嘛 re-export SSOT
16. ❌ **凍結模組繼續加 code / 新欄位 / 新功能**
    - 凍結模組必須在 `SCHEMA_PLAN.md` 對應 section 列「凍結中、年月日」+ 凍結原因 + 解凍方向
    - 凍結期間只允許：純 bug fix、跟全站機械式 type-check / lint 一起改
    - 解凍流程：「重新審視 → 拆模組 → 不繼承半成品」、不准延續現有實作直接擴充
    - 當前凍結：（無）
    - 已處理歷史：**頻道聊天模組**（`channels` / `channel_members` / `messages` / `channel_groups` / `/channel` UI / `channel-chat/*` hooks）2026-05-02 凍結、同日 William 拍板「直接完全刪除」、4 張 DB 表 + 整個 UI 模組已徹底移除（migration `20260503040000_drop_channel_chat_system.sql`）
17. ❌ **直接 manual SQL 改 DB schema/function/policy、繞過 migration tracking**
    - 2026-05-02 發現：`is_super_admin()` 函式 migration 寫對了、但 DB 實際被改成 `RETURN false` stub、表示有人手動改 DB
    - 後果：migration replay 無法 rebuild 真實狀態、災難復原靠運氣
    - 規則：**所有 schema / function / policy 變更必須走 `supabase/migrations/` + `supabase_migrations.schema_migrations` 記錄**
    - 例外：純資料修補（UPDATE rows）可以、但必須開單記錄、不要動 DDL
18. ❌ **codebase 跟 SQL function 用不同欄位指同一概念**
    - 2026-05-02 發現：`employees.supabase_user_id` 在 src 有 66 處引用、`employees.user_id` 0 處、但 RLS 函式用 `user_id`
    - 後果：RLS 函式對 81% 員工失效（因為 user_id 沒值）
    - 規則：DB 欄位重命名 / 廢棄時、必須同步 src + SQL function + RLS policy 全更新、不准只動一邊
19. ❌ **使用 `console.log` / `console.error` / `console.warn`**
    - 必須用 `logger` from `@/lib/utils/logger`
    - 原因：production 環境 console 會被 logger 攔截做正確處理（Sentry / log aggregator）、直接 console.* 會漏進 stdout
    - 例外：`scripts/` CLI tool 內可用 console（不是 production code）

20. ❌ **使用 `any` / `as any` / `<any>`**
    - 用 `unknown` + type guard、或明確 DB row type（`Database['public']['Tables'][X]['Row']`）
    - 真的需要 any（第三方 lib / 動態表名 escape hatch / 凍結模組過渡）必須 `// eslint-disable-next-line @typescript-eslint/no-explicit-any` + 一行原因註解
    - 整檔需要的可在檔頭 `/* eslint-disable @typescript-eslint/no-explicit-any */` + 註解原因（例：stub component）
    - 例外：auto-generated types（`src/lib/supabase/types.ts`）/ `scripts/` CLI tool

---

## Section 11 — Definition of Done

每次 ERP 變更完成定義：

### 動 code 必過

- [ ] `npx tsc --noEmit` = 0 errors
- [ ] 沒新增 `any` / `as any`
- [ ] 沒違反 Section 10 任何一條
- [ ] 沒有 `console.log` / `console.error`（用 `logger`）

### 動 DB 必過

- [ ] migration 有 `YYYYMMDDHHMMSS_name.sql` 命名
- [ ] migration 在 `supabase_migrations.schema_migrations` 有記錄
- [ ] `npx supabase gen types typescript` 重生 `src/lib/supabase/types.ts`
- [ ] 動的業務表符合 Section 2 標準（必要欄位 + RLS + index）
- [ ] 砍表前確認 src 0 殘留 `from('table')` query

### 動概念必過

- [ ] `docs/SCHEMA_PLAN.md` 同步更新
- [ ] 沒製造新的 SSOT 違反
- [ ] 沒製造新的命名不一致

### 完成宣告

不到 venturo-app 等級的乾淨度 = 不通過、回去追完。

---

## Section 12 — 守門機制

### 已落地（2026-05-02）

- ✅ **守門 script**：`scripts/check-standards.sh` 自動掃 Section 10 違反（10/10 全綠）
  - `--strict` 模式：任何違反 = exit 1
  - 涵蓋：#2 isAdmin 散落 / #4 module-level hook / #6 軟刪除殘留 / #10 root .md / #11 audit FK / #12 migration 命名 / #15 同類資源兩份 / #18 命名分裂 / #19 console.* 散落 / 額外 tsc 0-error
- ✅ **pre-commit hook**：`.husky/pre-commit` 本地 commit 前跑
  - type-check → @ts-expect-error 檢查 → Next.js 15 params 檢查 → console.log warn → `check-standards.sh --strict`
  - 任何一步失敗 = commit 被擋
- ✅ **CI workflow**：`.github/workflows/standards-check.yml` PR / push 守門
  - PR to main/develop、或 push to main/develop 都會跑
  - 跑 `./scripts/check-standards.sh --strict`、違反 = CI 失敗
  - 與既有 `.github/workflows/ci.yml`（format / lint / type-check / build / E2E smoke）並行、不重複
- ✅ **Bundle size 守門**：`.github/workflows/bundle-size.yml` 既有、PR 跑
- ✅ **E2E smoke 守門**：`.github/workflows/ci.yml` 中 `e2e-smoke` job 守 login + workspace 路徑

### 待補（follow-up）

- ⏳ **RLS sim test 整合 CI**：`docs/_session/_rls_simulation_test.sql` 目前僅本地 manual 跑
  - 需 production DB 連線（吃 Supabase quota）
  - 待業務面決定要不要在 CI 跑、否則只在重大 RLS migration 後本地驗證
- ⏳ **commit message 自動掃描「假的 type-check pass」**（憲法 §10.7）：低風險、有時間再做

### 短期手動（持續）

- 每個 PR 用 Section 11 checklist 自審
- review 用 Section 10 禁止清單對照

---

## 既有 docs 的關係（2026-05-02 對齊後）

| 既有 doc | 狀態 | 角色 |
|---|---|---|
| `FIELD_NAMING_STANDARDS.md` | ✅ active | 命名 SSOT、Section 1 引用 |
| `SCHEMA_PLAN.md` | ✅ active | 業務地圖、Section 3 引用 |
| `NAMING_CONVENTION_STANDARD.md` | ⚠️ deprecated | 跟 FIELD_NAMING 重疊、提及已不用的 IndexedDB |
| `DATABASE_DESIGN_STANDARDS.md` | ⚠️ deprecated | §3 RLS 用舊函式名跟憲法衝突；§8 審計欄位 / §9 tenant-scoped UNIQUE 仍有效（後者已整合進本憲法 Section 2） |
| `CODE_STANDARDS.md` | ⚠️ deprecated | 基本規則跟憲法重疊；日期處理 / Stale Closure / RSC 邊界等實作細節仍有效 |
| `ARCHITECTURE_STANDARDS.md` | ⚠️ deprecated | 權限部分用舊 `FEATURE_PERMISSIONS` / `ROLE_CONFIG` 跟憲法 §6 衝突；五層架構 / Store / SWR / Realtime / 「團為中心」哲學仍有效 |
| `DEV_STANDARDS.md` | ❌ 已刪除 | 索引指向不存在的 doc、被本檔取代 |

**規則**：上面標 deprecated 的 docs、跟本憲法衝突部分以**本憲法為準**。仍有效的細節在各檔最上面 deprecation header 列明、可繼續引用、但不再更新。

---

## 改這份憲法的流程

1. 提出修改原因（避免重蹈哪個覆轍 / 補充哪個漏洞）
2. 改完同步更新 `docs/SCHEMA_PLAN.md` 跟 `Section 12` 的守門 script
3. 在 `docs/ARCHITECTURE_DECISIONS.md` 留一筆 ADR 記錄為什麼這樣決定

---

**鐵律**：未來 AI / 新人接手 ERP、第一份要讀的就是這份。其他 docs 是補充細節、不是 SSOT。
