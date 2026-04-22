# /tours Tab 深挖研究 — Group 1（聚合層）

**研究日期**：2026-04-22  
**範疇**：`tab_value='overview'` / `tab_value='orders'` / `tab_value='members'` (mode='tour')  
**深化目標**：三個 Tab 的完成度、DB 依賴、SSOT 狀況、與 8 條原則對照

---

## 1. 總覽 Tab (Overview)

### 業務目的推斷

**這個 Tab 存在的理由**：一團的全景儀表板。大主管看團的財務狀況、快速判斷利潤、看訂單數、團員數。

**誰來看**：
- 大主管（看確認金額 vs 待確認金額的差）
- 團務（快速核對基本資訊、出團狀態）

**怎麼用**：
1. 進入 `/tours/[code]` 時的預設頁籤
2. 一眼看「總收入（預估／實收）」、「總支出」、「總利潤」
3. 快速進入頻道、編輯基本資料、管理報價、管理行程

### 完成度 %

| 層次 | 完成度 | 說明 |
|-----|--------|------|
| **UI** | 95% | 卡片佈局完整、顏色 OK、responsive。缺：沒有「聯絡資訊速查」面板 |
| **讀** | 100% | 用 `useOrdersSlim` + `useReceipts` + `usePaymentRequests` + `useMembers`，4 個 hook 各拿各的資料 |
| **寫** | 0% | 此 Tab 純展示、無新增/編輯邏輯（編輯在 onEdit callback 中） |
| **邏輯** | 70% | 收入計算正確（receipts status='1' vs 全部）、但「待確認金額」沒有明確狀態判定 |

### DB 表依賴

**讀**：
- `orders` (via `useOrdersSlim`)
  - 篩選：`tour_id = ?`
  - 用欄位：`id`, `tour_id`, `code`
- `receipts` (via `useReceipts`)
  - 篩選：`tour_id = ? OR (order_id IN (該團訂單 ID))`
  - 用欄位：`status` (確認金額靠 status='1' 判定)、`actual_amount`、`receipt_amount`
  - **【SSOT 風險】**status='1' 用來判斷「已確認」，但無 DB constraint 保證只有 2 種狀態
- `payment_requests` (via `usePaymentRequests`)
  - 篩選：`tour_id = ?`
  - 過濾：排除 `request_type LIKE '%bonus%' OR '%獎金%'`
  - 用欄位：`amount`、`request_type`
- `order_members` (via `useMembers`)
  - 篩選：`order_id IN (該團訂單 ID)`
  - 用欄位：count 計算 `member_count`

**寫**：無（純展示）

### 核心 Hooks / Services

```typescript
// 讀取層
useOrdersSlim()           // 團所有訂單（12 欄位精簡版）
useReceipts()             // 全部收款記錄
usePaymentRequests()      // 全部請款單
useMembers()              // 全部團員
useTourDisplay(tour)      // 顯示格式化目的地

// 快速動作
useTourChannelOperations()  // 建立/開啟團頻道
useWorkspaceChannels()      // 查該工作區的所有頻道

// 工具
formatCurrency()  // 金額格式化
```

### SSOT 有沒有斷

**斷點 1：確認金額判定** ⚠️
```typescript
const confirmedIncome = tourReceipts
  .filter(r => r.status === '1')  // ← 硬編 status='1' 表示「已確認」
  .reduce((sum, r) => sum + (Number(r.actual_amount) || Number(r.receipt_amount) || 0), 0)
```

**問題**：
- `receipts.status` 沒有 enum constraint
- 沒地方定義「status='1' 就是已確認」（可能是 migrations 迷因）
- UI 邏輯和 API 邏輯如果不同步，會導致金額計算錯誤

**斷點 2：團員數重複計算** ⚠️
```typescript
// tour-overview.tsx 裡：
const memberCount = useMemo(
  () => (allMembers ?? []).filter(m => m.order_id && orderIds.has(m.order_id)).length,
  [allMembers, orderIds]
)

// tour-stats.service.ts 裡（新增訂單時）：
await supabase.from('tours').update({ current_participants: participant_count })
```

**問題**：
- `tours.current_participants` 在 `recalculateParticipants()` 有值
- 但 `TourOverview` 用 `useMembers` 算 member_count，不讀 `tours.current_participants`
- 如果有人改 members 但沒呼叫 `recalculateParticipants()`，兩邊會不同步

**斷點 3：收入 vs 支出來源不同**
```typescript
// 收入：來自 receipts 表（支付流進來）
const tourReceipts = receipts.filter(r => r.tour_id === tour.id || ...)

// 支出：來自 payment_requests 表（支付流出去）
const totalExpense = paymentRequests.filter(pr => pr.tour_id === tour.id)
```

**為什麼斷**：
- `receipts` 和 `payment_requests` 是兩個獨立系統
- 「待確認金額」沒有明確的欄位或狀態
- William 說「待確認金額」是原則 4 的主要消費者，但代碼裡沒看到計算邏輯

### 對照 8 條原則

| # | 原則 | 命中狀況 | 一句評價 |
|----|------|--------|---------|
| 1 | 權限長在人身上 | ✓ 符合 | 無權限檢查（純展示）、可開啟頻道用 currentUser |
| 2 | 職務是身份卡 | ✗ 無關 | 此 Tab 不涉及職務邏輯 |
| 3 | 租戶一致性每層都守 | ✓ 符合 | 所有查詢都加 `workspace_id` filter（via SWR）或 tour_id |
| 4 | **狀態是 SSOT、數字從狀態算** | 🔴 **違反** | `receipts.status='1'` 判定「已確認」無 constraint；`current_participants` vs 動態計算不同步 |
| 5 | 核心業務事件走一張真相表 | ⚠️ 不符 | 收入=receipts、支出=payment_requests，無統一「團財務真相表」 |
| 6 | 聚合層 vs 明細層分離 | 🟡 部分 | TourOverview 是聚合層，但聚合邏輯在元件內（應該在 hook 或 service） |
| 7 | 資源類型獨立生命週期 | ✓ 符合 | receipts / payment_requests 各自管理 |
| 8 | 快速入口 ≠ 獨立資料 | ✓ 符合 | 頻道快速入口不存資料、只做導航 |

### 紅旗（上線前一定要處理）

1. **「待確認金額」無定義** — William 說這是重點，但代碼沒實裝。需要定義：
   - 是 `receipts.status != '1'` 的金額嗎？
   - 還是有第三種狀態（draft / pending / tentative）？
   - `TourOverview` 要顯示嗎？

2. **status='1' 是魔法字串** — receipts 表沒有 enum constraint，應該改用 check constraint 或定義為：
   ```sql
   ALTER TABLE receipts ADD CONSTRAINT status_in_valid_values CHECK (status IN ('0', '1', ...))
   ```

3. **current_participants 同步機制脆弱** — 依賴上層呼叫 `recalculateParticipants()`，容易漏掉。建議：
   - 改用 view 或 trigger：`CREATE VIEW tour_summary AS SELECT tour_id, COUNT(*) FROM order_members ...`
   - 或在 hook 層面保證 `useTour()` 拿到的 `current_participants` 永遠是新的

4. **總支出過濾邏輯太脆弱** — 用 `request_type.includes('bonus')` 排除獎金，但字串 match 容易出問題：
   ```typescript
   // ❌ 現在的方式
   const rt = (pr.request_type || '').toLowerCase()
   return !rt.includes('bonus') && !rt.includes('獎金')
   
   // ✓ 應該這樣
   const BONUS_TYPES = ['bonus', 'award', '獎金']
   return !BONUS_TYPES.includes(pr.request_type?.toLowerCase())
   ```

5. **「確認金額 vs 待確認」計算邏輯不清** — 需要商業規則會議確認：
   - 已確認金額 = status='1'？還是 confirmed_at IS NOT NULL？
   - 待確認金額如何定義？（total - confirmed？）

---

## 2. 訂單 Tab (Orders)

### 業務目的推斷

**這個 Tab 存在的理由**：一團有很多訂單、需要集中管理。業務快速收款、財務快速請款。

**誰來看**：
- 業務（看訂單進度、快速收款）
- 財務（看付款狀態、打進主表）
- 團務（看訂單人數、團員異動）

**怎麼用**：
1. `/tours/[code]?tab=orders` 進入
2. 看該團所有訂單（可能 5-10 筆）
3. 快速動作：收款、請款、發票、編輯、簽證
4. 新增訂單（業務)

### 完成度 %

| 層次 | 完成度 | 說明 |
|-----|--------|------|
| **UI** | 90% | 表格 + 快速動作按鈕完整、新增對話框有；缺少「無訂單」狀態提示 |
| **讀** | 100% | `useOrdersListSlim()` 取該團訂單，再 filter `tour_id = tour.id` |
| **寫** | 60% | 新增訂單有實裝、但新訂單初值全是 0 或 null（缺中軟引導） |
| **邏輯** | 50% | 過濾、新增有；缺少「訂單狀態推移」邏輯（draft → confirmed → paid） |

### DB 表依賴

**讀**：
- `orders` (via `useOrdersListSlim`)
  - 篩選：`tour_id = tour.id`
  - 用欄位：`id`, `order_number`, `code`, `contact_person`, `payment_status`, `total_amount`, `paid_amount`, `remaining_amount`, `member_count`

**寫**：
- `orders` (INSERT)
  - 寫欄位：
    ```typescript
    {
      code: `${tour.code}-O${nextOrderNumber}`,
      order_number: `${tour.code}-O${nextOrderNumber}`,
      tour_id: tour.id,
      tour_name: tour.name,
      contact_person: orderData.contact_person,
      sales_person: orderData.sales_person,
      assistant: orderData.assistant,
      member_count: 0,        // ← 初始 0，待新增成員時重算
      total_amount: 0,        // ← 初始 0，待新增報價時填
      paid_amount: 0,         // ← 初始 0，待收款時更新
      payment_status: 'unpaid',
      remaining_amount: 0,    // ← 初始 0，待 total_amount 和 paid_amount 確定
      status: 'pending',
      customer_id: null,
    }
    ```

- `order_members` (間接、透過 AddMemberDialog)
  - 當在團員 Tab 新增成員時，會 INSERT order_members
  - 同時呼叫 `recalculateParticipants(tour_id)` 更新 `tours.current_participants`

### 核心 Hooks / Services

```typescript
// 讀取
useOrdersListSlim()           // 該團訂單列表

// 寫入
createOrder()                 // 新增訂單（來自 @/data）
recalculateParticipants()     // 重算團人數（來自 tour-stats.service.ts）

// UI 狀態管理
useState(addDialogOpen)       // 新增對話框狀態
useAuthStore(workspace_id)    // 當前工作區

// 反饋
useToast()                    // toast 通知
```

### SSOT 有沒有斷

**斷點 1：payment_status 欄位的取值** ⚠️
```typescript
// 寫入時
payment_status: 'unpaid',

// 但 OrderOverview 裡這樣用
order.payment_status === 'paid' ? '已付' : 
order.payment_status === 'partial' ? '部分已付' : '未付'
```

**問題**：
- 新增訂單時硬編 `'unpaid'`
- 但讀取時卻要判 `'paid'` 和 `'partial'`
- payment_status 的取值範圍沒定義，無 enum constraint
- 誰負責把 `'unpaid'` → `'paid'` / `'partial'`？（應該是收款流程）

**斷點 2：total_amount 初始值為 0** ⚠️
```typescript
total_amount: 0,        // 新增訂單時
remaining_amount: 0,    // remaining = total - paid，邏輯上應該是 0
```

**問題**：
- 新訂單 `total_amount=0`，這不合理
- 應該在「選報價」或「手動輸入」時填 `total_amount`
- 現在流程不清楚

**斷點 3：member_count 重複計算** ⚠️
- `orders.member_count` 是冗餘欄位
- 該圖表依賴 `recalculateParticipants()` 來同步
- 但 `TourOrders` 沒顯示 member_count，只顯示在 OrderMembersExpandable

### 對照 8 條原則

| # | 原則 | 命中狀況 | 一句評價 |
|----|------|--------|---------|
| 1 | 權限長在人身上 | 🟡 部分 | `useAuthStore` 拿 workspace_id；但沒檢查「該用戶能不能新增訂單」 |
| 2 | 職務是身份卡 | ⚠️ 缺 | sales_person / assistant 讓業務選；但沒驗證「業務該職務」 |
| 3 | 租戶一致性每層都守 | ✓ 符合 | 新增時帶 workspace_id（via createOrder）；篩選 tour_id（租戶內隔離） |
| 4 | **狀態是 SSOT、數字從狀態算** | 🔴 **違反** | `payment_status` 無狀態機制、`member_count` / `total_amount` 初值 0 不合理 |
| 5 | 核心業務事件走一張真相表 | 🔴 **違反** | 新增訂單只寫 orders；該從「訂單報價決策」或「收款計畫」推導 |
| 6 | 聚合層 vs 明細層分離 | ✓ 符合 | TourOrders 聚合層、OrderListView 明細層、AddOrderForm 輔助層 |
| 7 | 資源類型獨立生命週期 | ⚠️ 不符 | 訂單生命週期和「報價」「收款」「請款」是一體的，但沒在新增時確認 |
| 8 | 快速入口 ≠ 獨立資料 | ✓ 符合 | 收款/請款/發票 dialog 呼叫各自服務、不存本地 |

### 紅旗（上線前一定要處理）

1. **新增訂單時沒有「選報價」流程** — total_amount 初值 0，業務怎麼知道該團該訂多少錢？需要：
   - 先選團的某個報價版本
   - 自動填 total_amount（或讓業務手動輸）
   - 算出 remaining_amount

2. **payment_status 無狀態機制** — 應該：
   - 定義狀態 enum：`unpaid | partial | paid`
   - 在 orders 表加 CHECK constraint
   - 新增訂單走狀態機（draft → unpaid → partial → paid）

3. **訂單號流水問題** — 現在是 `tour.code-O01, O02, ...`，但：
   - 如果一團有 99 個訂單怎辦？（很少見但可能）
   - 如果訂單被刪了，序號會斷嗎？
   - 建議改用 auto-increment 或 UUID

4. **新增後沒有「引導新增成員」** — 訂單剛建好，業務還要再進成員 Tab 才能加人。應該：
   - 新增訂單成功後，直接打開「新增成員」dialog
   - 或顯示一個 toast：「訂單已建立，請 → [新增成員] →」

5. **缺少「訂單狀態」流轉UI** — 沒看到訂單的 status 欄位顯示（只有 payment_status）。需要區分：
   - status：draft / confirmed / closed
   - payment_status：unpaid / partial / paid

---

## 3. 團員 Tab (Members)

### 業務目的推斷

**這個 Tab 存在的理由**：「大主管才看到」的跨訂單團員聚合。一團有 5 個訂單，分別 10/15/8/12/5 人，團員 Tab 把 50 個人一起列，用來：
- 核對人數
- 分房分車
- 上傳護照、簽證相關
- PNR 配對機票
- 發票/合約批次簽

**誰來看**：
- 大主管（全團概覽）
- 團務（協調分房分車）
- 行政（護照上傳、簽證追蹤）

**怎麼用**：
1. `/tours/[code]?tab=members` 進入
2. 一次看全團所有成員
3. 快速動作：分房、分車、PNR 配對、編輯、設領隊、護照上傳、導出
4. 按訂單 filter 或整團編輯

### 完成度 %

| 層次 | 完成度 | 說明 |
|-----|--------|------|
| **UI** | 85% | 表格 + 欄位選擇 + 拖曳排序完整；缺「訂單區隔視覺」、缺「無成員」狀態 |
| **讀** | 100% | `useOrderMembersData` 取 mode='tour' 下所有訂單的所有成員，加上分房、分車資料 |
| **寫** | 80% | 編輯、拖曳排序、新增成員、刪除有；自訂費用、附加費用有 |
| **邏輯** | 75% | 分房、分車、PNR 配對有；缺「權限邊界」、缺「tour_members vs order_members」明確性 |

### DB 表依賴

**讀**：
- `order_members` (via `useOrderMembersData`)
  - 篩選：`order_id IN (SELECT id FROM orders WHERE tour_id = tourId)`
  - 用欄位：*（所有欄位，~25）
  - 特殊：`custom_costs`（JSON）、`pnr`、`ticket_number`

- `tour_hotel_assignments`（若該團有飯店）
  - 讀取分房資訊

- `tour_vehicle_assignments`（若該團有交通）
  - 讀取分車資訊

- `customers`（若成員有 customer_id）
  - 用於顧客配對、批次同步

**寫**：
- `order_members` (UPDATE)
  - 編輯任何欄位、拖曳排序 (sort_order)、設領隊 (identity)
  - `custom_costs`、`total_payable`、`ticketing_deadline`

- `tour_hotel_assignments` (INSERT / UPDATE / DELETE)
  - 分房時新增/刪除房間、重新分配成員

- `tour_vehicle_assignments` (INSERT / UPDATE / DELETE)
  - 分車同理

- `customers` (INSERT / UPDATE)
  - 關閉編輯模式時「自動存為顧客」

### 核心 Hooks / Services

```typescript
// 資料層
useOrderMembersData({ mode: 'tour' })     // 該團所有訂單成員
useRoomVehicleAssignments()                // 分房分車狀態
useCustomerMatch()                         // 顧客配對
useMemberExport()                          // 導出/列印
useMemberEditDialog()                      // 編輯對話框
usePassportUpload()                        // 護照 OCR 上傳
useOcrRecognition()                        // OCR 辨識
useCustomers()                             // 顧客主檔
useTour()                                  // 團資料（用於列印）

// 寫入服務
updateMembersTicketingDeadline()           // 同 PNR 的開票期限
updateMember()                             // 更新單筆成員
createCustomer()                           // 建立新顧客

// UI 狀態
useState(columnVisibility)                 // 欄位顯示設定
useState(isAllEditMode)                    // 全部編輯模式
useState(showPnrMatchDialog)               // PNR 配對對話框
```

### SSOT 有沒有斷

**斷點 1：tour_members 表存在但未使用** 🔴
```typescript
// DB 有 tour_members 表（見 database.types.ts 17386）
// 但 OrderMembersExpandable 只用 order_members

// 業務邏輯：
// - mode='tour'：應該讀 tour_members（大主管聚合視圖）
// - mode='order'：應該讀 order_members（訂單管理）
```

**問題**：
- `tour_members` 表的定義不清：是 order_members 的冗餘副本嗎？還是獨立資源？
- 代碼只用 order_members，tour_members 是死表
- 如果大主管該看 tour_members，權限設定（RLS）應該在 tour_members 層面

**斷點 2：權限邊界不清** 🔴
```typescript
// 代碼沒有權限檢查
// 只有 mode 區分（'tour' vs 'order'）
// 但誰能進 mode='tour'？沒檢查

// 應該有：
// const { canReadTourMembers } = usePermissions()
// if (!canReadTourMembers(tourId)) return <AccessDenied />
```

**問題**：
- William 說「大主管才看到」，但代碼沒實裝
- 如果一般業務也能進，就會看到「跨訂單聚合」資料（應該隱藏）

**斷點 3：custom_costs 和 surcharges 同時存在** 🟡
```typescript
// 自訂費用存在 tours.custom_cost_fields 定義欄位
const { data: tourData } = await supabase
  .from('tours')
  .select('custom_cost_fields')  // ← JSON 陣列

// 成員的值存在 order_members.custom_costs (JSON key-value)
const { data: membersWithCosts } = await supabase
  .from('order_members')
  .select('id, custom_costs')

// 但也有 surcharges 相關欄位（single_room_surcharge, visa_fee, add_on_items）
const handleSurchargeChange = async (memberId: string, surcharges: MemberSurcharges) => {
  // 存到 custom_costs 底下
  const updatedCosts = { ...currentCosts, surcharges: surcharges }
}
```

**問題**：
- `custom_costs` 和 `surcharges` 混在一起
- `surcharges` 應該是獨立表還是 custom_costs 的子欄位？

**斷點 4：order_members vs tour_members 聚合邏輯** 🔴
```typescript
// 讀取：mode='tour' 時
const membersData = useOrderMembersData({ orderId, tourId, workspaceId, mode })

// 內部實裝不清楚，推測：
// if (mode === 'tour') {
//   order_ids = SELECT id FROM orders WHERE tour_id = tourId
//   members = SELECT * FROM order_members WHERE order_id IN (...)
// }
```

**問題**：
- 如果大主管要看「整團聚合後的成員列表」，應該有一個 `useTourMembers()` hook
- 而不是在元件層面做 `order_ids` + loop 過濾
- 聚合邏輯應該在 service 或 hook，不在元件

### 對照 8 條原則

| # | 原則 | 命中狀況 | 一句評價 |
|----|------|--------|---------|
| 1 | **權限長在人身上** | 🔴 **違反** | 沒有檢查「該用戶能看 tour_members 嗎」；只靠 mode 參數區分 |
| 2 | 職務是身份卡 | ⚠️ 缺 | 沒驗證「該用戶職務能進 mode='tour'」 |
| 3 | 租戶一致性每層都守 | ✓ 符合 | 所有查詢都加 workspace_id filter |
| 4 | **狀態是 SSOT、數字從狀態算** | 🟡 部分 | identity 狀態清楚（大人/小孩/領隊）；但 custom_costs / surcharges 結構混亂 |
| 5 | 核心業務事件走一張真相表 | 🔴 **違反** | order_members 和 tour_members 是分開的；「成員加入團」的真相在哪？ |
| 6 | **聚合層 vs 明細層分離** | 🔴 **違反** | mode='tour' 時是聚合層、但聚合邏輯在元件內；應該提出去變 hook（useTourMembers） |
| 7 | 資源類型獨立生命週期 | 🟡 部分 | order_members 有獨立生命週期；但 tour_members 定位不清 |
| 8 | 快速入口 ≠ 獨立資料 | ✓ 符合 | 分房、分車、PNR 配對都呼叫專用服務 |

### 紅旗（上線前一定要處理）

1. **tour_members 表是什麼？** — 必須定義：
   - 是 order_members 的聚合快照嗎？（誰負責更新？）
   - 還是獨立的成員主檔？（order_members 底下應該是 tour_members）
   - 現在死表，建議 drop 掉或改名 `order_members_view`

2. **權限邊界必須實裝** — 必須有：
   ```typescript
   if (mode === 'tour') {
     const { canReadTourMembers } = usePermissions()
     if (!canReadTourMembers(tourId)) return <AccessDenied />
   }
   ```

3. **聚合邏輯應該抽出 hook** — 代碼太複雜：
   ```typescript
   // 應該有
   const useTourMembers = (tourId, workspaceId) => {
     // 聚合所有訂單成員、加上分房分車、加上 PNR
     // 回傳 { members, loading, error }
   }
   ```

4. **custom_costs / surcharges 分家** — 定義清楚：
   - surcharges 是獨立表 `member_surcharges`？
   - 還是 custom_costs 的一個鍵？
   - 寫到 custom_costs.surcharges 不合理

5. **領隊排序邏輯脆弱** — 設領隊時把 sort_order 改 0，但：
   - 如果有多個 sort_order=0，怎辦？
   - 應該有 DB-level 約束（至多一個領隊）
   - 或在 order_members 加 `is_leader BOOLEAN`

6. **護照 OCR + 衝突解決** — PassportUploadZone 邏輯複雜，缺少：
   - 護照圖片質量驗證（OCR 失敗時的 fallback）
   - 護照過期偵測（expiry_date 過期不能上傳）
   - 上傳進度提示（現在只有「上傳中」，沒百分比）

---

## 交叉對比（三個 Tab 之間）

### 資料流向圖

```
overview tab                orders tab              members tab
    ↓                           ↓                       ↓
receipts ←───────────────────────────────────────→ order_members
   ↓                                                    ↓
(status='1'?)                                   (tour_members? ← 死表)
   ↓                                                    ↓
confirmed_income                               member_count (重複)
```

### 重複和同步問題

1. **member_count**：
   - `tours.current_participants`（由 recalculateParticipants 維護）
   - `orders.member_count`（由 recalculateParticipants 維護）
   - `TourOverview` 算 memberCount（動態）
   - 三個地方，哪個是真？

2. **payment_status**：
   - orders 表有此欄
   - 但新增時硬編 'unpaid'
   - 誰負責更新成 'partial' / 'paid'？

3. **total_amount**：
   - orders.total_amount（初值 0，待入帳）
   - receipts.total_amount（來自收款記錄）
   - 兩個欄位，哪個先填？

### 建議重構方向

**短期（v1.0 上線前）**：
1. 定義 `receipts.status` enum（改用 migration）
2. 定義 `orders.payment_status` enum（改用 CHECK constraint）
3. 把 tour_members 表移除（或標記為 deprecated）
4. 在 mode='tour' 進入點加權限檢查

**中期（v1.1-v1.2）**：
1. 抽出 `useTourMembers()` hook，聚合邏輯從元件移入
2. 定義「團財務真相表」`tour_finance_summary`（union orders、receipts、payment_requests）
3. 把 total_amount / paid_amount / remaining_amount 改用 computed column 或 view
4. 整理 custom_costs / surcharges，改用獨立表

**長期（v2.0+）**：
1. 引入事件溯源（orders / receipts 都是不可變的 append-only）
2. 讀模型層的聚合改用 materialized view（自動同步）
3. 權限模型改用 attribute-based (ABAC)

---

## 小結

| Tab | 業務完成度 | 代碼完成度 | SSOT 斷點 | 最大紅旗 |
|-----|-----------|-----------|---------|---------|
| **Overview** | 90% | 70% | 3 個 | 「待確認金額」無定義 |
| **Orders** | 80% | 60% | 3 個 | payment_status 無狀態機制、total_amount 初值 0 |
| **Members** | 85% | 75% | 4 個 | **tour_members 死表 + 權限邊界不清** |

**最優先 fix 順序**：
1. Members：加權限檢查（原則 1）→ 保護大主管資料
2. Overview：定義「待確認金額」狀態 → 原則 4 主消費者
3. Orders：payment_status enum + new order flow → 狀態機
4. 跨 Tab：移除 tour_members 或明確其用途

---

**報告產出時間**：2026-04-22 23:00 UTC+8  
**維護責任**：William Chen (Venturo CTO)  
**相關檔案**：
- `/tours/components/tour-overview.tsx`
- `/tours/components/tour-orders.tsx`
- `/orders/components/OrderMembersExpandable.tsx`
- `/data/entities/{receipts,payment-requests,members}.ts`

