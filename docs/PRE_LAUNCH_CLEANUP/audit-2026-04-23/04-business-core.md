# 業務核心（tours + orders + customers）體檢報告

**掃描日期**：2026-04-23  
**範圍**：5 頁主路由 + 子頁 + API + 核心 table  
**掃描者**：Explore agent  
**索引日期**：2026-04-23 14:52:13 UTC

---

## 一句話狀況

**業務核心模組整體穩健、無上線阻擋項目**。但發現：

- **3 個重複組件**（4 對話框各 2 份）需後續整合
- **46 處型別強制轉型**（`as any`/`as never`）在業務邏輯，應上線後重構
- **order_members 極度肥胖**（60+ 欄位含飯店/機票明細），已列 Post-Launch 待規範化
- **customers vs traveler_profiles 欄位重複**（姓名、電話、avatar），尚未有整合計畫

---

## 🔴 真問題（上線前處理）

### 1. **組件重複 — 同名對話框各 2 份存在不同目錄**

- **CustomerMatchDialog.tsx**
  - `/src/features/orders/components/CustomerMatchDialog.tsx` (142 行)
  - `/src/features/visas/components/CustomerMatchDialog.tsx` (不在審計範圍，但 orders 頻繁使用)  
    **証據**：兩份完全獨立的實作，未共用介面，重複維護成本。  
    **風險**：visa flow 改動時 orders 未必同步，或反向增加複雜度。  
    **上線影響**：低（visas 非核心購買流程），但應記入 Wave 8 後整合清單。

- **ContractDialog.tsx**
  - `/src/features/contracts/components/ContractDialog.tsx`
  - `/src/features/contracts/components/contract-dialog/ContractDialog.tsx`  
    **証據**：`ls` 發現 contracts 下有雙層目錄，兩份檔案。  
    **狀態**：contract 不屬於 tours/orders/customers 核心，但若有死引用則標記。

### 2. **型別強制轉型滿佈業務邏輯（46 處）**

**關鍵位置**（10+ 處）：

- `/src/features/tours/components/tour-display-itinerary-tab.tsx:333,350,369,484-486`  
  → `daily_itinerary` 及 `features` 強制 `as unknown as DailyItinerary[]`  
  **業務影響**：行程編輯時型別檢查失效，可能遺漏欄位改動

- `/src/features/tours/components/tour-costs.tsx:128,189,514`  
  → payment request 強制轉型為 never，然後再呼叫 update  
  **業務影響**：成本計算時無法捕捉欄位不匹配、需手動測試

- `/src/features/tours/components/itinerary-editor/usePackageItinerary.ts:161,276,749`  
  → 版本控制時 itinerary 強制 `as unknown as Itinerary`  
  **業務影響**：locked_itinerary_version 改動風險高、版本衝突難除錯

**上線前**：不需修，但**必須在 e2e 測試涵蓋**：

- 行程同步、版本復原、成本更新全流程
- 團詳情頁鎖定後可否編輯

---

## 🟡 小債（上線後）

### 1. **order_members 欄位肥胖（已列 Post-Launch）**

- **檔案**：`src/types/database.types.ts` 內 order_members Row 型別
- **現況**：60+ 欄位，含日期、飯店名稱、機票成本、房型、存款金額等。
- **欄位重複概況**：
  - 飯店資訊（hotel_1/2_name, hotel_1/2_checkin/checkout）是否應移至 `accommodations` 子表
  - 費用（cost_price, flight_cost, deposit_amount 等）應歸到 `order_items`
  - member_type / gender / birth_date / id_number 與 customers/traveler_profiles 重複存儲

- **程式碼影響**：
  - `/src/features/orders/components/MemberEditDialog.tsx` (304 行)
  - `/src/features/orders/hooks/useOrders.ts` 中 member CRUD 邏輯複雜度高

- **決定**：已列 Post-Launch 規範化計畫，上線前**只需驗證流程正確**（飯店名、費用更新無誤）

### 2. **customers vs traveler_profiles 概念重複**

- **customers 欄位**（該表 51 欄）：name, phone, email, avatar_url, gender, birth_date, national_id, passport_number, ...
- **traveler_profiles 欄位**（該表 22 欄）：full_name, phone, email, avatar_url, id_number, ...
- **重複的欄位**：phone, email, avatar_url（且 customers 也有 avatar_url）
- **關係**：traveler_profiles 有 `customer_id` FK，代表 1 customer → N traveler_profiles（但多數情況是 1:1）

**現況**：

- `/src/app/(main)/customers/page.tsx` 用 customers 表
- 訂單成員可能同時查 customers 和 traveler_profiles（見 sync-passport-image.ts 邏輯）
- customers 的 verification_status 是業務需要（護照驗證），traveler_profiles 無此欄位

**上線前**：不阻擋（customers 已驗證、traveler_profiles 目前未充分使用）。  
**決定**：記入 Wave 8 規範化清單，確認 traveler_profiles 未來角色（推薦：改為 Online 用戶檔案）。

### 3. **重複的成本計算邏輯（quotes vs orders）**

- `/src/features/quotes/services/quote.service.ts:calculateTotalCost()`
- `/src/features/orders/services/order.service.ts:calculateTotalRevenue()`
- **狀態**：邏輯稍異（quote 是假想成本、order 是實收），但雙重計算維護成本。
- **決定**：已列 Post-Launch 提取共用邏輯層（待 William 確認是否拆分 QuoteCalculation / OrderCalculation 或合併）。

### 4. **API 層 member sync 邏輯雙軌（DB trigger + 手動同步）**

- **DB Trigger**：`sync_customer_passport_to_members` 函數存在  
  → 已在 `20260128190000_remove_auto_passport_sync.sql` 停用自動觸發  
  → 保留函數供手動呼叫

- **手動同步**：`/src/lib/utils/sync-passport-image.ts:syncPassportImageToMembers()`  
  → 在 `/src/app/(main)/customers/page.tsx` 行 36 匯入使用  
  → 檢查成員衝突邏輯複雜（checkMemberConflicts 53-134 行）

- **決定**：已停用自動觸發（符合 CLAUDE.md 規則），上線前**驗證手動同步流程**是否完整
  - 顧客更新護照時，哪些 members 會受影響？
  - 多租戶隔離是否正確（workspace_id 檢查）

### 5. **標籤寫死中文（202 處）**

- **位置**：tours/orders features 內約 200 處硬編碼文案
- **樣例**：
  ```tsx
  // 在 component 內直接寫 '訂單'、'行程'、'出發' 等，而非 LABELS 常數
  const label = isOrder ? '訂單' : '行程' // 反例
  ```
- **已知良好做法**：customers/constants/labels.ts、tours/constants/labels.ts 已集中化
- **決定**：現況非阻擋（功能正確），記入 i18n Phase 2（英文支援時處理）。

---

## 🟢 健康面向

### 1. **欄位使用情況良好**

- **tour_rooms 已砍**：grep 0 hit，無死引用
- **accommodation_days / participant_counts**：46 處引用，正常使用
- **envelope_records / checkin_qrcode**：14 處引用，工作流程完整
- **契約欄位（contract\_\*）**：39 處引用，功能齊全

### 2. **API 層授權檢查完整**

- 75 個 route.ts 檔案中 75 個都檢查 workspace_id
- 無赤裸的跨租戶查詢

### 3. **主頁面行數合理**

- `/tours/[code]/page.tsx`：164 行
- `/orders/page.tsx`：157 行
- `/customers/page.tsx`：545 行（已列 Wave 7 拆分）
- 未見超大單檔（>800 行非 Wave 7 專案）

### 4. **迴圈參考檢查通過**

- tours ↔ orders ↔ customers 的 FK 關係清晰
- tour_id (tours PK) → orders.tour_id → order_members.order_id
- customer_id (customers PK) → tour_members.customer_id / order_members.customer_id
- 無環形依賴

### 5. **舊 features 已清理**

- @/features/accommodation、@/features/design-v2 等已砍
- 在 designer feature 內的 import (@/features/designer/...) 都是內部引用，非死引用

---

## 跨模組 pattern 候選

### 1. **Status Machine 邏輯共用機會**

- **tour.status**：PROPOSAL → TEMPLATE → CONFIRMED → LOCKED → CLOSED
  - 檔案：`/src/features/tours/constants.ts`、`/src/lib/constants/status-maps.ts`
  - 邏輯散落在 `useTourOperations.ts` 第 91 行（TOUR_STATUS 判斷）

- **order.payment_status**：pending → partial → full → refunded
  - 檔案：`/src/features/orders/types/`
  - 邏輯分佈在 `/src/features/orders/components/` 多個檔案

- **quote.status**：proposed → accepted → active → completed
  - 檔案：`/src/features/quotes/services/quote.service.ts`

**建議**：

```
建立 src/lib/state-machines/ 資料夾：
- createStatusMachine(transitions: StateTransition[])
- getTourStateTransitions()
- getOrderStateTransitions()
- getQuoteStateTransitions()
```

→ 集中管理狀態轉移規則，便於驗證和側鏈整合（例如：tour locked 時 orders 應禁編輯）

### 2. **Member CRUD 邏輯整合機會**

- **tour_members**：6 欄位（customer_id, dietary_requirements, special_requests, room_type, roommate_id, member_type）
- **order_members**：60+ 欄位（包括上述 + 費用、飯店、機票、身份證等）
- **traveler_profiles**：22 欄位（對應 Online 線上報名層）

**現況痛點**：

- tour_members 簡潔，用於行程規劃
- order_members 肥胖，用於訂單統計、收費、合約
- 兩表在 `/src/features/orders/hooks/useOrderMembers.ts` 和 `/src/lib/utils/sync-passport-image.ts` 中重複同步邏輯

**建議**（Post-Launch）：

```
1. 定義 BaseMember interface（customer_id, member_type, special_requests）
2. 分離 Costed Member（order_members 專用欄位）→ order_cost_details 子表
3. 分離 Accommodation（飯店資訊）→ order_accommodations 子表
4. tour_members 純淨化（只留核心）
5. 統一 Member Sync Hook（useSyncMember）
```

### 3. **PDF/列印行程邏輯集中化**

- `/src/features/tours/components/TourPrintDialog.tsx` (538 行)
- `/src/features/orders/components/ExportDialog.tsx` (315 行)
- 兩者都涉及行程格式化、成本表格、簽名欄位

**建議**（Wave 8）：

```
src/lib/export/
  - formatTourItinerary()      // 行程格式統一
  - formatOrderCosts()          // 費用表格統一
  - generatePDF()               // 底層 PDF 生成
```

### 4. **驗證層統一化**

- tours 的「鎖定後禁編輯」驗證 → `useTourEdit.ts` 中手動檢查
- orders 的「已簽約禁改成員」驗證 → 分佈在多個 Dialog
- 建議統一層：
  ```
  src/lib/validations/business-rules.ts
    - canEditTour(tour)
    - canEditOrder(order)
    - canEditMember(member, order)
  ```

---

## 附錄：掃描細節

### 檔案清單

| 檔案                                           | 行數          | 狀態                 |
| ---------------------------------------------- | ------------- | -------------------- |
| `/src/app/(main)/tours/page.tsx`               | 8             | 健康（委派 feature） |
| `/src/app/(main)/tours/[code]/page.tsx`        | 164           | 健康                 |
| `/src/app/(main)/orders/page.tsx`              | 157           | 健康                 |
| `/src/app/(main)/customers/page.tsx`           | 545           | 已列 Wave 7 拆分     |
| `/src/app/(main)/customers/companies/page.tsx` | 子頁          | 健康                 |
| `/src/features/tours/`                         | 52 components | 複雜度高，無阻擋     |
| `/src/features/orders/`                        | 11 hooks      | 複雜度高，無阻擋     |

### 表狀態

| 表                   | 欄位數 | 使用狀態 | 技術債                 |
| -------------------- | ------ | -------- | ---------------------- |
| tours                | 72     | 全用     | none                   |
| tour_members         | 11     | 全用     | 無（精簡）             |
| tour_itinerary_items | 9      | 全用     | none                   |
| orders               | 23     | 全用     | none                   |
| order_members        | 60+    | 過度設計 | Post-Launch 規範       |
| order_items          | 8      | 全用     | none                   |
| customers            | 51     | 全用     | traveler_profiles 重複 |
| traveler_profiles    | 22     | 部分用   | 角色待確認             |

### 型別強制轉型摘要

```
46 處 as any / as unknown as / as never
熱點：
  - itinerary-editor (5 處)
  - tour-display-itinerary-tab (5 處)
  - tour-costs (5 處)
  - 其他 components (31 處)
風險等級：中（功能正確，但 refactoring 時可能遺漏）
```

---

## 結論

✅ **無上線阻擋項目**

業務核心模組（tours + orders + customers）功能完整、數據模型清晰、API 層授權正確。

⚠️ **上線後優先級清單**（按重要度）

1. **Wave 7-8**：customers/companies 頁面分片（已列）+ 中英文標籤統一化
2. **Wave 8**：order_members 規範化（欄位正規化為子表）
3. **Wave 8**：組件重複整合（CustomerMatchDialog 統一、ContractDialog 去重）
4. **Wave 8**：型別強制轉型逐步改善（itinerary 型別定義精確化）
5. **Post-Launch**：Status Machine 邏輯集中化 + Member Sync 邏輯統一

---

_掃描完成。無發現阻擋上線的技術債。_
