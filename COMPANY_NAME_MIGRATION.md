# 公司名稱多租戶化 - 修改報告

**執行日期**：2026-03-22  
**執行人**：William AI

---

## ✅ 已完成修改（17 個檔案/組件）

### 核心系統
1. **lib/tenant.ts** ✅ 建立統一常數（COMPANY_NAME, COMPANY_NAME_EN）

### Client Components  
2. **QuotePageLayout.tsx** ✅ 公用報價頁面組件
3. **confirm/[token]/page.tsx** ✅ 報價確認頁面
4. **landing/page.tsx** ✅ 首頁
5. **TourHeroSection.tsx** ✅ 行程封面
6. **CoverBlockEditor.tsx** ✅ 封面編輯器
7. **CoverInfoForm.tsx** ✅ 封面表單
8. **test/dialog-compare/page.tsx** ✅ 測試頁面（樣式對比）
9. **test/dialog-modes/page.tsx** ✅ 測試頁面（模式切換）
10. **TransportConfirmForm.tsx** ✅ 遊覽車確認表單

### Server Components (Public 頁面)
11. **meal-quote/[tourId]/[requestId]/page.tsx** ✅ 餐食報價
12. **transport-quote/[tourId]/[requestId]/page.tsx** ✅ 遊覽車報價（單一需求）
13. **transport-quote/[tourId]/page.tsx** ✅ 遊覽車報價（總表）
14. **accommodation-quote/[tourId]/[requestId]/page.tsx** ✅ 住宿報價
15. **activity-quote/[tourId]/[requestId]/page.tsx** ✅ 活動報價
16. **itinerary/[tourId]/page.tsx** ✅ 行程表
17. **request/[token]/page.tsx** ✅ 需求單

---

## ⚠️ 技術債清單（24 個檔案需手動處理）

### 優先級 P0（功能性代碼，需仔細檢查）

#### Features 模組（11 個檔案）
- `features/confirmations/components/AssignSupplierDialog.tsx`
- `features/confirmations/components/LocalQuoteDialog.tsx`
- `features/confirmations/components/RequirementsList.tsx`
- `features/confirmations/components/TransportRequirementDialog.tsx`
- `features/confirmations/components/TransportTraditionalView.tsx`
- `features/confirmations/components/UnifiedTraditionalView.tsx`
- `features/confirmations/components/print/TransportRequirementPrint.tsx`
- `features/confirmations/utils/printTransportRequirement.ts`
- `features/finance/requests/components/CreateSupplierDialog.tsx`
- `features/tours/components/CoreTableRequestDialog.tsx`
- `features/tours/components/TourRequestFormDialog.tsx`

#### LINE 整合（1 個檔案）
- `lib/line/send-requirement.ts`

---

### 優先級 P1（設計模板，可能需要保留範例）

#### Designer 模板（13 個檔案）
- `features/designer/templates/definitions/corner-travel-v1.ts`
- `features/designer/templates/definitions/corner-travel-v1-daily.ts`
- `features/designer/templates/definitions/corner-travel-v1-memo.ts`
- `features/designer/templates/definitions/japanese-style-v1.ts`
- `features/designer/templates/definitions/types.ts`
- `features/designer/templates/engine/index.ts`
- `features/designer/components/TemplateDataPanel.tsx`
- `features/designer/components/TemplateSelector.tsx`
- `features/designer/components/design-components/covers/full-cover.ts`
- `features/designer/components/design-components/layout/footer.ts`
- `features/accommodation/components/CornerHotelVoucher.tsx`
- `features/itinerary/components/CornerFlightItinerary.tsx`
- `features/tours/components/sections/TourHeroLuxury.tsx`

---

### 優先級 P2（註解或範例，影響小）

#### API Routes（3 個檔案 - 可能只是註解）
- `api/line/send-cancel/route.ts`
- `api/line/send-local-quote/route.ts`
- `api/line/send-transport-quote/route.ts`

#### AI 功能（2 個檔案 - 註解）
- `api/ai/edit-image/route.ts`  
  `// * ⚠️ 限定功能：僅角落旅行社 (TP/TC) 可用`
- `api/ai/suggest-attraction/route.ts`  
  `// * ⚠️ 限定功能：僅角落旅行社 (TP/TC) 可用`

#### Labels（3 個檔案 - placeholder）
- `(main)/settings/constants/labels.ts`  
  `LEGAL_NAME_PLACEHOLDER: '例如：角落旅行社股份有限公司'`
- `(main)/tenants/constants/labels.ts`  
  `FIELD_NAME_PLACEHOLDER: '例如：角落旅行社、大地旅遊'`
- `features/tours/constants/labels.ts`  
  `LABEL_3621: '角落旅行社'`

#### 其他（3 個檔案）
- `public/insurance/[code]/page.tsx`
- `lib/workspace-helpers.ts`
- `(main)/itinerary/block-editor/page.tsx`

---

## 🎯 修改策略

### 已完成的修改方式

**統一使用常數引用**：
```typescript
import { COMPANY_NAME, COMPANY_NAME_EN } from '@/lib/tenant'

// 使用
<div>{COMPANY_NAME}</div>
<div>{COMPANY_NAME_EN}</div>
```

**好處**：
- ✅ 單一來源（只在 .env 設定）
- ✅ 支援多租戶（未來可從 DB 讀取）
- ✅ 類型安全（TypeScript 常數）

---

## 📋 處理建議

### Features 模組
**建議**：逐個檢查，確認是否為功能邏輯  
**原因**：可能影響業務邏輯，需要測試

### Designer 模板
**建議**：保留部分範例，改用預設值  
**原因**：模板可能需要範例資料

### API Routes + Labels
**建議**：最後處理（影響最小）  
**原因**：大多只是註解或 placeholder

---

## 🔧 環境變數設定

建立 `.env.local`：
```bash
# 公司名稱（中文）
NEXT_PUBLIC_COMPANY_NAME=角落旅行社

# 公司名稱（英文）
NEXT_PUBLIC_COMPANY_NAME_EN=Corner Travel
```

**對於其他租戶**（未來）：
```bash
# 租戶 A
NEXT_PUBLIC_COMPANY_NAME=大地旅遊
NEXT_PUBLIC_COMPANY_NAME_EN=Earth Travel

# 租戶 B  
NEXT_PUBLIC_COMPANY_NAME=漫途旅行
NEXT_PUBLIC_COMPANY_NAME_EN=Wanderlust Travel
```

---

## 📊 修改統計

- ✅ **已修改**：17 個核心檔案
- ⚠️ **技術債**：24 個檔案
- 📈 **完成度**：41% (17/41)

**預估剩餘工作量**：
- P0（功能模組）：2-3 小時
- P1（設計模板）：1-2 小時
- P2（註解/範例）：30 分鐘

---

## ✅ 驗證清單

完成修改後需驗證：

### 功能測試
- [ ] 報價確認頁面（/confirm/[token]）
- [ ] 公開報價頁面（餐食、交通、住宿、活動）
- [ ] 行程表頁面
- [ ] 需求單頁面
- [ ] 首頁

### 多租戶測試
- [ ] 修改 .env.local 中的公司名稱
- [ ] 重啟 dev server
- [ ] 確認所有頁面顯示新公司名稱

### 年份自動更新測試
- [ ] 確認 copyright 顯示當前年份
- [ ] 確認品牌標語顯示當前年份

---

**最後更新**：2026-03-22 10:30  
**狀態**：核心修改完成，技術債已記錄
