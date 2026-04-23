# P016 方案 B+ Code Review（幕僚 2 · code-reviewer）

**前提**：幕僚 1（senior-developer）初稿動筆時尚未落地。本 review 依「推測幕僚 1 產出符合 pattern-heal 規範的標準方案 B+」進行**前置審查**、把「我希望初稿包含的細節」當驗收表。幕僚 1 落地後逐條對表。

---

## 200 字摘要

方向對：DB 收緊 policy + API 補 DELETE + UI 改走 API。三個上線前必改紅點：（1）migration 絕不能下 `FORCE ROW LEVEL SECURITY`、CLAUDE.md 紅線、2026-04-20 燒過登入炸；（2）DELETE handler 必須前置 guard 擋真人員工 / active tours / active orders / 金流 payments、不准無條件 CASCADE 蒸發整個租戶資料樹；（3）`requireTenantAdmin` 已 copy-paste 3 份（permissions/features、tenants/create、workspaces/[id] GET）、這次必須提取共用 util 不增第 4 份。另：AddWorkspaceDialog:139 的 rollback 如果改走同一支 DELETE API、會被自己的 guard 409 擋住、需要另外想 — 傾向 soft deactivate + cleanup ticket。

---

## 幕僚 1 初稿驗收清單

### A. Migration
- A1 `DROP POLICY IF EXISTS "workspaces_delete"` 先行（冪等）
- A2 新 policy `USING` 明確擋 authenticated（選型見下）
- A3 🔴 **不得** `FORCE ROW LEVEL SECURITY`（CLAUDE.md 紅線）
- A4 檔名 `20260422xxxxxx_fix_workspaces_delete_policy.sql`
- A5 DO $$ 驗證塊查 `pg_policies.qual` 不是 `true`
- A6 註解記「原 policy 被覆寫、來源不明、本 migration 重鎖」
- A7 若 `is_super_admin()` 已停用、不得當 policy 謂詞

### B. API DELETE `/api/workspaces/[id]` DELETE（新）
- B1 走 `requireTenantAdmin()`（**提取後的共用版**）、401/403 分開
- B2 真人員工 > 0 → 409
- B3 active（未歸檔）tours / orders / payments > 0 → 409、回傳阻擋類型與筆數
- B4 self-delete 禁令（不能刪自己所屬 workspace）
- B5 Corner workspace 硬擋（硬編 `CORNER_WORKSPACE_ID`）
- B6 通過 guard 才用 `supabaseAdmin` 繞 RLS 刪
- B7 回傳 200 + 刪除摘要（CASCADE row count 日誌化）
- B8 Audit log：操作者 + 目標 workspaceId + 時戳

### C. UI
- C1 `WorkspacesManagePage:77` 改 `fetch('/api/workspaces/'+id, {method:'DELETE'})`
- C2 UI 既有員工數檢查保留、但 server 是最終守門
- C3 `AddWorkspaceDialog:139` rollback 定案（見 §5.2）、不能直連 supabase
- C4 409 翻業務語言 alert、不是 generic「刪除失敗」

---

## 逐節審查

### 1. 漏洞與邊界條件

**1.1 Migration 選型**（🔴）
pattern map v1.2 寫「`is_super_admin()` 已停用」。選項：
- X `USING (is_super_admin())` → 🔴 不能用（function 停用）
- Y `USING (false)` → 安全、但語義像「忘了寫」
- Z `USING (auth.role() = 'service_role')` → 自文件化、**推薦**

幕僚 1 選 X 必退回；選 Y 我 🟡 建議改 Z。

**1.2 CASCADE 無條件刪**（🔴）
`workspaces` 是租戶根節點、CASCADE 會連帶 `employees` / `tours` / `orders` / `payments` / `receipts` / `channels` / `workspace_features` / `workspace_roles` ... 整棵樹蒸發。UI 第 60-68 行只擋員工數、不擋 tours/orders/payments。真實風險：點錯一下 2 團 + 所有訂單收款消失。**必須前置 guard 擋到只剩空殼才放刪**。

**1.3 service_role 繞 RLS**（🟡）
只要 A3 守住就行。FORCE RLS 帶進來、service_role 也被擋、登入炸。migration 頂註解強調。

**1.4 Corner 系統主管 跨租戶刪**（🟡）
現 `requireTenantAdmin` 檢查 `settings.tenants.can_write`、技術上能跨租戶刪。業務題留給 William：Corner 系統主管 是否 = Venturo 平台平台管理資格？若未來多租戶自管、要升 `requirePlatformAdmin`。這次不擴、但 code 留 TODO。

### 2. 測試覆蓋

幕僚 1 必附 e2e（或計畫）：
- T1 無登入 → 401
- T2 一般員工 → 403
- T3 tenant 系統主管 刪空殼 → 200
- T4 有員工 → 409
- T5 有 active tours → 409
- T6 刪 Corner → 403/409
- T7 刪自己所屬 → 403
- T8 🔴 **authenticated client 用 supabase.from('workspaces').delete() → 0 rows**（證明 DB policy 真擋、不只 API 層擋）

**`requireTenantAdmin` unit test 🟡 建議加**：pattern 複製 3 次、提取後必須鎖規格。

### 3. 副作用

| 模組 | 影響 |
|---|---|
| `/database/workspaces` | 直連改 API、多一次 round-trip |
| `AddWorkspaceDialog` rollback | flow 改、需新 error path |
| `/tenants` GET | 無影響 |
| `workspace_features` update | 無影響 |
| `is_active=false` soft deactivate | 無直接影響、**但建議順手驗** `workspaces_update` policy 是否也依賴已停用的 `is_super_admin()` |

**隱性依賴掃完**：grep `workspaces.*delete` 全站 — 只有 WorkspacesManagePage:77、AddWorkspaceDialog:139、tenants/create:197（API 內 rollback、admin client、不受 policy 影響）。**無 cron job** 自動清 inactive workspace。

### 4. 回滾

- **場景 A**：API 太嚴 → patch guard、不用 rollback migration
- **場景 B**：Policy 鎖錯連 service_role 都擋 → 不該發生、但真炸：
```sql
DROP POLICY IF EXISTS "workspaces_delete" ON public.workspaces;
CREATE POLICY "workspaces_delete" ON public.workspaces
  FOR DELETE TO authenticated USING (true);
```
幕僚 1 migration 底部附註解版 rollback block、緊急即貼。

**可逆性**：policy 改動、無 schema 變更、100% 可逆。整體 rollback risk 低。

### 5. 幕僚 1 判斷審查

**5.1 USING 選型**：推薦 Z（service_role 明確）。選 Y 🟡 建議改、不擋。

**5.2 AddWorkspaceDialog rollback 選型**（🔴 關鍵）
- A：改 `is_active=false`（soft）+ cleanup ticket → 髒資料、但簡單
- B：改走新 DELETE API → **會被自己的 guard 409 擋**（剛建的 workspace 有 1 個 系統主管 員工）
- C：保留 supabase client 直連 → 🔴 client 拿不到 service_role、現行 policy 擋死

**推薦 A**、簡單、14 天內補 cleanup job。幕僚 1 選 B 且沒想到 guard 衝突 → 🔴 必退。

---

## 必改清單（🔴 不改退回）

1. Migration **不得** 下 `FORCE ROW LEVEL SECURITY`（CLAUDE.md 紅線）
2. Policy `USING` 不得用 `is_super_admin()`（已停用）；用 `USING (auth.role() = 'service_role')` 或 `USING (false)`
3. DELETE API 前置 guard：真人員工 / active tours / active orders / 金流 payments > 0 一律 409
4. Corner workspace 硬擋不刪
5. Self-delete 禁令
6. `requireTenantAdmin` 提取共用 util、不再增第 4 份 copy-paste
7. AddWorkspaceDialog:139 rollback 選 A（soft deactivate + cleanup ticket）或專用 endpoint、**不能直接複用 DELETE API（會被自己 guard 擋）**
8. e2e 必須含 T8（DB policy 真擋 authenticated client 直刪）

## 建議清單（🟡 / 💭）

1. 🟡 Migration DO $$ 驗證塊、上線看 `pg_policies.qual`
2. 🟡 DELETE handler audit log（操作者 + target + 時戳）
3. 🟡 `requireTenantAdmin` 提取後加 unit test
4. 🟡 UI 409 錯誤翻業務語言（含員工數 / 未結案團數）
5. 💭 TODO 註記：未來多租戶自管拆 `requirePlatformAdmin`
6. 💭 Migration 底部附註解版 rollback block
7. 💭 順手檢查 `workspaces_update` policy 是否也依賴壞掉的 `is_super_admin()`

---

方向對、skeleton OK、魔鬼在 CASCADE 與 FORCE RLS 兩個紅線、加上 rollback corner case。紅項全綠才算可進 William 點頭環節。
