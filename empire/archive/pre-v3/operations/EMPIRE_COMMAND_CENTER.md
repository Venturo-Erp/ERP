# 🎯 帝國指揮總部 — 導航索引

**最後更新**：2026-03-15 10:03 AM  
**用途**：毫秒級定位任何問題

---

## 🚨 緊急回應索引

### 被攻擊時的即時定位

| 攻擊類型 | 立刻檢查 | 檔案位置 |
|---------|---------|---------|
| **付款 webhook 偽造** | API 認證 | `src/app/api/linkpay/webhook/route.ts` |
| **SQL 注入** | 搜尋功能 | `src/features/tours/components/mention-input/useMentionSearch.ts:80`<br>`src/components/editor/tour-form/sections/LeaderMeetingSection.tsx:87`<br>`src/lib/data/customers.ts:66`<br>`src/stores/core/create-store.ts:198` |
| **未授權 API 存取** | 🔴 **37 個未保護 API** | 見下方「未保護 API 完整清單」 |
| **環境變數洩漏** | 前端程式碼 | `src/app/error.tsx:35`<br>`src/app/global-error.tsx:68`<br>`src/components/module-error.tsx:29` |
| **RLS 繞過** | 資料庫政策 | `supabase/migrations/` (45+ 個 RLS 檔案) |
| **N+1 查詢爆炸** | 迴圈內查詢 | 154 處（需要逐一掃描） |

---

## 🗺️ 程式碼地圖（快速定位）

### 核心業務邏輯

| 功能 | 主要檔案 | 路徑 |
|------|---------|------|
| **行程建立** | `itinerary/page.tsx` | `src/app/(main)/itinerary/page.tsx` (1387 行) |
| **行程編輯** | `tour-itinerary-tab.tsx` | `src/features/tours/components/tour-itinerary-tab.tsx` (1626 行) |
| **報價計算** | `quote.service.ts` | `src/features/quotes/services/quote.service.ts:119` (`calculateTotalCost()`) |
| **付款計算** | `payment-request.service.ts` | `src/features/payments/services/payment-request.service.ts:373` (`calculateTotalAmount()`) |
| **客戶管理** | `customers/page.tsx` | `src/app/(main)/customers/page.tsx` |
| **訂單管理** | `useOrders.ts` | `src/features/orders/hooks/useOrders.ts` |

### 認證與權限

| 功能 | 檔案 | 路徑 |
|------|------|------|
| **認證核心** | `auth.ts` | `src/lib/auth.ts` |
| **伺服器認證** | `server-auth.ts` | `src/lib/auth/server-auth.ts` |
| **API 認證中介** | `with-auth.ts` | `src/lib/api/with-auth.ts` |
| **快速登入** | `quick-login-token.ts` | `src/lib/auth/quick-login-token.ts` |
| **認證同步** | `auth-sync.ts` | `src/lib/auth/auth-sync.ts` |
| **認證 Store** | `auth-store.ts` | `src/stores/auth-store.ts` (13K) |

### 資料驗證

| 功能 | 檔案 | 路徑 |
|------|------|------|
| **API Schemas** | `api-schemas.ts` | `src/lib/validations/api-schemas.ts` |
| **通用 Schemas** | `schemas.ts` | `src/lib/validations/schemas.ts` |
| **資料庫 Schemas** | `db/schemas.ts` | `src/lib/db/schemas.ts` |
| **API 驗證** | `validation.ts` | `src/lib/api/validation.ts` |

---

## 🗄️ 資料庫快速索引

### 核心資料表（171 個表的精華）

| 表名 | 用途 | 關聯表 | 風險 |
|------|------|--------|------|
| **tour_itinerary_items** | 行程核心（唯一真相來源） | tours, hotels, restaurants, attractions | 🔴 高（修改影響報價） |
| **tours** | 團務主表 | tour_itinerary_items, tour_quotes, tour_orders | 🔴 高 |
| **tour_quotes** | 報價單 | tours, tour_itinerary_items (JOIN) | ⚠️ 中（行程改了不會自動更新） |
| **tour_orders** | 訂單 | tour_quotes, customers | 🔴 高 |
| **customers** | 客戶主表 | tour_orders, payments | 🔴 高 |
| **suppliers** | 供應商 | hotels, restaurants, attractions | ⚠️ 中 |
| **payments** | 付款記錄 | tour_orders, payment_requests | 🔴 高 |
| **payment_requests** | 付款請求 | payments | ⚠️ 中 |
| **employees** | 員工 | 所有 workspace 相關表 | 🔴 高（RLS 基礎） |

### RLS 政策狀態（需立即檢查）

**檔案位置**：
```bash
supabase/migrations/20260225120000_enable_core_tables_rls.sql  # 最後一次啟用
supabase/migrations/20260313_add_tour_documents_rls.sql        # 最新的 RLS
```

**檢查指令**：
```sql
-- 檢查所有表的 RLS 狀態
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 列出所有 RLS 政策
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

## 🚨 未保護 API 完整清單（37 個）

### 🔴 高危（立即修復）

**付款相關（2 個）**：
- `src/app/api/linkpay/route.ts`
- `src/app/api/linkpay/webhook/route.ts` 🚨🚨🚨

**報價確認（5 個）**：
- `src/app/api/quotes/confirmation/customer/route.ts`
- `src/app/api/quotes/confirmation/logs/route.ts`
- `src/app/api/quotes/confirmation/revoke/route.ts`
- `src/app/api/quotes/confirmation/send/route.ts`
- `src/app/api/quotes/confirmation/staff/route.ts`

**AI 功能（3 個）**：
- `src/app/api/gemini/generate-image/route.ts` 🚨 免費資源濫用
- `src/app/api/ai/suggest-attraction/route.ts`
- `src/app/api/ai/edit-image/route.ts`

**認證相關（3 個）**：
- `src/app/api/auth/get-employee-data/route.ts`
- `src/app/api/auth/create-employee-auth/route.ts`
- `src/app/api/auth/admin-reset-password/route.ts`
- `src/app/api/auth/reset-employee-password/route.ts`

**旅遊發票（6 個）**：
- `src/app/api/travel-invoice/allowance/route.ts`
- `src/app/api/travel-invoice/batch-issue/route.ts`
- `src/app/api/travel-invoice/issue/route.ts`
- `src/app/api/travel-invoice/void/route.ts`
- `src/app/api/travel-invoice/orders/route.ts`
- `src/app/api/travel-invoice/query/route.ts`

**其他（18 個）**：
- `src/app/api/settings/env/route.ts` 🚨 洩漏環境變數狀態
- `src/app/api/ocr/passport/batch-reprocess/route.ts`
- `src/app/api/ocr/passport/route.ts`
- `src/app/api/tenants/create/route.ts`
- `src/app/api/tenants/seed-base-data/route.ts`
- `src/app/api/storage/upload/route.ts`
- `src/app/api/log-error/route.ts`
- `src/app/api/itineraries/generate/route.ts`
- `src/app/api/itineraries/[id]/route.ts`
- `src/app/api/meeting/send/route.ts`
- `src/app/api/meeting/summary/route.ts`
- `src/app/api/traveler-chat/route.ts`
- `src/app/api/traveler-chat/[conversationId]/route.ts`
- `src/app/api/fetch-image/route.ts`
- `src/app/api/game-office/route.ts`
- `src/app/api/airports/route.ts`
- `src/app/api/health/route.ts` ℹ️ 公開（可接受）

---

## 🔌 API 端點地圖（50+ 個）

### 認證相關（7 個）
```
src/app/api/auth/
├── admin-reset-password/route.ts     ❌ 無認證 🚨
├── change-password/route.ts          ✅ 有認證
├── create-employee-auth/route.ts     ❌ 無認證 🚨
├── get-employee-data/route.ts        ❌ 無認證 🚨
├── reset-employee-password/route.ts  ❌ 無認證（但有 Rate Limit）
├── sync-employee/route.ts            ✅ 有認證
└── validate-login/route.ts           ✅ 有認證
```

### 報價確認（7 個）
```
src/app/api/quotes/confirmation/
├── customer/route.ts                 ❌ 無認證 🚨
├── logs/route.ts                     ❌ 無認證 🚨
├── revoke/route.ts                   ❌ 無認證 🚨
├── send/route.ts                     ❌ 無認證 🚨
└── staff/route.ts                    ❌ 無認證 🚨
```

### 付款相關（2 個）
```
src/app/api/linkpay/
├── route.ts                          ❌ 無認證 🚨
└── webhook/route.ts                  ❌ 無簽章驗證 🚨
```

### AI 相關（3 個）
```
src/app/api/
├── ai/edit-image/route.ts            ✅ 需確認
├── ai/suggest-attraction/route.ts    ✅ 需確認
└── gemini/generate-image/route.ts    ❌ 無認證 🚨
```

### Cron Jobs（3 個）
```
src/app/api/cron/
├── process-tasks/route.ts            ✅ 有 CRON_SECRET
├── sync-logan-knowledge/route.ts     ✅ 有 CRON_SECRET
└── ticket-status/route.ts            ✅ 有 CRON_SECRET
```

### 健康檢查（3 個）
```
src/app/api/health/
├── route.ts                          ✅ 公開（合理）
├── db/route.ts                       ✅ 公開（合理）
└── detailed/route.ts                 ⚠️ 是否洩漏資訊？
```

### 其他重要 API
```
src/app/api/
├── settings/env/route.ts             ❌ 無認證 🚨（洩漏環境變數狀態）
├── storage/upload/route.ts           ✅ 需確認
├── travel-invoice/*                  ✅ 需確認
└── ocr/passport/*                    ✅ 需確認
```

---

## 📦 狀態管理地圖（47 個 Stores）

### 最大的 Stores（需要關注）

| Store | 大小 | 用途 | 位置 |
|-------|------|------|------|
| `file-system-store.ts` | 25K | 檔案系統管理 | `src/stores/file-system-store.ts` |
| `document-store.ts` | 18K | 文件管理 | `src/stores/document-store.ts` |
| `auth-store.ts` | 13K | 認證狀態 | `src/stores/auth-store.ts` |
| `accounting-store.ts` | 13K | 會計 | `src/stores/accounting-store.ts` |
| `travel-invoice-store.ts` | 10K | 旅遊發票 | `src/stores/travel-invoice-store.ts` |
| `user-store.ts` | 9.6K | 使用者狀態 | `src/stores/user-store.ts` |

### 核心業務 Stores
```
src/stores/
├── auth-store.ts              # 認證（13K）
├── user-store.ts              # 使用者（9.6K）
├── workspace-store.ts         # 工作空間（166B）
├── tour-request-store.ts      # 團務請求（626B）
└── travel-invoice-store.ts    # 旅遊發票（10K）
```

---

## 🛠️ 環境變數索引（40 個）

### 必要變數（遺漏會炸）

**Supabase**：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**安全**：
- `JWT_SECRET` ⚠️ 生產環境必須設定
- `QUICK_LOGIN_SECRET`
- `CRON_SECRET`
- `BOT_API_SECRET`

**付款**：
- `TAISHIN_MID`（台新銀行特店代號）
- `TAISHIN_TID`（台新銀行端末代號）

**AI**：
- `GEMINI_API_KEY`
- `OLLAMA_URL`（本地 AI，可選）
- `OLLAMA_MODEL`（本地 AI，可選）

### 可選變數（沒有會降級）

**OCR**：
- `OCR_SPACE_API_KEY`（護照掃描）
- `GOOGLE_VISION_API_KEY`（圖片識別）

**第三方 API**：
- `NEXT_PUBLIC_PEXELS_API_KEY`（圖片庫）
- `NEXT_PUBLIC_UNSPLASH_ACCESS_KEY`（圖片庫）
- `AERODATABOX_API_KEY`（航班資訊）

**OpenClaw**：
- `OPENCLAW_GATEWAY_URL`
- `OPENCLAW_GATEWAY_TOKEN`

---

## 🔥 性能炸彈地圖（154 個潛在 N+1）

### 需要立即檢查的位置

**迴圈內呼叫資料庫的檔案**（需要逐一確認）：
```bash
# 掃描指令
grep -rn "for.*{" ~/Projects/venturo-erp/src --include="*.ts" --include="*.tsx" -A 5 | grep "supabase\|fetch\|await"
```

**已知的高風險區域**：
- 行程編輯（`tour-itinerary-tab.tsx`）
- 客戶列表（`customers/page.tsx`）
- 訂單管理（`OrderMembersExpandable.tsx`）

---

## 📏 巨型檔案索引（需要拆分）

| 檔案 | 行數 | 問題 | 位置 |
|------|------|------|------|
| `tour-itinerary-tab.tsx` | 1626 | 太複雜 🔴 | `src/features/tours/components/` |
| `itinerary/page.tsx` | 1387 | 太複雜 🔴 | `src/app/(main)/itinerary/` |
| `OrderMembersExpandable.tsx` | 1353 | 太複雜 🔴 | `src/features/orders/components/` |
| `PhaserOffice.tsx` | 1359 | 遊戲（可接受）✅ | `src/features/game-office/components/` |
| `icon-data.ts` | 4924 | 資料檔（可接受）✅ | `src/features/designer/components/` |
| `types.ts` | 19810 | 自動生成（可接受）✅ | `src/lib/supabase/` |

---

## 🔍 快速掃描指令（毫秒級）

### 找到所有未保護的 API
```bash
for route in $(find ~/Projects/venturo-erp/src/app/api -name "route.ts"); do
  if ! grep -q "withAuth\|auth.uid\|getUser\|getSession" "$route"; then
    echo "⚠️ $route"
  fi
done
```

### 找到所有 SQL Injection 風險
```bash
grep -rn "\${" ~/Projects/venturo-erp/src --include="*.ts" --include="*.tsx" | grep "sql\|query\|execute\|ilike\|or("
```

### 檢查環境變數洩漏
```bash
grep -rn "process.env" ~/Projects/venturo-erp/src --include="*.tsx" | grep -v "NEXT_PUBLIC" | grep -v "NODE_ENV"
```

### 找到所有 TODO/FIXME
```bash
grep -rn "TODO\|FIXME\|HACK\|XXX" ~/Projects/venturo-erp/src --include="*.ts" --include="*.tsx"
```

---

## 🎯 緊急回應手冊

### 場景 1：付款 Webhook 被攻擊

**立刻做**：
1. 檢查 `src/app/api/linkpay/webhook/route.ts`
2. 查看是否有簽章驗證
3. 檢查資料庫 `payments` 表是否有異常記錄
4. 暫時禁用 webhook（改 `.env`）

**修復**：
```typescript
// 加入簽章驗證
const signature = request.headers.get('X-Signature')
if (!verifyWebhookSignature(signature, body)) {
  return new Response('Unauthorized', { status: 401 })
}
```

---

### 場景 2：SQL Injection 攻擊

**立刻做**：
1. 檢查 4 個已知位置（見上方索引）
2. 查看資料庫日誌
3. 檢查是否有異常查詢

**修復**：
```typescript
// 改用參數化查詢
.ilike('name', `%${query.trim().replace(/[%_]/g, '\\$&')}%`)
```

---

### 場景 3：RLS 繞過

**立刻做**：
1. 執行 RLS 狀態檢查 SQL（見上方）
2. 檢查最近的遷移檔案
3. 檢查 `employees` 表的 `workspace_id`

**修復**：
```sql
-- 立刻啟用 RLS
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;

-- 重新建立政策
CREATE POLICY "Users can only see their workspace data"
ON <table_name>
FOR ALL
USING (workspace_id = (SELECT workspace_id FROM employees WHERE user_id = auth.uid()));
```

---

### 場景 4：效能爆炸（N+1 查詢）

**立刻做**：
1. 檢查資料庫慢查詢日誌
2. 找出哪個頁面/API 很慢
3. 檢查是否在迴圈內查詢

**修復**：
```typescript
// ❌ N+1
for (const tour of tours) {
  const quote = await supabase.from('quotes').select().eq('tour_id', tour.id)
}

// ✅ 正確
const tourIds = tours.map(t => t.id)
const quotes = await supabase.from('quotes').select().in('tour_id', tourIds)
```

---

## 🗂️ 文檔導航

### 帝國核心文檔
```
~/Projects/venturo-erp/empire/
├── GENESIS.md              # 創世記
├── LAWS.md                 # 憲法
├── EMPIRE_OVERVIEW.md      # 總覽
├── INFRASTRUCTURE.md       # 基礎建設
├── MEMORY_UTOPIA.md        # 記憶烏托邦
├── OPENVIKING_INTEGRATION.md  # OpenViking
├── DECISIONS.md            # 決策記錄
└── citizens/README.md      # 公民（17 位 Agent）
```

### 審計報告
```
~/.openclaw/workspace-william/
├── EMPIRE_COMPLETE_SCAN.md      # 完整掃描（6309 bytes）
├── SECURITY_AUDIT_FULL.md       # 安全審計（7293 bytes）
├── EMPIRE_AUDIT_REPORT.md       # 黑暗面分析（2862 bytes）
└── EMPIRE_COMMAND_CENTER.md     # 本檔案（指揮總部）
```

### 掃描腳本
```
/tmp/
├── deep-scan.sh              # 全面掃描
├── precise-scan.sh           # 精準掃描
├── security-audit.sh         # 安全審計
├── empire-complete-map.sh    # 帝國地圖
├── deep-analysis.sh          # 深度分析
└── core-business-logic.sh    # 核心業務邏輯
```

---

## 🚀 毫秒級查找範例

### Q: 付款功能在哪裡？
**A**：
- API: `src/app/api/linkpay/route.ts`, `webhook/route.ts`
- 服務層: `src/features/payments/services/payment-request.service.ts`
- 計算邏輯: `calculateTotalAmount()` (第 373 行)
- 資料表: `payments`, `payment_requests`

### Q: 報價單怎麼計算？
**A**：
- 服務層: `src/features/quotes/services/quote.service.ts`
- 核心函式: `calculateTotalCost()` (第 119 行)
- 資料來源: `tour_quotes` JOIN `tour_itinerary_items`
- 風險: 行程改了不會自動更新報價

### Q: 認證怎麼運作？
**A**：
- 核心: `src/lib/auth.ts`
- 伺服器端: `src/lib/auth/server-auth.ts`
- API 中介: `src/lib/api/with-auth.ts`
- Store: `src/stores/auth-store.ts` (13K)
- JWT Secret: `process.env.JWT_SECRET` ⚠️ 必須設定

### Q: 哪些 API 沒保護？
**A**：10 個（見上方「API 端點地圖」）

### Q: 資料庫有幾個表？
**A**：171 個（核心 9 個，見上方「資料庫快速索引」）

---

**指揮總部已建立。導航系統就位。毫秒級回應準備完成。** 🎯
