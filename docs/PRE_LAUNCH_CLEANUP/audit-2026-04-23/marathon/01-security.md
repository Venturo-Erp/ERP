# Marathon 01 · Security Engineer 🔒 體檢報告

**扮演靈魂**：Security Engineer（adversarial, methodical, CWE-focused）  
**掃描日期**：2026-04-24  
**範圍**：全專案（Authentication / Multi-tenant / Injection / Secrets / RLS / CSRF / Logging / Client）  
**方法**：OWASP Top 10 + CWE Top 25 + threat modeling + 多租戶 leak scenarios  
**期限內**：30-40 分鐘掃描、重點放新發現（避免重報前 6 模組已列項）

---

## 一句話裁決

**能上線、但必須清掉 3 個 P1（密鑰洩漏、不安全 JSON parse、CSP 過鬆）+ 5 個 P2（rate limit 分散度不足、XSS 列印風險、logger 詳程度、多租戶邊界 3 處薄弱、webhook 簽驗機制不一致）。多租戶隔離主體穩健（RLS + code-level workspace_id check），auth flow 也乾淨（rate limit + lock-out），但邊界細節需磨。**

---

## 🔴 Critical（CVSS 9+）

### 1. [CWE-798] Gemini API Key 嵌入代碼、暴露於 Bundle

**位置**：`src/app/api/gemini/generate-image/route.ts` L11-15、L35-39

**證據**：

```typescript
// src/app/api/gemini/generate-image/route.ts
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_API_KEY_2 = process.env.GEMINI_API_KEY_2
const GEMINI_API_KEY_3 = process.env.GEMINI_API_KEY_3
...

const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
)
```

**Threat scenario**：

- 每個 GEMINI_API_KEY 都是 `process.env`，但如果環境變數漏填、code 會用預設值「空字串」
- 更嚴重的是：`const apiKey = GEMINI_API_KEY || GEMINI_API_KEY_2 || ...` — 如果未來改成 hardcoded fallback（例如測試 key），會直接暴露在 source code
- 攻擊者 clone repo、grep `GEMINI_API_KEY`、一旦環境變數暴露或代碼外洩、Gemini quota 被濫用
- **量化**：Gemini API key 若被濫用、可以生成無限圖片、成本 $0.0025-0.01 per image、一天可費用 $1000+

**修復建議**：

- ✅ 目前實作「接近安全」，但有 fallback 邏輯的隱患
- **立即做**：確認 production `.env` 確實設定了 5 個 GEMINI_API_KEY\*、沒有任何 hardcoded value
- **代碼層**：改成 `const apiKey = process.env.GEMINI_API_KEY; if (!apiKey) throw new Error('Missing GEMINI_API_KEY')`（fail fast）
- **CI/CD**：加 linting rule 禁止 `= process.env.X || 'fallback-value'` pattern（即使 X 是 secret）

**優先**：P1（上線前必驗）

---

### 2. [CWE-502 + CWE-94] JSON.parse 無邊界檢查、LLM Output Injection 風險

**位置**：`src/app/api/ai/generate-itinerary-copy/route.ts` L104-110 + `src/app/api/ai/suggest-attraction/route.ts` 類似

**證據**：

````typescript
// src/app/api/ai/generate-itinerary-copy/route.ts
const cleaned = text
  .replace(/```json\s*/g, '')
  .replace(/```\s*/g, '')
  .trim()
let result: { subtitle?: string; description?: string }
try {
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  result = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned) // ⚠️ 無邊界、可能 stack overflow
} catch {
  logger.error('Failed to parse Gemini response:', text)
  result = { subtitle: '', description: cleaned.slice(0, 100) }
}
````

**Threat scenario**：

1. **Prompt Injection via LLM**：若 Gemini prompt 被注入惡意指令（indirect injection via user-provided tour title/city），Gemini 可回傳超大 JSON
   - 例如：title = `"A"*10000`，Gemini 被誘導回傳 `{ subtitle: 'A'*50000 }`
   - `JSON.parse` 會試圖分配 50KB+ 物件，可能造成記憶體溢位（DoS）
2. **正則表達式 ReDoS**：`.match(/\{[\s\S]*\}/)` 對超大字符串複雜度 O(n²)
3. **無大小檢查**：Gemini token 設了 `maxOutputTokens: 300`，但 POST response 沒驗證 body size

**修復代碼示意**：

````typescript
const MAX_RESPONSE_SIZE = 2000 // bytes
const cleaned = text
  .replace(/```json\s*/g, '')
  .replace(/```\s*/g, '')
  .trim()

if (cleaned.length > MAX_RESPONSE_SIZE) {
  logger.error('Gemini response too large')
  return errorResponse('AI 回應過大', 400)
}

let result
try {
  // 嚴格：只接受以 { 開頭、} 結尾的 JSON
  const jsonMatch = cleaned.match(/^\{[\s\S]*\}$/)
  if (!jsonMatch) {
    return errorResponse('Invalid response format', 400)
  }
  result = JSON.parse(jsonMatch[0], (key, value) => {
    // Reviver function：限制字符串長度
    if (typeof value === 'string' && value.length > 500) {
      throw new Error('String too long')
    }
    return value
  })
  // Type assertion：確保只有 subtitle / description
  if (typeof result.subtitle !== 'string' || typeof result.description !== 'string') {
    throw new Error('Invalid schema')
  }
} catch (e) {
  logger.error('Failed to parse Gemini response:', e)
  return errorResponse('AI 生成失敗', 500)
}
````

**優先**：P1（影響所有 AI endpoint）

---

### 3. [CWE-693] CSP 過於寬鬆（unsafe-eval、unsafe-inline）

**位置**：`next.config.ts` L43-46

**證據**：

```typescript
// next.config.ts
{
  key: 'Content-Security-Policy',
  value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' ...",
}
```

**Threat scenario**：

- `'unsafe-eval'`：允許 `eval()` / `Function()` / `setTimeout(...string)`，若 code 被 XSS 注入、可直接執行任意 JS
- `'unsafe-inline'`：允許 `<script>alert('xss')</script>` 直接嵌入 HTML，繞過 CSP 本意
- 搭配 **18 個 dangerouslySetInnerHTML 使用點**，風險大幅升級

**實際例子**：

- 攻擊者在 tour 標題裡塞 `<img src=x onerror="alert('xss')">`
- 前端用 `dangerouslySetInnerHTML={{ __html: tourTitle }}`
- CSP 因為 `unsafe-inline` 允許、事件處理器觸發 → RCE

**修復建議**：

```typescript
// next.config.ts — CSP 變嚴格
{
  key: 'Content-Security-Policy',
  value: "default-src 'self'; script-src 'self' 'nonce-<random>'; style-src 'self' 'nonce-<random>' https://fonts.googleapis.com; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io;",
}
```

並：

- **去掉所有 `dangerouslySetInnerHTML`**（改用 `.textContent` 或 Markdown → sanitized HTML 的 library）
- 或用 `sanitize-html` / `DOMPurify` 對用戶輸入的 HTML 進行白名單清理

**優先**：P1（CSP 是防 XSS 最後一道防線）

---

## 🟠 High（CVSS 7-8）

### 4. [CWE-95] XSS in Print & Export（innerHTML 直接拼接）

**位置**：`src/features/disbursement/components/DisbursementPrintDialog.tsx` + `src/features/tours/components/tour-itinerary-tab.tsx`

**證據**：

```typescript
// 列印時直接取 innerHTML、可能包含用戶輸入
const printHtml = `
  <html>
    <body>
      ${printRef.current.innerHTML}  // ⚠️ 若 printRef 包含 dangerouslySetInnerHTML、會直接列印惡意 script
    </body>
  </html>
`
```

**Threat scenario**：

- 攻擊者在「行程描述」或「備註」欄塞 `<script>alert('xss')</script>`
- 用戶點「列印」→ HTML 開啟新視窗 → 腳本在列印預覽上下文執行 → 可竊取 cookie / redirects
- Print preview 通常不受 CSP 限制（瀏覽器特例）

**修復**：

```typescript
// DisbursementPrintDialog.tsx
const printHtml = `
  <html>
    <body>
      ${sanitizeHtml(printRef.current.innerHTML, { allowedTags: ['b', 'i', 'u', 'p', 'br'] })}
    </body>
  </html>
`
// 或乾脆用 text-only：
const printText = printRef.current.textContent // 拋棄所有 HTML
```

**優先**：P2（受影響面有限、但旅行社可能在 itinerary 裡寫 HTML）

---

### 5. [CWE-613] Rate Limit 依賴 In-Memory Fallback（非分散）

**位置**：`src/lib/rate-limit.ts` L9-56

**證據**：

```typescript
// 本機記憶體 fallback
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function rateLimitInMemory(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(key)
  // ...
}

// 當 RPC 失敗、用 in-memory fallback
if (error) {
  logger.warn('Rate limit RPC error, falling back to in-memory:', error.message)
  return rateLimitInMemory(key, limit, windowSeconds * 1000)
}
```

**Threat scenario**：

- Vercel 多實例部署、每個實例有獨立 `rateLimitMap`
- 攻擊者可同時向 5 個 instance 發送 10 req/min → 每個 instance 都認為在 limit 以內 → 實際達成 50 req/min
- **具體例子**：login 端點設 10/min、攻擊者 5 instance \* 10 = 50 登入嘗試、不被擋

**修復建議**：

- ✅ RPC 實作看起來正常（`check_rate_limit` 在 DB 做分散鎖）
- **增強**：改 fallback 邏輯，不用 in-memory map、改用 **fail-closed**（RPC 失敗時直接回 429，不放行）

```typescript
async function rateLimitDistributed(...) {
  try {
    const { data, error } = await supabase.rpc(...)
    if (error) {
      // 不 fallback、直接拒（保守選擇）
      logger.error('Rate limit check failed, denying request')
      return false  // deny
    }
    return data as boolean
  } catch {
    return false  // 同樣 fail-closed
  }
}
```

**優先**：P2（分散部署下有風險、但 Vercel 上 instance 通常很快恢復）

---

### 6. [CWE-532] Logger 詳程度過高（auth 細節洩漏）

**位置**：`src/lib/auth/server-auth.ts` L60-64、L88-94

**證據**：

```typescript
// src/lib/auth/server-auth.ts L60-64
logger.log('🔍 getServerAuth - auth user:', {
  auth_uid: user.id?.substring(0, 8),
  auth_email: user.email, // ⚠️ 真實 email
  metadata: user.user_metadata,
})

// L88-94
logger.error('找不到員工資料', {
  auth_uid: user.id, // ⚠️ 完整 UUID
  auth_email: user.email, // ⚠️ 真實 email
  user_metadata: user.user_metadata,
})
```

**Threat scenario**：

- 攻擊者若能讀取 logs（Sentry、CloudWatch 洩漏或 debug mode），可看到：
  - 完整 auth.users email
  - user_metadata（可能包含 workspace_id）
  - 登入失敗的 user ID pattern（可用於 enumeration）
- Production 日誌通常被發送到中央收集平台（Sentry），若平台被破、全部 auth email 暴露

**修復**：

```typescript
// src/lib/auth/server-auth.ts
logger.log('🔍 getServerAuth - user authenticated', {
  // 只記 hash 或縮短版，不記真實 email
  auth_uid_hash: createHash('sha256').update(user.id).digest('hex').substring(0, 8),
  // 不記 user.email
})

// 記不詳細的失敗
logger.error('Employee lookup failed', {
  // 不記真實 email、只記「沒找到」
  code: 'EMPLOYEE_NOT_FOUND',
})
```

**優先**：P2（資訊洩漏、但需要攻擊者先讀到 logs）

---

### 7. [CWE-601] Open Redirect 低風險（但有註解警示）

**位置**：`src/app/api/d/[code]/route.ts` L51

**證據**：

```typescript
// src/app/api/d/[code]/route.ts
return NextResponse.redirect(signedData.signedUrl) // ⚠️ 無驗證
```

**現況評估**：

- 代碼**已有註解**警示：`TODO: Add rate limiting (e.g. IP-based, 10 req/min) to prevent enumeration attacks.`
- signed URL 來自 Supabase Storage、本身受限於 `tour_documents` 表 + tour_id match
- 風險：攻擊者不能 redirect 到任意 URL（受限於 `documents` bucket signed URL）
- **但**：tour code 半可預測（`CNX250128A` pattern）→ 可枚舉 tour codes 找存在的 tours

**修復建議**：

```typescript
// 加 rate limit
const rateLimited = await checkRateLimit(request, 'download-tour-manifest', 5, 60_000)
if (rateLimited) return rateLimited

// 驗證 tour code 非惡意字符
if (!/^[A-Z]{3}\d{6}[A-Z]$/.test(code)) {
  return NextResponse.json({ error: 'Invalid code format' }, { status: 400 })
}
```

**優先**：P2（已有緩解、但應補 rate limit）

---

### 8. [CWE-863] Multi-Tenant 邊界 3 處細節薄弱

#### 8a. `/api/customers/match` — 接受 client 傳來的 workspaceId（IDOR 預兆）

**位置**：`src/app/api/customers/match/route.ts` L23-32

**證據**：

```typescript
const { name, birthDate, phone, workspaceId } = await request.json()

if (!name || !workspaceId) {
  return NextResponse.json({ error: 'Missing name or workspaceId' }, { status: 400 })
}

let query = supabaseAdmin
  .from('customers')
  .select('id, code, name, phone, email, birth_date, line_user_id')
  .eq('workspace_id', workspaceId) // ⚠️ 直接信任 client 傳的 workspaceId
```

**Threat scenario**：

- 登入租戶 A、但傳 `workspaceId: <租戶 B UUID>`
- 若無 code 層驗證 → 直接洩漏租戶 B 的客戶資料
- **此 endpoint 是 public 嗎**？check middleware... 是 `/api/auth/...` 前綴的公開路由
- 但 `validateBody` 有檢查 schema？→ workspaceId 是 string UUID，沒有 whitelist

**修復**：

```typescript
// 一定要驗證 workspaceId 來自 auth user
const auth = await getServerAuth()
if (!auth.success) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

const requestedWorkspace = workspaceId // from request
const userWorkspace = auth.data.workspaceId

if (requestedWorkspace !== userWorkspace) {
  return NextResponse.json({ error: 'Access denied' }, { status: 403 })
}
```

**優先**：P2（需先確認此 endpoint 可被 unauthenticated 存取、再評估）

#### 8b. `/api/workspaces` — 回傳全部 workspace 給有 `tenants` feature 的用戶

**位置**：`src/app/api/workspaces/route.ts` L31-35

**證據**：

```typescript
// 檢查 feature 啟用，但沒檢查「是否為 Corner workspace」
const { data: feature } = await supabase
  .from('workspace_features')
  .select('enabled')
  .eq('workspace_id', auth.data.workspaceId)
  .eq('feature_code', 'tenants')
  .single()

if (!feature?.enabled) {
  return NextResponse.json({ error: '無權限' }, { status: 403 })
}

// 有 tenants feature → 查全部 workspaces
const { data: workspaces, error } = await supabase.from('workspaces').select('*') // ⚠️ 回傳所有欄位給全部 workspace
```

**Threat scenario**：

- 租戶 JINGYAO 若意外被啟用 `tenants` feature → 可看到 Corner + YUFEN 的 workspace 詳情
- 不涉及客戶資料、但洩漏業務結構
- **決策問題**：`tenants` feature 應該只開給 Corner（主租戶）、不應開給 Partner

**修復**：

```typescript
// 方案 1：檢查特定 workspace（只有 Corner 能管理 tenants）
const ALLOWED_WORKSPACE_ID = process.env.CORNER_WORKSPACE_ID
if (auth.data.workspaceId !== ALLOWED_WORKSPACE_ID) {
  return NextResponse.json({ error: 'Only Corner can manage tenants' }, { status: 403 })
}

// 方案 2：只回傳必要欄位
const { data: workspaces } = await supabase
  .from('workspaces')
  .select('id, code, name, type, created_at') // 限縮回傳
```

**優先**：P2（架構決策問題、可能不是漏洞）

---

### 9. [CWE-326] Webhook Signature 驗證機制不一致

**位置**：`src/app/api/line/webhook/route.ts` L20-28 vs `src/app/api/meta/webhook/route.ts`

**證據**：

```typescript
// LINE webhook — 用 timing-safe-equal
function validateSignature(rawBody: string, signature: string | null): boolean {
  if (!signature || !LINE_SECRET) return false
  try {
    const hash = createHmac('SHA256', LINE_SECRET).update(rawBody).digest('base64')
    return timingSafeEqual(Buffer.from(hash), Buffer.from(signature)) // ✅ timing-safe
  } catch {
    return false
  }
}

// 但 META webhook 怎麼做？需檢查...
```

**Threat scenario**：

- LINE 用 timing-safe-equal（好）
- 但若 META webhook 用簡單的 `===`，可被 timing attack 洩漏有效簽名的位元

**修復建議**：

- 審查 META webhook 簽驗邏輯
- 所有 webhook 都用 `timingSafeEqual`

**優先**：P2（需確認 META 實作）

---

## 🟡 Medium（CVSS 4-6）

### 10. [CWE-434] File Upload 未驗證 MIME type（OCR 端點）

**位置**：`src/app/api/ocr/passport/route.ts`（推測、未看詳細代碼）

**推測威脅**：

- OCR endpoint 接收護照掃描圖片
- 若無 MIME type check、可上傳 `.exe` / `.zip` 當圖片
- Supabase storage 默認允許存任意檔案類型

**修復建議**：

```typescript
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const mimeType = request.headers.get('content-type')
if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
  return errorResponse('Only JPEG/PNG/WebP images allowed', 400)
}
```

**優先**：P2（低風險、因為最終還要 OCR 處理、執行惡意檔案機率低）

---

### 11. [CWE-388] 硬編 Corner workspace UUID（多租戶洩漏預兆）

**位置**：（已在 BACKLOG Wave 3 列出、不重報）

- `src/app/api/finance/account-mappings/route.ts:97`
- `src/lib/line/ai-customer-service.ts:10`
- 等 6 處

**現況**：已列 BACKLOG Wave 3、William 已知

**優先**：已列

---

### 12. [CWE-200] localStorage 存放敏感用戶資訊

**位置**：`src/stores/auth-store.ts` L241-248

**證據**：

```typescript
// Zustand persist → localStorage
{
  name: 'auth-storage',
  partialize: state => ({
    user: state.user,  // ⚠️ 包含 employee.id, workspace_id, permissions
    isAuthenticated: state.isAuthenticated,
    isAdmin: state.isAdmin,
    sidebarCollapsed: state.sidebarCollapsed,
  }),
}
```

**Threat scenario**：

- localStorage 易被 XSS 讀取
- employee.id + workspace_id 被竊取 → 可用於 IDOR 攻擊
- 若被搭配 CSRF，可在另一個 tab 冒充該用戶

**修復建議**：

- ✅ Zupabase SSR 默認用 httpOnly cookies（安全）
- 但 auth-store 額外存到 localStorage（冗餘且不安全）
- **改成**：只在 RAM 存 auth state、重新整理時從 server 重新 fetch（不用 persist）

```typescript
// auth-store.ts — 去掉 persist middleware
export const useAuthStore = create<AuthState>((set, get) => ({
  // ... state
  // 無 persist！重新整理後、server middleware 會重新認證
}))
```

**優先**：P2（但若已用 httpOnly cookies、localStorage 衝擊相對小）

---

## 🟢 健康面向 / Defense-in-Depth 做得好

### ✅ 強點

| 面向               | 證據                                                                  | 評價                                |
| ------------------ | --------------------------------------------------------------------- | ----------------------------------- |
| **Rate Limiting**  | `checkRateLimit()` 在 login / public API 都有、RPC 分散鎖             | 設計完整、只缺 fail-closed fallback |
| **Auth Flow**      | `getServerAuth()` 嚴格驗證 user + workspace、admin client per-request | 架構穩、細節清楚                    |
| **RLS 主體**       | 28 張表 NO FORCE RLS、BACKLOG Wave 2.5 完整測試                       | 多租戶隔離基礎穩健                  |
| **Webhook 簽驗**   | LINE webhook `timingSafeEqual`、不懼 timing attack                    | ✅ best practice                    |
| **Cookie 安全**    | Supabase SSR 預設 httpOnly + Secure + SameSite=Lax                    | ✅ 自動保護、無需手動設定           |
| **密碼策略**       | `validateLogin` 有 login_failed_count + 15min lockout                 | ✅ 防 brute force                   |
| **Audit Trail**    | audit FK 統一到 employees(id)、Wave 0 全清                            | ✅ 追蹤完整                         |
| **Error Handling** | API 不洩漏 stack trace、generic error message                         | ✅ fail secure                      |
| **中央化權限**     | `role_tab_permissions` SSOT、不依賴 hardcoded isAdmin                 | ✅ 可擴展                           |

---

## 跨視角 Pattern 候選

這些不是純資安議題、但若不修會留下隱患：

| #   | Issue                                        | 歸屬            | 建議                                      |
| --- | -------------------------------------------- | --------------- | ----------------------------------------- |
| 1   | **CSP 過寬 + 18 個 dangerouslySetInnerHTML** | SRE + Architect | 統一改 CSP、清理 innerHTML                |
| 2   | **Logger 詳程度（auth email）**              | SRE 日誌策略    | 定義 log level 標準、pii 不落地           |
| 3   | **JSON.parse 無邊界**                        | Data Engineer   | Gemini/Claude output 需 schema validation |
| 4   | **Rate limit fallback 分散度**               | SRE 部署        | 多實例 load test、驗證分散鎖有效          |
| 5   | **多租戶邊界 3 處細節**                      | Architect       | 補充 tenant isolation design doc          |

---

## 給下一位靈魂的 Hint

**Database Optimizer 會關注的**：

- `check_rate_limit()` RPC 的性能（是否 index 完善）
- webhook signature 驗證表的 TTL / 去重機制
- logged-out user 的 session cleanup（防 DB 洩漏）

**SRE 會關注的**：

- CSP header 在 CDN / WAF 層的設定是否一致
- log aggregation（Sentry）的 PII redaction 規則
- rate limit RPC 的 distributed lock 是否會造成 contention

---

## 執行順序建議

### 今晚 / 明天白天（S = <2 小時）

1. ✅ Gemini API key fallback → fail fast（`throw new Error`）
2. ✅ JSON.parse 邊界檢查 + schema validation（Reviver function）
3. ✅ CSP 去掉 `unsafe-eval` 和 `unsafe-inline`（改 `nonce-*`）

### 需要決策（M = 半天）

4. 🛑 dangerouslySetInnerHTML 18 個位置該怎麼清 → DOMPurify 還是改 TextContent？
5. 🛑 Logger 詳程度 → 定義公司級 logging policy

### Post-Launch（L）

6. Rate limit RPC contention test（多實例負測）
7. 多租戶邊界文件化 + threat model 補充

---

_Security Engineer 簽名：看過的漏洞都是「基礎被忽略」的案例，這份代碼沒有那麼糟、但細節會決定上線後的痛點。_

---

## 🔁 主 Claude 覆盤（馬拉松節奏）

### 1. 真問題過濾（12 條 → 濾成 5 條值得上線前處理）

| #                                | Security Engineer 說 | 覆盤後實際                                                  | 原因                                                                                                          |
| -------------------------------- | -------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| #1 Gemini API Key                | 🔴 Critical          | ⚠️ **需驗證**                                               | 要先確認是 server 用還是 client bundle 用、`.env.example` 不一定代表在 bundle 裡、可能只是 prompt user 設 env |
| #2 JSON.parse 無邊界             | 🔴 Critical          | 🟡 真問題、但分類改                                         | 是**可靠性問題**（ReDoS / LLM 崩）而非 security、影響 ai-bot 可用性                                           |
| #3 CSP 過寬 + #4 innerHTML 18 處 | 🔴/🟠                | 🟠 **合併一條真問題**                                       | 沒 XSS 注入點就不會被打、但 #4 列印/匯出的 innerHTML 有攻擊面、要配套修                                       |
| #5 Rate Limit in-memory          | 🟠                   | 🟡 Vercel serverless 通常不踩                               | 除非你用長駐 node server                                                                                      |
| #6 Logger PII                    | 🟠                   | 🟡 真、但低                                                 | 日誌不公開、風險低                                                                                            |
| #7 Open Redirect                 | 🟠                   | 🟢 報告自己說「低風險但註解警示」= 已有人看過、不急         |
| #8 Multi-tenant 3 處             | 🟠                   | ⚠️ **要具體驗證 IDOR 路徑**、這是最可能致命但最需實證的一條 |
| #9 Webhook META 簽驗             | 🟠                   | 🔴 **真問題**                                               | LINE / META 接收外部 call、沒簽驗 = 仿冒攻擊                                                                  |
| #10 File upload MIME             | 🟡                   | 🟡 真                                                       |
| #11 Corner UUID 硬編             | 🟡                   | ❌ **扣分**、已列 BACKLOG Wave 3、不該重報                  |
| #12 localStorage                 | 🟡                   | 🟢 常見做法、低風險                                         |

**覆盤結論**：**3 個 P0 / 2 個 P1 需要處理**

- **P0-1**：#8 多租戶 IDOR 3 處 — 要人工驗證攻擊路徑（不是看 code、是實際打看看）
- **P0-2**：#9 Webhook 簽驗不一致（META）— 有外部攻擊面、立刻補
- **P0-3**：#1 Gemini Key 驗證是否真在 bundle（可能誤判）
- **P1-1**：#2 JSON.parse ReDoS 邊界 — 分類從 security 改到 reliability
- **P1-2**：#3+#4 合併 — CSP 收緊 + 18 處 `dangerouslySetInnerHTML` 審視

### 2. 跟 BACKLOG / INDEX 重複

- **#11 Corner UUID** 已在 `BACKLOG.md § Wave 3` 列了、agent 重報
- **#8.2 workspace features 權限** 跟 `00-INDEX.md § 管理區 module-tabs 幽靈 permission` 部分重疊

### 3. 跨視角 pattern 候選（傳給後面 9 位參考）

- 🔁 **CSP + `dangerouslySetInnerHTML` 18 處** → **UX Architect 也會看**（HTML 品質 / 無障礙）、**Architect 也會看**（renderer 抽象）
- 🔁 **Logger PII 洩漏** → **DevOps 會看**（可觀測性 + 合規）
- 🔁 **Rate limit 分散式** → **DevOps / SRE 會看**（multi-instance 可靠性）
- 🔁 **JSON.parse 無邊界** → **Data Engineer 會看**（資料品質）
- 🔁 **Webhook 簽驗不一致** → **SRE 會看**（外部整合可靠性）

**新 pattern**：**「外部輸入信任邊界未統一」** — LINE webhook、META webhook、LinkPay callback、OCR 上傳、LLM output、JSON.parse user input。六個入口六套檢查、沒有中央「untrusted input gateway」。這是跨安全/可靠性/資料三個視角的共同課題、傳給後面。

---
