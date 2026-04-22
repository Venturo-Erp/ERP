# P010 — role_tab_permissions RLS 修復 · Surgical Minimal Change 守門

## 身份宣告

我是 **Minimal Change Engineer（Surgical 守門者）**。
我的價值用「**沒寫的行數**」衡量、不是寫了什麼。
本次 P010 修的是 `role_tab_permissions` 4 條 policy 全 `USING: true` 的根因問題 —
**根因修復合理**（非 workaround），但 scope 必須鎖死、絕不擴張。

憲法依據：CLAUDE.md「Surgical Changes」 + `feedback_no_workarounds.md`（根因 OK）+ 本次任務書。

---

## Scope 核准清單（只能動的）

本次 PR 允許出現的改動、**僅以下**：

1. **新增 1 個 migration 檔**
   - 路徑：`supabase/migrations/20260422140000_fix_role_tab_permissions_rls.sql`
   - 內容：
     - `DROP POLICY` 舊 4 條（SELECT / INSERT / UPDATE / DELETE）
     - `CREATE POLICY` 新 4 條、以 `workspace_id` 做租戶隔離（詳細條件由幕僚 1/2 草擬，我只守 scope）
     - 保留 / 新增 1 條 `service_role` 例外 policy（系統後台維護用）
     - 允許 `COMMENT ON POLICY` 為每條 policy 寫一行用途註解（視為文件化、不是「順手改」）
   - 預估：~30 行 SQL、±5 行

2. **不新增、不修改任何其他檔案。**

---

## Scope 否決清單（絕不能動的）

以下若出現在任何幕僚草案、**我一律否決**：

| 否決項 | 原因 |
|---|---|
| ❌ 修改 `workspace_roles` 的 RLS | 跟 P010 無關、另案處理 |
| ❌ 改 `role_tab_permissions` 的 schema / column / index | 本次只動 policy、不動表結構 |
| ❌ 順手加 CHECK constraint | 那是 P007 的範圍 |
| ❌ 碰 `/api/roles/[roleId]/tab-permissions/route.ts` | 只動 DB、不動 TS/TSX code |
| ❌ 碰 `validate-login` 相關 code | 跟本次無關 |
| ❌ 順手修 `employee_permission_overrides` 同類問題 | 列入 pattern-map 下次處理、**本次不做** |
| ❌ 順手「復活」`is_super_admin()` 函式 | 跟 P010 無關 |
| ❌ 加 audit log trigger | P009 範圍 |
| ❌ 補 tests / RLS integration test | P015 範圍 |
| ❌ 改寫 migration naming 慣例 / 加 README | 沿用既有慣例即可 |

---

## 預期改動量

| 指標 | 預估 |
|---|---|
| 新增檔案數 | 1 |
| 修改檔案數 | 0 |
| TypeScript 改動行數 | **0** |
| SQL 改動行數 | ~30（±5） |
| 影響表數 | 1（僅 `role_tab_permissions`） |
| 5 分鐘內可讀懂 | ✅ 是 |
| Blast radius | 僅限該表的 RLS 讀寫權限、不影響 schema、不影響任何既有 API call shape |

---

## 預估會想越界的地方（防患未然）

根據我對 senior-dev / reviewer 的標準人格畫像、預測以下 6 個越界誘惑、**一律預先否決**：

1. **「順便把 `is_super_admin()` RPC 復活」** — ❌ 否決。該函式若不存在、就該在另案討論是否恢復；本次修 policy 不依賴它，用 `workspace_id` 直接隔離就夠。
2. **「順便加 `audit_logs` trigger 記錄 policy 變更」** — ❌ 否決。P009 範圍、不是 P010。
3. **「順便補 RLS integration test」** — ❌ 否決。P015 範圍。
4. **「順便修 `employee_permission_overrides` 同樣的 USING: true」** — ❌ 否決。同 pattern 下次批次處理、本次 PR 只打一個點。
5. **「順便改其他 RLS policy 的 naming 一致化」** — ❌ 否決。consistency trap。
6. **「順便把 migration 檔分成 3 個 step migration」** — ❌ 否決。過度抽象、一個檔案搞定就好。

若幕僚 1 / 幕僚 2 的草案觸及以上任何一項、**退稿重寫**、只留 policy 4 條 + service_role 1 條。

---

## 最小化建議（能不能更小？）

問自己三遍「能不能更小」：

- **Q1：能不能只改 2 條 policy、不改 4 條？**
  - A：不能。4 條（SELECT/INSERT/UPDATE/DELETE）全 `USING: true`、全都是洞、必須一次補齊。少補一條就還有洞、等於沒修。
- **Q2：能不能用 `ALTER POLICY` 代替 `DROP + CREATE`？**
  - A：不建議。PostgreSQL `ALTER POLICY` 只能改 expression、改不了 `USING` 與 `WITH CHECK` 的組合邏輯；`DROP + CREATE` 更明確、review 更快、rollback 更乾淨。保持 `DROP + CREATE`。
- **Q3：`COMMENT ON POLICY` 算不算順手改？**
  - A：不算。它是「文件化新建 policy」、是建立動作的一部分、不是修改無關代碼。保留。
- **Q4：`service_role` 例外到底要不要加？**
  - A：要。系統後台維護（seed / migration script / admin dashboard）需要 bypass、這是必要的、不是順手加的。

結論：**已經是最小集合**、不能再縮。

---

## 回傳摘要（< 200 字）

P010 的 Surgical scope 應該是：**1 個 migration 檔、~30 行 SQL、0 行 TypeScript**。
只動 `role_tab_permissions` 的 4 條 policy + service_role 例外、一次 `DROP + CREATE` 寫完、允許 `COMMENT ON POLICY` 文件化。
絕不順手碰：`workspace_roles` RLS、`is_super_admin()` 復活、audit trigger、integration test、`employee_permission_overrides` 同類問題、tab-permissions API route code、validate-login code、schema/column/index、CHECK constraint。
若幕僚草案越界、一律退稿。這次 PR 必須 5 分鐘可讀懂、blast radius 僅限一張表的 RLS、不影響任何既有 API / UI 行為。
根因修復合理（非 workaround）、但 scope 鎖死。
