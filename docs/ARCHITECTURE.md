---
type: architecture-snapshot
status: enriched
freshness: volatile
updated: 2026-05-03
review_cycle: monthly
next_review: 2026-06-03
summary: Venturo ERP 程式架構快照（features / routes / api / lib / stores / migrations 里程碑）— 給開發 AI / 接手同事 / William 自己對話前讀的「地圖」
---

# Venturo ERP — Architecture Snapshot

> ⚠️ 這是**靜態快照**、不是即時資料。即時 query 用 `gitnexus_query / gitnexus_context / gitnexus_impact`。
> 本檔每月覆蓋更新一次（next: 2026-06-03）。

---

## 跟 brain/ 的分工

| Vault | 用途 |
|---|---|
| `~/Projects/brain/wiki/companies/venturo/products/erp/` | **概念 / 戰略 / 設計 / 競品 / 商業** |
| `~/Projects/venturo-erp/`（本 repo + Obsidian vault）| **實作 / code / migrations / 開發紀錄** |

讀順序：
1. `brain/wiki/companies/venturo/Venturo ERP.md` —— 產品定位、起源 DNA
2. `brain/.../strategy/AI整合平台/AI整合平台發展策略.md` —— 整體技術 / 商業策略
3. **本檔** —— 實作架構地圖
4. `CLAUDE.md`（root）—— 五大方向 + 紅線
5. 對應模組的 `brain/.../modules/{hr,accounting}/README.md`（onboarding）

---

## 技術棧

```
Next.js 16.0 + React 19.2 + TypeScript 5
Zustand 5.0（state management）
Supabase（PostgreSQL + RLS + Edge Functions）
Vitest 4.0 + Playwright（測試）
Sentry（錯誤追蹤）
next-international（i18n）
```

部署：Vercel + Supabase Cloud
Project Ref：`wzvwmawpkapcmkfmkvav`

---

## 模組地圖

### `src/features/`（19 個業務模組、含 file 數量）

| 模組 | 規模 | brain 對應 |
|---|---|---|
| **tours** | 129 files | 旅遊團主軸（最大模組）|
| **orders** | 54 files | 訂單管理 |
| **quotes** | 51 files | 報價單 |
| **finance** | 36 files | 財務 |
| **visas** | 23 files | 簽證管理 |
| **attractions** | 18 files | 景點（會接 brain `data/attractions/` 12,113 份）|
| **calendar** | 18 files | 行事曆 |
| **disbursement** | 17 files | 出納單 |
| **dashboard** | 16 files | 儀表板 |
| **todos** | 12 files | 待辦事項 |
| **transportation-rates** | 9 files | 交通報價 |
| **contracts** | 7 files | 合約 |
| **itinerary** | 7 files | 行程 |
| **hr** | 6 files | ⚠️ v0、規格見 [brain hr_erp_system](../brain/wiki/companies/venturo/products/erp/modules/hr/) |
| **suppliers** | 6 files | 供應商 |
| **tour-leaders** | 6 files | 領隊 |
| **payments** | 4 files | 付款 |
| **confirmations** | 1 file | 確認 |

### `src/app/(main)/`（21 個 route 區）

`accounting / calendar / cis / customers / dashboard / database / finance / hr / login / orders / payslip / settings / tenants / todos / tours / unauthorized / visas`

特殊：`error.tsx`、`layout.tsx`、`loading.tsx`、`page.tsx`、`unauthorized/`

### `src/app/api/`（44 個 endpoint 區）

```
accounting / ai / ai-settings / ai-workflow / airports
amadeus-totp / auth / bank-accounts / cis / contracts
cron / customers / d / employees / fetch-image
finance / gemini / health / hr / itineraries
job-roles / lib / line / linkpay / log-error
meta / ocr / orders / permissions / quotes
roles / settings / storage / suppliers / tasks
tenants / todo-columns / tours / users / workspaces
```

### `src/lib/`（核心 lib）

`actions / api / auth / cache / cis / constants / cron / crypto / data / db / design-tokens / excel / external / hr / i18n / itinerary-generator / line / linkpay / navigation / passport-storage`

### `src/stores/`（Zustand stores）

`accounting / auth / calendar / leader-availability / region / theme / user / workspace`
+ `core/`、`sync/`、`utils/`、`workspace/`、`types/`

### `src/components/`（共用 UI）

`dialog / editor / guards / layout / providers / resource-panel / selectors / shared / table-cells / ui / widgets`

關鍵 SSOT：
- `guards/ModuleGuard.tsx` —— 路由守門
- `layout/list-page-layout.tsx` —— 列表頁範本
- `editor/tour-form/` —— 團體表單核心

---

## Migrations 里程碑（時間軸）

### v0 期（2025-11 ~ 2025-12 中）—— 基礎建立
- 11/30：請款單系統（payment_request_items）
- 12/03：客戶系統 + payment_requests 顯示欄位
- 12/05~12/15：RLS policy 多次調整、客戶資料擴充（國籍、性別、暱稱、飲食、護照）
- **12/16：`create_accounting_module`** ⭐ 會計模組 v0 建表
- 12/28：`accounting_v2_card_subjects` ⭐ 會計 v2 重構（card subjects）

### v1 期（2026-01 ~ 2026-04）—— 模組擴充 + 重構
- 03/19：accounting voucher links / equity 帳戶 / complete setup / verify
- 04/11：HR requests + reports（v0 HR）
- 04/22：`drop_hr_payroll_leave_personal` ⚠️ 砍 HR payroll/leave/personal 三表（聚焦策略決策）
- 04/23：`drop_dead_accounting_tables` + `drop_erp_bank_accounts` ⚠️ 大清理
- 04/24：`add_hr_settings_tab`

### v2 期（2026-05-02 ~ 2026-05-03）—— ⭐ 大重構日（30+ migrations）
- 05/02：visas / linkpay / companies compliance、RLS policies 19 表修復、attractions 在地化、platform_admin 修復
- 05/02：drop supabase_user_id / sync_fields / legacy_migrations / dead auth users
- 05/02：add missing indexes + triggers
- **05/03：HR core 系統建立** ⭐
  - `create_attendance_core`（打卡核心、對應 [hr_erp_system 第 2 章](../brain/wiki/companies/venturo/products/erp/modules/hr/hr_erp_system.md)）
  - `create_leave_system`（請假、第 3 章）
  - `create_payroll_system`（薪資、第 4 章）
  - `backfill_hr_capabilities_for_admin`
- 05/03：`reset_role_capabilities`（權限重設）
- 05/03：`create_venturo_platform_workspace`（platform 租戶）
- 05/03：disbursement 重構（id to uuid、voucher fk、type check）
- 05/03：`unify_finance_numeric_to_20_2` ⭐ 統一財務 numeric 精度
- 05/03：`drop_dead_accounting_tables_retry`（會計 v2 收尾）
- **05/03：CIS workflow 建立** ⭐（對應 [CIS 工作流](../brain/wiki/companies/venturo/service/cis/)）
  - `create_cis_workflow`
  - `create_cis_audio_bucket`
  - `create_cis_pricing_items`
- 05/03：todos add description / tags、workspaces add billing_day、receipts refund fields

### 已知後續里程碑（已排）
- **2026-05-07**：永豐 EPOS 簽約整合（對應 [EPOS-永豐](../brain/wiki/companies/venturo/products/erp/integrations/EPOS-永豐.md)）

---

## 模組 ↔ brain 概念對應

開發某個模組時、查 brain 對應位置：

| ERP 模組 | brain 概念 / 戰略 |
|---|---|
| `features/hr` + `app/(main)/hr` | [hr/README](../brain/wiki/companies/venturo/products/erp/modules/hr/) — onboarding + 規格 + 競品（打卡之星）|
| `features/finance` + `features/disbursement` + `app/(main)/accounting` | [accounting/README](../brain/wiki/companies/venturo/products/erp/modules/accounting/) — onboarding + 紅線（不做完整會計）|
| `features/tours` + `features/orders` + `features/quotes` | （核心業務、待 brain 補對應戰略檔）|
| `features/attractions` | brain `data/attractions/` 12,113 份 + 之後遷移 `wiki/knowledge/travel/`（待議）|
| `app/(main)/cis` + `lib/cis` | [service/cis/](../brain/wiki/companies/venturo/service/cis/) — A 主工作流 + B 戰略 + C 商業參考 |
| `lib/line` + `app/api/line` | [Venturo APP](../brain/wiki/companies/venturo/products/app/) — LINE 整合 |
| `lib/linkpay` | [LinkPay teardown](../brain/.claude/projects/-Users-william-Projects/memory/) — 待拔除 |

---

## 資料庫關鍵表（按業務分組）

### 旅遊核心
`tours / orders / quotes / customers / order_members / itineraries / tour_destinations / tour_documents`

### 財務 / 會計
`payment_requests / payment_request_items / disbursement_orders / receipts / journal_vouchers / journal_lines / chart_of_accounts / accounting_accounts / accounting_transactions / accounting_period_closings`

### HR
`employees / job-roles（待整合）/ attendance（v2 新建）/ leave（v2 新建）/ payroll（v2 新建）`

### 多租戶
`workspaces / workspace_features / workspace_roles / workspace_countries / workspace_line_config / workspace_attendance_settings / workspace_meta_config / workspace_selector_fields`

### 權限 SSOT
`role_capabilities`（427 rows）— APP-style capability ledger
`workspace_features`（247 rows）

### 通訊 / AI
`ai_conversations / ai_memories / ai_settings`（羅根客服）/ `customer_service_conversations` / `line_groups / line_users / line_conversations / line_messages`

### CIS（5/3 新建）
`create_cis_workflow / create_cis_audio_bucket / create_cis_pricing_items`

### 參考表（不開 RLS、純對照）
`ref_airlines / ref_airports / ref_booking_classes / ref_ssr_codes / ref_status_codes / ref_destinations / ref_countries / ref_cities`（3,250 rows）

---

## 關鍵 SSOT 檔（出問題第一個查）

| 場景 | SSOT |
|---|---|
| 路由守門 | `src/components/guards/ModuleGuard.tsx` |
| Capability 推導 | `src/lib/permissions/capability-derivation.ts` |
| API 守門 | `src/lib/auth/require-capability.ts` |
| 認證 / Layout | `src/lib/auth/useLayoutContext.ts` |
| 編號 | `src/stores/utils/code-generator.ts` |
| Admin client | `src/lib/supabase/admin.ts`（必 per-request、**不准 singleton**）|

---

## 開發紅線快查（完整見 root [CLAUDE.md](./CLAUDE.md)）

- ❌ 不准刪 `src/` / vault 既有檔（紅線 #0）
- ❌ 不准 `DROP TABLE` 有資料的表（紅線 #0）
- ❌ `workspaces` 不准 FORCE RLS（紅線 #1）
- ❌ 審計欄位 FK 一律指 `employees(id)`（紅線 #2）
- ❌ 不准 `--no-verify` / `as any` / `console.log`
- ❌ 動 symbol 前必跑 `gitnexus_impact`（GitNexus 規則）

---

## 維護記事

- 本檔每月 review 一次（next: **2026-06-03**）
- 更新方式：跑 `find src/features` `find src/app/(main)` `ls supabase/migrations/ | tail -50` `git log --stat` 後覆寫
- 跟 brain 對應 link 改動時、雙邊都要更新
