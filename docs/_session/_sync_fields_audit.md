# SyncFields 殘留 Audit

> 範圍：`_needs_sync` / `_synced_at` / `_deleted` 三個離線同步殘留欄位
> 不含：`deleted_at`（軟刪除時間戳，已被 E1 之前的 soft-delete 統一處理）
> 不含：`src/stores/sync/`（那是 store events / Realtime broadcast，跟離線同步無關）

---

## 1. DB 欄位現況（12 表）

每張表都同時有 `_needs_sync` + `_synced_at` + `_deleted`：

| 表 | 備註 |
|---|---|
| `advance_items` | workspace 借支條目 |
| `advance_lists` | workspace 借支清單 |
| `bulletins` | workspace 公告 |
| `channel_groups` | workspace 頻道群組 |
| `channels` | workspace 頻道 |
| `itineraries` | 行程表 |
| `messages` | workspace 訊息 |
| `shared_order_lists` | workspace 分享訂單清單 |
| `suppliers` | 供應商 |
| `tours` | 旅遊團 |
| `workspaces` | 工作空間 |

C2 之前已清掉的（DB 已無）：`visas`、`linkpay_logs`、`companies`、`company_contacts`、`company_announcements`、`disbursement_orders`、`tour_addons`、`payment_request_items`、`proposals`（從 migration 看）。

DB 沒有但 type 還假設有的（C 類）：`supplier_categories`、`cost_templates`、`tour_leaders`、`employees`。

---

## 2. src 引用現況（按檔分組）

### 2.1 Type 定義層

- **`src/types/base.types.ts:34-38`** — 定義 `SyncableEntity` extends `BaseEntity`，三欄都有。SSOT 源頭。
- **`src/types/index.ts:10`** — re-export `SyncableEntity`。
- **`src/types/tour.types.ts:371-373`** — `Tour` 介面手寫三欄（沒 extend SyncableEntity）。
- **`src/types/tour.types.ts:487-489`** — `Itinerary` 介面手寫三欄。
- **`src/types/tour-leader.types.ts:18,76`** — `TourLeader extends SyncableEntity`，且 `TourLeaderInput = Omit<TourLeader, '..._needs_sync'|'_synced_at'>`。**DB 沒有對應欄位**。
- **`src/types/supplier.types.ts:15,82`** — `Supplier`、`CostTemplate` extends `SyncableEntity`。`CostTemplate` 的 DB 表 `cost_templates` 沒對應欄位。
- **`src/types/supplier-category.types.ts:7`** — `SupplierCategory extends SyncableEntity`。**DB 沒有對應欄位**。
- **`src/stores/workspace/types.ts:16-18,57-59,72-74,116-118`** — `Workspace`、`Channel`、`ChannelGroup`、`Message` 各自手寫三欄（沒用 `SyncableEntity`）。

### 2.2 Data 層

- **`src/data/core/types.ts:16`** — `CreateInput<T>` Omit 三欄；目前 entity 寫入時依賴此 type 排除。**現存 entity 都未 SELECT/INSERT 這三欄**（grep `src/data/entities/` 全空）。

### 2.3 Component / Hook 層（實際使用 `_deleted` 過濾）

- **`src/stores/workspace/chat-store.ts:102`** — `filter(m => ... !m._deleted)` 訊息過濾。
- **`src/stores/workspace/chat-store.ts:376`** — `messageStore.update(messageId, { _deleted: true })` 軟刪除訊息。
- **`src/components/workspace/channel-chat/hooks/useThreadState.ts:28,35,48,66`** — 4 處 `!m._deleted` 過濾 thread 訊息。
- **`src/components/workspace/ShareAdvanceDialog.tsx:55-56`** — `Employee & { _deleted? }` 過濾離職員工。**但 employees 表 DB 無此欄**（C 類 dead filter）。
- **`src/features/tours/components/tour-form/TourSettings.tsx:12,52-53`** — `EmployeeFull & Partial<SyncableEntity>` 過濾。同上，**DB 無此欄**（C 類）。
- **`src/features/tours/components/itinerary-editor/usePackageItinerary.ts:295`** — `if (i._deleted) return false` 過濾行程表。
- **`src/features/quotes/components/QuoteDialog.tsx:87`** — `tours.filter(t => !t._deleted)` 過濾旅遊團。

### 2.4 Migration 層（仍 CREATE TABLE 帶三欄）

仍寫入 `_needs_sync` / `_synced_at` 的 active migration（不含 `_archive/`）：

- `20251130110001_create_visas.sql`（visas 已被 20260502170000 DROP，migration 文件保留）
- `20251130110002_create_disbursement_orders.sql`
- `20251130110003_create_companies.sql`
- `20251130110004_create_company_contacts.sql`
- `20251130110005_create_company_announcements.sql`
- `20251130110006_create_tour_addons.sql`
- `20251130110007_create_payment_request_items.sql`
- `20260105000000_create_proposal_system.sql`
- `20250122000000_add_itineraries_table.sql`

> Migration 是歷史檔，不需修改；此處僅供溯源。後續新增 migration 不可再寫這三欄。

---

## 3. 分類

### A 類（DB 有欄位 + src 還在用 → 要先改 src 再 DROP）

實際在 src 主動讀寫 `_deleted` 做業務邏輯的：

| DB 表 | src 點 | 動作說明 |
|---|---|---|
| `messages` | `chat-store.ts:102,376`、`useThreadState.ts:28,35,48,66` | 訊息軟刪除走這欄。要先改成 `deleted_at` 或新建 `is_deleted` 欄、或保留改名 |
| `itineraries` | `usePackageItinerary.ts:295` | 過濾 `_deleted`。DB 是否還有真資料是 `_deleted=true` 要先查 |
| `tours` | `QuoteDialog.tsx:87` | 過濾 `_deleted`。同上 |

`_needs_sync` / `_synced_at` 沒有任何 src 在讀寫 — 純 dead column。

### B 類（DB 有欄位 + src 沒引用 → 直接 DROP）

下列表的三欄全部沒 src 引用，可直接 DROP：

- `advance_items`（三欄全廢）
- `advance_lists`（三欄全廢）
- `bulletins`（三欄全廢）
- `channel_groups`（type 有 stub 但無 runtime 使用，三欄全廢）
- `channels`（type 有 stub 但無 runtime 使用，三欄全廢）
- `shared_order_lists`（三欄全廢）
- `suppliers`（type extends SyncableEntity 但無 runtime 使用，三欄全廢）
- `workspaces`（type 有 stub 但無 runtime 使用，三欄全廢）

A 類三表 `messages` / `itineraries` / `tours` 的 `_needs_sync` + `_synced_at` 也屬 B 類（src 只用 `_deleted`、那兩欄純 dead）。

### C 類（DB 沒欄位 + src 有引用 → 刪 src 即可）

| 受影響表 | src 點 | 說明 |
|---|---|---|
| `employees` | `ShareAdvanceDialog.tsx:55-56`、`TourSettings.tsx:52-53` | 過濾 `_deleted` 但 `employees` 表沒這欄、永遠 `undefined`、實質已壞但因 `!undefined === true` 沒擋到任何資料。應改用 `status === 'terminated'` 或 `terminated_at` |
| `supplier_categories` | `types/supplier-category.types.ts:7` | type extends SyncableEntity 但 DB 沒欄、entity 也不寫 |
| `cost_templates` | `types/supplier.types.ts:82` | 同上 |
| `tour_leaders` | `types/tour-leader.types.ts:18,76` | 同上 |

### D 類（type 定義整體可砍）

- **`src/types/base.types.ts:34-38`** — `SyncableEntity` interface 整個 SyncFields concept 可移除、改成各 entity 自己手寫（如同 `Tour` / `Itinerary` / `Message` 的做法）或全部清掉。
- **`src/data/core/types.ts:16`** — `CreateInput` 的 Omit list 可拿掉三欄（拿掉後不影響功能、純化）。
- **`src/types/index.ts:10`** — re-export 跟著移除。

---

## 4. 清理計畫（給下波 agent）

### Phase 1：A 類 src 重新設計（最關鍵、要決策）

1. `messages._deleted` 是 chat-store 軟刪除 single source。**不能直接砍**，必須先決定遷移到 `deleted_at` (timestamptz) 還是 `is_deleted` (boolean)。建議併入 E 系列軟刪除 SSOT（跟其他表用同一規範）。
2. `tours._deleted` / `itineraries._deleted`：先 query DB 看有沒有真的 `_deleted=true` 的 row、若無 → 改 src filter 拿掉、然後 DROP。若有 → 一樣轉 `deleted_at` 後再 DROP。

### Phase 2：B 類純 DROP migration

寫一個 migration、把 9 表的三欄全 DROP（含其上 index 如 `idx_*_needs_sync`）：

```
advance_items, advance_lists, bulletins, channel_groups, channels,
shared_order_lists, suppliers, workspaces,
+ messages._needs_sync/_synced_at（只留 _deleted 等 Phase 1）
+ itineraries._needs_sync/_synced_at
+ tours._needs_sync/_synced_at
```

### Phase 3：C 類 dead src 清除

- `ShareAdvanceDialog.tsx`、`TourSettings.tsx`：把 `_deleted` 過濾邏輯改成正確的離職判斷（`status` / `terminated_at`），刪掉 `_deleted` 引用與 `EmployeeWithSync` / `SyncableEntity` import。
- `supplier-category.types.ts`、`supplier.types.ts`、`tour-leader.types.ts`：interface 改 extends `BaseEntity`、不再 extends `SyncableEntity`。
- 同步檢查 `TourLeaderInput` 的 Omit list、把 `_needs_sync`/`_synced_at` 拿掉。

### Phase 4：D 類 type 全清

- B + C 跑完後，全站不再有 `SyncableEntity` 引用 → 把 `base.types.ts:34-38` 整個 interface 砍掉。
- `data/core/types.ts:16` 的 `CreateInput` Omit 拿掉三欄。
- `types/index.ts:10` 的 re-export 拿掉。

### Phase 5：歷史 migration 加註記（可選）

不修改、但在 README 或 ADR 寫一句「2025/2026 早期 migration 建表帶 SyncFields、之後逐表清除」溯源用。

---

## 5. 異常與發現

1. **`employees._deleted` 是大型死過濾**：`ShareAdvanceDialog` 和 `TourSettings` 兩個 UI 一直用 `!emp._deleted` 過濾離職員工，但 `employees` 表根本沒這欄、`_deleted` 永遠 `undefined`、實際過濾條件等同沒寫。離職員工只靠 `status === 'active'` 擋住、若 status 沒同步更新會洩漏。**這是潛在 bug、不只清理問題**。

2. **C2 已清過 9 表、剩 12 表**：`visas` / `linkpay_logs` / `companies` / `company_contacts` / `company_announcements` / `disbursement_orders` / `tour_addons` / `payment_request_items` / `proposals` 都已 DROP，只 migration 文件保留。代表這條路 C2 走過、SOP 已知（先改 src 再 DROP）。

3. **`messages` 軟刪除是真在用的**：是唯一一個 `_deleted` 真的有業務邏輯（chat 軟刪除）的地方。處理時要決定遷不遷到統一軟刪除規範、不能粗暴 DROP。

4. **三欄出現頻率不均**：`_deleted` 是唯一在 runtime 被讀寫的欄位（messages、tours filter、itineraries filter），`_needs_sync` 與 `_synced_at` 全站零 runtime 使用、純 dead column，Phase 2 可以無腦 DROP。

5. **`src/stores/sync/` 不是離線同步**：是 store events broadcast（StoreEventType / StoreSource），跟此 audit 無關、不要誤砍。

6. **`tour.types.ts` / `workspace/types.ts` 用手寫不 extend SyncableEntity**：有兩種定義 SyncFields 的風格混存。Phase 4 統一成「不要再有 SyncFields」。
