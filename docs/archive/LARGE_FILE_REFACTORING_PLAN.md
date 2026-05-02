# 超大檔案重構計劃

**分析日期**: 2025-11-19
**超過 500 行的檔案**: 24 個

---

## 📊 檔案分類

### 🔴 極度超大 (>900 行) - 4 個檔案

| 檔案                                      | 行數 | 類型        | 優先級    |
| ----------------------------------------- | ---- | ----------- | --------- |
| `lib/supabase/types.ts`                   | 4993 | 自動生成    | ⏸️ 不處理 |
| `features/quotes/PrintableQuotation.tsx`  | 973  | UI 組件     | 🔴 高     |
| `features/quotes/PrintableQuickQuote.tsx` | 922  | UI 組件     | 🔴 高     |
| `lib/db/schemas.ts`                       | 778  | Schema 定義 | ⏸️ 不處理 |

### 🟡 非常大 (700-900 行) - 6 個檔案

| 檔案                                           | 行數 | 類型     | 優先級    |
| ---------------------------------------------- | ---- | -------- | --------- |
| `components/orders/OrderMembersExpandable.tsx` | 770  | UI 組件  | 🟡 中     |
| `stores/types.ts`                              | 760  | 型別定義 | ⏸️ 不處理 |
| `components/layout/sidebar.tsx`                | 746  | UI 組件  | 🟡 中     |
| `features/quotes/SellingPriceSection.tsx`      | 701  | UI 組件  | 🟡 中     |
| `features/quotes/QuickQuoteDetail.tsx`         | 688  | UI 組件  | 🟡 中     |
| `components/tours/tour-members.tsx`            | 674  | UI 組件  | 🟡 中     |

### 🟢 大型 (500-700 行) - 14 個檔案

| 檔案                                          | 行數 | 類型    | 優先級 |
| --------------------------------------------- | ---- | ------- | ------ |
| `stores/auth-store.ts`                        | 671  | Store   | 🟢 低  |
| `app/itinerary/new/page.tsx`                  | 620  | 頁面    | 🟢 低  |
| `app/todos/page.tsx`                          | 615  | 頁面    | 🟢 低  |
| `confirmations/.../PrintableConfirmation.tsx` | 600  | UI 組件 | 🟢 低  |
| `dashboard/components/flight-widget.tsx`      | 598  | UI 組件 | 🟢 低  |
| `todos/quick-actions/quick-disbursement.tsx`  | 590  | UI 組件 | 🟢 低  |
| `app/customers/page.tsx`                      | 543  | 頁面    | 🟢 低  |
| `esims/components/EsimCreateDialog.tsx`       | 534  | UI 組件 | 🟢 低  |
| `tours/tour-members-advanced.tsx`             | 531  | UI 組件 | 🟢 低  |
| `workspace/.../ChannelSidebar.tsx`            | 524  | UI 組件 | 🟢 低  |
| `features/tours/ToursPage.tsx`                | 516  | UI 組件 | 🟢 低  |
| `app/itinerary/[slug]/page.tsx`               | 516  | 頁面    | 🟢 低  |
| `stores/timebox-store.ts`                     | 515  | Store   | 🟢 低  |
| `app/accounting/page.tsx`                     | 514  | 頁面    | 🟢 低  |

---

## 🎯 重構策略

### ⏸️ 不需處理 (3 個)

**原因**: 自動生成或型別定義檔案

1. `lib/supabase/types.ts` (4993 行)
   - **類型**: Supabase CLI 自動生成
   - **處理**: 不修改，由 `supabase gen types` 管理

2. `lib/db/schemas.ts` (778 行)
   - **類型**: IndexedDB Schema 定義
   - **處理**: 保持集中管理，便於維護

3. `stores/types.ts` (760 行)
   - **類型**: 型別定義集合
   - **處理**: 已按模組分組，結構清晰

---

## 🔴 高優先級重構 (2 個)

### 1. PrintableQuotation.tsx (973 行)

**問題**:

- 單一組件包含完整報價單的所有區塊
- 重複的樣式定義
- 難以維護和測試

**重構方案**:

```
PrintableQuotation.tsx (主組件，100 行)
├── components/
│   ├── QuotationHeader.tsx (50 行)
│   ├── QuotationCustomerInfo.tsx (80 行)
│   ├── QuotationItinerary.tsx (150 行)
│   ├── QuotationPricing.tsx (120 行)
│   ├── QuotationInclusions.tsx (100 行)
│   ├── QuotationExclusions.tsx (80 行)
│   ├── QuotationTerms.tsx (100 行)
│   └── QuotationFooter.tsx (50 行)
├── styles/
│   └── quotation-styles.ts (80 行)
└── utils/
    └── quotation-helpers.ts (50 行)
```

**預期結果**: 973 → ~960 行（分散到 11 個檔案）

---

### 2. PrintableQuickQuote.tsx (922 行)

**問題**:

- 與 PrintableQuotation 類似結構
- 可共用部分組件

**重構方案**:

```
PrintableQuickQuote.tsx (主組件，100 行)
├── components/ (共用 QuotationHeader, QuotationFooter)
│   ├── QuickQuoteHeader.tsx (60 行)
│   ├── QuickQuoteSummary.tsx (100 行)
│   ├── QuickQuoteItems.tsx (150 行)
│   ├── QuickQuotePricing.tsx (100 行)
│   └── QuickQuoteTerms.tsx (80 行)
└── styles/
    └── quick-quote-styles.ts (60 行)
```

**預期結果**: 922 → ~650 行（分散到 7 個檔案）

---

## 🟡 中優先級重構 (6 個)

### 3. OrderMembersExpandable.tsx (770 行)

**重構方案**:

- 拆分為 `OrderMembersList.tsx` (主組件)
- 提取 `MemberEditDialog.tsx` (編輯對話框)
- 提取 `MemberRow.tsx` (單行組件)
- 提取 `MemberActions.tsx` (操作按鈕)

**預期結果**: 770 → ~600 行（分散到 4 個檔案）

---

### 4. sidebar.tsx (746 行)

**重構方案**:

- 拆分為 `Sidebar.tsx` (主組件)
- 提取 `SidebarMenu.tsx` (選單項目)
- 提取 `SidebarWorkspaceSelector.tsx` (工作區選擇器)
- 提取 `SidebarUserProfile.tsx` (使用者資訊)

**預期結果**: 746 → ~550 行（分散到 4 個檔案）

---

### 5. SellingPriceSection.tsx (701 行)

**重構方案**:

- 拆分為 `SellingPriceSection.tsx` (主組件)
- 提取 `PriceCalculator.tsx` (計算邏輯)
- 提取 `PriceBreakdown.tsx` (明細顯示)
- 提取 `PriceAdjustments.tsx` (調整項目)

**預期結果**: 701 → ~500 行（分散到 4 個檔案）

---

### 6. QuickQuoteDetail.tsx (688 行)

**重構方案**:

- 拆分為 `QuickQuoteDetail.tsx` (主組件)
- 提取 `QuoteItemsList.tsx` (項目列表)
- 提取 `QuoteItemForm.tsx` (新增/編輯表單)
- 提取 `QuoteSummary.tsx` (摘要區塊)

**預期結果**: 688 → ~480 行（分散到 4 個檔案）

---

### 7. tour-members.tsx (674 行)

**重構方案**:

- 拆分為 `TourMembers.tsx` (主組件)
- 提取 `MemberTable.tsx` (表格顯示)
- 提取 `MemberFilters.tsx` (篩選器)
- 提取 `MemberExport.tsx` (匯出功能)

**預期結果**: 674 → ~480 行（分散到 4 個檔案）

---

### 8. auth-store.ts (671 行)

**重構方案**:

- 拆分為 `auth-store.ts` (主 store)
- 提取 `auth-validators.ts` (驗證邏輯)
- 提取 `auth-helpers.ts` (輔助函數)
- 提取 `login-attempts.ts` (登入嘗試管理)

**預期結果**: 671 → ~450 行（分散到 4 個檔案）

---

## 🟢 低優先級 (14 個)

這些檔案雖然超過 500 行，但結構相對清晰，可暫緩處理：

- 頁面組件 (5個): 通常包含多個功能區塊，符合頁面複雜度
- UI 組件 (7個): 功能明確，暫時可接受
- Store (2個): 狀態管理邏輯集中，暫緩拆分

---

## 📈 重構效益評估

### 立即處理 (高優先級 2 個)

| 項目                | 原始行數 | 預期行數 | 檔案數 | 可維護性    |
| ------------------- | -------- | -------- | ------ | ----------- |
| PrintableQuotation  | 973      | 100      | 11     | ⬆️ 大幅提升 |
| PrintableQuickQuote | 922      | 100      | 7      | ⬆️ 大幅提升 |
| **總計**            | **1895** | **200**  | **18** | -           |

**效益**:

- ✅ 元件可重用性提升
- ✅ 測試更容易撰寫
- ✅ 樣式管理集中化
- ✅ 減少重複程式碼

### 中期處理 (中優先級 6 個)

| 項目             | 原始行數 | 預期行數 | 檔案數 | 可維護性 |
| ---------------- | -------- | -------- | ------ | -------- |
| 6 個中優先級檔案 | 4250     | ~2960    | 24     | ⬆️ 提升  |

**效益**:

- ✅ 降低單檔複雜度
- ✅ 提升程式碼可讀性
- ✅ 便於團隊協作

---

## 🗓️ 執行時程建議

### Week 1: 高優先級 (2 個檔案)

- Day 1-2: 重構 PrintableQuotation.tsx
- Day 3-4: 重構 PrintableQuickQuote.tsx
- Day 5: 測試和驗證

### Week 2: 中優先級 (6 個檔案)

- Day 1: OrderMembersExpandable.tsx
- Day 2: sidebar.tsx
- Day 3: SellingPriceSection.tsx
- Day 4: QuickQuoteDetail.tsx
- Day 5: tour-members.tsx + auth-store.ts

### Week 3+: 低優先級 (視需要)

- 根據實際開發需求決定是否處理

---

## ⚠️ 重構注意事項

1. **保持功能一致性**: 重構前後功能完全相同
2. **逐步進行**: 一次重構一個檔案，確保穩定性
3. **測試覆蓋**: 重構後立即測試
4. **版本控制**: 每個重構單獨 commit
5. **文檔更新**: 更新相關文檔和 import 路徑

---

**結論**:

- 總計 24 個超大檔案
- 3 個不需處理（自動生成/型別定義）
- 2 個高優先級（列印組件）
- 6 個中優先級（UI 組件和 Store）
- 14 個低優先級（暫緩處理）

建議優先處理 2 個高優先級檔案，預計可減少 ~1700 行主檔案程式碼，提升可維護性。
