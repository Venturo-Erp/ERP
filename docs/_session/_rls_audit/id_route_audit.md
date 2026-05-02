# [id] Route 漏洞 Audit

> 2026-05-02 / D3 任務 / 純 read / 不改任何東西

## 統計

- `[id]` 動態 route 檔案總數：**17**
- HTTP method 點數總計：**24**（每個 method 算 1）
- **P0 CRITICAL**：3
- **P1 HIGH**：1
- **P2 MEDIUM-HIGH**：3
- **P3 INFO**：2
- **Whitelist 合法用例**：4

---

## 路由清單

| # | 路徑 | 動態參數 | Methods | 客戶端類型 |
|---|------|---------|---------|-----------|
| 1 | `contracts/[id]/pdf` | id | GET | createApiClient (RLS) |
| 2 | `d/[code]` | code | GET | createServiceClient (admin) — public 短網址 |
| 3 | `employees/by-ref/[ref]` | ref | GET | createClient (admin) |
| 4 | `itineraries/[id]` | id | GET | getSupabaseAdminClient (admin) |
| 5 | `itineraries/by-tour/[tourId]` | tourId | GET | createClient (admin) |
| 6 | `job-roles/selector-fields/[fieldId]` | fieldId | PUT, DELETE | createApiClient (RLS) |
| 7 | `line/knowledge/[id]` | id | PUT, DELETE | getSupabaseAdminClient (admin) |
| 8 | `line/messages/[conversationId]` | conversationId | GET, PATCH | getSupabaseAdminClient (admin) |
| 9 | `line/webhook/[workspaceId]` | workspaceId | GET, POST | getSupabaseAdminClient (admin) — 外部 webhook |
| 10 | `roles/[roleId]` | roleId | DELETE | createApiClient (RLS) |
| 11 | `roles/[roleId]/tab-permissions` | roleId | GET, PUT | createApiClient (RLS) |
| 12 | `tours/by-code/[code]` | code | GET | createClient (admin) — public 分享 |
| 13 | `transport/[id]/confirm` | id | POST | createApiClient (RLS) |
| 14 | `users/[userId]/role` | userId | GET | createApiClient (RLS) |
| 15 | `workspaces/[id]` | id | GET, DELETE | createServiceClient + capability gate |
| 16 | `workspaces/[id]/channels/[channelId]/members` | id, channelId | GET, POST, DELETE | getSupabaseAdminClient (admin) + 顯式檢查 |

---

## P0 — admin query 沒有 workspace_id（CRITICAL）

### 1. `src/app/api/employees/by-ref/[ref]/route.ts` GET — P0 CRITICAL

```ts
const supabase = createClient(URL, SERVICE_ROLE_KEY)  // admin 繞 RLS
let { data } = await supabase.from('employees')
  .select('id, employee_number, display_name, ..., workspace_id, job_info')
  .eq('employee_number', ref)
  .single()
// 第二次 fallback 也沒篩 workspace_id
```

**漏洞**：service_role + 純用 `employee_number` 或 `display_name` 篩。任何登入用戶猜到別家 `E001` 就能拿到對方員工的全部資料（含 `workspace_id`、`job_info`）。沒任何 auth check、沒呼叫者 workspace 限制。

**修法**：
1. 加 `getServerAuth()` 取 `workspaceId`
2. 兩次 query 都加 `.eq('workspace_id', workspaceId)`

---

### 2. `src/app/api/itineraries/by-tour/[tourId]/route.ts` GET — P0 CRITICAL

```ts
const supabase = createClient(URL, SERVICE_ROLE_KEY)
const { data } = await supabase.from('itineraries')
  .select('..., workspace_id, ...')
  .eq('tour_id', tourId)
  .single()
```

**漏洞**：service_role + 純用 `tour_id` 篩。任何登入用戶（甚至未登入、route 沒 auth check）拿到別家 tour UUID 即拿整份行程內容、含內部 `workspace_id`、航班、`return_date` 等。

**修法**：加 `getServerAuth()` + `.eq('workspace_id', workspaceId)`。

---

### 3. `src/app/api/itineraries/[id]/route.ts` GET — P0 CRITICAL

```ts
const supabaseAdmin = getSupabaseAdminClient()
const auth = await getServerAuth()
const isAuthenticated = auth.success
// ... 三種查法（UUID / 短碼 / tour_code）全部沒篩 workspace_id
const result = await supabaseAdmin.from('itineraries')
  .select('*, tour:tours(quotes(tier_pricings,quote_type))')
  .eq('id', id).single()
// 行 197 註解寫「公開分享頁、有連結即可檢視」、但短碼是 8 個 hex（~32 bit、可暴力枚舉）
```

**漏洞**：admin client 全程繞 RLS。註解認為「公開分享頁可以看」、但：
- 短碼 8 hex 字元、空間 4.3 億、含 rate limit 仍在實務枚舉範圍
- 短碼用 `ilike('id', 'xxxxxxxx%')` `.limit(1)`、能命中任何租戶的 itinerary
- 隱含跨租戶資料外洩、沒 capability、沒 workspace 邊界
- 取得 `auth` 後 `isAuthenticated` 變數宣告但**未使用**

**修法**：
1. 把 `isAuthenticated` 真的拿來分流：登入走 `.eq('workspace_id', auth.data.workspaceId)`
2. 公開分享走獨立短 token（不是 UUID 前綴）+ 單獨 published 表 / 欄位
3. 至少把短碼 ilike 拿掉（仍保留 UUID 完整查詢、且該 row 必須是 `published`）

---

## P1 — workspace_id 篩了但用法/順序有疑慮（HIGH）

### 4. `src/app/api/line/messages/[conversationId]/route.ts` GET — P1 HIGH

```ts
// 先確認對話屬於 workspace（OK）
const { data: conv } = await supabase.from('line_conversations')
  .select('id').eq('id', conversationId).eq('workspace_id', workspaceId).limit(1)
if (!conv?.length) return 404

// 但接著拿 messages 沒篩 workspace_id：
const { data } = await supabase.from('line_messages')
  .select('*').eq('conversation_id', conversationId).order(...).limit(500)
```

**漏洞**：第一段 conversation guard 是有的、所以實際上不可繞租戶（必須先有對話 row 在自己 workspace）。但 `line_messages` query 仍是 admin client 不篩 workspace_id、依賴前一個 guard 為前提；若有人重構 / `line_messages` 反向關聯破壞、就直接破。屬「縱深防禦不足」。

**修法**：`line_messages` query 直接 `.eq('workspace_id', workspaceId).eq('conversation_id', conversationId)`（line_messages 表確實有 `workspace_id` 欄位、PATCH 已用此欄位）。

---

## P2 — 走 RLS 但 RLS 可能破或不足（MEDIUM-HIGH）

### 5. `src/app/api/contracts/[id]/pdf/route.ts` GET — P2

```ts
const supabase = await createApiClient()  // 走 RLS
const { data: contract } = await supabase.from('contracts')
  .select('*, tour:tours(...), order:orders(...)')
  .eq('id', id).single()
```

**狀態**：用 RLS-aware client、未手動篩 workspace_id。註解寫「RLS 自動過濾」。
**風險**：完全依賴 `contracts` RLS policy。若 D1 報告該 policy 有問題、雙保險全失效。
**修法**：加 `.eq('workspace_id', auth.data.workspaceId)` 縱深防禦。

---

### 6. `src/app/api/transport/[id]/confirm/route.ts` POST — P2

```ts
const supabase = await createApiClient()  // 走 RLS
await supabase.from('tour_itinerary_items').update({...}).eq('id', id)
```

**狀態**：RLS-aware client、純用 `id` update。`tour_itinerary_items` 的 RLS UPDATE policy 是 `workspace_id = get_current_user_workspace()`、目前 OK。
**風險**：依賴 RLS。但這是司機外部表單頁（從車行視角提交）、若該 page 用 service_role 或 anon 呼叫此 API、就完全沒 workspace 守。實際 caller 認證流程未知。
**修法**：加 `getServerAuth()` 顯式檢查 + `.eq('workspace_id', workspaceId)`。

---

### 7. `src/app/api/users/[userId]/role/route.ts` GET — P2

```ts
const supabase = await createApiClient()  // 走 RLS
const { data: employee } = await supabase.from('employees')
  .select('role_id').eq('id', userId).single()
const { data: role } = await supabase.from('workspace_roles')
  .select('id, name, is_admin').eq('id', roleId).single()
```

**狀態**：RLS-aware、依賴 `employees` 跟 `workspace_roles` 的 RLS。
**風險**：兩張表 RLS 都是 `workspace_id = get_current_user_workspace()`、看似 OK。但 admin user 跨租戶可能仍可讀別家員工角色（看 RLS policy 是否分 admin / 一般）。屬「面對非自家 userId 應 404、目前沒明確語意」。
**修法**：加 `getServerAuth()`、若 `userId` 不是當前 employee 又沒 admin capability、回 403。

---

## P3 — 跨租戶/特殊用例（INFO）

### 8. `src/app/api/workspaces/[id]/route.ts` GET, DELETE — P3 INFO

**狀態**：合法跨租戶用例（platform admin 管理租戶）。已守 `settings.tenants.write` capability、Corner 硬擋、self-delete 擋、員工 > 0 擋、rate limit、audit log。**設計正確**。

### 9. `src/app/api/line/webhook/[workspaceId]/route.ts` POST — P3 INFO

**狀態**：外部 LINE 平台呼叫、無登入用戶。用 `workspaceId` 路徑參數查 `workspace_line_config` 取 `channel_secret`、HMAC 簽名驗證後才處理事件。簽名是 LINE 用該 workspace 的 secret 算出來的、外部攻擊者沒 secret 偽造不了。設計正確。

---

## Whitelist — 合法跨租戶 / 公開用例

| 路徑 | 理由 |
|------|------|
| `d/[code]` | 公開短網址下載團員名冊（has TODO: rate limit）。註解明說可枚舉、用 15 min signed URL 緩解 |
| `tours/by-code/[code]` | 公開分享給客戶看的 tour。明確只回公開欄位、`is_active=true` 過濾 |
| `workspaces/[id]` | tenant 管理用例、已守 `settings.tenants.write` capability |
| `line/webhook/[workspaceId]` | 外部 webhook、HMAC 簽名驗證 |

---

## 額外發現

### `roles/[roleId]/tab-permissions` PUT/GET — 半隱形 P2

```ts
const supabase = await createApiClient()
await supabase.from('role_capabilities').delete().eq('role_id', roleId).in(...)
```

走 RLS、依賴 `role_capabilities` 的 RLS policy（`has_capability_for_workspace(workspace_roles.workspace_id, 'hr.roles.write')`）。policy 設計正確、但完全沒 capability 檢查在程式碼層 — 若 RLS policy 因任何 migration 改錯、就直接通。建議加程式碼層 capability gate。

### `roles/[roleId]/route.ts` DELETE — 同上

無 `getServerAuth()` 顯式檢查、純靠 RLS。建議加 capability gate。

### `job-roles/selector-fields/[fieldId]` — 子表 mapping 漏 workspace

PUT 對 `workspace_selector_fields` 有篩 `workspace_id`（OK）、但接著對 `selector_field_roles` 子表 `.delete().eq('field_id', fieldId)` 沒篩 workspace。雖然 `field_id` 已被前一查驗證在自己 workspace、屬縱深不足。RLS-aware、低風險。

---

## 修復建議優先順序

1. **立即修（P0、3 個）**— admin client 沒 workspace_id 守：
   - `employees/by-ref/[ref]` GET
   - `itineraries/by-tour/[tourId]` GET
   - `itineraries/[id]` GET（短碼 ilike + admin 全程繞 RLS）
2. **本週修（P1、1 個）**— `line/messages/[conversationId]` 第二段 query 加 workspace 守
3. **下週修（P2、3 個）**— 縱深防禦：contracts pdf / transport confirm / users role 加顯式 workspace + capability gate
4. **跟 D1 交叉**— 確認 `contracts`、`employees`、`tour_itinerary_items`、`workspace_roles`、`role_capabilities` 的 RLS policy 沒被 D1 列為破

---

## 異常與發現

- `itineraries/[id]/route.ts` 行 137 取 `auth` 後變數 `isAuthenticated` 宣告卻沒用、原始意圖（未登入只看 published）沒落實 — dead intent
- 多個 admin client query 用「先 lookup 再篩」、`.single()` 後再 filter 不存在；但「先 admin lookup 不篩任何 workspace 邊界」就是 P0
- `transport/[id]/confirm` 是車行外部頁面 API、需確認該頁面實際用什麼 client/認證打過來（report 範圍內看不到 caller）
- D2 預期會重複 cover 部分 admin client 用法（`getSupabaseAdminClient`、`createServiceClient`），與本報告 P0/P2 部分點重疊
