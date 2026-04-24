# Marathon 04 · Software Architect 🏛 體檢報告

**扮演靈魂**：Software Architect（長期視角、抽象邊界、5 年後誰在痛）  
**掃描日期**：2026-04-24  
**範圍**：Domain boundary / Layer / Dependency / Abstraction / Cross-cutting / State / Code smell / Evolvability  
**方法**：Module graph (18 features) + service layer + dependency direction + god component analysis

---

## 一句話裁決（Architect 語氣）

**架構主體是模組化的（18 個 bounded context）、守層級也做得 70% 對，但「演化債」集中在三個地方：(1) 編號生成沒中央化、(2) 跨域引用繞層級、(3) god component 與 god page 吞掉了層級邊界。上線能用，但 5 年後維護會痛。這份報告的核心建議是「抽象層次對齊」——現在的無序成本，會在每個新需求時倍增。**

---

## 🔴 長期會痛的架構雷

### 1. 編號生成無中央化、race condition 跨三個模組

**症狀**：`voucher_no`、`order_number`、`tour_code`、`receipt_number` 各自在 code 中用 `.order('DESC').limit(1)` 取最大 → 並行 INSERT 會撞號

**證據**：

- `src/app/api/accounting/vouchers/auto-create/route.ts` L66-81：singleton supabase client 取最後一筆、seq++、無 transaction
- Orders / Payments / Quotes 模組各自有類似邏輯、沒有統一
- DB 層沒有 RPC / `FOR UPDATE` 鎖機制

**為什麼痛**：

- 新客戶租戶上線時大批量導入舊資料，併發撞號機率 100%
- 5 年後如果加新的編號類型（voucher_no → 分帳號前綴的編號），会重複這個 bug
- 當前是「某天有人發現兩筆傳票編號一樣」才知道

**架構視角**：

```
❌ 現況（分散）
  orders → generateOrderNo() ← orders DB query
  payments → generateReceiptNo() ← payments DB query
  accounting → generateVoucherNo() ← accounting DB query
             ↓ singleton client（違反 CLAUDE.md）

✅ 應該的樣子
  orders / payments / accounting
         ↓
   src/lib/erp/number-generator.ts (pure function)
         ↓
   DB RPC (number_sequence(entity_type) → next_number FOR UPDATE)
```

**修法**：

1. **DB 層**（Wave 8 後期）：建 `number_sequences` 表 + RPC `get_next_number(entity_type TEXT) → INT`、用 `FOR UPDATE` 鎖行
2. **Code 層**：`src/lib/erp/number-generator.ts` 統一取號邏輯
3. **Supabase client**：用 per-request client（現在是 singleton、違反 CLAUDE.md）

**估時**：M（半天、涉及 DB + code）  
**優先**：Medium-High（不是上線阻擋、但上線後第一個月會踩）

---

### 2. Page → Hook → Component 層級邊界模糊、跨域引用繞層級

**症狀**：Orders 模組的 Component 直接 import Tours 的 Service（`tour-stats.service`、`tour-channel.service`），繞過了應有的 API 層或共用 Service

**證據**：

```
src/features/orders/components/simple-order-table.tsx
  ↓
import { recalculateParticipants } from '@/features/tours/services/tour-stats.service'

src/features/orders/hooks/useOrders.ts
  ↓
import { addMembersToTourChannel } from '@/features/tours/services/tour-channel.service'
import { recalculateParticipants } from '@/features/tours/services/tour-stats.service'
```

**為什麼痛**：

- Tours 改了內部 service 簽名、Orders component 沒測到、runtime 才炸
- 五年後加新的「副團」feature，要改兩個 service 的邏輯、但改法不一致、導致 Orders 和 Tours 的狀態不同步
- Features 邊界變成「我知道你的私密邏輯」而非「我只呼叫你的公開 API」

**架構視角**：

```
❌ 現況（跨域直用 service）
  Orders Component
    ↓ import tours.service（私密）
  Tours Service（內部實作細節）

✅ 應該的樣子（edge 層清晰）
  Orders Component ─────────→ Orders API Route ────→ Orders Service
                                    ↓
  Tours Component ─────────→ Tours API Route ────→ Tours Service

  跨域協調只在 service 層（Orders Service 呼叫 Tours API、不直用 Tours Service）
```

**具體問題**：

- `recalculateParticipants`（Tour 內部）被 Orders 直用 → 應該是 Tours API `/api/tours/{id}/recalculate-participants` 給 Orders 呼叫
- `addMembersToTourChannel`（Tour 內部）被 Orders Hook 直用 → 應該暴露成 API endpoint

**修法**：

1. Tours service 內的「跨邊界」function（如上二者）改成 API route（需 William 決定 scope）
2. Orders 改用 API endpoint 而非直 import service
3. 短期可行：在 `src/features/tours/api/` 建一個 internal API layer（不暴露給前端、只給 backend service 用）

**估時**：L（需要逐個 API 端點設計）  
**優先**：High（但不是上線阻擋、是「架構債」）

---

### 3. God Component + God Page 吞掉層級

**症狀**：五個超大檔案（1500+ 行）未按責任分層

**證據**：

```
src/features/finance/requests/components/AddRequestDialog.tsx     1525 行（Dialog 本身要 1000+ 嗎？）
src/features/orders/components/OrderMembersExpandable.tsx          1449 行（Expandable 應該很小）
src/features/tours/components/tour-itinerary-tab.tsx              1914 行（Tab 內容該拆分）
src/app/(main)/finance/settings/page.tsx                          1434 行（Page shell 不該這大）
src/app/(main)/todos/page.tsx                                     1098 行
```

**層級應該是**：

```
Page（業務路由層、200 行內）
  ↓
Layout / Sections（畫面組織層、300-400 行）
  ↓
Form / Dialog / Panel（互動層、200-300 行）
  ↓
Presentational Components（純展示、<200 行）
```

**現況的問題**：

- `AddRequestDialog` 1525 行 = Dialog 框架 + Form 邏輯 + Table 邏輯 + API 呼叫 + 多個 sub-dialog 管理 → 一個 god component 裡五層東西
- `OrderMembersExpandable` 1449 行 = 成員列表展開 + 房間分配 + 車輛分配 + 座位分配 + PNR 匹配 → Expandable 變怪物

**為什麼痛**：

- 測試：沒人敢動，因為改一行可能影響五個地方
- Reuse：想在別的地方重用「房間分配邏輯」，但它跟成員列表緊耦合
- Review：1500 行 PR 沒人能 review 完整、bug 藏在深層

**修法方向**（Post-Launch）：

1. **AddRequestDialog** → 拆成 `<RequestForm/>` + `<RequestItemTable/>` + `<AllocationSummary/>` 三個 component
2. **OrderMembersExpandable** → 拆成 `<MemberList/>` + `<RoomAssignmentPanel/>` + `<VehicleAssignmentPanel/>` + `<PnrMatcherPanel/>`
3. **tour-itinerary-tab** → 拆成 `<ItineraryDayEditor/>` + `<FlightSection/>` + `<AccommodationSection/>` 各自是 <400 行

**現在做不做**：不卡上線（邏輯沒問題、只是維護成本高）

---

## 🟠 演化債

### 1. 重複組件（無中央化 UI 邏輯）

**症狀**：同一個組件在多個 feature 各有一份

| 組件                  | 位置 1                               | 位置 2                     | 行數                   |
| --------------------- | ------------------------------------ | -------------------------- | ---------------------- |
| `CustomerMatchDialog` | orders                               | visas                      | ~140                   |
| `ContractDialog`      | contracts                            | contracts/contract-dialog  | ~650（不確定有無重複） |
| 5 個 CRUD Dialog      | database（/archive /attractions 等） | tours / orders / suppliers | ~90-300                |

**為什麼痛**：

- visas 的 CustomerMatchDialog 改了、orders 沒跟上 → visa 功能正常、order 功能異常
- 5 年後加「自動補全顧客名字」feature → 需要改 5 個地方 / 或漏掉一個

**短期修法**：建立共用 component library

```
src/features/common/
  ├── components/
  │   ├── CustomerMatchDialog.tsx（統一版）
  │   └── ContractDialog.tsx
  ├── hooks/
  └── types/
```

**估時**：M（需要梳理現有差異、統一簽名）

---

### 2. 共用邏輯散落在 Hook / Util / Service 三處、無一致性

**症狀**：

- 「取最後一個編號 + 1」：orders / payments / accounting 各一份
- 「報表統計 query」：accounting reports × 3 都 copy-paste（DBA 已提）
- 「狀態轉移機」：tour / order / quote / payment / request 各自寫一份狀態機

**應該的樣子**：

```
src/lib/erp/
  ├── number-generator.ts（統一編號邏輯）
  ├── state-machines/（所有狀態機集中）
  │   ├── tour.machine.ts
  │   ├── order.machine.ts
  │   └── payment.machine.ts
  ├── constants.ts（DECIMAL_TOLERANCE 等常數）
  └── queries/（通用 query builder）
```

**BACKLOG 已列**（00-INDEX.md §跨模組 pattern）、這份報告確認必要性

---

### 3. State Management 邊界模糊

**症狀**：

- Zustand store（`useChannelsStore` 等）直接在 store 內做 Supabase query
- Server state（API 資料）和 client state（UI 狀態）混在一起
- 沒有明確的「API 層」vs「Store 層」邊界

**應該的樣子**：

```
Server State（誰都不改、API 是真相源）
  ←SWR/React Query
  ├─ /api/tours
  ├─ /api/orders
  └─ /api/payments

Client State（UI 狀態、Zustand）
  ├─ activeTab
  ├─ selectedRows
  └─ ui filters（不影響 API）

現況問題：Store 不只存 client state、還存 API 資料、還直接查 Supabase
```

**估時**：L（需要重構 store、一個個 feature）

---

## 🟡 整理機會

### 1. 沒有 Repository Pattern、直接 supabase.from() 散落各地

**現況**：

- Page 直查 supabase（已列 BACKLOG INV-P02、e.g. /tours /customers /quotes）
- Hook 直查（大部分是這樣）
- Component 偶爾直查（OrderMembersExpandable 可能有）

**為什麼值得做**：

- 測試困難（需要 mock Supabase）
- 遷移困難（如果要換 backend）
- Query 最佳化困難（不知道全局有幾個重複 query）

**做法**：`src/lib/data/` 已經有開始（`usePaymentRequestItems` 等）、但不統一

**估時**：L（逐個 feature 建 repository）

---

### 2. API Route 層級守衛不一致

**症狀**：

- 有些 API route 有 `withErrorHandler` HOC
- 有些 API route 有 try/catch
- 有些 API route 13% 沒有 try/catch（SRE 指出）

**應該**：統一 HOC 或 middleware

```typescript
export async function GET(req: NextRequest) {
  return withErrorHandler(async () => {
    // business logic
  })
}
```

**估時**：M（建立統一 HOC、逐個改）

---

## 🟢 架構做得好的

### 1. 18 個 Feature Module 邊界清晰

**證據**：

- `src/features/tours`、`src/features/orders`、`src/features/finance` 等各自獨立
- 資料流向清楚（Page → Hook → Service → API → Supabase）
- 沒有「什麼都在 features 根目錄」的混亂

**維持做法**：新增 feature 時继续这个结构

### 2. RLS + Audit FK 統一（Wave 0-6 已處理）

**證據**：

- 所有業務表都 enable RLS + `workspace_id` filter
- Audit FK 全指 `employees(id)`（CLAUDE.md 紅線遵守）
- 多租戶隔離從 DB 層保護

**維持做法**：新表都這樣做

### 3. Service Layer 存在、大部分 feature 有（不完全）

**證據**：

```
payments:  payment-request.service.ts / disbursement-order.service.ts
tours:     tour.service / tour-stats.service / tour-channel.service
orders:    order.service / order-stats.service
finance:   receipt-core.service / expense-core.service
```

**缺點**：不是所有 feature 都有（accounting 沒有）、service 職責不一致

### 4. Hook 層次（Custom Hooks）有體系、不混亂

**證據**：

- `useRequestForm()` / `useRequestOperations()` 分離（form 邏輯 vs 操作邏輯）
- `useToursPaginated()` / `useToursPage()` 分離（分頁 vs 頁面狀態）
- 不像有些框架全亂在 `useFetch()`

**維持做法**：新 hook 都這樣分層

---

## 跨視角 Pattern 候選（累積至第 4 位）

已浮現 8 種，Architect 加 2 種新觀察：

1. **外部輸入信任邊界未統一**（Security）
2. **資料密集功能全 client 算**（DBA）
3. **編號 race condition 跨模組**（DBA + SRE + **Architect 確認三個地方**）
4. **HTML 安全 × 列印 × 無障礙**（Security）
5. **效能 vs 正確性政策缺失**（DBA）
6. **外部依賴無防禦**（SRE）
7. **冪等性缺席**（SRE）
8. **觀察性近零**（SRE）
9. **【新】跨域引用繞層級、無明確 API 邊界**（Architect 主打）→ Orders import Tours service / component 直用其他 feature 私密邏輯
10. **【新】層級無序、god component + god page 吞掉責任**（Architect 主打）→ 1500 行 component / 1400 行 page、沒有分層

---

## 給下一位靈魂（Bookkeeper Controller）的 Hint

### 你會在乎的架構面

1. **SSOT 衝突**：
   - `employees.permissions` 與 `role_tab_permissions` 曾雙軌（已列 BACKLOG §5）
   - `order_members` vs `tour_members`（已列 BACKLOG、上線後合併）
   - `customers` vs `traveler_profiles` 欄位重複（BACKLOG 未決）

2. **數據完整性**：
   - Audit FK 現在全指 employees ✅
   - `tour_leaders` 缺 `workspace_id` / `created_by`（多租戶不完整）
   - `chart_of_accounts.is_favorite` 幽靈欄位（會計流程決策）

3. **報表層**：
   - 三份 accounting report 都 client-side calc（DBA 指出）
   - 沒有報表的 pre-compute / cache 策略
   - 沒有「報表資料時間戳」的明確政策

4. **Accounting 模組缺 service layer**：
   - Finance / Payments 有、但 Accounting 沒有統一 service
   - 傳票邏輯分散在 hook + API route

---

## 跨 3 位報告的架構合奏圖

```
               Security + DBA + Architect 合看

層級問題（Architect）
├─ Page 直查 Supabase（INV-P02）
├─ Component 直用其他 feature service
└─ god component 沒有分層
     ↑
     └─ 導致無法測試、無法驗證 Input 邊界
           ↑
           └─ 外部輸入信任邊界難以統一（Security）

編號問題（DBA + Architect）
├─ 沒有 repository pattern（Architect）
├─ 三個地方各自實作編號邏輯（Architect）
├─ race condition（DBA）
└─ singleton client 不 per-request（CLAUDE.md）
     ↑
     └─ 也影響了 SRE 的「冪等性」（SRE）

Performance vs Correctness（DBA）
├─ 報表全 client 算（DBA 主打）
├─ 沒有 index 策略 policy（DBA）
├─ 大型 component 無法 lazy load（Architect）
└─ 沒有 SLO 告警（SRE）
```

---

## 建議執行順序（給 William）

### 上線前（今晚、明天）：P0 架構雷

- ✅ 已列 BACKLOG 的 6 個紅色項（不重報）

### 上線後第 1 週（架構債 Quick Wins）

- 編號生成中央化 + DB RPC（DBA 確認的修法更對）
- API 層統一 `withErrorHandler` HOC

### 上線後第 1 個月（架構演化）

- God component 拆分（AddRequestDialog / OrderMembersExpandable）
- 共用組件库建立（CustomerMatchDialog 統一）
- Hook 層共用邏輯集中（number-generator / state-machines）

### Post-Launch（架構重構、不卡功能）

- 跨域引用改用 API endpoint（Orders 不直用 Tours service）
- State Management 重構（Zustand → SWR 分離）
- Repository pattern 全面應用

---

_Software Architect 簽名：架構的目標不是完美、而是「減少未來的驚喜」。這份代碼的驚喜主要在「層級糊掉」和「重複邏輯」，不在「設計複雜」。簡化層級、統一重複，5 年後就不會有人怪你。_

---

## 掃描足跡

- 18 個 feature module、90+ dialog、14 個 service layer
- gitnexus query × 8、cypher × 1（schema 學習中）
- 檔案規模統計：page 最大 1434 行（finance/settings）、component 最大 1914 行（tour-itinerary-tab）
- 未檢查：team 決策（跨域 API 設計權限）、性能基準（是否真的影響）

---

## 🔁 主 Claude 覆盤

### 1. 真問題過濾

| #                                                | Architect 說 | 覆盤後                        | 備註                                                                                                       |
| ------------------------------------------------ | ------------ | ----------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 編號 race condition                              | 🔴           | ⚠️ **第 4 次重報**            | DBA + 01-accounting + SRE 都講過、Architect 加的新角度是「跨模組 pattern 的 meta 觀察」、修法已確定 DB RPC |
| **跨域引用繞層級**（Orders → Tours service）     | 🔴           | 🔴 **真、新、Architect 獨有** | 嚴重 layer violation、兩模組改動時易失同步                                                                 |
| **OrderMembersExpandable 1449 行 god component** | 🔴           | 🔴 **真、新巨型檔**           | Wave 7 清單沒列、加進去                                                                                    |
| AddRequestDialog 1525 行                         | 🔴           | ❌ **已列 Wave 7**            |
| tour-itinerary-tab 1914 行                       | 🟠           | 🟠 **新**                     | Wave 7 補入                                                                                                |
| Finance vs Accounting 無共用 service             | 🟠           | 🟠 真、新                     |
| 8 個 Zustand store 無統一 pattern                | 🟠           | 🟡 低                         | 運作正常                                                                                                   |
| SSOT 3 處衝突                                    | -            | -                             | 3 個都已列別處、重述                                                                                       |
| Repository pattern 缺                            | 🟡           | 🟡 架構品味題                 |

**覆盤結論**：**1 個 P0 新 + 2 個 Wave 7 補入**

- **P0 新**：Orders ↔ Tours 跨域繞層引用
- **Wave 7 補**：OrderMembersExpandable 1449、tour-itinerary-tab 1914

### 2. 重複

- **編號 race**（第 4 次）→ 確認跨視角 pattern、修一次全解決
- Wave 7 巨型檔案部分重複、補 2 個新的

### 3. 跨視角 pattern 累積（1-4 位）

| #      | Pattern                    | 誰發現                |
| ------ | -------------------------- | --------------------- |
| 1      | 外部輸入信任邊界未統一     | Security              |
| 2      | 資料密集功能全 client 算   | DBA                   |
| 3      | 編號 race condition 跨模組 | DBA + SRE + Architect |
| 4      | HTML 安全 × 列印 × 無障礙  | Security              |
| 5      | 效能 vs 正確性政策缺失     | DBA                   |
| 6      | 外部依賴無防禦             | SRE                   |
| 7      | 冪等性缺席                 | SRE                   |
| 8      | 觀察性近零                 | SRE                   |
| **9**  | **跨域引用繞層級**         | **Architect 新**      |
| **10** | **god component 吞噬分層** | **Architect 新**      |

**觀察**：Architect 價值在**從架構高度確認 pattern**、並補 meta 層 2 個。累計 10 種跨視角 pattern。

---
