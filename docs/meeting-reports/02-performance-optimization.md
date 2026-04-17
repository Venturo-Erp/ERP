# ⚡ 效能優化會議報告

## 會議日期：2026-04-16

## 參與角色：前端效能專家、DBA

---

### 執行摘要（3 句話總結）

Venturo ERP 的資料層架構設計良好（SWR + IndexedDB 三層快取 + Realtime 推播），code splitting 在團詳情頁做得特別到位（14 個 tab 全部 dynamic import）。主要效能風險集中在三個面向：**重量級依賴 bundle 膨脹**（Univerjs、Fabric、Phaser、FullCalendar 等合計估計 2-3MB）、**Realtime channel 過度訂閱**（每個 entity hook 實例都開一條 channel）、以及**部分巨型組件缺乏拆分**（RequirementsList 2190 行、OrderMembersExpandable 1491 行）。

---

### Bundle 分析

#### 依賴總覽

| 類別         | 套件                          | 估計大小                      | 備註                            |
| ------------ | ----------------------------- | ----------------------------- | ------------------------------- |
| **超重量級** | `@univerjs/*`（12 個套件）    | ~800KB-1.2MB                  | 辦公室模組，僅 `/office` 用     |
| **超重量級** | `fabric`                      | ~300KB                        | 設計器模組，僅 `/design` 用     |
| **重量級**   | `phaser`                      | ~1MB                          | 遊戲引擎，用途不明              |
| **重量級**   | `@fullcalendar/*`（4 個套件） | ~200KB                        | 僅 `/calendar` 用               |
| **中量級**   | `framer-motion`               | ~130KB                        | 39 個檔案引用，多數在公開預覽頁 |
| **中量級**   | `@tiptap/*`（9 個套件）       | ~150KB                        | 富文本編輯器                    |
| **中量級**   | `jspdf` + `jspdf-autotable`   | ~300KB                        | PDF 生成                        |
| **中量級**   | `exceljs` + `xlsx`            | ~400KB                        | Excel 處理                      |
| **輕量**     | `lucide-react`                | 已在 `optimizePackageImports` | OK                              |

**問題 1：雙重圖標庫**

- 同時使用 `lucide-react`（主力）、`@phosphor-icons/react`（6 處）、`@iconify/react`（6 處）
- 位置：`src/components/layout/sidebar.tsx`、`src/features/designer/components/IconPicker.tsx` 等
- 影響：額外 bundle 大小 + tree-shaking 不完整

**問題 2：雙重資料層套件**

- `swr`（主力，整個 data layer 基於此）與 `@tanstack/react-query` 同時存在
- `@tanstack/react-query` 僅在 `src/lib/react-query/provider.tsx` 被引用，provider 包在根 layout 但**沒有任何實際 consumer**
- 位置：`src/app/layout.tsx` 第 54 行
- 影響：白白增加 ~30KB gzipped

**問題 3：雙重虛擬化套件**

- `react-virtuoso` 與 `@tanstack/react-virtual` 同時存在
- `react-virtuoso` 使用 2 處，`@tanstack/react-virtual` 使用 1 處（VirtualizedTable）
- 應統一為一個

#### next.config 設定（良好）

- `optimizePackageImports` 已涵蓋 lucide-react、radix-ui、date-fns、framer-motion — **做得不錯**
- `output: 'standalone'` 已啟用
- `@next/bundle-analyzer` 已配置
- 圖片格式支援 AVIF + WebP

**缺失項目：**

- `@univerjs/*` 未列入 `optimizePackageImports`
- `@tiptap/*` 未列入 `optimizePackageImports`
- `@fullcalendar/*` 未列入 `optimizePackageImports`
- `@dnd-kit/*` 未列入 `optimizePackageImports`

---

### 載入策略檢查

#### 做得好的地方

1. **團詳情頁** (`src/features/tours/components/TourTabs.tsx`)：14 個分頁全部用 `dynamic()` 載入，切換時才下載，是整個專案最佳實踐範例。

2. **收款頁** (`src/app/(main)/finance/payments/page.tsx` 第 26-37 行)：3 個 Dialog 用 `dynamic()` 載入。

3. **辦公室模組** (`src/app/(main)/office/editor/page.tsx`)：Univerjs 三個組件全部 `dynamic()` 且 `ssr: false`。

4. **行事曆** (`src/app/(main)/calendar/page.tsx` 第 28 行)：CalendarGrid dynamic 載入。

5. **資料庫管理頁** (`src/features/attractions/components/DatabaseManagementPage.tsx`)：tabs 用 `React.lazy()`。

#### 需要改善的頁面

| 頁面          | 檔案                                                           | 問題                                                                                                                          |
| ------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Dashboard** | `src/features/dashboard/components/DashboardClient.tsx`        | 引入完整 `@dnd-kit/core` + `@dnd-kit/sortable` 但無 dynamic import；所有 widget 組件同步載入                                  |
| **訂單頁**    | `src/app/(main)/orders/page.tsx`                               | 5 個 Dialog（QuickReceipt、OrderEditDialog、InvoiceDialog、BatchVisaDialog、AddOrderForm）全部同步 import，應改為 `dynamic()` |
| **待辦事項**  | `src/app/(main)/todos/page.tsx`（1104 行）                     | 巨型單體組件，且設為 `force-dynamic`                                                                                          |
| **設計器**    | `src/app/(main)/design/new/DesignerPageContent.tsx`（1148 行） | fabric.js 已 dynamic，但 DesignerPageContent 本身 1148 行未拆分                                                               |

#### `force-dynamic` 濫用

`src/app/layout.tsx` 第 25 行設定了 `export const dynamic = 'force-dynamic'`，這會讓**所有**頁面都無法被靜態快取，包含登入頁、設定頁等不需要 SSR 的頁面。另有 6 個子頁面額外重複設定。

---

### SWR / 資料層效能

#### 架構設計（良好）

三層快取策略設計良好：

```
SWR (L1 Memory) → IndexedDB (L2 Persistent) → Supabase (L3 Cloud)
```

- **快取策略**：`staleTime: Infinity` + `revalidateOnFocus: false`，靠 Realtime 推播更新 — 避免不必要的 refetch
- **樂觀更新**：create/update/delete 全部實作樂觀更新
- **Slim 版本**：高頻 entity（tours、orders、receipts）都有 slim select 配置
- **IndexedDB fallback**：`useIdbFallback` 在網路不穩時先顯示上次資料

#### 問題 1：Realtime Channel 過度訂閱（高優先）

**位置**：`src/data/core/createEntityHook.ts` 第 185-205 行

`useRealtimeSync()` 在每個 `useList()` 和 `useListSlim()` 呼叫時都會建立一條 Realtime channel。以訂單頁為例：

- `useOrdersListSlim()` → 開 `realtime:orders` channel
- `useToursListSlim()` → 開 `realtime:tours` channel

如果 Dashboard 同時顯示多個 widget，每個 widget 各自呼叫不同 entity hook，會瞬間開出 5-10 條 Realtime channel。**Supabase 免費版限制 200 條並發連線**。

而且同一張表的多個 hook 實例會各自訂閱一條 channel，造成重複：

- 頁面 A 用 `useOrders()` → 開 channel
- 同頁面的 Dialog B 也用 `useOrders()` → **又開一條 channel**

**建議**：改用全域 channel 管理器，同一表只開一條 channel，用 reference counting 管理生命週期。

#### 問題 2：receipts list select 過度撈取

**位置**：`src/data/entities/receipts.ts` 第 13-16 行

`list.select` 包含 37 個欄位（幾乎等於 `select('*')`），包含 `account_info`、`auth_code`、`bank_name`、`card_last_four` 等敏感且列表不需要的欄位。列表頁只用到 receipt_number、receipt_date、tour_name、receipt_amount、actual_amount、payment_method、status。

#### 問題 3：tours list select 也偏多

**位置**：`src/data/entities/tours.ts` 第 24-25 行

`list.select` 包含 42 個欄位，包含 `contract_status`、`contract_completed`、`locked_at`、`locked_by` 等多數列表頁不需要的欄位。

#### 問題 4：useIdbFallback 每次 mount 都觸發 IndexedDB 讀取

**位置**：`src/data/core/createEntityHook.ts` 第 245-266 行

即使 SWR 已有記憶體快取（不需要 fallback），`useIdbFallback` 仍會發起 IndexedDB 讀取。應加入判斷：只在 SWR 記憶體沒有資料時才讀 IndexedDB。

#### 問題 5：localStorage + IndexedDB 雙重持久化

`src/lib/swr/config.ts` 的 `localStorageProvider` 和 `src/lib/cache/indexeddb-cache.ts` 都在做持久化快取。兩層都做會造成：

- 寫入時雙重 I/O
- localStorage 有 5MB 限制，大量 entity 資料容易超限
- 快取一致性難以維護

---

### 發現的效能瓶頸

#### 瓶頸 1：巨型組件未拆分

| 組件                     | 行數    | 位置                                                            | 問題                                                        |
| ------------------------ | ------- | --------------------------------------------------------------- | ----------------------------------------------------------- |
| `RequirementsList`       | 2190 行 | `src/features/confirmations/components/RequirementsList.tsx`    | 20 個 useMemo/useCallback，但整個組件是單一 render function |
| `OrderMembersExpandable` | 1491 行 | `src/features/orders/components/OrderMembersExpandable.tsx`     | 包含展開/收合邏輯 + 護照上傳 + PNR 配對等多個子功能         |
| `tour-itinerary-tab`     | 1967 行 | `src/features/tours/components/tour-itinerary-tab.tsx`          | 行程編輯器核心，含航班查詢 + 拖拽排序 + 景點庫              |
| `AddRequestDialog`       | 1512 行 | `src/features/finance/requests/components/AddRequestDialog.tsx` | 請款新增表單                                                |
| `DesignerPageContent`    | 1148 行 | `src/app/(main)/design/new/DesignerPageContent.tsx`             | 設計器主頁面                                                |
| `finance/settings`       | 1427 行 | `src/app/(main)/finance/settings/page.tsx`                      | 財務設定頁面                                                |

這些組件任何 state 變化都會觸發整個 2000 行組件的 re-render。

#### 瓶頸 2：列表頁未使用虛擬化

已有 `VirtualizedTable` 組件（`src/components/ui/enhanced-table/VirtualizedTable.tsx`）和 `useVirtualList` hook，但主要列表頁（訂單、收款、請款、旅遊團）**都未使用虛擬化**。

例如訂單頁 (`src/app/(main)/orders/page.tsx`) 的 `SimpleOrderTable` 使用一般 DOM 渲染，如果有 500+ 訂單，會產生大量 DOM 節點。

#### 瓶頸 3：原生 `<img>` 標籤

33 處使用原生 `<img>` 而非 Next.js `<Image>`（grep 結果顯示 28 個檔案共 33 處）。原生 `<img>` 不會：

- 自動 lazy loading
- 自動尺寸優化
- 自動 WebP/AVIF 轉換
- 防止 CLS（Cumulative Layout Shift）

特別是景點卡片、飯店卡片等列表場景影響較大。

#### 瓶頸 4：`'use client'` 過度使用

198 個檔案標記 `'use client'`，包括 layout、error boundary 等可以是 Server Component 的檔案。雖然 Next.js App Router 的 Client Component 不代表完全不 SSR，但會增加 client bundle 大小。

---

### 具體建議（按優先級）

#### P0 — 立即處理（預計 bundle 減少 30-40%）

| #   | 建議                                     | 位置                                                                              | 影響                                 |
| --- | ---------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------ |
| 1   | **移除未使用的 `@tanstack/react-query`** | `package.json`、`src/lib/react-query/provider.tsx`、`src/app/layout.tsx` 第 54 行 | 減少 ~30KB gzipped，簡化 provider 樹 |
| 2   | **移除根 layout 的 `force-dynamic`**     | `src/app/layout.tsx` 第 25 行                                                     | 讓靜態頁面可以被快取                 |
| 3   | **訂單頁 Dialog 改 dynamic import**      | `src/app/(main)/orders/page.tsx` 第 8-15 行                                       | 減少首次載入 JS ~50-100KB            |
| 4   | **Realtime channel 全域管理器**          | `src/data/core/createEntityHook.ts` 第 185-205 行                                 | 避免重複訂閱，減少 WebSocket 連線數  |

#### P1 — 短期優化（1-2 週）

| #   | 建議                                           | 位置                                                                      | 影響                                         |
| --- | ---------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------- |
| 5   | **精簡 receipts list select**                  | `src/data/entities/receipts.ts` 第 13-16 行                               | 將 37 欄位縮減到 ~10 欄位，減少 payload ~70% |
| 6   | **精簡 tours list select**                     | `src/data/entities/tours.ts` 第 24-25 行                                  | 將 42 欄位縮減到 ~15 欄位                    |
| 7   | **統一圖標庫**                                 | 移除 `@phosphor-icons/react` 和 `@iconify/react`，全部改用 `lucide-react` | 減少 bundle + 統一視覺                       |
| 8   | **統一虛擬化套件**                             | 移除 `react-virtuoso`，統一用 `@tanstack/react-virtual`                   | 減少 bundle 重複                             |
| 9   | **新增缺少的 optimizePackageImports**          | `next.config.ts` 加入 `@tiptap/*`、`@dnd-kit/*`、`@fullcalendar/*`        | 改善 tree-shaking                            |
| 10  | **移除 localStorage 持久化**，只保留 IndexedDB | `src/lib/swr/config.ts` 的 `localStorageProvider`                         | 減少雙重 I/O，避免 localStorage 5MB 限制     |

#### P2 — 中期重構（2-4 週）

| #   | 建議                            | 位置                                                         | 影響                                             |
| --- | ------------------------------- | ------------------------------------------------------------ | ------------------------------------------------ |
| 11  | **拆分 RequirementsList**       | `src/features/confirmations/components/RequirementsList.tsx` | 2190 行拆成 4-5 個子組件，減少不必要的 re-render |
| 12  | **拆分 OrderMembersExpandable** | `src/features/orders/components/OrderMembersExpandable.tsx`  | 1491 行拆分，護照上傳和 PNR 配對改為 lazy 載入   |
| 13  | **列表頁導入虛擬化**            | 訂單、收款、旅遊團列表頁                                     | 對 100+ 筆資料場景大幅改善渲染效能               |
| 14  | **`<img>` 改為 `<Image>`**      | 28 個檔案 33 處                                              | 自動 lazy loading + 格式優化                     |
| 15  | **useIdbFallback 條件化**       | `src/data/core/createEntityHook.ts` 第 245 行                | 只在 SWR 無快取時才讀 IndexedDB                  |

#### P3 — 長期規劃

| #   | 建議                      | 位置                                     | 影響                              |
| --- | ------------------------- | ---------------------------------------- | --------------------------------- |
| 16  | **評估 phaser 是否必要**  | `package.json`                           | ~1MB 的遊戲引擎，確認是否仍在使用 |
| 17  | **Server Component 遷移** | 多個 `'use client'` 頁面                 | 減少 client bundle，改善 FCP      |
| 18  | **Bundle 分析自動化**     | CI pipeline 加入 `@next/bundle-analyzer` | 防止 bundle regression            |

---

### 下一步行動

1. **本週**：執行 P0 四項（移除 react-query、修 force-dynamic、訂單頁 dynamic import、設計 Realtime 管理器方案）
2. **下週**：執行 P1 六項，重點在 select 欄位精簡和套件統一
3. **下次會議前**：跑一次 `ANALYZE=true npm run build` 產出 bundle 分析報告，作為基線數據
4. **追蹤指標**：First Load JS、LCP、TTI，建議用 Vercel Speed Insights 持續監控

---

_報告由前端效能專家產出，基於 2026-04-16 的 codebase 分析。_
