# 系統全景圖（快速掃描版）

**更新時間**：2026-03-14 10:35  
**狀態**：快速掃描中

---

## 🎯 核心系統清單

### 1. 行程表系統
- 檔案：tour-itinerary-tab.tsx (1626行)
- 職責：**寫入點** - 唯一可以新增核心表資料
- 關鍵：syncToCore() - 寫入 tour_itinerary_items

### 2. 報價單系統  
- 檔案：quotes/[id]/page.tsx
- 職責：讀取核心表 → 填價格 → 寫回核心表
- 關鍵：
  - coreItemsToCostCategories() - 讀取
  - writePricingToCore() - 寫回

### 3. 需求單系統
- 檔案：CoreTableRequestDialog.tsx
- 職責：從核心表 JOIN 讀取 → 產生 PDF
- 關鍵：
  - useCoreRequestItems() - JOIN 讀取
  - 更新 request_status

### 4. 確認單系統
- 檔案：tour-confirmation-sheet.tsx (546行)
- 服務：confirmationCoreTableSync.ts (224行)
- 職責：確認價格 → 同步核心表
- 關鍵函數：
  - syncConfirmationCreateToCore() - 建立確認單 → 核心表
  - syncConfirmationUpdateToCore() - 更新確認單 → 核心表
  - syncLeaderExpenseToCore() - 領隊費用 → 核心表
  - batchSyncConfirmationToCore() - 批次同步

### 5. 結帳單系統
- 檔案：tour-closing-tab.tsx
- 職責：領隊回填實際費用
- 關鍵：actual_expense, receipt_images

### 6. 訂單系統
- 檔案：orders/
- 職責：團員管理、收款記錄
- 關聯：tour_id → tours

### 7. 收款/請款系統
- 檔案：payment-requests/
- 職責：代收轉付
- 關聯：tour_id, order_id

---

## 📊 資料流向全景

```
[寫入點]
行程表 (tour-itinerary-tab)
  ↓ syncToCore()
tour_itinerary_items
  ↓
[讀取點 1]
報價單 (quotes/[id])
  ↓ coreItemsToCostCategories()
  ↓ 填價格
  ↓ writePricingToCore()
tour_itinerary_items (unit_price, quote_status)
  ↓
[讀取點 2]  
需求單 (CoreTableRequestDialog)
  ↓ useCoreRequestItems() + JOIN
  ↓ 產生 PDF
tour_itinerary_items (request_status)
  ↓
[讀取點 3]
確認單 (tour-confirmation-sheet)
  ↓ syncConfirmationCreateToCore()
tour_itinerary_items (confirmed_cost, confirmation_status)
  ↓
[讀取點 4]
結帳單 (tour-closing-tab)
  ↓ syncLeaderExpenseToCore()
tour_itinerary_items (actual_expense, leader_status)
```

---

## 🔧 關鍵服務層

### confirmationCoreTableSync.ts

**職責**：確認單 ↔ 核心表 雙向同步

**函數清單**：
```typescript
// 建立確認單 → 核心表
syncConfirmationCreateToCore(params: {
  tourId: string
  confirmationItems: ConfirmationItem[]
  workspaceId: string
})

// 更新確認單 → 核心表
syncConfirmationUpdateToCore(params: {
  tourId: string
  confirmationItems: ConfirmationItem[]
  workspaceId: string
})

// 領隊費用 → 核心表
syncLeaderExpenseToCore(params: {
  tourId: string
  expenseItems: ExpenseItem[]
  workspaceId: string
})

// 批次同步
batchSyncConfirmationToCore(params: {
  tourId: string
  items: ConfirmationItem[]
  workspaceId: string
})
```

**更新欄位**：
- confirmed_cost
- booking_reference
- confirmation_date
- confirmation_status
- actual_expense
- expense_note
- receipt_images
- leader_status

---

## 📋 待深入研究

- [ ] 行程表編輯器的完整邏輯（1626行）
- [ ] 確認單的建立流程
- [ ] 領隊回填的驗證規則
- [ ] 訂單系統的收款邏輯
- [ ] 代收轉付的完整流程
- [ ] 供應商回覆機制
- [ ] 每個按鈕的事件處理
- [ ] 錯誤處理和邊界情況

---

**快速掃描進度：30%**  
**下一步：深入確認單和結帳單邏輯**
