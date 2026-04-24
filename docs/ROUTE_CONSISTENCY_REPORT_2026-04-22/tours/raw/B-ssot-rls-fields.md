# /tours 路由驗證 — Agent B（SSOT/RLS/欄位一致性）

**日期**：2026-04-22  
**檢查範圍**：代碼層面（不檢查 DB schema）  
**檢查重點**：SSOT 破碎、RLS 租戶隔離、UI↔API↔DB 欄位漂移

---

## 1. SSOT 一致性檢查

### 1.1 「團」的概念定義次數（查 grep 結果）

**Tour 定義來源**：

- 統一型別來源：`src/types/tour.types.ts`（interface Tour extends BaseEntity）
- Store 型別 re-export：`src/stores/types/tour.types.ts`（re-export from @/types/tour.types）
- Supabase 自動生成：`src/types/models.types.ts`（export type Tour = Database['public']['Tables']['tours']['Row']）
- UI 狀態：多個 tab 組件（TourOverviewTab, tour-quote-tab-v2, etc）

**現狀**：

- ✅ 統一源於 `/types/tour.types.ts`（`interface Tour extends BaseEntity`）
- ✅ Store 正確 re-export，無本地複製定義
- ⚠️ **TourQuoteTab（v1）vs TourQuoteTabV2（v2）並存**：
  - v1：簡潔模式，無快速報價單列表
  - v2：完整模式，左邊版本選單 + 快速報價單列表
  - **問題**：尚未明確哪個是 canonical、何時移除 v1

### 1.2 `tour_itinerary_items` SSOT 讀寫一致性

**核心讀寫器**（按文件標記）：

1. **行程表寫入**：`src/features/tours/hooks/useTourItineraryItems.ts`
   - 函數：`syncToCore()`
   - 策略：**delete-then-insert**（見第 238 行註解）
   - 匹配鍵：**day_number + category** 用於 carry-over 邏輯（第 468-472 行）
   - workspace_id：✅ 有檢查（第 248-250 行）

2. **報價寫入**：`src/features/quotes/utils/core-table-adapter.ts`
   - 函數：`writePricingToCore()`
   - 寫入欄位：unit_price, quantity, total_cost, pricing_type, adult_price, child_price, quote_note, quote_status
   - 匹配鍵：**itinerary_item_id**（若無則 INSERT）
   - workspace_id：✅ 有傳入參數（第 144 行），用於 INSERT（第 228 行）
   - ⚠️ **UPDATE 時無 workspace 過濾**（第 155-173 行，只用 eq('id', ...)）

3. **需求單讀取**：`src/features/confirmations/components/core-items-to-quote-items.ts`
   - 函數：`coreItemsToQuoteItems()`
   - 讀取：day_number, category, resource_type, resource_id 等
   - **無寫入操作** — 純轉換

4. **分房讀取**：`src/features/tours/hooks/useAccommodationSegments.ts`
   - 讀取：hotel_name + night_number（續住合併邏輯）
   - **無寫入操作** — 純轉換

**一致性判定**：

- ✅ 匹配鍵統一（day_number + category 或 itinerary_item_id）
- ⚠️ **UPDATE query 缺少 workspace_id 過濾**：writePricingToCore 第 155-173 行，UPDATE 時只用 `eq('id', item.itinerary_item_id)`，未過濾 workspace_id → **潛在跨租戶寫入風險**（Agent F DB 驗證時會發現）

### 1.3 「訂單成員」vs「團員」是否兩套

**現狀查詢**：

| 概念             | 表名            | 類型定義 | 位置                                   |
| ---------------- | --------------- | -------- | -------------------------------------- |
| 團員             | `order_members` | `Member` | `src/types/tour.types.ts` 第 45-118 行 |
| 訂單成員         | `order_members` | 同上     | 同上                                   |
| **tour_members** | 不存在          | 無       | 無                                     |

**結論**：✅ **只有一套 order_members 表**，Member 型別統一定義。「團員」實為「訂單成員」（order_members），一個成員屬於某訂單，跨訂單集合形成「團人數」。

### 1.4 「報價」概念被定義幾次

| 位置              | 檔案                   | 說明             | 狀態       |
| ----------------- | ---------------------- | ---------------- | ---------- |
| features/quotes   | `src/features/quotes/` | 報價模組（通用） | ✅ 主 SSOT |
| tour-quote-tab-v2 | 報價分頁（完整）       | ✅ 已用          |
| tour-quote-tab    | 報價分頁（簡潔）       | ⚠️ 保留中        |
| TourQuoteTabV2    | 同 v2                  | ⚠️ 兩套並存      |

**為何有 v1 v2**：

- v1（tour-quote-tab.tsx）：簡約模式，自動建立報價單
- v2（tour-quote-tab-v2.tsx）：完整模式，支援快速報價單列表 + 版本管理
- **清晰度問題**：未在代碼註解或文檔說明何時用哪個、遷移計畫

**建議**：確認 v2 是最終版、v1 何時下線。

---

## 2. RLS 租戶隔離檢查

### 2.1 tour 表的 SELECT/UPDATE 有無 workspace_id 過濾

**檢查位置**：`src/features/tours/services/tour.service.ts`

| 操作                       | 代碼行           | workspace_id 過濾 | 備註                                                     |
| -------------------------- | ---------------- | ----------------- | -------------------------------------------------------- |
| SELECT（isTourCodeExists） | 79-85            | ❌ 無             | 直接 `.eq('code', code)` — **跨租戶查重複**              |
| SELECT（generateTourCode） | 108-112          | ❌ 無             | `.like('code', prefix%)` — 查現存團號，無 workspace 過濾 |
| UPDATE（updateTourStatus） | 235-239          | ❌ 無             | 透過 Store，未檢查 workspace                             |
| CREATE（create）           | 繼承 BaseService | ？                | Store 層級，需查 useTourStore                            |

**發現**：

- 代碼註解第 8 行：`// workspace_id is now auto-set by DB trigger`
- **假設**：DB trigger 自動填 workspace_id，代碼層無需手動檢查
- ⚠️ **風險**：若 trigger 失效、或某些路徑繞過 trigger，租戶隔離會破裂 → **Agent F 須驗證 trigger**

### 2.2 tour_itinerary_items 讀寫的 workspace 過濾

**核心讀寫器檢查**：

| 函數                         | 檔案                             | workspace 過濾                                      |
| ---------------------------- | -------------------------------- | --------------------------------------------------- |
| syncToCore（INSERT）         | useTourItineraryItems.ts:438-540 | ✅ 第 451 行傳入 workspace_id，第 479 行用於 INSERT |
| syncToCore（DELETE）         | 同上:420-429                     | ✅ 靠 tour_id + workspace_id（tour 已租戶隔離）     |
| writePricingToCore（UPDATE） | core-table-adapter.ts:155-173    | ❌ **無 .eq('workspace_id', ...)**                  |
| writePricingToCore（INSERT） | 同上:224-250                     | ✅ 第 228 行傳入 workspace_id                       |

**嚴重問題**：

```typescript
// core-table-adapter.ts 第 155-173 行
const { error } = await supabase
  .from('tour_itinerary_items')
  .update({...})
  .eq('id', item.itinerary_item_id)  // ← 只用 id，無 workspace 過濾
```

**影響**：admin client 直通、不同租戶可能 UPDATE 彼此的項目 → **跨租戶寫入漏洞**

### 2.3 Quick-payment / Quick-disbursement（訂單頁快速收付）RLS 檢查

**檔案**：`src/features/todos/components/quick-actions/quick-disbursement.tsx`

| 檢查點               | 結果                                            |
| -------------------- | ----------------------------------------------- |
| 讀取 tours           | 無顯式 workspace 過濾（靠 useRequestForm hook） |
| 讀取 orders          | 無顯式 workspace 過濾（靠 useRequestForm hook） |
| 建立 payment_request | 調用 createRequest（需查此 hook）               |
| 使用 admin client    | ❌ 無跡象                                       |

**結論**：快速收付邏輯均依賴 hook 層級的 workspace 隔離，未在此組件層級檢查，假設上層已過濾（需 Agent F 驗證）。

---

## 3. 欄位一致性檢查

### 3.1 UI State Interface vs API Response vs DB Column

**Tour 欄位對應**：

| UI 層 (tour.types.ts)      | API 層 (Supabase)          | DB 層 (tours)              | 備註                                          |
| -------------------------- | -------------------------- | -------------------------- | --------------------------------------------- |
| `code`                     | `code`                     | `code`                     | ✅ 一致                                       |
| `status`                   | `status`                   | `status`                   | ✅ 一致，但有新舊值問題（見下）               |
| `location`                 | `location`                 | `location`                 | 🚫 已廢棄（需改用 country_id + airport_code） |
| `closing_status`           | `closing_status`           | `closing_status`           | ✅ 一致                                       |
| `selling_price_per_person` | `selling_price_per_person` | `selling_price_per_person` | ✅ 一致                                       |

**狀態欄位問題**（tour.types.ts 第 436 行）：

```typescript
status?: string | null // 狀態（英文）
```

但 TourStatus type（第 529-535 行）定義為中文：

```typescript
type TourStatus = '開團' | '待出發' | '已出發' | '待結團' | '已結團' | '取消'
```

**矛盾**：型別註解說「英文」、type 定義卻是中文 → **欄位混亂信號**

### 3.2 一團多訂單的關聯欄位

| 關係           | FK 欄位          | 位置      | 一致性 |
| -------------- | ---------------- | --------- | ------ |
| tours → orders | `orders.tour_id` | orders 表 | ✅     |
| orders ← tours | `tours.id`       | tours 表  | ✅     |

**命名一致**：✅ `tour_id` 統一使用

### 3.3 「狀態」欄位統一性

| 欄位                    | 定義位置          | 值類型         | 備註                                         |
| ----------------------- | ----------------- | -------------- | -------------------------------------------- |
| `tours.status`          | tour.types.ts:436 | string \| null | 模糊（註解說英文、type 說中文）              |
| `tours.closing_status`  | tour.types.ts:462 | string \| null | 明確：'open' \| 'closing' \| 'closed'        |
| `tours.contract_status` | tour.types.ts:441 | string         | 明確：'pending' \| 'partial' \| 'signed'     |
| `tours.tour_type`       | tour.types.ts:424 | TourType       | 明確：'official' \| 'proposal' \| 'template' |

**問題**：`tours.status` 是唯一模糊的欄位、易誤用

---

## 4. Pattern 搜查結果

### 4.1 isAdmin 短路

**搜查結果**：

```
/src/features/tours/components/tour-itinerary-tab.tsx
  const { user: currentUser, isAdmin } = useAuthStore()
  const canEditDatabase = isAdmin || currentUser?.permissions?.includes('database') || false
```

**評估**：

- ✅ 非短路用法（`isAdmin || permission.includes('database')`）
- ✅ 有降級邏輯（不依賴 isAdmin 單一判斷）
- **建議**：搜查全 tours 模組其他 isAdmin 用法，確認無其他短路

### 4.2 Checkbox/Toggle 無後端接收

**搜查結果**：

```
/src/features/tours/components/TourPrintDialog.tsx
  onChange={() => toggleColumn(key)}
  onChange={() => toggleMember(member.id)}
```

**評估**：

- ✅ 僅限列印對話框（不涉及資料持久化）
- 無其他發現 checkbox onChange 無 API 接收

---

## 5. 總結

| 項目             | 狀態      | 優先級 | 備註                                                                                 |
| ---------------- | --------- | ------ | ------------------------------------------------------------------------------------ |
| **SSOT 破碎**    | 🟡 中度   | M      | writePricingToCore UPDATE 缺 workspace 過濾（Agent F 確認風險）                      |
| **RLS 隔離**     | 🟡 中度   | M      | tour_itinerary_items UPDATE 無 workspace 過濾，tour SELECT 無過濾（依賴 DB trigger） |
| **欄位漂移**     | 🟡 輕微   | L      | tours.status 註解與 type 定義矛盾（文檔 vs 代碼）                                    |
| **v1/v2 並存**   | 🟡 清晰度 | L      | TourQuoteTab(v1) 與 TourQuoteTabV2 並存，未說明何時遷移                              |
| **isAdmin 短路** | ✅ 無     | -      | 僅發現一處、且非短路用法                                                             |

---

**Agent B 完成**  
Date: 2026-04-22
