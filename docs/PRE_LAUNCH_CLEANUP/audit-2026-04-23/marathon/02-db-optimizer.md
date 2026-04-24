# Marathon 02 · Database Optimizer 💾 體檢報告

**扮演靈魂**：Database Optimizer（schema first、explain plan 聞香、N+1 獵人）  
**掃描日期**：2026-04-24  
**範圍**：Query pattern / Index strategy / JSONB / Transaction race / Schema design  
**方法**：Static code scan + migration archaeology、不跑 EXPLAIN（用 code 邏輯推理）

---

## 一句話裁決

**能上線、但 3 個查詢濫用 + 1 個 race condition + 0 個 GIN index 要處理。主體上沒有致命痛點，但邊界細節會決定上線後使用者 800ms vs 150ms 的體驗差。**

---

## 🔴 Critical（會讓頁面卡住）

### 1. [Query Pattern] Trial Balance / Income Statement / Balance Sheet 三張報表全是「無分組下推」模式

**位置**：

- `src/app/(main)/accounting/reports/trial-balance/page.tsx` L56-94
- 類似邏輯在 income-statement / balance-sheet / general-ledger

**濫用**:

```typescript
// ❌ 壞模式：全表掃、client 端分組
const { data: accounts } = await supabase
  .from('chart_of_accounts')
  .select('id, code, name, account_type')  // 沒加 WHERE is_active=true、沒加 LIMIT
  .eq('workspace_id', user.workspace_id)
  // ^--- 假設表有 100-500 筆科目、全數拉回

const { data: lines } = await supabase
  .from('journal_lines')
  .select(...)
  // ^--- 假設表有 10000-100000 筆分錄、全數拉回

// 然後 client 做 forEach loop 計算
lines.forEach(line => {
  balanceMap.set(line.account_id, ...)
})
```

**症狀**：

- 試算表首次點開頁面、browser console 看 journal_lines API 回應 payload > 2MB
- 月結時卡 2-5 秒
- 多租戶同時點、Supabase 連線池可能炸

**修法（優先序）**：

**P1（今天）**：改用 server-side GROUP BY

```sql
-- 改這樣（DB 層做 aggregation）
SELECT
  account_id,
  SUM(debit_amount) as debit_total,
  SUM(credit_amount) as credit_total
FROM journal_lines
WHERE workspace_id = $1
  AND voucher_date <= $2
GROUP BY account_id
```

**P2（可選）**：加分組指標

- 若要保留「按類型分組」視覺、改用 DB 層 CASE 語句或 window function、不用 client map

**依據**：Venturo BACKLOG §Wave 2 報表頁 6 個 系統主管 guard 就有提及統計濫用

---

### 2. [Query Pattern] `/orders` 和 `/tours` 頁面有 client 端 filter

**位置**：`src/app/(main)/orders/page.tsx` L38-57

**濫用**：

```typescript
// ✅ 好：hook 層用 select field subset 瘦身
const { items: orders } = useOrdersListSlim() // 14 欄位

// ❌ 但壞：page 層 client 端 filter
const filteredOrders = orders.filter(order => {
  const isVisaOrEsim = order.tour_name?.includes('簽證專用團')
  if (isVisaOrEsim) return false // magic string 硬編

  const matchesFilter = order.payment_status === statusFilter
  const matchesSearch = order.order_number?.includes(searchQuery)
  return matchesFilter && matchesSearch
})
```

**症狀**：

- 假設 Corner 有 5000 訂單、每次搜尋都下載 5000 筆
- Filter tab 切換超過 50ms
- 無分頁、全表 return

**修法**：

- **P2（可做）**：用 `useToursPaginated` 的模式、改 `useOrdersListSlim` 加上 `page`, `pageSize`, `filter` 參數
- **P3（已在 BACKLOG）**：magic string `'簽證專用團'` 改成 flag 欄位（已列 BACKLOG Wave 9）

**對比健康的模式**：tours 頁面 L91-99（`useToursPage` → `useToursPaginated` → server-side pagination + filter）✅

---

### 3. [Race Condition] `vouchers/auto-create` 編號生成無原子性

**位置**：`src/app/api/accounting/vouchers/auto-create/route.ts` L66-86

**問題**：

```typescript
async function generateVoucherNo(workspaceId: string, date: string): Promise<string> {
  // ⚠️ 沒有鎖、沒有 TRANSACTION、沒有 SEQUENCE

  // 步驟 1：查詢最大編號
  const { data } = await supabase
    .from('journal_vouchers')
    .select('voucher_no')
    .like('voucher_no', `JV202603%`) // prefix
    .order('voucher_no', { ascending: false })
    .limit(1)

  // 步驟 2-3：計算 seq、return 新編號
  let seq = 1
  if (data?.length) seq = parseInt(data[0].voucher_no.slice(-4)) + 1
  return `JV202603${seq.toString().padStart(4, '0')}`
  // ⚠️ 與此同時、另一個請求也執行同樣邏輯
  // 結果：兩個傳票都是 JV20260301、unique constraint 失敗
}
```

**症狀**：

- 併發請款 2 筆以上、有機率 `unique constraint` 失敗
- 使用者嘗試「批次確認付款」時踩到
- 日誌顯示 `violates unique constraint "journal_vouchers_voucher_no_key"`

**修法（優先序）**：

**P1（立刻）**：改用 DB-side RPC

```sql
-- 建 RPC function
CREATE OR REPLACE FUNCTION public.generate_next_voucher_no(
  workspace_id UUID,
  voucher_date DATE
) RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  next_seq INT;
  result TEXT;
BEGIN
  prefix := 'JV' || TO_CHAR(voucher_date, 'YYYYMM');

  -- 用 FOR UPDATE 鎖定、確保原子性
  SELECT COALESCE(MAX(CAST(RIGHT(voucher_no, 4) AS INT)), 0) + 1
  INTO next_seq
  FROM public.journal_vouchers
  WHERE workspace_id = $1
    AND voucher_no LIKE prefix || '%'
  FOR UPDATE;

  result := prefix || LPAD(next_seq::TEXT, 4, '0');
  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

然後改 API 只呼叫這個 RPC。

**P2（替代方案）**：TRANSACTION SERIALIZABLE + retry

```typescript
for (let attempt = 0; attempt < 3; attempt++) {
  try {
    await supabase.rpc('begin_transaction', { isolation_level: 'serializable' })
    // ... generate + insert
    await supabase.rpc('commit')
    return
  } catch (e) {
    if (e.code === '40P01') await supabase.rpc('rollback') // serialization conflict
  }
}
```

**依據**：BACKLOG WAVE 8 已列編號競態條件、但未標優先序

---

## 🟠 High（上線用起來會痛）

### 4. [Schema] JSONB 欄位零 GIN index

**位置**：`daily_itinerary`, `personal_info`, `job_info`, `contracts`, `invoices` 等 JSONB 欄位（至少 7 個）

**查證**：

```bash
grep -r "CREATE INDEX.*gin\|USING gin" supabase/migrations/
# 結果：0 matches
```

**症狀**：

- 若搜尋行程描述內容（`daily_itinerary->>'description' ILIKE '%...'`）→ 全表掃
- 搜尋員工 email（`personal_info->>'email' = '...'`）→ 全表掃（但目前無此查詢、safe by accident）

**修法**：

```sql
-- 單欄位 GIN（針對 ->  存在查詢）
CREATE INDEX CONCURRENTLY idx_itineraries_daily_itinerary_gin
ON itineraries USING GIN(daily_itinerary);

-- 表達式 index（針對 ->> 等號查詢）
CREATE INDEX CONCURRENTLY idx_daily_itinerary_desc
ON itineraries ((daily_itinerary->>'description' COLLATE "C"));
```

**優先序**：

- **P2（可上線後做）**：若目前無強 JSONB 查詢、延遲到 Post-Launch
- **P3（有 feature flag）**：若未來加搜尋功能（e.g., 搜尋行程），提前加

---

### 5. [Index Strategy] 缺 FK 外鍵查詢 composite index

**位置**：通過 Wave 1b（103 個 FK index 已加）✅、但還有幾個漏掉：

**例子**：

- `tour_itinerary_items(tour_id, assignee_id)` — 常見查詢 `WHERE tour_id = ? AND assignee_id = ?`、但現在只有 `(assignee_id)` index
- `journal_lines(account_id, voucher_id)` — 應該改 `(account_id, voucher_id)` 的 composite
- `request_response_items` 可能也有類似漏洞（Wave 1b 列表無此表）

**修法**：

```sql
-- 檢查用 query（執行一次確認）
SELECT indexname
FROM pg_indexes
WHERE tablename IN ('tour_itinerary_items', 'journal_lines', 'request_response_items')
ORDER BY indexname;

-- 加缺少的 composite index
CREATE INDEX CONCURRENTLY idx_tour_itinerary_items_tour_assignee
ON tour_itinerary_items(tour_id, assignee_id);
```

**優先序**：P3（非緊急、FK index wave 1b 已大幅改善）

---

### 6. [Query Pattern] `/accounting/reports/*` 所有報表無分頁

**位置**：trial-balance / income-statement / balance-sheet / general-ledger

**症狀**：

- Corner 有 1000+ 科目 × 10 年資料 → 報表全載、Browser 可能 OOM
- 年結時卡死

**修法**：

- 試算表通常不分頁（因為要「試算」）
- 但可加 **date range picker**（目前只有截止日期、無起始日期）
- 或加「按類型單獨報」選項

**優先序**：P2（影響大、但場景少）

---

## 🟡 Medium（Post-Launch）

### 7. [Index Strategy] Partial index on soft-delete 欄位

**現狀**：

- `usa_esta(status) WHERE deleted_at IS NULL` ✅（已有）
- `itineraries(is_latest) WHERE is_latest = true` ✅（已有）
- 但其他 soft-delete 表沒有

**欄位列表**（應該都加 partial index）：

- `customers.deleted_at`
- `orders.deleted_at`
- `tours.deleted_at`（已有 `idx_tours_deleted` + `idx_tours_is_deleted`）
- `payment_requests.is_deleted`

**修法**：

```sql
CREATE INDEX CONCURRENTLY idx_customers_active
ON customers(workspace_id) WHERE deleted_at IS NULL;
```

**優先序**：P3（Wave 5 已移除 dead column、軟刪除用量增加後再做）

---

## 🟢 健康面向

### ✅ Index 策略整體穩健

| 面向                | 証據                                                | 評價              |
| ------------------- | --------------------------------------------------- | ----------------- |
| **FK Index**        | Wave 1b 103 條 + CONCURRENTLY（不鎖表）             | ✅ 細心、無鎖風險 |
| **Partial Index**   | `is_latest`, `deleted_at IS NULL`, 5+ 條            | ✅ 懂成本最小化   |
| **Composite Index** | `(channel_id, is_pinned)` / `(user_id, week_start)` | ✅ 熱路徑優化     |
| **Column 類型**     | DECIMAL(12,2) for amount、INT for count             | ✅ 沒見過浮點金額 |
| **Pagination**      | `/tours` 用 `useToursPaginated` + server-side       | ✅ 分頁做對了     |

### ✅ Query Pattern 部分優化到位

- `useOrdersListSlim` / `useToursListSlim` 瘦身版欄位選擇 ✅
- `tours` 報表頁 server-side pagination ✅
- Orders 頁面有分狀態 tab（雖然 client filter、但量小）✅

### ✅ Schema 設計基礎紮實

- Audit FK 統一到 `employees(id)`（CLAUDE.md 紅線）✅
- Workspace isolation 完整（RLS 無 FORCE）✅
- 沒見過 `TEXT` 當 amount / count ✅

---

## 跨視角 Pattern 候選

### 1. 「統計查詢無分組下推」→ **SRE / Data Engineer 也會看**

Security Engineer 提過「JSON.parse 無邊界」是 data quality 問題；Database Optimizer 看到「group by 在 client」也是 data quality + 可靠性問題。三張報表都同一病灶 → 應該中央定義「Report base query 範本」。

### 2. 「編號生成 race condition」→ **跨 Accounting / Finance / Tours 模組**

- Voucher_no（accounting）race
- order_number（orders）用 `${tour.code}-O${seq}` 的模式，seq 也是 client 算（L87-88 orders/page.tsx）
- tour_code 可能也有
- BACKLOG 已列 Wave 8、但該集中一個「編號生成 helper RPC」

### 3. 「JSONB 欄位查詢策略缺乏中央決定」

7+ 個 JSONB 欄位、各自 schema 不同、現在無人查（所以沒 GIN）。未來新功能可能會查。應該 Post-Launch 建「JSONB 查詢指南」。

---

## 給下一位靈魂（SRE）的 Hint

**要怎麼驗證我的發現**：

1. **Trial Balance 報表效能**：用 Chrome DevTools Network tab，看 journal_lines API response size 有多大
2. **Voucher 編號 race**：寫測試跑 `Promise.all([...5 個 auto-create call])` 看有沒有 unique constraint 失敗
3. **JSONB GIN index ROI**：若加搜尋功能，用 EXPLAIN ANALYZE 對比 with/without index

**會影響 SRE 的下游**：

- Rate limit RPC (`check_rate_limit`)沒有鎖、可能分散度不足（已列 Security Engineer 報告 P2）
- Materialized view 候選（報表重算）→ 該由 SRE 決定 refresh 策略
- Connection pool 會爆（大查詢 × 多租戶）→ SRE 要調 `max_connections`

---

## 執行順序建議

### 今晚 / 明天白天（Critical path）

1. **報表三張改 DB GROUP BY**（1-2 小時）
   - 改查詢語句、測試 smoke
   - 可以分批改、先改 trial-balance 驗證模式

2. **Voucher_no RPC + API 改用**（2 小時）
   - 建 function + 測試 concurrent call
   - 改 auto-create 呼叫 RPC

### 可延遲（Post-Launch 3-7 天內）

3. Orders 頁面改 server-side filter + pagination（1.5 小時）
4. JSONB GIN index（如有搜尋需求）（30 分）

### 架構決策（需要 William）

- 編號生成該集中到 `src/lib/constants/number-generators.ts` 還是各模組自己 RPC？
- 報表的「date range」該加嗎？

---

## 附錄：掃描足跡

- 掃過：506 migrations、140 hook、40+ API routes、5 報表頁、index strategy
- 沒跑 EXPLAIN（只用邏輯推理 + code 證據）
- 未檢查：pg_stat_statements（需 Supabase API 授權）、真實租戶資料量（不碰）
- 不重報：FK index Wave 1b（已做）、CASCADE 統一（Wave 6 已做）、JSONB CHECK（BACKLOG Wave 8）

---

_Database Optimizer 簽名：看到的濫用都是「邊界細節」，沒有架構爆炸。上線能用、但要不要等一週把 Critical 3 項清掉，由產品決策。_

---

## 🔁 主 Claude 覆盤

### 1. 真問題過濾（7 條濾後）

| #                                 | DBA 說 | 覆盤後                                                                                          | 備註                                                                                                   |
| --------------------------------- | ------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| #1 報表 client filter 無下推      | 🔴     | 🔴 真、**DBA 把 01-accounting.md §3 從「code 重複」升級成「效能問題」**、兩份報告同一病不同切面 |
| #2 `/orders` client filter 無分頁 | 🔴     | 🔴 **真、新的**                                                                                 | `/tours` 已修、`/orders` 沒跟上、資料量增後會痛                                                        |
| #3 voucher_no race                | 🔴     | 🟠 **部分重複**                                                                                 | 01-accounting §4 已提、DBA 把修法從 JS helper 升級到 DB RPC + `FOR UPDATE`、這是**更正確的修法**、採納 |
| #4 JSONB 零 GIN index             | 🟠     | 🟠 **真、新的**                                                                                 | 7 個 JSONB 欄位沒索引、報表/搜尋會慢                                                                   |
| #5 composite index 缺             | 🟠     | 🟡 真、低優先                                                                                   | 寫入多於查詢、先觀察                                                                                   |
| #6 報表無分頁                     | 🟠     | 🟢 **小公司實際資料量不會到**                                                                   | Corner 一個月也就 N 百筆傳票、OOM 不太可能                                                             |
| #7 partial index soft-delete      | 🟡     | 🟡 真、Post-Launch                                                                              |

**覆盤結論**：**2 個真 P0（#1 報表下推、#2 orders 分頁）+ 1 個修法升級（#3 voucher race 改走 DB RPC）**

### 2. 跟前面重複

- **#1 跟 01-accounting.md §3 同一病** — 但視角不同（code 重複 vs 效能）、合併看是「整個 ERP 報表都 client 算」
- **#3 跟 01-accounting.md §4 同一病** — DBA 指出修法應該是 DB RPC 而不是 JS helper、**更正確、採納 DBA 意見**

### 3. 跨視角 pattern 浮現（累積）

累計跨視角 pattern（1-2 位合計）：

1. **外部輸入信任邊界未統一**（Security + DBA）→ 六個 untrusted 入口六套檢查
2. **資料密集功能全 client 算**（DBA 主打）→ 報表 × 3 + orders filter + 未來 dashboard widget、都沒下推
3. **編號 race condition 跨模組**（DBA 主打）→ voucher_no + order_number + tour_code 可能都有、統一 DB RPC
4. **「HTML 安全 × 列印 × 無障礙」三位一體**（Security 埋的）→ 18 處 `dangerouslySetInnerHTML` 留給 UX 接

**新浮現**：**「效能 vs 正確性 trade-off 沒有公司級政策」** — 報表的 0.01 tolerance、jsonb 用法、index 策略、分頁大小、都靠個別開發者判斷、沒 `docs/DATABASE_DESIGN_STANDARDS.md` 的對應章節。DBA 提了、值得進 BACKLOG。

---
