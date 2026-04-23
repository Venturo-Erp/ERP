# 03 · Security Engineer 診斷

## 身份宣告

我是 Security Engineer。我不評論程式優雅、只問一件事：**一個有合法帳號的員工、從登入那一刻起、能摸到多少不該摸的東西**。看到 P010 在 `role_tab_permissions` 已修完、我第一反應不是放心、是問：**那其他 USING:true 的表呢？今晚先修一張、其他四張就是「同一個病的兄弟」在旁邊等著被發現**。P003 架構師讀的是 API 層、我讀的是 DB policy 層、我要看這兩層拼起來、攻擊面還剩多少。

---

## 1. 逐條 Pattern：實際 Exploit Path

### Pattern A · `workspaces.workspaces_delete` USING:true（🔴 Critical）

**現狀驗證**：`supabase/migrations/20260405500000_fix_rls_medium_risk_tables.sql:622` 原本寫 `USING (is_super_admin())`、**但** `20251211000000_disable_all_remaining_rls.sql:34` 把整張 workspaces 的 RLS DISABLE。目前的淨效果等於 policy 不生效、任何帶 JWT 的 anon+authenticated 呼叫都能通過 DB 層（僅 middleware / API layer 可能擋）。

**實際攻擊路徑（authenticated 用戶）**：

```js
// 攻擊者：A 公司的普通員工、登入自家 workspace
const { data: { session } } = await supabase.auth.getSession()
// 直接呼叫 supabase-js client（公開 anon key 打 PostgREST）
const { error } = await supabase
  .from('workspaces')
  .delete()
  .eq('id', '<victim-workspace-uuid>')  // 從公司粉專 / LinkedIn 猜 code 再 select 拿 id
// RLS 沒擋 → 目標 workspace 整筆刪除 → ON DELETE CASCADE 帶走：
//   employees / tour_requests / orders / payments / all 工作流表
// 一鍵打爆競爭對手整間公司的 ERP
```

**爆炸半徑**：目標 workspace 所有 `ON DELETE CASCADE` 的子表（光看 migration 目錄就有 50+ 張含 `REFERENCES workspaces(id) ON DELETE CASCADE`）。這是**整間公司瞬間蒸發等級**。

**CWE / OWASP**：
- CWE-284 Improper Access Control
- CWE-285 Improper Authorization
- OWASP API Security Top 10 2023 — **API5: Broken Function Level Authorization**（刪 workspace 擁有管理員資格級功能、卻對 authenticated 全開放）

**攻擊門檻**：**極低**。任何一個合法登入的員工（連系統主管都不用）、知道目標 workspace id（從 URL / 邀請連結可拿）、單行 supabase-js 調用即可。若 anon key 被抓包、連登入都不用。

---

### Pattern B · `_migrations` 無 RLS（🟠 High — 情報洩漏）

**實際攻擊路徑**：

```js
// authenticated user
const { data } = await supabase.from('_migrations').select('*')
// 得到：完整 SQL 檔名序列 + 檔內容（若存內容欄位）
```

攻擊者取得：
1. **schema 變更全史**（哪張表什麼時候加什麼欄位、哪個 constraint 被拆過、哪個 RLS 被 DISABLE）
2. **未修補的弱點地圖**（看到 `disable_all_remaining_rls` 就知道還有多少張表沒 RLS）
3. **近期 migration 名**如 `20260422140000_fix_role_tab_permissions_rls` — 直接告訴攻擊者「這張表昨天才補、代表昨天之前是洞」

**本身不直接奪資料、但是所有後續攻擊的偵察教科書**。配合 Pattern A 使用：先讀 `_migrations` 拿 schema、再精準挑 USING:true 的表下手。

**CWE / OWASP**：
- CWE-200 Exposure of Sensitive Information
- CWE-1295 Debug Messages Revealing Unnecessary Information
- OWASP A01:2021 — Broken Access Control（info disclosure 變形）

**攻擊門檻**：**低**。任何 authenticated 用戶。

---

### Pattern C · `rate_limits` 無 RLS（🟠 High — 可規避 rate limit + 偵察）

**驗證**：`_applied/2026-04-18/20260418_create_rate_limit_system.sql` 建表時**完全沒有** `ENABLE ROW LEVEL SECURITY`、只有 `GRANT EXECUTE` 給 function。表本身對 authenticated 全開放讀寫。

**實際攻擊路徑**：

```js
// 攻擊 1：偵察 — 讀別人的 rate limit 狀態
const { data } = await supabase.from('rate_limits').select('*')
// 拿到：所有 key（含 `login:bob@corp.com`、`password-reset:alice@corp.com`）
//   → 映射出公司有哪些員工、誰剛試過重設密碼（預攻擊偵察）

// 攻擊 2：清自己的 throttle
await supabase.from('rate_limits').delete().eq('key', 'login:attacker@...')
// 清掉自己的計數 → brute force login 無限次數

// 攻擊 3：DoS 別人
await supabase.from('rate_limits')
  .upsert({ key: 'login:victim@corp.com', count: 9999, reset_at: '2099-01-01' })
// 把受害者的 login rate limit 打爆 → 永遠登不進來
```

**CWE / OWASP**：
- CWE-307 Improper Restriction of Excessive Authentication Attempts（可 reset 自己的 throttle 等於 rate limit 無效）
- CWE-799 Improper Control of Interaction Frequency
- OWASP API4:2023 — Unrestricted Resource Consumption
- OWASP A04:2021 — Insecure Design（rate limit 表不該是用戶可讀可寫）

**攻擊門檻**：**低**。任何 authenticated 用戶。比 Pattern A 次之、但影響面是**整個平台的 brute-force 防線**。

---

### Pattern D · `employee_permission_overrides` 全 USING:true（🔴 Critical — 橫向 / 縱向提權）

**實際攻擊路徑**：

```js
// authenticated user、自家 workspace 的普通會計
// 1. 先讀：偷看別家公司的權限結構
const { data } = await supabase
  .from('employee_permission_overrides')
  .select('*')
// 拿到跨租戶所有員工的個別權限覆蓋

// 2. 再寫：給自己加系統主管覆蓋
await supabase.from('employee_permission_overrides').insert({
  employee_id: '<my-own-employee-id>',
  permission: 'systemmaster.full_access',  // 或該系統定義的提權 key
  granted: true,
})
// 下一次 JWT refresh / 重登 → 我就擁有管理員資格

// 3. 跨租戶提權：給 B 公司某員工設我方的 token
await supabase.from('employee_permission_overrides').insert({
  employee_id: '<victim-employee-at-other-company>',
  permission: 'systemmaster.full_access',
  granted: true,
})
// 他下次登入變系統主管、攻擊者控制他的帳號做事
```

**爆炸半徑**：這是**所有權限系統的最後一道個人覆蓋**、USING:true 等於告訴每個登入用戶「你可以自己任命自己當系統主管」。比 Pattern A（刪 workspace）更陰險、因為 A 是一鎚定音可被發現、D 是悄悄提權長期潛伏。

**CWE / OWASP**：
- CWE-269 Improper Privilege Management
- CWE-639 Authorization Bypass Through User-Controlled Key（IDOR + privilege escalation）
- OWASP API3:2023 — Broken Object Property Level Authorization（BOPLA）
- OWASP API5:2023 — Broken Function Level Authorization
- OWASP A01:2021 — Broken Access Control

**攻擊門檻**：**極低**。任何 authenticated 用戶即可寫入。

---

## 2. 跟 P003（API 層跨租戶無 workspace 驗證）的關係

**答：是**。這 4 條是 **P003 的 DB 層鏡像、同一個病的不同 layer**。

兩層架構（縱深防禦 Defense-in-Depth）：

```
[ 攻擊者 ]
   ↓
[ L1: Middleware / API route ]  ← P003 在這層（API handler 沒驗 workspace_id）
   ↓
[ L2: Supabase PostgREST ]
   ↓
[ L3: DB RLS Policy ]           ← 本次 4 條 pattern 在這層
   ↓
[ 資料 ]
```

**關鍵洞察**：
1. **P003 修好 API 層 ≠ 安全**。只要攻擊者**繞過 API 層**（直接呼叫 supabase-js client 打 PostgREST、或透過 REST API 直打 `/rest/v1/<table>`）、L3 RLS 是**最後一道防線**。現在 L3 USING:true = **沒有最後一道防線**。
2. **L1 + L3 都漏 = 雙層失守、無縱深防禦**。L1 修完就停 = 單層防線、任何 regression / API 新增漏 workspace 檢查 = 立即穿透到 DB。
3. **Pattern A/D 特別危險**：因為 Supabase 的設計哲學就是「前端可以直接打 DB」。你的 anon key 在前端 bundle 裡、RLS 是**唯一**擋前端直連的東西。RLS USING:true 在 Supabase stack 下 = **把 DB 完全當 public API**。

**結論**：P003（API 層）已修 🟢、但本次 4 條（DB 層）未修 = **安全狀態實質仍是紅色**。兩層必須同時修才算有防禦深度。

---

## 3. 優先度排序與攻擊者模型

| # | Pattern | 嚴重度 | 攻擊門檻 | 可行攻擊者 | 爆炸半徑 |
|---|---|---|---|---|---|
| 1 | **D · employee_permission_overrides** | 🔴 Crit | 單行 SQL | 任一 authenticated 員工 | 跨租戶提權 + 長期潛伏 |
| 2 | **A · workspaces_delete** | 🔴 Crit | 單行 SQL | 任一 authenticated 員工 | 整間公司 ERP 蒸發 |
| 3 | **C · rate_limits** | 🟠 High | 單行 SQL | 任一 authenticated 員工 | brute-force 防線崩潰 + 員工偵察 |
| 4 | **B · _migrations** | 🟠 High | 單行 SQL | 任一 authenticated 員工 | 情報洩漏（輔助其他攻擊）|

**排序邏輯**：
- **D 第一**：提權後攻擊者擁有所有後續攻擊的 token、並且**難以發現**（普通員工變系統主管 不會有 alert）
- **A 第二**：破壞力最大、但一刪即明顯、客戶第一時間就發現、reputational 炸但可 restore backup
- **C 第三**：rate limit 被繞 = 所有 auth endpoint 對 brute-force 裸奔
- **B 第四**：info disclosure、本身不直接傷害、但是所有攻擊的偵察教科書

---

## 4. 上線前最小必修清單 vs 完整修清單

### 最小必修（🔴 上線前必改、不改就不要上線）

**只修這兩張**、上線相對安全：

1. **Pattern D · `employee_permission_overrides`** — 必須立即加 RLS workspace 隔離
2. **Pattern A · `workspaces`** — 必須開 RLS 並確保 DELETE policy 至少 `USING (is_super_admin())`、不能 USING:true

**修法 sketch（真正 migration 要走 safe-tenant-test）**：

```sql
-- Pattern A
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
-- 注意：不能 FORCE RLS（CLAUDE.md 紅線、會炸登入）
DROP POLICY IF EXISTS "workspaces_delete" ON public.workspaces;
CREATE POLICY "workspaces_delete" ON public.workspaces FOR DELETE TO authenticated
  USING (is_super_admin());

-- Pattern D
ALTER TABLE public.employee_permission_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "epo_select" ON public.employee_permission_overrides FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM employees e
      WHERE e.id = employee_permission_overrides.employee_id
        AND e.workspace_id = get_current_user_workspace())
    OR is_super_admin()
  );
CREATE POLICY "epo_write" ON public.employee_permission_overrides FOR ALL TO authenticated
  USING (is_super_admin() OR is_workspace_admin(<resolved_workspace>))
  WITH CHECK (is_super_admin() OR is_workspace_admin(<resolved_workspace>));
```

**為什麼這兩張是紅線**：
- D 讓普通員工能提權自己變系統主管、所有其他權限控制形同虛設
- A 讓普通員工能一鍵刪除整間公司、這是 existential risk

### 完整修（🟠 High、上線後 1-2 週內補）

3. **Pattern C · `rate_limits`** — RLS deny-all for authenticated（只准 service_role 透過 `check_rate_limit()` function 讀寫）
4. **Pattern B · `_migrations`** — RLS deny-all for authenticated（此表只該給 service_role 看）

這兩張不是 existential risk、但**都是很便宜的修法**（兩個 migration 檔、各 < 20 行）、沒理由上線後還留著。

### 並行檢查（衍生）

**強烈建議**：上線前用 `CLAUDE.md` 紅線條件跑一次全表掃描：

```sql
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;

SELECT tablename, policyname, qual FROM pg_policies
WHERE schemaname = 'public' AND qual = 'true';
```

以本次發現的 pattern 為模板、**4 張只是被發現的 4 張**、可能還有更多同病兄弟。不掃一次不能上線。

---

## < 200 字摘要

這 4 條是 **P003（API 層）在 DB 層的鏡像**、**同一個病縱深防禦的另一半**。P003 修完只代表 L1 擋住正常流量、但 Supabase 架構下、**任何人都能用前端 anon key 直打 PostgREST 繞過 L1**、此時 L3 RLS 是最後一道牆、USING:true = 牆不存在。

優先度：**D（permission_overrides 提權）> A（workspaces_delete）> C（rate_limits）> B（_migrations）**。4 條的攻擊門檻**都是一行 supabase-js 調用、普通登入員工即可**、不需要系統主管或 service_role。

**上線前最小必修**：D + A（防存在級災難）。C + B 上線後 1-2 週內補（但 migration 本身 < 20 行、沒理由拖）。**強烈建議上線前對 `pg_policies WHERE qual='true'` 全掃一次**、這 4 張只是露出來的冰山。
