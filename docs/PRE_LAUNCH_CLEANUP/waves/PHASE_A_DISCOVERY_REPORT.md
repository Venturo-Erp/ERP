# Phase A Discovery Report

**完成**：2026-04-21 00:10
**Session**：2026-04-20 晚連續執行
**方法**：Supabase Management API 只讀查 + `src/` grep + migration 檔案分析

---

## 摘要

四個盤點項目全跑完、發現項目會改寫後續 Wave 計畫：

| 盤點                    | 結果                                                    | 影響 Wave                   |
| ----------------------- | ------------------------------------------------------- | --------------------------- |
| **A1 RLS 全掃**         | 28 張 FORCE RLS（等同 workspaces 紅線）、3 張完全缺 RLS | 🔴 新 Wave 或 Wave 2 擴充   |
| **A2 audit FK 驗證**    | 5 個漏網、1 嚴重 `tours.deleted_by → profiles`          | 🔴 Wave 0 補一項            |
| **A3 permissions 系統** | `useTabPermissions` 已存在、可直接用                    | ✅ Wave 2 不用新設計        |
| **A4 184 張空表分類**   | 可搬 126 / 不可搬 57 / 已不存在 1                       | 🟡 archive migration 要重寫 |

---

## A1 · RLS 盤點

### 🛑 嚴重：28 張 FORCE RLS 表（等同 workspaces 紅線問題）

**原因**：`FORCE ROW LEVEL SECURITY` 讓 service_role 也被 policy 擋——就是 2026-04-20 登入 bug 的成因。CLAUDE.md 紅線寫明「不准對 workspaces FORCE RLS」、但下面這 28 張同樣 FORCE、可能有同類型 bug 等著爆。

```
accounting_accounts
accounting_entries
accounting_subjects
attraction_licenses
attractions
channel_members
companies
company_assets
confirmations
esims
files
folders
michelin_restaurants
payment_request_items
premium_experiences
selector_field_roles
supplier_categories
tour_confirmation_items
tour_confirmation_sheets
tour_itinerary_days
tour_itinerary_items       ← 核心表！若 API 用 admin client 查會爆
tour_leaders
tour_role_assignments
tour_room_assignments
tour_rooms
visas
workspace_modules
workspace_selector_fields
```

**風險**：API route 用 `getSupabaseAdminClient()` 查這些表、若 policy 沒寫 service_role 例外、會空結果。

**建議動作**：

- 逐張評估：改 `NO FORCE` 還是保留但在 policy 加 service_role 例外
- 至少對「API route 常用的」優先處理：`tour_itinerary_items`、`confirmations`、`files`、`folders`、`visas`

### 🟡 次要：3 張缺 policy

```
_migrations     — 系統內部表、正常
rate_limits     — 系統、正常
ref_cities      — 4-18 新建的參考表、該加 policy
```

**建議**：`ref_cities` 開 RLS + 加「workspace 內讀取」policy。

---

## A2 · audit FK 驗證

查 `pg_constraint` 找所有 audit 欄位的實際 FK 指向、不指 employees 的：

### 🔴 1 個嚴重漏網（ERP 核心表）

| 表      | 欄位         | 錯指         | 修法                              |
| ------- | ------------ | ------------ | --------------------------------- |
| `tours` | `deleted_by` | **profiles** | Wave 0 擴充：改指 `employees(id)` |

**注意**：4-20 FK 重構 17 表、但 `tours.deleted_by` 被漏掉——inventory 沒列這欄位。

### 🟡 4 個 traveler domain（可接受）

| 表                       | 欄位         | 錯指                | 處置                      |
| ------------------------ | ------------ | ------------------- | ------------------------- |
| `traveler_conversations` | `created_by` | `auth.users`        | 旅客端 domain、可獨立邏輯 |
| `traveler_trips`         | `created_by` | `traveler_profiles` | 同上                      |
| `traveler_split_groups`  | `created_by` | `traveler_profiles` | 同上                      |
| `social_groups`          | `created_by` | `traveler_profiles` | 同上                      |

**建議**：traveler/social 系統是另一個 domain（旅客本人操作、不是員工）、指 traveler_profiles 或 auth.users 語義合理。
**但** `tours.deleted_by` 是 ERP 員工操作、必須修。

---

## A3 · permissions 系統

### 現況：已有完整職務權限系統、不用新設計

三個 hook 分工清楚：

```
src/lib/permissions/
├─ hooks.ts
│  ├─ useWorkspaceFeatures        — 功能開關（付費 / basic）
│  ├─ useRolePermissions          — route 層（現為空殼）
│  └─ usePermissions              — 整合 + isAdmin
├─ useTabPermissions.tsx          — 職務 × module × tab 權限 ⭐ Wave 2 用這個
└─ index.ts
```

### Wave 2 的方向確立

**用 `useTabPermissions.canRead / canWrite`**、不要新設計 hasPermission。

API：

```tsx
const { canRead, canWrite } = useTabPermissions()

if (!canWrite('finance', 'travel-invoice')) return <Unauthorized />
if (!canRead('finance', 'reports')) return <Unauthorized />
```

資料來源：`role_tab_permissions` 表（已存在）。

### Wave 2 前置工作（下次 session 第一步）

1. 盤點所有頁面現有權限檢查：
   - hardcode `isAdmin` 的頁（audit 統計：settings/company、hr/roles 等）
   - 已用 `canRead/canWrite` 的頁（看多少）
   - 完全沒檢查的頁（`/finance/travel-invoice` 等）
2. 列 permission key 清單（建議 module × tab 組合）：
   ```
   finance.requests / .payments / .travel-invoice / .reports
   hr.roles / .employees / .salary
   settings.company / .workspace / .integrations
   tools.reset-db / .audit-trail
   ```
3. 給 William 審、他在每個 role 後台勾要給哪些 tab

---

## A4 · 184 張空表分類

### 結果（grep only、不是 100% 保證）

| 類別                           | 張數    | 可動嗎                               |
| ------------------------------ | ------- | ------------------------------------ |
| 🟢 真死（0 row + grep 無引用） | **126** | 可搬 `_archive`                      |
| 🟡 未啟用但 code 有引用        | **57**  | **不可搬**（功能準備中）             |
| 🔴 其實有資料                  | 0       | —                                    |
| ⚪ DB 已無此表                 | 1       | `employee_job_roles`（4-18 已 drop） |

### ⚠️ grep 的盲點

我只抓 `.from('xxx')` pattern、漏：

- type import：`Database['public']['Tables']['xxx']`
- service 層封裝（`TABLE_NAMES.X`）
- 動態 table name

**實證警告**：真死清單裡有 3 張 4-20 FK 重構剛處理過的表：

- `tour_control_forms`
- `file_audit_logs`
- `emails`

這些 4-20 剛動過 FK、按理 code 有引用、grep 漏抓。
所以真死 126 張 → 實際可搬應該 **< 126**。建議 Wave 1d 前再過一輪（type import + service 掃描）。

### 🟡 57 張「不該搬」清單（功能準備中）

```
accounting_accounts              — 會計核心、未啟用
accounting_period_closings       — 月結封閉、未啟用
accounting_transactions          — 會計交易、未啟用
advance_items / advance_lists    — 預支款、未啟用
announcements                    — 公告、未啟用
background_tasks                 — 背景任務、未啟用
brochure_documents / _versions   — 型錄、未啟用
calendar_events                  — 行事曆、audit 說在用但 0 row
checks                           — 支票、未啟用
company_contacts                 — 公司聯絡人、未啟用
customer_inquiries               — 客戶詢問、未啟用
departments                      — 部門、未啟用
design_templates                 — 設計範本、未啟用
employee_payroll_config          — 員工薪資設定、未啟用
employee_permission_overrides    — 個人權限覆寫、未啟用
flight_status_subscriptions      — 航班訂閱、未啟用
image_library                    — 圖庫、未啟用
invoice_orders                   — 發票訂單、未啟用
knowledge_base                   — 知識庫、未啟用
leave_balances / _requests / _types — 請假、未啟用
line_conversations / _messages   — LINE、未啟用
linkpay_logs                     — 藍新付款、未啟用
messages                         — 訊息、未啟用
missed_clock_requests            — 漏刷卡、未啟用
overtime_requests                — 加班、未啟用
payroll_*（5 張）                 — 薪資、未啟用
pnr_*（7 張）                     — PNR/航班、未啟用
quote_confirmation_logs          — 報價確認 log、未啟用
request_responses / _items / supplier_request_responses — 詢報價回覆、未啟用
tour_confirmation_items / _sheets — 團務確認、未啟用
tour_meal_settings / _request_items / _role_assignments — 團務細項、未啟用
tour_tables / _vehicles / _vehicle_assignments — 桌位/車輛、未啟用
transportation_rates             — 交通費率、未啟用
travel_invoices                  — 發票！audit 說核心表、但 0 row（尚未開第一張）
visas                            — 簽證、未啟用
workspace_meta_config            — workspace 設定、未啟用
```

### 建議

- **archive_empty_tables migration 重寫**：從 184 改成 ~120 張（先拿掉 57 張 + 排除 grep 漏抓的 4-20 FK 處理表）
- **先放著不搬**也行——空表不影響效能、只影響 types.ts 大小（21k → 9k）
- Wave 1 已省略這步、Phase D 上線前再處理

---

## 🎯 盤點結論：Wave 計畫修正

### Wave 0 擴充

- 新增：修 `tours.deleted_by → employees`（1 條 migration）

### Wave 2（權限系統）確立方向

- 不用新設計 hasPermission、延伸現有 `useTabPermissions`
- 前置：盤點現有檢查 + 列 permission key 清單

### 新 Wave：RLS 體檢

- 28 張 FORCE RLS 逐張評估（Wave 2.5 或 Wave 3 前置）
- 優先：tour_itinerary_items / confirmations / files / folders / visas

### Archive migration 緩做

- 原 184 張降為 126（扣 57 有 code 引用 + 1 已刪）
- 但 grep 有盲點、實際安全數 < 126
- 不是上線阻擋項、Phase D 前再決定要不要搬

---

_本報告 Phase B 各 Wave 執行時會進一步細化、有新發現補進 BACKLOG.md_
