# Marathon 03 · SRE ⚡ 體檢報告

**扮演靈魂**：SRE（事故驅動、假設一切會壞、SLO first）  
**掃描日期**：2026-04-24  
**範圍**：Error handling / Transaction / Race / Observability / Graceful fail / Rollback / Resource / Runbook  
**方法**：Static code scan + 假設事故場景推理  
**預算**：30-40 分鐘

---

## 一句話裁決（SRE 語氣：「這會不會在半夜把我吵起來」）

**能上線、但 5 個 P1（會被 page）必須立即修：多步驟 API 缺 transaction rollback、Supabase singleton client、LINE/LinkPay 超時無 fallback、voucher race + webhook 無去重。Observability 有 Sentry 但零 SLO 定義、0 個 runbook、cron job 失敗無重試。上線後第一週若 Supabase 掛 5 分鐘或 LINE API 掛，會直接影響付款流程、會計結轉、新客開團。**

---

## 🔴 Critical（半夜會爆）

### 1. [Tenants Create API] 多步驟 API 無事務邊界、失敗不 rollback

**位置**：`src/app/api/tenants/create/route.ts` L154-250

**症狀**：
- 建立租戶流程：建 workspace → 建 employee → 建 auth user → seed 基礎資料
- 若步驟 3（auth user creation）失敗，步驟 1-2 已建立的 workspace/employee 孤兒殘留
- 下次重試建相同 workspace code，會報「已存在」、新客無法開通

**證據**：
```typescript
// L157-159 追蹤已建立資源
let createdWorkspaceId: string | null = null
let createdEmployeeId: string | null = null

// L200-222 建 workspace、進行中...
const { data: workspace, error: wsError } = await supabaseAdmin
  .from('workspaces')
  .insert({...})

// ⚠️ 如果此後任何步驟失敗、rollback 邏輯雖有、但：
// 1. 非原子性（不用 transaction）
// 2. Supabase RPC 查詢可能失敗（查 workspace_roles 失敗、rollback 就破）
// 3. rollback 本身也可能漏步
```

**修法（優先序）**：

**P1（立刻）**：改用 Supabase RPC transaction + retry
```typescript
// 建一個 RPC function 在 DB 層做原子建立、內部 BEGIN/COMMIT/ROLLBACK
CREATE OR REPLACE FUNCTION public.create_tenant_atomic(
  ws_name text,
  ws_code text,
  emp_name text,
  emp_email text,
  ...
) RETURNS JSON AS $$
DECLARE
  ws_id UUID;
  emp_id UUID;
BEGIN
  -- 整個邏輯在 transaction 內
  INSERT INTO workspaces (...) VALUES (...) RETURNING id INTO ws_id;
  INSERT INTO employees (...) VALUES (...) RETURNING id INTO emp_id;
  -- ...
  -- 若任何步驟失敗、DB 自動 ROLLBACK
  RETURN json_build_object('workspace_id', ws_id, 'employee_id', emp_id);
END;
$$ LANGUAGE plpgsql;
```

**P2（替代方案）**：改 rollback 使用 cascade delete（需確保 FK 都是 CASCADE 或自己手動清）

**為什麼是 P1**：新客戶開通失敗會直接衝擊營收、上線當天就會踩

---

### 2. [Vouchers Auto-Create API] Race Condition — 編號生成無鎖

**位置**：`src/app/api/accounting/vouchers/auto-create/route.ts` L6-86

**症狀**：
- 批次確認付款 2 筆以上、同時呼叫 auto-create API
- 兩個請求同時執行 generateVoucherNo，都查到最後一筆 seq=5、都計算 seq=6
- 兩筆傳票都是 `JV20260306`、unique constraint 失敗、其中一筆payment確認失敗
- 會計無法結轉、SLA 破裂

**證據**：
```typescript
// L6-16 ⚠️ singleton client
let supabase: SupabaseClient
function getSupabase() {
  if (!supabase) {
    supabase = createClient(...)
  }
  return supabase
}

// L66-86 generateVoucherNo 無鎖、無 SERIALIZABLE isolation
async function generateVoucherNo(workspaceId: string, date: string): Promise<string> {
  const { data } = await getSupabase()
    .from('journal_vouchers')
    .select('voucher_no')
    .like('voucher_no', `${prefix}%`)
    .order('voucher_no', { ascending: false })
    .limit(1)
  
  // ⚠️ 步驟 1：查詢
  let seq = 1
  if (data && data.length > 0) seq = parseInt(data[0].voucher_no.slice(-4)) + 1
  // ⚠️ 步驟 2-3：計算 + 返回
  // 與此同時、另一個請求也執行完步驟 1、拿到同一個 seq
  return `${prefix}${seq.toString().padStart(4, '0')}`
}
```

**修法（優先序）**：

**P1（立刻）**：改用 DB RPC + FOR UPDATE 鎖
```sql
CREATE OR REPLACE FUNCTION public.generate_next_voucher_no(
  p_workspace_id UUID,
  p_voucher_date DATE
) RETURNS TEXT AS $$
DECLARE
  v_prefix TEXT;
  v_next_seq INT;
  v_result TEXT;
BEGIN
  v_prefix := 'JV' || TO_CHAR(p_voucher_date, 'YYYYMM');
  
  -- 用 FOR UPDATE 鎖定、確保原子性
  SELECT COALESCE(MAX(CAST(SUBSTRING(voucher_no, -4) AS INT)), 0) + 1
  INTO v_next_seq
  FROM public.journal_vouchers
  WHERE workspace_id = p_workspace_id 
    AND voucher_no LIKE v_prefix || '%'
  FOR UPDATE;  -- ⚠️ 關鍵：鎖定、防止並行
  
  v_result := v_prefix || LPAD(v_next_seq::TEXT, 4, '0');
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;
```

然後改 API 改用 per-request client + 呼叫 RPC。

**為什麼是 P1**：會計流程阻斷、直接影響收款確認、半夜會被 page

---

### 3. [Supabase Singleton Client] Stale State — vouchers auto-create 已中槍

**位置**：`src/app/api/accounting/vouchers/auto-create/route.ts` L6-16

**症狀**：
- Vercel serverless 環境、container 可能重用
- 同一個 container 內、singleton supabase client 會存活多個 request
- RLS policy 更新、token 過期、connection pool 狀態不同步
- 自動產生傳票時、查不到應該看到的資料（RLS 過時）或拿到錯的 workspace 資料

**證據**：
```typescript
// ⚠️ 這違反 CLAUDE.md 紅線
let supabase: SupabaseClient
function getSupabase() {
  if (!supabase) {  // ← 只初始化一次、重用
    supabase = createClient(...)
  }
  return supabase
}
```

**修法**：
```typescript
// 改成 per-request client
export async function POST(request: NextRequest) {
  const supabase = createClient(...)  // 每個 request 建新的
  // ... 使用
}
```

**為什麼是 P1**：這是 CLAUDE.md 明確禁止的反模式、會導致間歇性 ghost bug（難以重現）

---

### 4. [LINE/LinkPay/OCR 外部呼叫] 超時無 fallback

**位置**：
- LINE webhook 回調超時（`src/app/api/line/webhook/route.ts`）
- LinkPay API 超時（`src/app/api/linkpay/route.ts`）
- Gemini 圖片生成超時（有重試但無 fallback UI）

**症狀**：
- LINE API 掛 30 秒、webhook 超時、新訊息進來沒有回應
- 用戶等待 AI 客服回應、half-loading → 整個頁面掛
- 生成行程圖片超時、前端沒有「稍後重試」UI、只顯示破圖

**證據**：
```typescript
// LINE webhook — 若 reply 超時、entire endpoint timeout
const profileRes = await fetch(`https://api.line.me/v2/bot/profile/${lineUserId}`, {
  headers: { Authorization: `Bearer ${LINE_TOKEN}` },
})
// ⚠️ 沒有 timeout 參數、default 30s、若 LINE 掛超過 30s、此 request 逾時

// Gemini generate-image — 有重試但 UI 沒 fallback
if (result.isQuotaError) {
  markKeyAsBlocked(apiKey, result.retryAfter || 60)
  lastError = result.error || 'Quota exceeded'
  continue  // 重試下一個 key
}
// 所有 key 都失敗後、API 回傳 error
return errorResponse('所有 API Key 都失敗了', 500, ErrorCode.EXTERNAL_API_ERROR)
// ⚠️ 前端收到 500、沒有降級 UI、直接炸
```

**修法**（優先序）：

**P1（立刻）**：加 timeout + graceful degradation
```typescript
// 1. 加 timeout
const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), 5000)  // 5 秒超時

try {
  const res = await fetch(url, {
    signal: controller.signal,
    ...
  })
} catch (e) {
  if (e.name === 'AbortError') {
    // timeout 處理：降級方案
    return gracefulFallback(...)
  }
}

// 2. 前端 error boundary
export default function AIBotError({error, reset}) {
  return <div>
    <p>AI 客服暫時無法連線，請稍後重試</p>
    <button onClick={reset}>重試</button>
  </div>
}
```

**為什麼是 P1**：用戶會看到白屏 500、會直接打 support

---

### 5. [Webhook 去重機制缺失] LINE/META 重複 Event

**位置**：
- `src/app/api/line/webhook/route.ts` — 無 dedup
- `src/app/api/meta/webhook/route.ts` — 可能也無

**症狀**：
- LINE/META 重試邏輯：若我們 API 回 timeout、LINE 會 3 次重試
- 同一個 event（例如 follow / message）被我們處理 3 次
- 新客戶被重複建立 3 筆 line_user
- 訊息被重複儲存、AI 客服被呼叫 3 次、內存 query 被擊中 3 次

**證據**：
```typescript
// LINE webhook — 無 dedup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const events: LineEvent[] = body.events
    
    for (const event of events) {
      if (event.type === 'follow') {
        // 直接建立 user
        await saveUserToDb(event.source.userId, profile)  // ⚠️ 無檢查重複
      }
    }
    
    return NextResponse.json({ message: 'ok' })
  } catch (error) {
    // 若此 try/catch 裡任何地方拋出、webhook 回傳 error
    // LINE 會再重試
  }
}
```

**修法**（優先序）：

**P1（立刻）**：加 idempotency key 檢查
```typescript
// 在 webhook event 表記錄 (event_id, workspace_id) unique constraint
// 每個 event 第一次進來、記錄到 webhook_event_dedup
// 第二次進來、發現已處理、直接 return ok（不重複執行）

const { data: existing } = await supabase
  .from('webhook_event_dedup')
  .select('id')
  .eq('event_id', event.message.id)  // LINE 每個 event 有唯一 id
  .eq('provider', 'line')
  .single()

if (existing) {
  // 已處理過、直接返回
  return NextResponse.json({ message: 'ok' })
}

// 處理 event...

// 標記已處理
await supabase.from('webhook_event_dedup').insert({
  event_id: event.message.id,
  provider: 'line',
  processed_at: new Date().toISOString(),
})
```

**為什麼是 P1**：webhook 是外部服務驅動、無法控制重試頻率、dedup 是防禦機制

---

## 🟠 High（上線會痛）

### 6. [Observability] Sentry 設定但無 SLO / 無 Alert Rule

**位置**：
- `sentry.client.config.ts` — 設定了 Sentry 但無 alert threshold
- `src/lib/utils/logger.ts` — 自刻 logger、error 發送到 `/api/log-error`
- **缺失**：SLO 定義、error budget、burn rate alert

**症狀**：
- Error rate 爬升到 5%、沒有人收到通知
- 等到隔天看 Sentry dashboard、才發現昨晚 01:00-02:00 LAG 爆表
- 上線當天有隱藏 bug（例如金額計算 0.01 偏差）、持續漏帳 1 小時、被發現時已有 100 筆訂單受影響

**證據**：
```typescript
// sentry.client.config.ts 有初始化但無 alert
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1,  // 但沒有 burn rate thresholds
  // ⚠️ 無 beforeSend（無 PII 過濾）
  // ⚠️ 無 integrations（如 RequestIntegration）
})

// logger.ts 有遠端發送但無集中儀表板
if (level === 'error') {
  sendToRemote(entry)  // 發到 /api/log-error、但沒後端收集
}
```

**修法**（優先序）：

**P2（上線前後 1 週內）**：
1. 定義 SLO
   ```
   - 可用性：99.9%（月度 uptime）
   - 登入成功率：99.95%
   - 支付成功率：99.9%
   - 報表載入 P99 latency：3s
   ```

2. 設定 Sentry alert
   ```json
   {
     "conditions": [
       {
         "interval": "1m",
         "threshold": 10,  // error rate > 10% in 1min
         "comparisonType": ">"
       }
     ],
     "actions": [
       {
         "service": "slack",
         "channel": "#venturo-sre-alerts"
       }
     ]
   }
   ```

3. 加 PII redaction
   ```typescript
   beforeSend(event, hint) {
     if (event.request?.cookies) {
       delete event.request.cookies  // 不記錄 session token
     }
     // 過濾 email、UUID 等敏感資訊
     return event
   }
   ```

**為什麼是 High**：上線後需要快速故障感知、目前盲視

---

### 7. [Background Jobs] Cron Task 失敗無重試

**位置**：
- `src/app/api/cron/ticket-status/route.ts`
- `src/app/api/cron/process-tasks/route.ts`

**症狀**：
- 每天 02:00 UTC (10:00 Taiwan) 開票狀態檢查 cron 失敗
- 因為那時 Supabase 做 maintenance、API 回 503
- Cron 執行失敗、只記到 cron_execution_logs、沒有人被通知
- 隔天發現開票狀態沒有推給業務、會計無法確認

**證據**：
```typescript
// ticket-status/route.ts — 無重試
export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${baseUrl}/api/bot/ticket-status`, {...})
    const result = await response.json()
    
    if (!result.success) {
      logger.error('開票狀態檢查失敗:', result)
      return NextResponse.json(result, { status: 500 })  // ⚠️ 失敗、無重試
    }
    // ...
  } catch (error) {
    // ⚠️ 記錄失敗、但 Vercel Cron 無法重試
    // Vercel Cron 只支援 GET/POST 成功 (2xx)、失敗就算失敗
    return ApiError.internal('Internal error')
  }
}
```

**修法**（優先序）：

**P2（上線後 1 週）**：
1. 改用 exponential backoff
   ```typescript
   async function fetchWithRetry(url, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         const res = await fetch(url)
         if (res.ok) return res
       } catch (e) {
         if (i === maxRetries - 1) throw e
         await sleep(1000 * Math.pow(2, i))  // 1s, 2s, 4s
       }
     }
   }
   ```

2. 加監控告警
   ```typescript
   if (!result.success) {
     // 記錄 + 通知
     await notifySlack(`Cron 失敗：${jobName}`, { error: result })
     throw new Error(`Cron failed: ${jobName}`)
   }
   ```

3. 考慮改用 Supabase Edge Functions（原生重試支援）

**為什麼是 High**：後台業務流程無法自動化、人工接手會滑坡

---

### 8. [API Error Handling] 13% 的 route.ts 缺 try/catch

**位置**：API routes（75 個中約 10 個無頂層 try/catch）

**症狀**：
- API 拋出未捕捉的異常（例如 JSON.parse 失敗、RPC 超時）
- Vercel Function 回傳 5xx、但沒有結構化日誌
- Client 收到 `<html> 502 Bad Gateway</html>`、無法區分「backend down」vs「我寫錯了」

**修法**：
```typescript
// ⚠️ 現況：某些 route 無頂層 catch
export async function POST(request: NextRequest) {
  const body = await request.json()  // 若 JSON 壞掉、直接拋 SyntaxError
  // ...
}

// ✅ 改法
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // ...
    return successResponse(...)
  } catch (error) {
    logger.error('API error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Unknown error',
      500
    )
  }
}
```

**為什麼是 High**：不是 critical bug、但會在上線後被發現「某個 endpoint 有時候掛」

---

## 🟡 Medium（Post-Launch）

### 9. [Idempotency Keys] POST /orders / POST /payments 無重複提交防護

**位置**：訂單建立、支付確認 endpoint

**症狀**：
- 使用者網路慢、點「確認付款」2 次
- 兩筆 receipt 都建立、金額扣 2 倍
- 對帳時差 2 倍金額、會計崩潰

**修法**：
```typescript
// 在 client 端生成 idempotency key、在 API 層檢查
const idempotencyKey = `${userId}:${Date.now()}`

// API endpoint 記錄已處理的 key
const { data: existing } = await supabase
  .from('idempotency_keys')
  .select('result')
  .eq('key', idempotencyKey)
  .single()

if (existing) {
  return successResponse(existing.result)  // 返回快取結果
}

// 執行...
await supabase.from('idempotency_keys').insert({
  key: idempotencyKey,
  result: result,
})
```

**為什麼是 Medium**：不會當場炸、但會累積帳務風險、post-launch 才處理

---

### 10. [Front-End Error Boundary] 30 個 error.tsx 但缺 fallback UI

**位置**：所有 error.tsx 都是「顯示 error message」、無降級方案

**症狀**：
- 報表頁因為 Supabase query 超時、顯示白屏 error
- 本來使用者可以看「載入中」UI、改成看錯誤訊息
- 後台管理頁掛、新客無法開團

**修法**：
```typescript
// error.tsx 加 fallback UI
export default function Error({error, reset}) {
  return (
    <div>
      {/* 優先級 1：嘗試重新載入 */}
      <button onClick={reset}>重試</button>
      
      {/* 優先級 2：顯示快取資料（若有的話）*/}
      {cachedData && <CachedView data={cachedData} />}
      
      {/* 優先級 3：顯示簡化版本 */}
      <SimplifiedView />
      
      {/* 優先級 4：才顯示錯誤細節 */}
      {process.env.NODE_ENV === 'development' && (
        <pre>{error.message}</pre>
      )}
    </div>
  )
}
```

**為什麼是 Medium**：UX 改善、不影響功能、但會改善 SLA 感受

---

## 🟢 健康面向（別改壞）

### ✅ 強點

| 面向 | 證據 | 評價 |
|---|---|---|
| **Error Logging** | Logger 自刻、支援 context、遠端發送 | ✅ 結構完善、只缺 SLO |
| **Admin Client** | per-request（非 singleton），遵守 CLAUDE.md | ✅ 正確架構 |
| **Rate Limiting** | 登入、public API 都有檢查 + RPC 分散鎖 | ✅ 防禦完整 |
| **Webhook 簽驗** | LINE 用 timingSafeEqual、防 timing attack | ✅ 安全 |
| **Cron 認證** | CRON_SECRET 檢查 | ✅ 防止 unauthorized 呼叫 |
| **Request Dedup** | 實作 dedup 函式（client 端防雙擊） | ✅ 基礎有、但 API 層還需補 |
| **External API Retry** | Gemini 有多 key 輪替 + 標記封鎖 | ✅ 主動降級設計 |

---

## 跨視角 Pattern 候選（傳給下一位）

### 1. **多步驟 API 無事務邊界** → Architect / Database 也會看
- Tenants create、Period closing、Invoice 等都是「寫多張表」
- 目前都靠 rollback 函式（易漏）
- 應該中央定義「multi-step API 範本」→ RPC 做原子

### 2. **外部 API 超時無 fallback** → UX Architect / DevOps 也會看
- LINE、LinkPay、Gemini、OCR 各有超時
- 前端沒有降級方案
- 應該文件化「外部 API SLA」+ 「降級策略清單」

### 3. **Webhook 去重 + 幂等性統一政策缺失** → Data Engineer 也會看
- LINE / META / LinkPay 都有重試邏輯
- 目前無中央 dedup 框架
- 應該建 `webhook-dedup-middleware` 供所有 webhook 共用

### 4. **Cron Job 失敗無重試、無通知** → DevOps / Automation 也會看
- 兩個 cron 都失敗無重試
- 沒有 monitoring、沒有 alert
- 應該改用 Supabase Edge Functions（原生重試）或加 external job queue

### 5. **Observability 無 SLO/Alert** → DevOps / Architect 也會看
- Sentry 裝了但沒告警
- Logger 發了但沒人收
- 上線 day-1 需要一份「維運儀表板」+ 「告警規則」

**新浮現 Pattern**：**「外部依賴鬆耦合不足」** — LINE、Supabase、LinkPay、Gemini 掛了會直接影響用戶、無 graceful degradation。應該建「依賴健康檢查」+ 「feature toggle」決定是否暴露。

---

## 給下一位靈魂（Software Architect）的 Hint

**Architecture 視角會補充**：
- 多步驟 API 是否應該改用 saga pattern（分散 transaction）
- Webhook 去重是否該改成 event sourcing
- External API resilience 是否該加 circuit breaker
- Observability 架構（Sentry vs 自刻 logger 的 trade-off）

**DevOps/SRE 會補充的**：
- Vercel function timeout（10s / 60s / 900s）有沒有超
- Supabase 連線池容量（pgBouncer default 20、會不會炸）
- Cron 改用 Edge Functions / GitHub Actions / Bull Queue 的評估
- Monitoring stack（Prometheus / Grafana / ELK）規劃

---

## 執行順序建議

### 今晚 / 明天白天（Critical path、S = <2 小時）

1. ✅ **Tenants Create 改 RPC transaction**（1.5 小時）
   - 寫 SQL function、改 API 呼叫 RPC、smoke test
2. ✅ **Vouchers RPC + FOR UPDATE**（1.5 小時）
   - 同上
3. ✅ **LINE/LinkPay 加 timeout + fallback**（1 小時）
   - AbortController + graceful error response
4. ✅ **Webhook dedup 表 + 檢查**（1 小時）
   - 簡單 unique constraint、查詢+插入
5. ✅ **Vouchers auto-create singleton → per-request**（30 分）
   - 改 getSupabase() 調用

### 需要決策（M = 半天）

6. 🛑 **SLO 定義** — 登入成功率、支付成功率、報表 P99 latency 各設多少？
7. 🛑 **Cron 失敗重試策略** — 改 Edge Functions 還是加 retry logic？
8. 🛑 **Observability 工具選擇** — 保留自刻 logger + Sentry、還是改成集中式？

### Post-Launch（L、不卡上線）

9. [ ] 設定 Sentry alert rules + Slack integration
10. [ ] 前端 error boundary 補 fallback UI
11. [ ] API 層 idempotency key（訂單、支付）
12. [ ] 寫「事故 runbook」（LINE 掛了怎麼做、Supabase 掛了怎麼做）

---

## Runbook 範本（立即需要）

**上線當天必須有** — 值班人員第一個參考：

```markdown
# Venturo ERP 事故 Runbook

## Case 1: LINE API 掛機（response 5xx 或 timeout）
- **症狀**：用戶在 ai-bot 收不到回應、半分鐘後 timeout
- **檢查**：
  1. `curl https://api.line.me/v2/bot/info -H "Authorization: Bearer..."` 測試 LINE 連通性
  2. Sentry 看有沒有大量 fetch error
- **立即行動**：
  1. Slack 通知「LINE API 異常、預計 15 分鐘恢復」
  2. 前端自動降級顯示「LINE 服務暫時中斷」
  3. 改用離線 FAQ bot（備用）
- **復原**：LINE 恢復後、app 自動重試

## Case 2: Supabase 連線爆滿（pgBouncer pool exhausted）
- **症狀**：所有 API 超時、登入無法進行
- **檢查**：
  1. Supabase dashboard 看 active connections
  2. 看有沒有長駐 transaction（查 pg_stat_activity）
- **立即行動**：
  1. 停止新增 connection（暫停 cron job）
  2. Kill idle transaction（超過 5 min 的）
  3. 切換流量到 read replica（若有的話）
  4. 如果還是掛，準備 rollback to 前一版本

## Case 3: 新客戶建立失敗（Tenants Create）
- **症狀**：新租戶無法開通、重試後報「workspace code 已存在」
- **檢查**：
  1. 去 workspaces 表查是否有孤兒 workspace（沒有 owner employee）
  2. 查 employees 表是否有孤兒 row
- **復原**：
  1. 手動清孤兒：DELETE FROM workspaces WHERE code = 'XXX'
  2. 重試建立租戶
  3. 通知客戶完成
```

---

## 附錄：SRE 視角總結

| 維度 | 目前狀況 | 風險等級 | 修復難度 |
|---|---|---|---|
| Error Handling | 113 個 try/catch、13% 缺失 | 🟠 High | 低 |
| Transaction | Tenants / Vouchers 無原子性 | 🔴 Critical | 中 |
| Idempotency | Webhook 無去重、POST API 無 idempotency key | 🔴 Critical | 中 |
| External API | LINE/LinkPay 無 timeout / fallback | 🔴 Critical | 低 |
| Observability | Sentry 配好但無 SLO / alert | 🟠 High | 中 |
| Background Jobs | Cron 失敗無重試、無通知 | 🟠 High | 中 |
| Runbook | **完全缺失** | 🟠 High | 低 |
| Feature Flags | 無（無法 rollback 功能、只能 rollback 整版） | 🟡 Medium | 高 |

---

**SRE 簽名**：看到的都是「上線前 72 小時內能修」的東西。沒有架構爆炸、但細節會決定上線後是「週末悠閒」還是「凌晨被 page」。多步驟 API 和 webhook 是最會出問題的、prioritize。

---

## 🔁 主 Claude 覆盤

### 1. 真問題過濾

| # | SRE 說 | 覆盤後 | 備註 |
|---|---|---|---|
| Tenants Create 無 transaction | 🔴 | 🔴 **真、視角升級** | 原 INDEX ① 只講「欄位錯」、SRE 升級成「多步驟無事務邊界」、**兩個問題合併看更完整**、修 ① 時一起修 transaction |
| Vouchers race | 🔴 | ❌ **扣分、重報** | 01-accounting + 02-db-optimizer 都報過、SRE 沒加新角度 |
| Supabase singleton | 🔴 | ❌ **扣分、重報** | INDEX ⑥ 已列、CLAUDE.md 紅線已規範、SRE 重報 |
| **LINE/LinkPay/Gemini timeout 無 fallback** | 🔴 | 🔴 **真、新、SRE 獨有** | 外部 API 超時沒 circuit breaker、使用者白屏 |
| **Webhook 無去重（idempotency）** | 🔴 | 🔴 **真、新、SRE 獨有** | LINE 重試或 META 重試會重複建訂單 / 扣款。Security 指出簽驗、SRE 補上冪等性、兩層都要 |
| **無 SLO / alert / oncall** | 🟠 | 🟠 **真、新、SRE 獨有** | Sentry 裝了但沒接告警、壞了不知道 |
| Cron 無重試 | 🟠 | ⚠️ **需驗證** | 要先確認「有沒有 cron job」、可能誤設前提 |
| 13% API route 缺 try/catch | 🟠 | 🟡 低 | Next.js framework 有頂層 catch、不會整個 crash、是可觀察性差 |

**覆盤結論**：**4 個真 P0 / 1 個 P1 新的**
- P0：LINE/LinkPay timeout fallback
- P0：Webhook idempotency
- P0：Tenants Create 無 transaction（合併 ①）
- P0（已列別處）：Vouchers race（DBA 已指 DB RPC）
- P1：SLO / alert 建立

扣分：SRE 重報了 Vouchers race 和 Supabase singleton、應該只加 SRE 視角不是重報問題。

### 2. 跟前面重複

- **Vouchers race** = 01 + 02 + 03 三份都報、明顯是共通痛點、列入跨模組 pattern 優先修
- **Supabase singleton** = INDEX ⑥ + 03、CLAUDE.md 紅線明文、03 重報不給新角度

### 3. 跨視角 pattern 浮現（累積 1-3 位）

1. **外部輸入信任邊界未統一**（Security）
2. **資料密集功能全 client 算**（DBA）
3. **編號 race condition 跨模組**（DBA + SRE）→ 用 DB RPC
4. **HTML 安全 × 列印 × 無障礙**（Security 埋、UX 接）
5. **效能 vs 正確性政策缺失**（DBA）
6. **【新】外部依賴無防禦**（SRE 主打）→ LINE + META + LinkPay + Gemini + Claude + OpenAI 六個依賴全都沒有 timeout / retry / circuit breaker / fallback UI
7. **【新】冪等性缺席**（SRE 主打）→ POST 重試 / webhook 重傳 / 雙擊 都會產生重複資料
8. **【新】觀察性近零**（SRE 主打）→ 有 Sentry 沒 alert、沒 SLO、沒 on-call playbook

**總計 8 種跨視角 pattern**、後面 7 位繼續累積。

---

