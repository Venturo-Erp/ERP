# Admin Client 漏洞 Audit（由 D2 替代執行、人工腳本）
> 2026-05-02 / 純 read / 不改任何東西
> （原 D2 sub-agent stalled、由指揮官 Claude 接手用 Python script 完成）

## 統計
- Admin client 進入點（含 query）：31 個檔
- **P0 CRITICAL**：22 筆（admin 寫入/delete 沒 workspace_id、或 admin select+by-id 沒 workspace_id）
- P1 HIGH：45 筆（admin select 沒 id 篩也沒 workspace_id、可能列表跨租戶）
- INFO（platform 表合法用法）：40 筆

## 嚴重度分類

**P0 = CRITICAL** = admin client 寫入（delete/update/upsert/insert）沒 workspace_id filter、或 admin select 用 id 篩沒先篩 workspace_id

**P1 = HIGH** = admin select 沒 workspace_id 也沒 id 篩、可能整表跨租戶列表外洩

---

## P0 — CRITICAL 漏洞（22 筆）

### `bot/ticket-status/route.ts:389`
- 操作：`.from('channels').select()`
- 風險：admin 用 id 篩寫入/讀取、跨租戶可拿/改別家資料

### `bot/ticket-status/route.ts:705`
- 操作：`.from('order_members').update()`
- 風險：admin 寫入/upsert 沒 workspace_id、可能跨租戶寫入

### `customers/link-line/route.ts:32`
- 操作：`.from('customers').update()`
- 風險：admin 用 id 篩寫入/讀取、跨租戶可拿/改別家資料

### `itineraries/[id]/route.ts:47`
- 操作：`.from('attractions').select()`
- 風險：admin 用 id 篩寫入/讀取、跨租戶可拿/改別家資料

### `itineraries/[id]/route.ts:155`
- 操作：`.from('itineraries').select()`
- 風險：admin 用 id 篩寫入/讀取、跨租戶可拿/改別家資料

### `itineraries/generate/route.ts:91`
- 操作：`.from('countries').select()`
- 風險：admin 用 id 篩寫入/讀取、跨租戶可拿/改別家資料

### `itineraries/generate/route.ts:262`
- 操作：`.from('cities').select()`
- 風險：admin 用 id 篩寫入/讀取、跨租戶可拿/改別家資料

### `itineraries/generate/route.ts:271`
- 操作：`.from('countries').select()`
- 風險：admin 用 id 篩寫入/讀取、跨租戶可拿/改別家資料

### `itineraries/generate/route.ts:283`
- 操作：`.from('countries').select()`
- 風險：admin 用 id 篩寫入/讀取、跨租戶可拿/改別家資料

### `line/webhook/[workspaceId]/route.ts:217`
- 操作：`.from('line_users').upsert()`
- 風險：admin 寫入/upsert 沒 workspace_id、可能跨租戶寫入

### `linkpay/route.ts:243`
- 操作：`.from('linkpay_logs').update()`
- 風險：admin 寫入/upsert 沒 workspace_id、可能跨租戶寫入

### `linkpay/route.ts:254`
- 操作：`.from('receipts').update()`
- 風險：admin 寫入/upsert 沒 workspace_id、可能跨租戶寫入

### `linkpay/route.ts:280`
- 操作：`.from('linkpay_logs').update()`
- 風險：admin 寫入/upsert 沒 workspace_id、可能跨租戶寫入

### `linkpay/webhook/route.ts:130`
- 操作：`.from('linkpay_logs').update()`
- 風險：admin 寫入/upsert 沒 workspace_id、可能跨租戶寫入

### `linkpay/webhook/route.ts:158`
- 操作：`.from('receipts').update()`
- 風險：admin 寫入/upsert 沒 workspace_id、可能跨租戶寫入

### `linkpay/webhook/route.ts:179`
- 操作：`.from('receipts').update()`
- 風險：admin 寫入/upsert 沒 workspace_id、可能跨租戶寫入

### `ocr/passport/batch-reprocess/route.ts:99`
- 操作：`.from('customers').update()`
- 風險：admin 用 id 篩寫入/讀取、跨租戶可拿/改別家資料

### `ocr/passport/batch-reprocess/route.ts:114`
- 操作：`.from('customers').update()`
- 風險：admin 用 id 篩寫入/讀取、跨租戶可拿/改別家資料

### `ocr/passport/batch-reprocess/route.ts:154`
- 操作：`.from('order_members').update()`
- 風險：admin 用 id 篩寫入/讀取、跨租戶可拿/改別家資料

### `ocr/passport/batch-reprocess/route.ts:169`
- 操作：`.from('order_members').update()`
- 風險：admin 用 id 篩寫入/讀取、跨租戶可拿/改別家資料

### `tenants/create/route.ts:88`
- 操作：`.from('workspace_roles').select()`
- 風險：admin 用 id 篩寫入/讀取、跨租戶可拿/改別家資料

### `tenants/create/route.ts:175`
- 操作：`.from('role_capabilities').delete()`
- 風險：admin 寫入/upsert 沒 workspace_id、可能跨租戶寫入

---

## P1 — HIGH 漏洞（45 筆、按表分組）

- **`attractions`** × 2 處: route.ts:147, route.ts:207
- **`channel_members`** × 2 處: route.ts:83, route.ts:142
- **`channels`** × 3 處: route.ts:39, route.ts:65, route.ts:457
- **`cities`** × 3 處: route.ts:80, route.ts:132, route.ts:161
- **`countries`** × 2 處: route.ts:111, route.ts:487
- **`customers`** × 3 處: route.ts:67, route.ts:35, route.ts:85
- **`documents`** × 1 處: route.ts:43
- **`hotels`** × 1 處: route.ts:100
- **`itineraries`** × 2 處: route.ts:166, route.ts:176
- **`knowledge_base`** × 1 處: route.ts:85
- **`line_messages`** × 1 處: route.ts:46
- **`linkpay_logs`** × 2 處: route.ts:214, route.ts:88
- **`messages`** × 2 處: route.ts:430, route.ts:103
- **`order_members`** × 3 處: route.ts:231, route.ts:42, route.ts:140
- **`orders`** × 1 處: route.ts:210
- **`quote_confirmation_logs`** × 1 處: route.ts:30
- **`quotes`** × 2 處: route.ts:80, route.ts:103
- **`receipts`** × 1 處: route.ts:151
- **`role_capabilities`** × 3 處: route.ts:338, route.ts:370, route.ts:193
- **`suppliers`** × 2 處: route.ts:27, route.ts:65
- **`tour_documents`** × 1 處: route.ts:29
- **`tours`** × 2 處: route.ts:180, route.ts:21
- **`workspace_roles`** × 4 處: route.ts:289, route.ts:42, route.ts:156, route.ts:203

---

## 修復優先順序

1. **P0 寫入點**（delete/update/upsert）→ 立即修、跨租戶寫入 = 資料破壞
   - linkpay update receipts/linkpay_logs（金流寫入跨租戶）
   - batch-reprocess update customers/order_members（OCR 跨租戶寫入）
   - bot/ticket-status update order_members
   - tenants/create role_capabilities delete（建租戶清舊資料）

2. **P0 讀取 + by-id**（select with .eq('id')）→ 高優先
   - itineraries/[id] / itineraries/generate（D3 也標了）
   - bot/ticket-status select channels
   - customers/link-line select

3. **P1 整表掃描**（admin select 沒 filter）→ 中優先
   - 大量 customers / orders / payment_requests / receipts 列表查、需逐一 review

## 異常與發現

- 自動腳本可能誤判 false positive（例如同檔有 helper 把 workspace 提到外面）
- 修復前每個點要人工 review 1 次、確認業務語意
- 跟 D3 [id] route audit 重疊：itineraries/[id]、employees/by-ref/[ref] 都已被標
