#!/usr/bin/env node
/**
 * P001 tenants/create seed 對帳一次性測試腳本（2026-04-22）
 *
 * 步驟：
 *   1. 建 TESTAUTH workspace + 1 管理員 employee + auth user（當呼叫 API 的人）
 *   2. 用 TESTAUTH 管理員帳密 Playwright 登入、取 session cookies
 *   3. 帶 cookies 打 /api/tenants/create 建 TESTSEED
 *   4. 查 TESTSEED 4 職務 role_tab_permissions row 數、對 Corner
 *   5. 清理：刪 TESTAUTH + TESTSEED 兩家所有 row（CASCADE）
 *
 * 使用：node scripts/test-tenants-create-seed.mjs
 * 前置：dev server 要在 http://localhost:3000 跑著
 */

import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'
import { config as loadEnv } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: resolve(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('缺 env：NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const CORNER_WS_ID = '8ef05a74-1f87-48ab-afd3-9bfeb423935d'
const TEST_AUTH_CODE = 'TESTAUTH'
const TEST_SEED_CODE = 'TESTSEED'
const TEST_PASSWORD = 'test_auth_2026_04_22'
const TEST_ADMIN_EMAIL = 'test-auth-admin@venturo.local'

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`)
}

async function cleanupBoth() {
  // 也用 email 直接清 auth user（避免殘留孤兒 auth 記錄）
  const LEFTOVER_EMAILS = [TEST_ADMIN_EMAIL, 'test-seed-admin@venturo.local']

  // workspace-scoped 子表清理順序（RESTRICT FK 多層、需手動依順序）：
  //   1. auth.users（employees 的 supabase_user_id）
  //   2. role_tab_permissions（FK → workspace_roles.id）
  //   3. employees（其他 child 可能 FK → employees，但新建 workspace 應無其他 row）
  //   4. workspace_roles（上面清掉 role_tab_permissions 就能刪）
  //   5. 其他 workspace-scoped 子表（payment_methods / bank_accounts / countries / cities / channels / workspace_features）
  //   6. workspaces 本身
  const MISC_CHILDREN = [
    'payment_methods',
    'bank_accounts',
    'countries',
    'cities',
    'channels',
    'workspace_features',
  ]

  for (const code of [TEST_AUTH_CODE, TEST_SEED_CODE]) {
    const { data: ws } = await admin.from('workspaces').select('id').eq('code', code).maybeSingle()
    if (!ws) {
      log(`✓ ${code} 不存在、跳過清理`)
      continue
    }

    // 1. auth users
    const { data: emps } = await admin
      .from('employees')
      .select('id, supabase_user_id')
      .eq('workspace_id', ws.id)
    for (const e of emps || []) {
      if (e.supabase_user_id) {
        await admin.auth.admin.deleteUser(e.supabase_user_id).catch(() => {})
      }
    }

    // 2. role_tab_permissions
    const { data: roles } = await admin
      .from('workspace_roles')
      .select('id')
      .eq('workspace_id', ws.id)
    const roleIds = (roles || []).map(r => r.id)
    if (roleIds.length > 0) {
      const { error } = await admin.from('role_tab_permissions').delete().in('role_id', roleIds)
      if (error) log(`  ⚠️ 刪 ${code}.role_tab_permissions 失敗：${error.message}`)
    }

    // 3. employees
    {
      const { error } = await admin.from('employees').delete().eq('workspace_id', ws.id)
      if (error) log(`  ⚠️ 刪 ${code}.employees 失敗：${error.message}`)
    }

    // 4. workspace_roles
    {
      const { error } = await admin.from('workspace_roles').delete().eq('workspace_id', ws.id)
      if (error) log(`  ⚠️ 刪 ${code}.workspace_roles 失敗：${error.message}`)
    }

    // 5. 其他子表
    for (const tbl of MISC_CHILDREN) {
      const { error } = await admin.from(tbl).delete().eq('workspace_id', ws.id)
      if (error) log(`  ⚠️ 刪 ${code}.${tbl} 失敗：${error.message}`)
    }

    // 6. workspace 本身
    const { error } = await admin.from('workspaces').delete().eq('id', ws.id)
    if (error) log(`⚠️ 刪 ${code} workspace 失敗：${error.message}`)
    else log(`✓ 清理 ${code}（全 child + workspace + auth users）`)
  }

  // 孤兒 auth user（employees row 已不存在但 auth 還在）
  for (const email of LEFTOVER_EMAILS) {
    const { data: users } = await admin.auth.admin.listUsers()
    const u = users?.users?.find(u => u.email === email)
    if (u) {
      await admin.auth.admin.deleteUser(u.id).catch(() => {})
      log(`✓ 清理孤兒 auth user ${email}`)
    }
  }
}

async function step1_createTestAuthWorkspace() {
  log('Step 1: 建 TESTAUTH workspace + 管理員')

  // 1a. workspace
  const { data: ws, error: wsErr } = await admin
    .from('workspaces')
    .insert({
      name: '測試驗證用（今日大修 P001）',
      code: TEST_AUTH_CODE,
      is_active: true,
      premium_enabled: false,
    })
    .select('id')
    .single()
  if (wsErr) throw new Error(`建 TESTAUTH workspace 失敗：${wsErr.message}`)
  log(`  workspace_id=${ws.id}`)

  // 1b. 管理員職務
  const { data: role, error: roleErr } = await admin
    .from('workspace_roles')
    .insert({ workspace_id: ws.id, name: '管理員', is_admin: true })
    .select('id')
    .single()
  if (roleErr) throw new Error(`建管理員職務失敗：${roleErr.message}`)

  // 1c. 複製 Corner 管理員職務的 role_tab_permissions 給 TESTAUTH 管理員
  //    （讓他有 settings.tenants can_write、才能打 /api/tenants/create）
  const { data: cornerAdminRole } = await admin
    .from('workspace_roles')
    .select('id')
    .eq('workspace_id', CORNER_WS_ID)
    .eq('name', '管理員')
    .single()
  if (!cornerAdminRole) throw new Error('找不到 Corner 管理員職務')
  const { data: cornerPerms } = await admin
    .from('role_tab_permissions')
    .select('module_code, tab_code, can_read, can_write')
    .eq('role_id', cornerAdminRole.id)
  if (!cornerPerms || cornerPerms.length === 0) throw new Error('Corner 管理員無權限 row')
  const { error: permErr } = await admin.from('role_tab_permissions').insert(
    cornerPerms.map(p => ({
      role_id: role.id,
      module_code: p.module_code,
      tab_code: p.tab_code,
      can_read: p.can_read,
      can_write: p.can_write,
    }))
  )
  if (permErr) throw new Error(`複製管理員權限失敗：${permErr.message}`)
  log(`  管理員權限複製 ${cornerPerms.length} row`)

  // 1d. auth user
  const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
    email: TEST_ADMIN_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { workspace_id: ws.id, workspace_code: TEST_AUTH_CODE },
  })
  if (authErr) throw new Error(`建 auth user 失敗：${authErr.message}`)

  // 1e. employee
  const { data: emp, error: empErr } = await admin
    .from('employees')
    .insert({
      workspace_id: ws.id,
      employee_number: 'E001',
      chinese_name: '測試管理員',
      display_name: '測試管理員',
      email: TEST_ADMIN_EMAIL,
      supabase_user_id: authUser.user.id,
      role_id: role.id,
      roles: ['admin'],
      is_active: true,
    })
    .select('id')
    .single()
  if (empErr) throw new Error(`建 employee 失敗：${empErr.message}`)

  // 1f. 更新 auth user metadata 加上 employee_id
  await admin.auth.admin.updateUserById(authUser.user.id, {
    user_metadata: {
      workspace_id: ws.id,
      employee_id: emp.id,
      workspace_code: TEST_AUTH_CODE,
    },
  })

  log(`  ✓ TESTAUTH 就緒：workspace_id=${ws.id}, employee_id=${emp.id}, auth_uid=${authUser.user.id}`)
  return { workspaceId: ws.id, employeeId: emp.id }
}

async function step2_loginViaPlaywright() {
  log('Step 2: Playwright 用 TESTAUTH 管理員登入、取 cookies')
  const browser = await chromium.launch()
  const ctx = await browser.newContext()
  const page = await ctx.newPage()

  await page.goto('http://localhost:3000/login')
  await page.waitForSelector('input[placeholder="公司代號"]')
  await page.fill('input[placeholder="公司代號"]', TEST_AUTH_CODE)
  await page.fill('input[placeholder="帳號（例：E001）"]', 'E001')
  await page.fill('input[placeholder="密碼"]', TEST_PASSWORD)
  await page.click('button[type="submit"]')

  try {
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 20000 })
  } catch (e) {
    // 抓失敗截圖、印 body
    const body = await page.textContent('body').catch(() => '')
    log(`  ⚠️ 登入未跳轉、頁面 body: ${body.slice(0, 200)}`)
    throw e
  }

  const cookies = await ctx.cookies()
  await browser.close()
  log(`  ✓ 登入成功、取得 ${cookies.length} 個 cookie`)
  return cookies
}

function cookiesToHeader(cookies) {
  return cookies.map(c => `${c.name}=${c.value}`).join('; ')
}

async function step3_callTenantsCreate(cookies) {
  log('Step 3: 用 TESTAUTH 管理員 session 打 /api/tenants/create 建 TESTSEED')
  const res = await fetch('http://localhost:3000/api/tenants/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookiesToHeader(cookies),
    },
    body: JSON.stringify({
      workspaceName: '測試種子（今日大修驗證）',
      workspaceCode: TEST_SEED_CODE,
      workspaceType: null,
      maxEmployees: null,
      adminEmployeeNumber: 'E001',
      adminName: 'TestSeed Admin',
      adminEmail: 'test-seed-admin@venturo.local',
      adminPassword: 'test_seed_2026_04_22',
    }),
  })
  const body = await res.json()
  log(`  HTTP ${res.status}: ${JSON.stringify(body).slice(0, 200)}`)
  if (!res.ok) throw new Error(`tenants/create 失敗：${JSON.stringify(body)}`)
  log(`  ✓ TESTSEED 建立成功`)
  return body
}

async function step4_verifyRowCounts() {
  log('Step 4: 對帳 4 職務 row 數')

  async function countFor(wsCode, roleName) {
    const { data: ws } = await admin.from('workspaces').select('id').eq('code', wsCode).single()
    const { data: role } = await admin
      .from('workspace_roles')
      .select('id')
      .eq('workspace_id', ws.id)
      .eq('name', roleName)
      .single()
    const { count } = await admin
      .from('role_tab_permissions')
      .select('id', { count: 'exact', head: true })
      .eq('role_id', role.id)
    return count
  }

  const results = []
  for (const roleName of ['管理員', '業務', '會計', '助理']) {
    const cornerCount = await countFor('CORNER', roleName)
    const seedCount = await countFor(TEST_SEED_CODE, roleName)
    const match = cornerCount === seedCount
    results.push({ roleName, cornerCount, seedCount, match })
    log(
      `  ${match ? '✓' : '✗'} ${roleName}: Corner=${cornerCount}, TESTSEED=${seedCount}`
    )
  }
  const allMatch = results.every(r => r.match)
  log(allMatch ? '  ✓ 全部對齊' : '  ✗ 有落差')
  return { allMatch, results }
}

async function main() {
  // 0. 先清乾淨殘留（例如上次測試沒清完）
  log('Step 0: 清理可能殘留的 TESTAUTH / TESTSEED')
  await cleanupBoth()

  let stage = 'pre'
  try {
    stage = 'step1'
    await step1_createTestAuthWorkspace()
    stage = 'step2'
    const cookies = await step2_loginViaPlaywright()
    stage = 'step3'
    await step3_callTenantsCreate(cookies)
    stage = 'step4'
    const { allMatch, results } = await step4_verifyRowCounts()
    log(`\n=== 結果 ===`)
    console.table(results)
    log(allMatch ? '🟢 P001 tenants/create seed 驗收通過' : '🔴 有落差、需檢查')
  } catch (e) {
    log(`✗ stage=${stage} 失敗：${e.message}`)
    console.error(e.stack)
  } finally {
    log('\nStep 5: 清理')
    await cleanupBoth()
  }
}

main()
