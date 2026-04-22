# Agent G：/login 的 API Route + Middleware 掃描

## 掃描範圍

- `/src/middleware.ts` — 全域 middleware、路由保護
- `/src/lib/supabase/admin.ts` — admin client 實作（per-request 確認）
- `/src/lib/auth.ts` — 通用 auth helper（token blacklist、bcrypt）
- `/src/lib/auth/auth-sync.ts` — 前端發起的同步邏輯
- `/src/lib/auth/server-auth.ts` — server-side 認證檢查
- `/src/lib/auth/quick-login-token.ts` — 一次性登入 token（HMAC-SHA256）
- `/src/lib/rate-limit.ts` — 分散式速率限制（Supabase RPC fallback）
- `/src/supabase/server.ts` — server client cookie 管理
- `/src/supabase/client.ts` — browser client（SSR 模式）
- 所有 `/api/auth/*` routes — 11 個端點（validate-login、sync-employee、change-password、reset-employee-password、admin-reset-password、create-employee-auth、logout、LINE OAuth）

---

## 發現（按嚴重度排）

### 🔴 1. Middleware 對公開路由定義寬鬆，`/api/auth/*` 整組都公開

**檔案：行號**
- `src/middleware.ts:67-68`

**事實**
```typescript
// === 認證 API ===
'/api/auth',
```
此 prefix 匹配將 **所有 `/api/auth/*` 路由都納入公開路由**，包括：
- `sync-employee` — 無需登入即可呼叫、後續同步員工資料
- `change-password` — 變更自身密碼、但 middleware 不擋未登入者
- `get-employee-data` — 查詢員工資料（之後才加 `getServerAuth()` 檢查）

**為什麼重要**
前線防線應該擋未認證請求。即使各 route 內部有 `getServerAuth()` 檢查，middleware 放寬權限代表：
1. 未認證用戶可直接呼叫這些 endpoint
2. API endpoint 必須各自實現認證（**防禦深度取決於開發者記憶**）
3. 若某個 endpoint 遺漏認證檢查、會直通

**影響範圍**
- 所有 11 個 `/api/auth/*` routes
- `sync-employee` 雖有 token/cookie 驗證、但前線 middleware 沒擋

**修法方向**
- 只在 middleware 公開**必要**的 auth routes（validate-login、logout、sync-employee、create-employee-auth 新租戶第一筆）
- 其他應該要求登入
- 或至少在 middleware 層檢查敏感操作（password reset、employee creation）

---

### 🔴 2. Cookie 設定未定義 maxAge，session 傳播時間邏輯不明

**檔案：行號**
- `src/lib/supabase/server.ts:15-16` — server 端 cookie 設定無 options 預設值
- `src/middleware.ts:31-35` — middleware 更新 cookie 時直接用 Supabase 回傳的 options（可能包含 maxAge）
- `src/app/api/auth/line/callback/route.ts:101` — LINE token 設 7 天、但 Supabase JWT session cookie 沒設定

**事實**
```typescript
// middleware 處理 cookie：
cookiesToSet.forEach(({ name, value, options }) => {
  request.cookies.set(name, value)
  response.cookies.set(name, value, options)  // options 可能為空
})
```

Supabase SSR 根據 server 回傳的 options 決定 cookie 有效期。若 Supabase 沒在 options 裡設 maxAge，cookie 會變成 **session cookie**（瀏覽器關閉即刪除）。

**為什麼重要**
- login.md 說 JWT TTL 1 小時、但沒提 **cookie 本身的有效期**
- 若 cookie 是 session cookie、使用者關瀏覽器即使不到 1 小時也會掉線
- 若 cookie 有 maxAge > 1 小時、refresh token 過期後 cookie 仍存在（造成 TOCTOU 漏洞）
- LINE 特殊登入的 cookie 是 7 天（明確設定）、但主要 session cookie 不明確

**影響範圍**
- 所有登入流程
- refresh token 邏輯

**建議**
- 明確在 Supabase client setup 或 middleware 中設定 session cookie maxAge
- 統一定義：session maxAge = JWT expiry（或更短）
- 如果想要「記住 30 天」（login.md 提過的假功能）、應在此處實現而非 API 層

---

### 🟡 3. Sync-Employee 端點無 workspace 隔離檢查

**檔案：行號**
- `src/app/api/auth/sync-employee/route.ts:24-52` — token/cookie 驗證後無 workspace 一致性檢查

**事實**
```typescript
const { employee_id, supabase_user_id, workspace_id, access_token } = validation.data

if (access_token) {
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(access_token)
  if (error || !user || user.id !== supabase_user_id) {
    // 只檢查 user ID 一致
    return errorResponse('Unauthorized: invalid token', 401, ErrorCode.UNAUTHORIZED)
  }
}

// 然後直接更新 employees.supabase_user_id（無 workspace 檢查）
await supabaseAdmin
  .from('employees')
  .update({ supabase_user_id })
  .eq('id', employee_id)
```

攻擊流程：
1. 用戶 A 在 workspace-X 登入、取得 access_token
2. 用戶 A 可呼叫 `/api/auth/sync-employee`、將 **任何 employee_id（包括其他 workspace 的員工）** 的 supabase_user_id 更新成自己的 user.id
3. 結果：用戶 A 可綁定到任意員工身份、突破 workspace 隔離

**為什麼重要**
- SSOT violation：employee 的 workspace_id 應該是不可變的、只有 RLS 保護
- 無 workspace owner 驗證，跨租戶污染風險

**影響範圍**
- multi-tenant 隔離

**修法方向**
- 在 sync-employee 中驗證 `employee_id.workspace_id == auth.workspace_id`
- 或在 DB 層加 RLS policy（但 admin client 會繞過、需額外應用層檢查）

---

### 🟡 4. Rate Limit RPC 失敗 Fallback 至 in-memory，多實例環境無同步

**檔案：行號**
- `src/lib/rate-limit.ts:15-39` — RPC 失敗 fallback 邏輯

**事實**
```typescript
async function rateLimitDistributed(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  try {
    const supabase = getSupabaseAdminClient()
    const { data, error } = await (supabase.rpc as any)('check_rate_limit', { ... })

    if (error) {
      logger.warn('Rate limit RPC error, falling back to in-memory:', error.message)
      return rateLimitInMemory(key, limit, windowSeconds * 1000)
    }
    return data as boolean
  } catch {
    return rateLimitInMemory(key, limit, windowSeconds * 1000)
  }
}

// in-memory 靜態 Map
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
```

在多實例環境（雲服務自動擴展）下，RPC 暫時失敗 → fallback in-memory：
- 實例 A 和實例 B 各自維護獨立的 rate limit state
- 同一用戶在短時間內可發多個請求到不同實例、各實例只計算自己的 count
- 真實的請求速率可能超過設定的 limit、但都過了

**為什麼重要**
- 暴力破解登入密碼時、可繞過速率限制
- `validate-login` 有 10 req/min、但若實例多於 1 時會失效

**影響範圍**
- brute force 防禦

**建議**
- 若 RPC 失敗、應拒絕請求（fail-secure）而非 fallback
- 或改用 client-side Redis / 在應用層實現全局 state
- 短期：增加警告日誌、監控 RPC 失敗頻率

---

### 🟡 5. 快速登入 Token (Quick-Login-v2) 無 IP 綁定或 User-Agent 驗證

**檔案：行號**
- `src/lib/auth/quick-login-token.ts:50-115` — token 驗證邏輯

**事實**
```typescript
export async function verifyQuickLoginToken(token: string): Promise<boolean> {
  // ... 解析格式
  const timestamp = parseInt(...)
  const profileId = ...
  const providedSignature = ...

  // 驗證簽名、檢查過期時間（8 小時）
  // 但無 IP / User-Agent / device fingerprint 檢查
  const expectedSignature = ...
  return expectedSignature === providedSignature
}
```

Quick-Login token 格式：`quick-login-v2-{profileId}-{timestamp}-{signature}`
- profileId（通常是 employee_id 或 UUID）
- timestamp（8 小時內有效）
- HMAC-SHA256 簽名（基於 QUICK_LOGIN_SECRET）

若 token 被竊取（例如：log file 洩露、網路嗅探），攻擊者可在 8 小時內無限制重複使用，無法檢測。

**為什麼重要**
- 一次性登入的 token 有長有效期（8 小時）、無設備綁定
- 適用於 mobile 無 cookie 的場景、但風險較高

**影響範圍**
- mobile / app client

**建議**
- 可考慮加 IP fingerprint 或 device nonce
- 或改短有效期至 15 分鐘

---

### 🟡 6. 錯誤訊息一致導致帳號枚舉（enumeration attack）

**檔案：行號**
- `src/app/api/auth/validate-login/route.ts:66` — 帳號不存在時回傳

**事實**
```typescript
if (!employee) {
  return ApiError.unauthorized('帳號或密碼錯誤')
}

// ... 檢查帳號狀態 ...
if (employee.status === 'terminated') {
  return ApiError.unauthorized('此帳號已停用')
}

// ... 檢查鎖定 ...
if (lockedUntil && new Date(lockedUntil) > new Date()) {
  return ApiError.unauthorized(`帳號已鎖定，請 ${remainingMinutes} 分鐘後再試`)
}
```

所有失敗情況都回傳 status 401 `unauthorized`、但 401 message 不同：
- 帳號不存在 → `'帳號或密碼錯誤'`
- 帳號已停用 → `'此帳號已停用'`
- 帳號已鎖定 → `'帳號已鎖定，...'`
- 密碼錯誤 → `'帳號或密碼錯誤'`

攻擊者可透過 error message 推測：
1. 此帳號是否存在（不存在 vs 存在但停用）
2. 此帳號當前是否被鎖定（判斷是否在活躍測試）

**為什麼重要**
- 信息洩露
- 有助於針對性 brute force

**修法方向**
- 所有認證失敗統一回傳 `'帳號或密碼錯誤'`（不洩露帳號存在狀態）
- 或統一回傳 generic error、於 logger 記錄詳細原因

---

### 🟡 7. `getServerAuth()` Fallback 邏輯複雜，可能導致身份混淆

**檔案：行號**
- `src/lib/auth/server-auth.ts:39-126` — fallback 邏輯

**事實**
```typescript
export async function getServerAuth(): Promise<AuthResult> {
  // 1. 先讀 Supabase Auth user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  // 2. 嘗試從 user_metadata 讀（快速路徑）
  let workspaceId = user.user_metadata?.workspace_id as string | undefined
  let employeeId = user.user_metadata?.employee_id as string | undefined

  // 3. 如果 user_metadata 沒有、從 employees 表查詢
  if (!workspaceId || !employeeId) {
    const { data: employees } = await adminClient
      .from('employees')
      .select('id, workspace_id, supabase_user_id')
      .or(`id.eq.${user.id},supabase_user_id.eq.${user.id}`)  // 雙重匹配
      .limit(1)

    const employee = employees?.[0]
    // ...
    workspaceId = employee.workspace_id ?? undefined
    employeeId = employee.id
  }

  return {
    success: true,
    data: { user, workspaceId, employeeId }
  }
}
```

問題：
- `.or(\`id.eq.${user.id},supabase_user_id.eq.${user.id}\`)` 同時檢查兩種 pattern：
  - Pattern A：employee.id = auth.user.id（新架構）
  - Pattern B：employee.supabase_user_id = auth.user.id（舊架構）
- 若同一 user.id 同時滿足兩種、`.limit(1)` 會返回**任意一個**（執行順序不保證）
- 結果可能： employee A 在 workspace X、但返回了同名 employee B 在 workspace Y

**為什麼重要**
- 身份混淆漏洞（雖然概率低、但會導致跨租戶訪問）
- 舊架構遺留產物

**影響範圍**
- 多架構並存期間（目前仍在過渡）

**建議**
- 明確優先級：`.or()` 改用 case/when 或分步查詢
- 或設 policy：pattern A 優先、pattern B 只作 fallback

---

### 🟢 8. 分散式 Admin Client 設計正確（per-request、非 singleton）

**檔案：行號**
- `src/lib/supabase/admin.ts:10-42`

**事實**
```typescript
export function getSupabaseAdminClient(): SupabaseClient<Database> {
  // 每次呼叫都建新 client、不使用 singleton
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
}
```

**為何符合原則**
- 紀錄中說明過：singleton 會在 schema 變更時拿到過期狀態
- 實際測試過 CLAUDE.md 紅線問題（FORCE RLS 導致 workspace 查不到）
- 設計決策已文件化

---

### 🟢 9. 速率限制應用於敏感操作

**檔案：行號**
- `src/app/api/auth/validate-login/route.ts:13` — 10 req/min
- `src/app/api/auth/change-password/route.ts:19` — 5 req/min
- `src/app/api/auth/reset-employee-password/route.ts:46` — 10 req/min
- `src/app/api/auth/admin-reset-password/route.ts:48` — 5 req/min

設置合理、覆蓋全部認證操作。

---

## 跟既有 login.md 結論的關係

**補充了**：
1. **Middleware 權限泄漏** — login.md 未涉及、新發現
2. **Cookie maxAge 未定義** — login.md 提過 JWT TTL、但 cookie 傳播時間未明確
3. **Sync-Employee 跨租戶漏洞** — login.md 未掃 sync-employee 細節
4. **Rate Limit Fallback 無同步** — 對 login.md 的「防暴力破解」有補充
5. **錯誤訊息枚舉** — 新發現
6. **快速登入 Token 無設備綁定** — 新線路（mobile）
7. **getServerAuth() Fallback 複雜性** — 舊架構過渡期的風險

**矛盾了**：
- 無直接矛盾、API route 層面補強了 login.md 的發現

---

## 推薦進 _INDEX 的跨路由 pattern

### 🟡 Auth Endpoint 應在 Middleware 層分層保護
- **Pattern**：public paths 清單過寬 → 遺漏認證檢查風險
- **應用到**：所有涉及敏感操作的 API route（password reset、employee creation、data sync）
- **建議**：auth 類 route 預設要求登入、除非明確列入公開清單

### 🟡 Cookie 和 Token 有效期必須文件化
- **Pattern**：session cookie、JWT、refresh token 三層時間各自管理、容易 TOCTOU
- **應用到**：所有需要 session 的路由
- **建議**：在 CLAUDE.md 加「Session TTL 設計規範」

### 🟡 多實例環境的分散式限流必須 fail-secure
- **Pattern**：RPC 失敗 fallback 導致單點失效
- **應用到**：所有頻率限制
- **建議**：failed RPC 應拒絕請求、不 fallback

### 🔴 跨租戶操作必須驗證 workspace 一致性
- **Pattern**：token/cookie 驗證後、無 workspace owner 檢查
- **應用到**：所有修改 employee、sync、update 操作
- **建議**：在 getServerAuth() 返回後、任何 INSERT/UPDATE 必須檢查 workspace_id 一致

---

*本掃描專注 server-side 新發現、補強 login.md 代碼現況驗證。*
