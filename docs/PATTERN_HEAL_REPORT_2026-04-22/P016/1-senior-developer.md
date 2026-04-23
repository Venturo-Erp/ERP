# P016 修法草案 — Senior Developer

**Pattern**：`workspaces` 表 DELETE policy = `USING: true` → 任何登入用戶技術上可刪任一 workspace（CASCADE 刪整租戶資料）。
**根因**：原設計走 `is_super_admin()` (20260405500000)、但該函式已停用永遠 return false、有人把 policy 覆寫成 `USING: true` workaround。
**方案 B+**：DB 層關死 DELETE（policy 回 `USING (false)`）、改走 server-side API `/api/workspaces/[id]` DELETE handler + `requireTenantAdmin` + service_role bypass RLS。

---

## 1. DB Migration

**檔案**：`supabase/migrations/20260422170000_fix_workspaces_delete_policy.sql`

```sql
-- ============================================================================
-- Migration: P016 修 workspaces DELETE policy 的 workaround 漏洞
-- Date: 2026-04-22
-- ============================================================================
-- 歷史：
--   1. 20260405500000_fix_rls_medium_risk_tables.sql 原本 DELETE policy 是
--      USING (is_super_admin())、意圖只允許 super_admin 刪 workspace。
--   2. is_super_admin() function 後來被停用、永遠 return false、
--      UI「刪除公司」功能被卡死。
--   3. 有人把 policy 覆寫成 USING (true)（或類似 workaround）
--      → 任何登入用戶技術上可刪任一 workspace、CASCADE 毀整租戶。
--
-- 今日修法：
--   - policy USING (false)：RLS 路徑永遠拒絕 DELETE。
--   - service_role 自動 bypass RLS（Supabase 預設）、
--     所以 API 層用 getSupabaseAdminClient() 仍可刪。
--   - API 層 /api/workspaces/[id] DELETE handler 用 requireTenantAdmin 守門、
--     跟 /api/permissions/features 同 pattern（P003-A/H）。
--
-- 配合 UI 改動：
--   - WorkspacesManagePage.tsx:77 改打 /api/workspaces/[id] DELETE
--   - AddWorkspaceDialog.tsx:139 rollback 改呼叫 /api/tenants/create
--     （整個建公司流程搬 server-side、避免 client-side delete）
-- ============================================================================

BEGIN;

DROP POLICY IF EXISTS "workspaces_delete" ON public.workspaces;

-- DELETE 走 RLS 路徑永遠拒絕。
-- 合法刪除路徑：server-side API + service_role client（自動 bypass RLS）。
CREATE POLICY "workspaces_delete" ON public.workspaces
  FOR DELETE TO authenticated
  USING (false);

COMMENT ON POLICY "workspaces_delete" ON public.workspaces IS
  'P016 (2026-04-22): RLS 層永遠拒絕 DELETE。合法刪除必須走 server-side API (/api/workspaces/[id] DELETE) + requireTenantAdmin + service_role。';

-- 驗證：確認 workspaces 仍是 RLS ENABLE 但 NO FORCE（CLAUDE.md 紅線）
DO $$
DECLARE
  v_rls_enabled boolean;
  v_rls_forced boolean;
BEGIN
  SELECT relrowsecurity, relforcerowsecurity
    INTO v_rls_enabled, v_rls_forced
    FROM pg_class
    WHERE oid = 'public.workspaces'::regclass;

  IF NOT v_rls_enabled THEN
    RAISE EXCEPTION 'workspaces RLS 被關了、不符合預期';
  END IF;

  IF v_rls_forced THEN
    RAISE EXCEPTION 'workspaces FORCE RLS 被打開、會打斷登入（CLAUDE.md 紅線）';
  END IF;

  RAISE NOTICE '✅ P016 DELETE policy 修好、RLS ENABLE + NO FORCE 維持';
END $$;

COMMIT;
```

---

## 2. API Route — 新增 DELETE handler

**檔案**：`src/app/api/workspaces/[id]/route.ts`（既有檔、加 import + 加 requireTenantAdmin + 加 DELETE export）

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/api-client'
import { getServerAuth } from '@/lib/auth/server-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

// P016 (2026-04-22) + P003-A/H 同 pattern
// 只有有「租戶管理」權限的人（role_tab_permissions.settings.tenants.can_write）
// 才能動任何 workspace（刪除 / 更新功能權限 / 建立）。
async function requireTenantAdmin(): Promise<
  | { ok: true; workspaceId: string; employeeId: string }
  | { ok: false; response: NextResponse }
> {
  const auth = await getServerAuth()
  if (!auth.success) {
    return {
      ok: false,
      response: NextResponse.json({ error: '請先登入' }, { status: 401 }),
    }
  }

  const adminClient = getSupabaseAdminClient()
  const { data: employee } = await adminClient
    .from('employees')
    .select('role_id, job_info')
    .eq('id', auth.data.employeeId)
    .single()

  const effectiveRoleId =
    employee?.role_id ||
    ((employee?.job_info as Record<string, unknown> | null)?.role_id as string | undefined)

  if (!effectiveRoleId) {
    return {
      ok: false,
      response: NextResponse.json({ error: '沒有租戶管理權限' }, { status: 403 }),
    }
  }

  const { data: rolePermission } = await adminClient
    .from('role_tab_permissions')
    .select('can_write')
    .eq('role_id', effectiveRoleId)
    .eq('module_code', 'settings')
    .eq('tab_code', 'tenants')
    .single()

  if (!rolePermission?.can_write) {
    return {
      ok: false,
      response: NextResponse.json({ error: '沒有租戶管理權限' }, { status: 403 }),
    }
  }

  return {
    ok: true,
    workspaceId: auth.data.workspaceId,
    employeeId: auth.data.employeeId,
  }
}

// GET handler 原樣保留（略）...
// 但把上方那 40 行重複代碼整合成一個 helper、GET 也呼叫 requireTenantAdmin
// （重構 GET 是 optional、若想 surgical 可留不動）

/**
 * DELETE /api/workspaces/[id]
 * 刪除 workspace（CASCADE 刪整租戶資料）。
 *
 * 守門（P016）：
 * - 必須登入
 * - 必須有租戶管理權限（role_tab_permissions.settings.tenants.can_write）
 * - workspace 必須存在
 * - workspace 底下不能還有員工（防呆、跟 UI 端檢查一致）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workspaceId } = await params

  // 驗 UUID 格式
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workspaceId)) {
    return NextResponse.json({ error: '無效的 workspace id' }, { status: 400 })
  }

  const gate = await requireTenantAdmin()
  if (!gate.ok) return gate.response

  const serviceSupabase = createServiceClient()

  // 確認 workspace 存在
  const { data: existing, error: findError } = await serviceSupabase
    .from('workspaces')
    .select('id, name')
    .eq('id', workspaceId)
    .single()

  if (findError || !existing) {
    return NextResponse.json({ error: '找不到該公司' }, { status: 404 })
  }

  // 防呆：底下還有員工就擋
  const { count: employeeCount } = await serviceSupabase
    .from('employees')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .or('is_bot.is.null,is_bot.eq.false')

  if (employeeCount && employeeCount > 0) {
    return NextResponse.json(
      { error: `此公司還有 ${employeeCount} 位員工、無法刪除` },
      { status: 409 }
    )
  }

  // service_role bypass RLS（P016 policy USING false 擋不住 service_role）
  const { error: deleteError } = await serviceSupabase
    .from('workspaces')
    .delete()
    .eq('id', workspaceId)

  if (deleteError) {
    return NextResponse.json(
      { error: `刪除失敗：${deleteError.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, workspace: existing })
}
```

---

## 3. UI 改動 1 — WorkspacesManagePage.tsx:77

**改動**：把 `handleDelete` 裡 `supabase.from('workspaces').delete()` 改成 fetch API。

```typescript
// 刪除公司
const handleDelete = useCallback(
  async (workspace: WorkspaceWithDetails) => {
    // 檢查是否有員工（client-side 防呆、server 也會擋 409）
    const { count } = await supabase
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspace.id)

    if (count && count > 0) {
      await alert(`無法刪除「${workspace.name}」，此公司還有 ${count} 位員工`, 'error')
      return
    }

    const confirmed = await confirm(`確定要刪除公司「${workspace.name}」嗎？`, {
      title: WORKSPACES_LABELS.刪除公司,
      type: 'warning',
    })
    if (!confirmed) return

    try {
      const response = await fetch(`/api/workspaces/${workspace.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const { error: errMsg } = await response.json().catch(() => ({ error: '' }))
        if (response.status === 401) {
          await alert('請先登入', 'error')
          return
        }
        if (response.status === 403) {
          await alert('沒有租戶管理權限、無法刪除公司', 'error')
          return
        }
        if (response.status === 409) {
          await alert(errMsg || WORKSPACES_LABELS.刪除失敗, 'error')
          return
        }
        throw new Error(errMsg || 'delete failed')
      }

      await alert(WORKSPACES_LABELS.公司已刪除, 'success')
      fetchWorkspaces()
    } catch (error) {
      logger.error(WORKSPACES_LABELS.刪除公司失敗, error)
      await alert(WORKSPACES_LABELS.刪除失敗, 'error')
    }
  },
  [fetchWorkspaces]
)
```

---

## 4. UI 改動 2 — AddWorkspaceDialog.tsx:139（rollback）

### 決策：**選 C — 把整個建公司流程搬到 `/api/tenants/create`**

**理由（Senior Dev 判斷）**：
1. `/api/tenants/create/route.ts` 已存在、**已實作** requireTenantAdmin + service_role + rollback 全流程（含 employee / auth / channel / features / countries / bot、比 Dialog 版還完整）。
2. 方案 A 不可行：一般用戶沒 `tenants.can_write`、rollback DELETE 會 403 自己打自己。
3. 方案 B 新增 `/api/tenants/rollback` endpoint = 重複 `/api/tenants/create` 已有的 rollback 邏輯、違反 DRY 也增加攻擊面。
4. 方案 C 最 surgical：client 只打一支 API、rollback 邏輯 server-side 用 service_role 處理、P016 漏洞從根上消失（client 完全碰不到 `workspaces.delete()`）。
5. Bonus：統一建公司入口、未來改規則（feature seed / role template）只改一處。

### 實作

**Dialog 改寫 `handleSubmit`**（130 行 → 約 40 行）：

```typescript
const handleSubmit = useCallback(async () => {
  // 驗證（保留原驗證邏輯、略）...

  setIsSubmitting(true)
  try {
    const response = await fetch('/api/tenants/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceName: formData.name.trim(),
        workspaceCode: formData.code.toUpperCase().trim(),
        workspaceType: formData.type,
        maxEmployees: null,
        adminEmployeeNumber: formData.admin_employee_number.trim().toUpperCase(),
        adminName: formData.admin_name.trim(),
        adminEmail: '', // ERP 用員工編號登入、email 選填
        adminPassword: formData.admin_password,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      if (response.status === 401) {
        await alert('請先登入', 'error')
        return
      }
      if (response.status === 403) {
        await alert('沒有租戶管理權限、無法建立公司', 'error')
        return
      }
      if (response.status === 400 && result.error?.includes('代號已存在')) {
        await alert(WORKSPACES_LABELS.此公司代號已存在, 'error')
        return
      }
      throw new Error(result.error || 'create failed')
    }

    await alert(
      `公司「${formData.name}」已建立，系統主管帳號為 ${formData.admin_employee_number}`,
      'success'
    )
    resetForm()
    onOpenChange(false)
    onSuccess()
  } catch (error) {
    logger.error(WORKSPACES_LABELS.建立公司失敗, error)
    await alert(WORKSPACES_LABELS.建立公司_請稍後再試, 'error')
  } finally {
    setIsSubmitting(false)
  }
}, [formData, onOpenChange, onSuccess, resetForm])
```

**需要順便處理**：
- `/api/tenants/create/route.ts:121` 目前強制 `/^[A-Z]+$/` 驗 workspace code、但 Dialog 原本輸入 lowercase。改成：client 送上去前 `.toUpperCase()`、或放寬 API 驗證允許混大小寫（建議前者、API 嚴格）。
- Import 可以刪除：`supabase`（不再直接查 DB）、`bcrypt`（server 端處理）。

---

## 5. Type-check / 測試建議

### 必跑

```bash
npm run type-check
```

### 建議測試

1. **既有 login e2e 必跑**（CLAUDE.md 紅線、動 RLS policy 必跑）：
   ```bash
   npx playwright test tests/e2e/login-api.spec.ts
   ```

2. **新增 workspaces DELETE 權限 spec**：`tests/e2e/workspaces-delete.spec.ts`
   - case 1：一般員工（無 `tenants.can_write`）呼叫 DELETE → 預期 403
   - case 2：Corner 系統主管 呼叫 DELETE 自己 workspace 但底下有員工 → 預期 409
   - case 3：Corner 系統主管 建空 workspace → 呼叫 DELETE → 預期 200、DB 真的刪掉
   - case 4：未登入呼叫 DELETE → 預期 401
   - case 5：直接在 client `supabase.from('workspaces').delete()` → 預期被 RLS 擋（0 rows affected）

3. **AddWorkspaceDialog smoke test**：建一個 workspace「看看 rollback 仍生效」（故意傳壞的 email 觸發 auth 失敗、確認 workspace 被 rollback 掉）。

---

## 6. 部署順序

**Migration 和 code 必須同批、不然會炸**：

- 先上 migration → policy 變 `USING (false)` → UI 原本 `supabase.from('workspaces').delete()` 立刻失效（0 rows affected 但不報錯、刪除按鈕看起來像壞掉）。
- 先上 code → UI 改打 API → 但 policy 還是 `USING (true)` → 新舊都能刪、漏洞還在。

**正確順序**（同一個 deploy）：
1. Migration 先跑（Vercel deploy 前 Supabase push）。
2. Build 成功後 Vercel 部署新版 Next.js（新 DELETE handler + UI fetch）。
3. 驗證清單：
   - `/database/workspaces` 頁刪除按鈕實際操作一次（Corner 系統主管 身分）
   - 開 DevTools network、確認打的是 `/api/workspaces/[id]` DELETE、不是 Supabase PostgREST
   - 登入 spec 仍 pass（workspaces FORCE RLS 沒被誤開）
   - 直接用沒有系統主管資格 帳號在 browser console `supabase.from('workspaces').delete().eq('id', '某個空 workspace')` → 預期 0 rows / RLS 擋

**回滾策略**：
- 如果 API DELETE 出包、可先緊急 patch migration、policy 臨時放寬成 `USING (EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND roles @> ARRAY['admin']))` 擋 80% 情境、不重開 `USING (true)`。

---

## 摘要（200 字）

P016 根因是 `workspaces_delete` policy 從 `is_super_admin()` 被 workaround 成 `USING (true)`、任何登入用戶可刪任一 workspace。方案 B+ 雙層修：(1) DB migration `20260422170000` 把 policy 改成 `USING (false)`、RLS 路徑永遠拒絕 DELETE、service_role 自動 bypass。(2) Code 層新增 `/api/workspaces/[id]` DELETE handler、走 `requireTenantAdmin`（跟 P003-A/H 同 pattern）+ service_role client。UI 改兩處：`WorkspacesManagePage:77` 改 fetch API、`AddWorkspaceDialog:139` 的 rollback 選方案 C（整個建公司搬到已存在的 `/api/tenants/create`、client 完全不碰 `workspaces.delete()`）。Migration 和 code 必須同批部署、順序是 migration 先。測試守門：login-api.spec.ts（RLS 紅線）+ 新增 workspaces-delete.spec.ts 5 個 case。漏洞關死、沒打破 CLAUDE.md 的 FORCE RLS 紅線、沒增加攻擊面。
