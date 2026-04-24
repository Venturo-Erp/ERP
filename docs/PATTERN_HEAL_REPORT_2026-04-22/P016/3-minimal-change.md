# P016 Surgical Changes 守門報告 — Minimal Change Engineer

**我的立場**：只動要動的。每行改動必須能直接追溯到「修 P016（workspaces DELETE policy 漏洞）」。不是「差不多也該」、不是「順手乾淨」、不是「既然都改到這了」。

**幕僚 1 方案 B+ 總評**：方向對、但 **加料過多**。有 3 處「while I'm here」夾帶、1 處可以不動的檔。下方逐項判。

---

## 1. DB Migration — `20260422170000_fix_workspaces_delete_policy.sql`

### ✅ 允許

- `DROP POLICY IF EXISTS "workspaces_delete"` + `CREATE POLICY ... USING (false)`：這一 DROP + CREATE 對、是 P016 的本體。
- `COMMENT ON POLICY`：兩行字、追溯需要、留。
- 驗證 DO block 檢查 `relrowsecurity / relforcerowsecurity`：這是 CLAUDE.md 紅線守門、**算防呆不算加料**、留。

### ❌ 拒絕 / 🤔 要確認

- **幕僚 1 並未順手改 SELECT/UPDATE/INSERT**。檢查草案：乾淨、只動 DELETE policy。✅ 通過。
- **檔名時戳 `20260422170000`**：今天已有 `20260422160000`、編號連續、OK。

---

## 2. API Route — `src/app/api/workspaces/[id]/route.ts`

### ✅ 允許

- 新增 `import { createServiceClient }`、`import { getSupabaseAdminClient }`（DELETE 需要）、`import { getServerAuth }`（原已 import、保留）。
- 新增 `requireTenantAdmin` helper：**逐字複製** `src/app/api/permissions/features/route.ts:9-55` 的同名 helper、一致 pattern、合格。
- 新增 `export async function DELETE`：P016 本體。
- UUID 格式 regex 驗 `workspaceId`：算 boundary validation、勉強允許（理由：API 是對外邊界、CLAUDE.md「Simplicity First」裡特別保留 boundary 驗證）。
- `employee_count` 防呆回 409：跟 UI client-side 檢查對稱、server 也擋、合理。

### ❌ 拒絕

- **草案第 145 行註解**：「重構 GET 是 optional、若想 surgical 可留不動」→ 請明確「GET 不動」。不要把「optional 重構」留在紀錄裡給未來 reviewer 誤會。**任何對 GET 的動作一律拒絕**。GET 的權限邏輯已跟 P003-H 自對齊、沒壞。

### 🤔 要拆到別 PR

- **helper 重複**：`requireTenantAdmin` 現在會出現在 3 個地方（`permissions/features/route.ts`、新 `workspaces/[id]/route.ts`、`tenants/create/route.ts` 預期也有）。CLAUDE.md 的 Minimal Change 原則明講「三個相似就容忍、第四次再抽」、**現在複製第 2 次、是正解**。等之後出現第 4 個 caller、再抽到 `src/lib/auth/require-tenant-admin.ts`。→ **本次 PR 不抽**。

---

## 3. UI — `WorkspacesManagePage.tsx:77`

### ✅ 允許

- `supabase.from('workspaces').delete().eq(...)` → `fetch('/api/workspaces/${workspace.id}', { method: 'DELETE' })`：P016 本體。
- `response.ok` 檢查 + 401 / 403 / 409 分支：**照既有 `WorkspacesManagePage` 自己的 try/catch + `alert` + `logger.error` pattern**、同風格、通過。

### ❌ 拒絕

- **417 / 409 錯誤文案細分**：草案裡 409 case 吐 `errMsg || WORKSPACES_LABELS.刪除失敗`。**只用 `WORKSPACES_LABELS.刪除失敗` 即可**、不吐 raw server message 到 UI（這是既有風格、其他 handler 都這樣）。→ 改成「優先 LABEL、errMsg 只寫 logger」。
- **client 端 employee count 檢查保留**：草案有保留、合格。但不准順手改 `.or('is_bot.is.null,is_bot.eq.false')` 過濾邏輯、保持**一字不改**。
- **confirm dialog 文案**：絕對不動。
- **loading state / toast**：絕對不動、保留 `alert`。

### 🤔 要拆到別 PR

- （無）

---

## 4. UI — `AddWorkspaceDialog.tsx:139`（rollback）— **這段我最有意見**

幕僚 1 選了**方案 C**（整個建公司搬 `/api/tenants/create`）。我的判斷：**方案 C 是重構、不是 P016 修復**。

### ❌ 拒絕（方案 C 的「順手改」列表）

1. **把 130 行 `handleSubmit` 砍成 40 行**：這是重構、超出「修 P016 rollback 漏洞」的 scope。
2. **改動 `/api/tenants/create/route.ts:121` workspace code 驗證規則**（`/^[A-Z]+$/`）：已經明擺是順手。拒絕。
3. **刪掉 `supabase` / `bcrypt` import**：這是「順手改造成的孤兒、順手清」。但如果根本不搬 flow、就沒有這個孤兒可清。→ 順手幅度指數級放大。
4. **整個建公司邏輯改 server-side**：優點（DRY / 入口統一 / 未來 feature seed 好改）全部是**真實價值、但不是 P016**。請**拆到新 PR `project_consolidate_workspace_creation`**。

### ✅ 允許的 P016 最小修

**只改 line 139 那一行 rollback DELETE**：

```typescript
// line 139 附近
if (empError) {
  // 如果建立員工失敗、呼叫 server-side rollback（P016：client 無權 DELETE workspaces）
  await fetch(`/api/workspaces/${workspace.id}`, { method: 'DELETE' })
  throw empError
}
```

**為什麼這樣夠**：

- line 139 的 rollback 只在「建 workspace 成功 → 建 employee 失敗」極窄路徑觸發。
- 該用戶已有建 workspace 的權限（走到這行前 `workspaces.insert()` 已成功）。
- DELETE API 會再驗一次 `tenants.can_write`、即便 insert 是漏洞利用、rollback DELETE 也守得住（server gate 一致）。
- **不動其他邏輯、不刪 import、不改流程**、純粹換一行呼叫。

### 🤔 要拆到別 PR

- **整個建公司搬 `/api/tenants/create`**：拆 `project_consolidate_workspace_creation`、獨立評審、獨立回歸。理由：動 bcrypt 工作路徑、Auth 建帳號路徑、employee `supabase_user_id` 綁定路徑、均為高風險。
- **workspace code uppercase/lowercase 統一**：拆 `project_workspace_code_case_convention`、獨立處理。

---

## 5. 孤兒檢查

- **本次 P016 surgical 版本造成的孤兒**：零。`supabase` / `bcrypt` 都還在用（line 96 `workspaces.insert()`、line 118 `bcrypt.hash`、line 122 `employees.insert()`、line 162 `employees.update()`）。
- 如果堅持走方案 C、孤兒一堆、**反而不 surgical**。

---

## 6. 精簡版 vs 完整版對比

| 項目                    | 完整版（幕僚 1 方案 B+）                    | 精簡版（我的版本）                        |
| ----------------------- | ------------------------------------------- | ----------------------------------------- |
| DB migration            | ✅ 動 `workspaces_delete` policy            | ✅ 相同                                   |
| API 新增 DELETE handler | ✅ 新增（~80 行）                           | ✅ 相同                                   |
| WorkspacesManagePage:77 | ✅ 改 fetch                                 | ✅ 相同（409 文案收斂）                   |
| AddWorkspaceDialog:139  | ❌ 搬整個 flow 到 `/api/tenants/create`     | ✅ **只換 1 行 rollback 為 fetch DELETE** |
| 額外動到的檔            | `api/tenants/create/route.ts`（code regex） | 無                                        |
| Diff 行數估             | +200 / -140（重寫 Dialog）                  | +85 / -5                                  |
| 回歸風險                | 中（動 Auth / bcrypt / employee 綁定路徑）  | 低（只改 delete 呼叫）                    |
| P016 漏洞是否關閉       | ✅ 是                                       | ✅ 是（等效）                             |

**我的推薦**：**精簡版**。理由三條：

1. P016 漏洞關鍵是「client 不能直接打 `workspaces.delete()`」、精簡版靠「policy USING (false) + rollback 改 fetch DELETE」已 100% 達成。
2. 方案 C 的所有價值（DRY / 未來好改）都是真實的、但不屬於 P016 的「修」scope、屬於「改進」scope。混在一起提交 = bug-fix PR 變成 refactor avalanche、正是 Minimal Change 最警戒的模式。
3. 精簡版回歸風險低、review 時間可壓到 15 分鐘、William 點頭門檻低。

---

## 摘要（給主 Claude / William）

幕僚 1 方案 B+ **方向 90% 正、加料 30%**。DB migration 和 API DELETE handler 兩項乾淨通過。`WorkspacesManagePage:77` 的 fetch 改動幾乎乾淨、只要把 409 錯誤訊息收斂成既有 LABEL 即可。真正要拒絕的是 `AddWorkspaceDialog:139` 的方案 C — 把整個建公司流程搬到 server API，這不是 P016 修復、是獨立重構、該拆 PR。**我建議的精簡版只改 line 139 那一行為 `fetch('/api/workspaces/${id}', { method: 'DELETE' })`，既達到 P016 漏洞關閉（client 無法直接 `workspaces.delete()`），又不動 130 行 Dialog flow、不動 bcrypt 路徑、不動 Auth 綁定、不動 `/api/tenants/create` 的 code regex**。diff 估 +85/-5 行、回歸面小、review 快、William 可以一次點完頭。**完整版（方案 C）價值確實存在、但請另立 PR `consolidate_workspace_creation`**、別跟 P016 綁一起。

**推薦**：精簡版 P016 本次先上、方案 C 拆下一輪、bug-fix 歸 bug-fix、refactor 歸 refactor。
