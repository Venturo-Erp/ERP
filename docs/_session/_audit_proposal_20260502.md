# Audit Proposal — 資安 / SSOT 方向 (2026-05-02)

> agent 對 W 兩個重點（資安 / SSOT）做的 read-only audit。**不是已完成的工作**、是「發現 + 建議」、需 W 拍板要不要加進 backlog 派 agent 做。

LOW 風險 backlog 全清（B-001~B-005）後續做的 audit。下列 finding 大部分**不在現有 backlog 上**、需要 W 授權。

---

## 🔴 高 ROI 發現：admin client SSOT 嚴重破碎

**這是 W 兩重點（資安 + SSOT）的交集點、優先級最高。**

### 現況

`src/lib/supabase/admin.ts` 已經是 admin client SSOT、提供 `getSupabaseAdminClient()`、明確註解「per-request、不 singleton」。

**但 20 個檔案完全繞過 SSOT**、自己 `createClient(url, SUPABASE_SERVICE_ROLE_KEY, ...)`：

```
src/app/transport/[id]/confirm/page.tsx
src/app/public/contract/sign/[code]/page.tsx
src/app/public/insurance/[code]/page.tsx
src/app/api/customers/link-line/route.ts
src/app/api/customers/match/route.ts
src/app/api/accounting/vouchers/auto-create/route.ts
src/app/api/tours/by-code/[code]/route.ts
src/app/api/transport/send-booking/route.ts
src/app/api/contracts/sign/route.ts
src/app/api/meta/webhook/route.ts
src/app/api/itineraries/by-tour/[tourId]/route.ts
src/app/api/line/webhook/[workspaceId]/route.ts
src/app/api/line/webhook/route.ts
src/app/api/line/send-insurance/route.ts
src/app/api/orders/create-from-booking/route.ts
src/app/api/employees/by-ref/[ref]/route.ts
src/lib/ai-settings.ts
src/lib/supabase/api-client.ts
src/lib/line/ai-customer-service.ts
src/lib/notifications/channel-notify.ts
```

### 為什麼這同時是「資安」+「SSOT」問題

**SSOT 角度**：admin client 創建邏輯應該**只一處**（`admin.ts`）。現在有 21 套（admin.ts + 20 散落）。改 admin client 行為（如加 retry、log、auth header tweak）要改 21 處、漏一處就 inconsistent。

**資安角度**：
- `admin.ts` 設定了 `auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }`、是 server-side 安全配置
- 散落的 20 處有些**沒設這幾項**、預設值可能讓 session 殘留在 server runtime
- 散落的 20 處 review / patch 困難 — 之前 F1 (45 P1 admin client) 已修過一輪、但這 20 處仍在繞

### 風險評級
**MEDIUM**（純機械重構但要小心 webhook / public page 的 by-design service_role 用法）

### 建議新 task：N-001 admin client 收斂
- 範圍：20 個散落檔全改用 `getSupabaseAdminClient()`
- 例外白名單：webhook 簽名驗證階段、public page server-side data load — 仍可用 admin client、但走 SSOT
- 守門：F1 已修 45 處、本 task 是 F1 的補刀
- 驗證：grep `process.env.SUPABASE_SERVICE_ROLE_KEY` 在 src/ 應只剩 `admin.ts` + `settings/env/route.ts`（後者是 env config UI、合法）

---

## 🟡 SSOT 違反：SCHEMA_PLAN 已自我 flag 但未清

來源：`docs/SCHEMA_PLAN.md` line 690-702。

### 1. `workspace_modules` (0 row) vs `workspace_features` (235 row)
- SCHEMA_PLAN 註：「workspace_modules 0 row、可砍」
- **建議 N-002：DROP workspace_modules**（LOW、純 0 row 表）

### 2. `_migrations` vs `supabase_migrations.schema_migrations`
- SCHEMA_PLAN：「收斂、選一個為主」
- F5 應已處理（已完成清單有「F5：兩套 migration tracking 收斂」）
- **建議：N-003 驗證 F5 是否真的清完**（純驗證、可能沒 task 要做）

### 3. `todos` (6) vs `tasks` (12) 命名混淆
- SCHEMA_PLAN：「用途不同（個人 vs 團隊）但命名易混、考慮 rename」
- **不建議自動做** — 命名是業務語意、需 W 拍板要不要 rename + 怎麼 rename

### 4. LINE 系列 vs 客服系列 vs 凍結 channels
- SCHEMA_PLAN：「未來解凍時一起整理」
- 凍結模組相關、**不能動**

### 5. `actual_expense` 冗餘 + `paymentRequests` 複數體系
- 來源：`docs/ROUTE_CONSISTENCY_REPORT_2026-04-22/tours/tabs-deep-dive/G4-checkin-closing.md`
- 「帳務清潔」🔴 finding
- **HIGH 風險、需業務拍板** — 不在 agent 範圍

---

## 🟢 LOW 風險、純機械可做的清單（建議加進 backlog）

如果 W 拍板「繼續做」、以下是可立即派 agent 跑的：

| ID | 描述 | 風險 | 估計 |
|---|---|---|---|
| **N-001** | admin client 收斂、20 處改走 `getSupabaseAdminClient()` | MEDIUM | 1 個 PR、~80 行 diff |
| **N-002** | DROP `workspace_modules` 表（0 row） | LOW | 1 個 migration |
| **N-003** | 驗證 F5 migration tracking 收斂、清殘餘 | LOW | 純驗證 + 可能 1 個小 migration |

## 🟡 MEDIUM~HIGH、需 W 拍板的方向

| 主題 | 現況 | 拍板問題 |
|---|---|---|
| **N-M01** | `todos` vs `tasks` 命名混淆 | 業務上是不是要合併？或 rename `tasks` 成 `team_tasks`？ |
| **N-M02** | `/finance/` vs `/accounting/` 兩個 module | 這兩個是否真的需要分開、或要合併 module？（W 強調的「財務系統只一套」可能直指這個） |
| **N-M03** | `actual_expense` 冗餘 + `paymentRequests` 複數體系 | 報告已 flag、需業務拍板「分潤計算 / 對帳」要怎麼設計 |
| **N-M04** | 凍結模組（channels / messages / channel_groups）解凍計畫 | 解凍才能清最後 ~40 條用 `update_updated_at_column` 的 trigger（B-001 留下的尾巴） |

---

## 不在 audit 範圍內、但建議獨立評估

- **API 守門盤點**：95 個 route、grep `requireAuth` / `withAuth` / `getServerSession` 只匹配到部分 — 需要更精確的 audit（不是 grep 能搞定的、要逐 route 看）。建議獨立做一次 API 守門 audit、估 4-6 hr 工作量。

- **RLS policy 完整性**：21 表 4-policy 已標準化、但 SCHEMA_PLAN 說 ERP 約 80+ 業務表、剩下 ~60 張的 RLS 狀況不明。建議跑一次 RLS audit。

---

## 我的建議優先順序（給 W 拍板）

1. **先做 N-001（admin client 收斂）** — 命中 W 兩重點交集、ROI 最高、純機械
2. 然後做 N-002 / N-003 — 都是 LOW、收掉 SCHEMA_PLAN 的小尾巴
3. **暫停**等 W 對 N-M01 / N-M02 / N-M03 / N-M04 拍板再續
4. 再評估 API 守門 + RLS audit 要不要排

---

## 不做的事（agent 自我約束）

- 不寫 N-001/N-002/N-003 的 migration 或 patch（沒授權）
- 不對 N-M01~N-M04 提具體解法（業務語意決策）
- 不直接寫進 `_followup_backlog.md`（避開 entry doc 鐵律「沒在 backlog 裡的不要自己加事做」、由 W 決定加不加）

需 W 回應：「N-001 開做」/「N-002 開做」/「先停、我看完再說」/「方向錯了、改 X」
