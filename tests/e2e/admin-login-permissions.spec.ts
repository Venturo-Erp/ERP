/**
 * Admin 登入權限守門測試（P001 Phase A 配套）
 *
 * 背景：
 *   2026-04-22 拔掉前端 isAdmin 短路（auth-store:249、permissions/hooks.ts:284/293、
 *   usePermissions.ts 的 9 個 bool）、改走 user.permissions 比對。
 *   同時跑 backfill migration 20260422150000、admin role 在 role_tab_permissions
 *   預填所有 MODULES × tabs row。
 *
 * 這個 test 守「admin 登入後取得完整 permissions」、防止：
 *   (a) backfill 沒跑或被回退 → admin permissions 空陣列 → 拔短路後整站白屏
 *   (b) validate-login 邏輯退化 → 沒從 role_tab_permissions 讀
 *   (c) 新增 MODULES.tabs 但沒補 backfill → admin 漏某些 key
 */

import { test, expect } from './fixtures/auth.fixture'

// 必須的 module key（MODULES 裡定義的 root code）
const REQUIRED_MODULE_KEYS = [
  'calendar',
  'workspace',
  'todos',
  'tours',
  'orders',
  'finance',
  'accounting',
  'visas',
  'design',
  'office',
  'hr',
  'database',
  'settings',
]

// 必須的 module:tab key（抽樣代表性 tab、命中 /finance/payments、/tours、/hr 等 UI 大鎖涉及的路由）
const REQUIRED_TAB_KEYS = [
  'tours:overview',
  'tours:orders',
  'tours:itinerary',
  'finance:payments',
  'finance:requests',
  'hr:employees',
  'hr:roles',
  'database:customers',
  'settings:personal',
  'settings:company',
]

async function loginAsAdmin() {
  const res = await fetch('http://localhost:3000/api/auth/validate-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'E001', password: 'testux1234', code: 'TESTUX' }),
  })
  return res.json() as Promise<{
    success: boolean
    data?: {
      isAdmin?: boolean
      permissions?: string[]
      employee?: { employee_number?: string }
    }
  }>
}

test.describe('Admin 登入權限守門（P001 Phase A）', () => {
  test('TESTUX admin 登入 isAdmin=true 且 permissions 非空', async () => {
    const body = await loginAsAdmin()
    expect(body.success).toBe(true)
    expect(body.data?.isAdmin).toBe(true)
    expect(Array.isArray(body.data?.permissions)).toBe(true)
    expect(
      body.data?.permissions?.length ?? 0,
      `admin permissions 不該是空陣列。如果是空、代表：
      (a) backfill migration 20260422150000 沒跑或被 revert
      (b) validate-login 沒從 role_tab_permissions 讀
      (c) admin role 不是 is_admin=true`
    ).toBeGreaterThan(40)
  })

  test('admin permissions 包含所有 MODULES root key', async () => {
    const body = await loginAsAdmin()
    const perms = new Set(body.data?.permissions ?? [])

    for (const key of REQUIRED_MODULE_KEYS) {
      // root module key 可能以原名（無 tab 的模組）或 `${module}:${tab}`（有 tab 的模組）出現
      const hasRoot = perms.has(key)
      const hasAnyTab = [...perms].some(p => p.startsWith(`${key}:`))

      expect(
        hasRoot || hasAnyTab,
        `admin 應該有 '${key}' 的權限（root 或任一 tab）。如果沒有、代表該 module 沒被 backfill。`
      ).toBe(true)
    }
  })

  test('admin permissions 包含關鍵 module:tab key', async () => {
    const body = await loginAsAdmin()
    const perms = new Set(body.data?.permissions ?? [])

    for (const key of REQUIRED_TAB_KEYS) {
      expect(perms.has(key), `admin 應該有 '${key}'、但沒看到。backfill 可能遺漏此 tab。`).toBe(
        true
      )
    }
  })
})
