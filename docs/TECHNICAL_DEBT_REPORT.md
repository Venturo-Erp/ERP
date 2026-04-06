# 技術債報告

**生成日期**：2026-04-01

---

## 📊 概覽

| 類別             | 數量 | 優先級 |
| ---------------- | ---- | ------ |
| TODO/FIXME 註解  | 94   | 🟡 中  |
| @deprecated 標記 | 12   | 🔴 高  |
| 舊版欄位殘留     | 3    | 🔴 高  |

---

## 🔴 優先處理：@deprecated 但仍被引用

### 1. `src/features/quotes/components/printable/shared/` (整個目錄)

**狀態**：標記 deprecated，但仍被引用

**引用位置**：

```
src/features/tours/components/TourRequestFormDialog.tsx:27
  → import { usePrintLogo } from '@/features/quotes/components/printable/shared/usePrintLogo'

src/features/quotes/components/PrintableQuickQuote.tsx:15
  → import { PrintFooter } from './printable/shared/PrintFooter'
```

**建議**：

1. 將引用改為 `@/lib/print` 的版本
2. 刪除整個 `printable/shared/` 目錄

---

### 2. `price_tiers` vs `tier_pricings` 欄位混用

**狀態**：`price_tiers` 已標記 deprecated，應改用 `tier_pricings`

**仍在使用 `price_tiers` 的位置**：

```
src/features/tours/components/tour-webpage-tab.tsx:260, 316
src/components/editor/publish/hooks/usePublish.ts:93
```

**建議**：統一改用 `tier_pricings`

---

### 3. `submission_date` 已棄用

**位置**：`src/types/finance.types.ts:228`
**說明**：應改用 `received_date`
**建議**：搜尋所有使用處並統一

---

## 🟡 中優先：TODO 註解需清理

### 需要處理的 TODO（有時效性）

| 位置                                         | 內容                         | 優先級  |
| -------------------------------------------- | ---------------------------- | ------- |
| `middleware.ts:42`                           | 2026-04 移除 base64 fallback | 🔴 本月 |
| `api/public/inquiries/route.ts:71`           | 發送通知給業務               | 🟡 中   |
| `api/orders/create-from-booking/route.ts:82` | 發送通知                     | 🟡 中   |
| `accounting/checks/page.tsx`                 | 多個 TODO 等 migration       | 🟡 中   |

### 功能性 TODO（可稍後處理）

| 位置                      | 內容               |
| ------------------------- | ------------------ |
| `p/wishlist/page.tsx:104` | 3D Globe component |
| `itinerary/page.tsx:538`  | 建立模板功能       |
| `AccountSettings.tsx:88`  | bank_account 來源  |

---

## 🟡 舊版相容代碼

這些是為了向後相容保留的，可以在確認無舊資料後移除：

| 位置                                          | 說明                         |
| --------------------------------------------- | ---------------------------- |
| `tour.types.ts:186`                           | `image` 欄位（舊版單張圖片） |
| `lib/permissions/hooks.ts:160`                | `isAdmin` 重複匯出           |
| `lib/tenant.ts:45,52`                         | deprecated 函數              |
| `designer/templates/definitions/types.ts:159` | `showSeatNumber`             |

---

## 📋 清理步驟建議

### Phase 1：本月必須處理（2026-04）

1. **middleware.ts 的 base64 fallback**
   - 檢查是否還有舊 session
   - 移除 fallback 代碼

2. **printable/shared/ 目錄**
   - 修改 2 個引用改用 `@/lib/print`
   - 刪除整個目錄

### Phase 2：統一欄位命名

1. `price_tiers` → `tier_pricings`
2. `submission_date` → `received_date`

### Phase 3：清理 TODO

- 實作或移除過時的 TODO 註解

---

## 執行指令

```bash
# 找所有 deprecated 引用
grep -rn "@deprecated" src --include="*.ts" --include="*.tsx"

# 找 price_tiers 使用處
grep -rn "price_tiers" src --include="*.ts" --include="*.tsx" | grep -v "tier_pricings"

# 找 submission_date 使用處
grep -rn "submission_date" src --include="*.ts" --include="*.tsx"
```
