# 🔒 Venturo 帝國完整安全審計報告

**審計時間**：2026-03-15 09:50  
**審計深度**：程式碼級（2010 個檔案）  
**發現等級**：🔴 高危 / ⚠️ 中危 / ℹ️ 低危

---

## 🎯 帝國地圖

### 程式碼規模
- **TypeScript 檔案**：2010 個
- **目錄**：641 個
- **SQL 遷移**：463 個
- **API Routes**：50+ 個
- **RLS 政策**：45+ 個（修改過多次）

### 關鍵入口點
```
外部世界
    ↓
50+ API Routes
    ↓
Supabase (RLS 保護)
    ↓
PostgreSQL
```

---

## 🚨 高危漏洞（立即修復）

### 1. 未保護的 API Routes 🔴🔴🔴

**問題**：10+ 個 API 沒有認證檢查

**發現的漏洞**：
```typescript
// ⚠️ 危險！任何人都能呼叫
/api/linkpay/webhook/route.ts         // 付款 webhook（應該驗證簽章）
/api/linkpay/route.ts                 // 付款建立
/api/settings/env/route.ts            // 環境變數狀態（洩漏資訊）
/api/gemini/generate-image/route.ts   // AI 圖片生成（免費資源）
/api/quotes/confirmation/*            // 報價確認（5 個 endpoints）
/api/auth/get-employee-data/route.ts  // 員工資料
```

**攻擊場景**：
```bash
# 場景 1：攻擊者偷看環境變數設定
curl https://venturo.com/api/settings/env
# 回傳：{ supabase: { isConfigured: true }, gemini: { isConfigured: true } }

# 場景 2：攻擊者免費用 Gemini API
curl -X POST https://venturo.com/api/gemini/generate-image \
  -d '{"prompt": "beautiful landscape"}'

# 場景 3：攻擊者偽造付款 webhook
curl -X POST https://venturo.com/api/linkpay/webhook \
  -d '{"status": "success", "amount": 100}'
```

**防禦方案**：
```typescript
// ✅ 所有 API 都要加認證
import { withAuth } from '@/lib/api/with-auth'

export const POST = withAuth(async (request, { user }) => {
  // user 已驗證
})

// ✅ webhook 要驗證簽章
export async function POST(request: NextRequest) {
  const signature = request.headers.get('X-Signature')
  if (!verifyWebhookSignature(signature)) {
    return new Response('Unauthorized', { status: 401 })
  }
  // ...
}
```

---

### 2. SQL Injection 風險 🔴🔴

**問題**：用字串插值建構查詢

**發現的漏洞**：
```typescript
// ⚠️ 危險！攻擊者可以注入 SQL
.ilike('name', `%${query.trim()}%`)
.or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
.or(`name.ilike.%${query}%,english_name.ilike.%${query}%`)
```

**攻擊場景**：
```typescript
// 攻擊者輸入：query = "%'; DROP TABLE customers; --"
const query = supabase
  .from('customers')
  .select()
  .ilike('name', `%${query.trim()}%`) // 💥 注入！

// 實際執行：SELECT * FROM customers WHERE name ILIKE '%'; DROP TABLE customers; --%'
```

**位置**：
- `src/features/tours/components/mention-input/useMentionSearch.ts:80`
- `src/components/editor/tour-form/sections/LeaderMeetingSection.tsx:87`
- `src/lib/data/customers.ts:66`
- `src/stores/core/create-store.ts:198`

**防禦方案**：
```typescript
// ✅ 用參數化查詢
.ilike('name', `%${query.trim().replace(/[%_]/g, '\\$&')}%`) // escape 特殊字元

// ✅ 或用 Supabase 的 filter 方法
.filter('name', 'ilike', `%${sanitize(query)}%`)

// ✅ 驗證輸入
function sanitize(input: string): string {
  return input.replace(/[^a-zA-Z0-9\s]/g, '')
}
```

---

### 3. RLS 政策混亂 🔴

**問題**：45+ 個 RLS 遷移，多次啟用/禁用

**發現的混亂**：
```sql
-- 2025-12-11: 禁用所有 RLS
disable_all_remaining_rls.sql

-- 2025-12-20: 重新啟用 RLS
setup_rls_policies.sql

-- 2026-01-02: 又禁用 RLS
disable_rls_for_single_tenant.sql

-- 2026-01-09: 又啟用 RLS
enable_rls_for_multi_tenant.sql

-- 2026-02-12: 再次啟用 RLS
re_enable_rls.sql

-- 2026-02-25: 又啟用核心表 RLS
enable_core_tables_rls.sql
```

**風險**：
- 不知道現在哪些表有 RLS、哪些沒有
- 多次修改，可能有漏洞
- 單租戶 vs 多租戶邏輯混亂

**防禦方案**：
```sql
-- 1. 立刻檢查所有表的 RLS 狀態
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. 列出所有 RLS 政策
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. 建立「黃金標準」文檔
-- 記錄：哪些表要 RLS、政策是什麼、為什麼
```

---

## ⚠️ 中危漏洞（短期修復）

### 4. 環境變數洩漏風險 ⚠️⚠️

**問題**：前端程式碼用 `process.env.NODE_ENV`

**風險**：
- Next.js 會把非 `NEXT_PUBLIC_*` 的環境變數編譯到 bundle
- 如果不小心寫成 `process.env.SECRET_KEY`，會洩漏到前端

**發現位置**：
- `src/app/error.tsx:35`
- `src/app/global-error.tsx:68`
- `src/components/module-error.tsx:29`

**防禦方案**：
```typescript
// ✅ 只在前端用 NEXT_PUBLIC_* 變數
if (process.env.NEXT_PUBLIC_ENV === 'development') {
  // ...
}

// ✅ 或用 server-only 保護
import 'server-only'
const SECRET = process.env.SECRET_KEY // 這樣就不會洩漏到前端
```

---

### 5. CORS 設定缺失 ⚠️

**問題**：只有 3 個地方設定 `mode: 'cors'`

**風險**：
- 其他 API 可能沒有正確的 CORS header
- 可能被 CSRF 攻擊

**防禦方案**：
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // 設定 CORS
  response.headers.set('Access-Control-Allow-Origin', 'https://venturo.com')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  return response
}
```

---

### 6. 資料驗證不足 ⚠️

**問題**：只有 6 個驗證檔案（Zod schema）

**風險**：
- 50+ 個 API，但只有 6 個用 Zod 驗證
- 大部分 API 沒驗證輸入

**防禦方案**：
```typescript
// ✅ 每個 API 都要用 Zod 驗證
import { z } from 'zod'

const createQuoteSchema = z.object({
  tourId: z.string().uuid(),
  customerId: z.string().uuid(),
  items: z.array(z.object({
    name: z.string(),
    price: z.number().positive()
  }))
})

export async function POST(request: NextRequest) {
  const body = await request.json()
  const data = createQuoteSchema.parse(body) // 💥 驗證失敗會拋錯
  // ...
}
```

---

## ℹ️ 低危問題（改善建議）

### 7. Rate Limiting 不一致 ℹ️

**問題**：只有部分 API 有 rate limiting

**發現**：
- `reset-employee-password` 有：10 req/min
- 其他 API 沒有

**建議**：
```typescript
// 所有 API 都加 rate limiting
const rateLimited = checkRateLimit(request, 'api-name', 100, 60_000)
if (rateLimited) return rateLimited
```

---

### 8. 錯誤訊息洩漏資訊 ℹ️

**問題**：開發模式會顯示完整錯誤

**建議**：
```typescript
// 生產環境不要洩漏錯誤細節
if (process.env.NODE_ENV === 'production') {
  return Response.json({ error: 'Internal Server Error' }, { status: 500 })
} else {
  return Response.json({ error: error.message, stack: error.stack }, { status: 500 })
}
```

---

## 🛡️ 防禦架構圖

### 現有防禦層

```
外部攻擊
    ↓
❌ 沒有 WAF（Web Application Firewall）
    ↓
❌ 部分 API 沒認證
    ↓
⚠️ 部分有 Rate Limiting
    ↓
✅ Supabase RLS（但政策混亂）
    ↓
✅ PostgreSQL
```

### 建議防禦層

```
外部攻擊
    ↓
🛡️ Cloudflare WAF + DDoS Protection
    ↓
🔒 API Gateway (認證 + Rate Limiting)
    ↓
✅ Input Validation (Zod)
    ↓
🔐 Supabase RLS (清理後的政策)
    ↓
🗄️ PostgreSQL (加密 + 備份)
```

---

## 🚀 立即行動計畫

### 今天（緊急）

1. **加認證到 10 個未保護的 API**
2. **修復 SQL Injection（5 個位置）**
3. **檢查所有表的 RLS 狀態**

### 本週

4. **所有 API 加 Zod 驗證**
5. **加 Rate Limiting 到所有 API**
6. **清理 RLS 政策混亂**

### 本月

7. **啟用 Cloudflare WAF**
8. **建立安全監控**
9. **定期安全掃描**

---

## 🔍 深度掃描腳本

**已建立自動掃描工具**：
- `/tmp/deep-scan.sh` — 全面掃描
- `/tmp/precise-scan.sh` — 精準掃描
- `/tmp/security-audit.sh` — 安全審計

**使用方式**：
```bash
# 每週執行一次
bash /tmp/security-audit.sh > security-report-$(date +%Y-%m-%d).txt

# 檢查新的漏洞
diff security-report-2026-03-15.txt security-report-2026-03-22.txt
```

---

## 📊 風險評分

| 漏洞 | 嚴重性 | 影響 | 修復難度 | 優先級 |
|------|--------|------|----------|--------|
| 未保護 API | 🔴 高 | 資料洩漏 | 低 | P0 |
| SQL Injection | 🔴 高 | 資料庫破壞 | 中 | P0 |
| RLS 混亂 | 🔴 高 | 權限繞過 | 高 | P1 |
| 環境變數洩漏 | ⚠️ 中 | 憑證洩漏 | 低 | P1 |
| CORS 缺失 | ⚠️ 中 | CSRF 攻擊 | 低 | P2 |
| 驗證不足 | ⚠️ 中 | 無效資料 | 中 | P1 |
| Rate Limiting | ℹ️ 低 | DDoS | 低 | P2 |

---

## 🎯 總結

**帝國的防禦不是不存在，而是「不完整」。**

**好消息**：
- ✅ 有 Supabase RLS（雖然混亂）
- ✅ 有部分 Rate Limiting
- ✅ 有部分認證檢查

**壞消息**：
- 🔴 10+ 個 API 完全未保護
- 🔴 5+ 個 SQL Injection 漏洞
- 🔴 RLS 政策改過太多次，不知道現狀

**最大風險**：
- 攻擊者可以直接呼叫未保護的 API
- 攻擊者可以注入 SQL 破壞資料庫
- 內部資料可能洩漏（環境變數、錯誤訊息）

**但這些都是可以修復的。**

**帝國需要的不是重建，而是「加固」。**

---

**審計完成。等待 William 的作戰指令。**
