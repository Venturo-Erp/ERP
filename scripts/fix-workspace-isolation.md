# 租戶隔離修復計畫

## 發現的漏洞（45 個高風險 + 11 個中風險）

### 分類處理策略

#### 1. 內部 Cron/Webhook（需要加 API key 驗證）
- `cron/auto-insurance/route.ts`
- `cron/process-tasks/route.ts`
- `cron/sync-logan-knowledge/route.ts`
- `cron/ticket-status/route.ts`
- `messaging/webhook/route.ts`

**修復方案**：
```typescript
const CRON_SECRET = process.env.CRON_SECRET || ''
const authHeader = request.headers.get('authorization')
if (authHeader !== `Bearer ${CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

#### 2. LINE Bot API（需要取得對應租戶）
- `customers/by-line/route.ts` ✅ 需修復
- `line/webhook/route.ts`
- `line/send-*.ts`

**修復方案**：
1. 從 `line_users` 表查詢 `workspace_id`
2. 或從 LINE bot channel 設定查詢

#### 3. 公開 API（需要 token 驗證 + workspace 綁定）
- `tours/by-code/[code]/route.ts` ✅ 需修復
- `public/submit-quote/route.ts`
- `contracts/sign/route.ts`

**修復方案**：
```typescript
// 方案 A: 從 code 查詢完整資料（包含 workspace_id），然後回傳
const { data } = await supabase
  .from('tours')
  .select('*')
  .eq('code', code)
  .single()

// ✅ 即使回傳 workspace_id 也沒關係（公開資訊）
// ❌ 但不應允許直接指定 workspace_id 查詢
```

#### 4. 後台管理 API（需要加身份驗證）
- `workspaces/route.ts`
- `workspaces/[id]/route.ts`
- `auth/admin-reset-password/route.ts`

**修復方案**：
```typescript
const auth = await getServerAuth()
if (!auth.success || !auth.data.isSuperAdmin) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
}
```

#### 5. Health Check（可保持公開）
- `health/route.ts`
- `health/db/route.ts`
- `health/detailed/route.ts`

**決策**：保持公開，但不洩露敏感資訊

---

## 修復優先順序

### P0（立即修復，已有資料洩露風險）
1. ✅ `customers/by-line/route.ts` — 客戶資料洩露
2. ✅ `tours/by-code/[code]/route.ts` — 旅遊團資料洩露
3. ✅ `contracts/sign/route.ts` — 合約資料洩露
4. ✅ `storage/upload/route.ts` — 檔案上傳無限制

### P1（本週修復，內部工具）
5. ✅ Cron API 加驗證
6. ✅ Webhook API 加驗證
7. ✅ 後台管理 API 加權限檢查

### P2（下週修復，依賴 RLS 但需加固）
8. ✅ 所有 `createApiClient` 但沒顯式過濾的 API
9. ✅ 建立自動化測試

---

## 自動化測試腳本

建立 `tests/security/tenant-isolation.test.ts`：

```typescript
/**
 * 租戶隔離測試
 * 驗證：切換租戶後，不會看到其他租戶資料
 */

import { test, expect } from '@playwright/test'

const WORKSPACE_A = '8ef05a74-1f87-48ab-afd3-9bfeb423935d' // Venturo
const WORKSPACE_B = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' // 測試租戶

test.describe('租戶隔離測試', () => {
  test('客戶列表只顯示自己租戶', async ({ page }) => {
    // 登入租戶 A
    await page.goto('/login')
    await page.fill('[name="email"]', 'test-a@example.com')
    await page.fill('[name="password"]', 'password')
    await page.click('button[type="submit"]')
    
    // 取得客戶列表
    const customersA = await page.evaluate(() => {
      return fetch('/api/customers').then(r => r.json())
    })
    
    // 驗證：所有客戶都是租戶 A 的
    expect(customersA.every(c => c.workspace_id === WORKSPACE_A)).toBe(true)
    
    // 登出
    await page.click('[data-testid="logout"]')
    
    // 登入租戶 B
    await page.fill('[name="email"]', 'test-b@example.com')
    await page.fill('[name="password"]', 'password')
    await page.click('button[type="submit"]')
    
    // 取得客戶列表
    const customersB = await page.evaluate(() => {
      return fetch('/api/customers').then(r => r.json())
    })
    
    // 驗證：沒有租戶 A 的客戶
    expect(customersB.every(c => c.workspace_id !== WORKSPACE_A)).toBe(true)
  })
  
  test('無法透過 API 查詢其他租戶資料', async ({ page }) => {
    // 登入租戶 A
    await page.goto('/login')
    await page.fill('[name="email"]', 'test-a@example.com')
    await page.fill('[name="password"]', 'password')
    await page.click('button[type="submit"]')
    
    // 嘗試查詢租戶 B 的客戶
    const response = await page.evaluate(async (workspaceB) => {
      return fetch(`/api/customers?workspace_id=${workspaceB}`)
        .then(r => r.json())
    }, WORKSPACE_B)
    
    // 驗證：應該回傳空陣列或錯誤
    expect(response.length === 0 || response.error).toBe(true)
  })
})
```

---

## 執行計畫

Day 1：
1. ✅ 修復 P0 漏洞（4 個）
2. ✅ 部署到測試環境
3. ✅ 手動驗證

Day 2：
4. ✅ 修復 P1 漏洞（15 個）
5. ✅ 建立自動化測試
6. ✅ 部署到正式環境

Day 3：
7. ✅ 修復 P2 漏洞（11 個）
8. ✅ 執行完整安全掃描
9. ✅ 輸出安全報告

完成後：
- ✅ 推送到 GitHub（自動部署）
- ✅ 執行自動化測試
- ✅ 通知 Logan

---

## 自動修復腳本（需要人工檢查）

```bash
# 找出所有使用 service_role 但沒過濾 workspace_id 的檔案
grep -r "SUPABASE_SERVICE_ROLE_KEY" src/app/api --include="*.ts" \
  | grep -v "workspace_id" \
  | cut -d: -f1 \
  | sort | uniq

# 找出所有使用 createApiClient 但沒顯式過濾的檔案
grep -r "createApiClient" src/app/api --include="*.ts" \
  | grep -v ".eq('workspace_id'" \
  | cut -d: -f1 \
  | sort | uniq
```
