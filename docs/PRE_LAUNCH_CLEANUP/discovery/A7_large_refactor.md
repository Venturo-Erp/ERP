# A7 · Large File Refactor Architectural Plan

**Generated**: 2026-04-21（A7 Plan agent 產出、由主 session 代寫）

## Summary

| File                   | Current LOC | Proposed LOC (shell) | # new files |  Risk   |
| ---------------------- | ----------: | -------------------: | ----------: | :-----: |
| `AddRequestDialog.tsx` |        1474 |                 ~140 |           8 |  HIGH   |
| `QuoteDetailEmbed.tsx` |         737 |   ~60 + 20 re-export |           6 | MEDIUM  |
| `customers/page.tsx`   |         562 |                  ~90 |           5 | LOW-MED |

> ⚠️ **Stale reference in BACKLOG**：BACKLOG L214 寫 `/quotes/[id]/page.tsx` 614 行、**實際該檔不存在**。Wave 7 真正要處理的是 `QuoteDetailEmbed.tsx` 737 行本身。BACKLOG 要修正。

---

## 1. AddRequestDialog.tsx (1474 lines)

### 現狀結構

單一 Dialog 處理：
| 關注點 | 行 | LOC |
|---|---|---|
| Imports + constants | 1-124 | 124 |
| Create-mode shared state | 135-232 | 100 |
| Tour-mode 匯入 picker | 166-278 | 110 |
| Batch-mode (TourAllocation) | 176-290, 611-663 | 175 |
| Edit-mode（dirty tracking、save/delete） | 336-608 | 270 |
| Submit orchestrator（3 branch） | 788-935 | 150 |
| Render（Dialog/Tabs/Footer） | 938-1470 | 530 |

### 隱藏 complexity flags

- **3 種 data model 共用 tab state**（formData / tourAllocations / localItems）— 混用就是 bug 源
- **`useResetOnTabChange` 在 edit mode 被 short-circuit**（line 193）— 拆分必須保 `!isEditMode` guard
- **Supplier-create modal 用 Promise resolver 存 state** — 跨 component 邊界需要 Context
- **`dbItemsJson` string-equality diff**（407-417）— 手動 SWR vs local-dirty 同步器、不能在 child 重複 derive
- **`handleSubmit` 非 transactional** — `crypto.randomUUID()` + 序列 createPaymentRequest + addPaymentItem、partial-failure 留 orphan（out of scope、但 flag for future wave）
- **Open/edit init 競態**（336-364 + 666-718）— 兩 effects 跑同資料、拆分要保 guard
- **4 處 `supabase.from()` 直查**（344, 502, 518, 526）— INV-P02 違反、獨立 pass
- **3 處 `as unknown as`**（269, 382-402, 680）— A4 幽靈欄位同 pattern、獨立清

### 建議分解

```
src/features/finance/requests/components/
└── AddRequestDialog/
    ├── index.tsx                                  (~140 LOC shell)
    ├── AddRequestDialogHeader.tsx                 (~110 LOC)
    ├── AddRequestDialogFooter.tsx                 (~80 LOC)
    ├── BatchRequestSwitcher.tsx                   (~40 LOC, edit-only)
    ├── tabs/
    │   ├── TourRequestTab.tsx                     (~50 LOC)
    │   ├── BatchRequestTab.tsx                    (~230 LOC)
    │   └── CompanyRequestTab.tsx                  (~80 LOC)
    ├── hooks/
    │   ├── useBatchAllocations.ts                 (~120 LOC)
    │   ├── useEditRequest.ts                      (~230 LOC)
    │   ├── useRequestSubmit.ts                    (~160 LOC)
    │   └── useSupplierCreateBridge.ts             (~50 LOC)
    └── utils/
        └── next-thursday.ts                        (~15 LOC, 去重)
```

### 執行順序（低風險 → 整合）

1. `utils/next-thursday.ts`（pure）
2. `useSupplierCreateBridge.ts`（blast radius = self）
3. `useBatchAllocations.ts`
4. **`useEditRequest.ts`**（最高風險、270 LOC 一次搬、保 dbItemsJson diff）
5. `useRequestSubmit.ts`
6. Leaf components bottom-up（Switcher → Footer → Header → TourTab → CompanyTab → BatchTab）
7. Shell rewrite
8. Move file location（維持 import path）

**強制**：step 8 前跑 `gitnexus_impact({target:"AddRequestDialog", direction:"upstream"})`

---

## 2. QuoteDetailEmbed.tsx (737 lines) — 實際目標

### Reality check

- `/quotes/[id]/page.tsx` **不存在於當前 repo**、BACKLOG L214 描述 stale
- `QuoteDetailEmbed` 被 `tour-quote-tab.tsx:134` 和 `tour-quote-tab-v2.tsx:452` 用
- `QuickQuoteDetail.tsx`（242 LOC）是另一個快速報價流程、不同

真正痛點：737 行混合 display / data-loading / mutation / dialog orchestration / local-tiers。

### 建議 `<QuoteDetailCore>` API

```ts
interface QuoteDetailCoreProps {
  quoteId: string
  showHeader?: boolean
  onNavigateAfterSave?: () => void
}
```

存儲 state 在 Core 內、`QuoteDetailEmbed` 變 20 行 re-export、未來 `/quotes/[id]/page.tsx` 是 10 行 wrapper。

### 建議分解

```
src/features/quotes/components/
├── QuoteDetailEmbed.tsx                          (~20 LOC re-export)
└── QuoteDetailCore/
    ├── index.tsx                                  (~180 LOC shell)
    ├── sections/
    │   ├── CostCategoriesTable.tsx                (~120 LOC)
    │   └── QuoteDialogs.tsx                       (~80 LOC)
    └── hooks/
        ├── useQuoteDetailState.ts                 (~180 LOC)
        ├── useQuoteVisibilityToggle.ts            (~70 LOC)
        ├── useLocalPricing.ts                     (~110 LOC)
        └── usePreviewState.ts                     (~50 LOC)
```

### 隱藏 complexity flags

- **Init effect race condition**（122-165）— `quote.tour_id && coreItemsLoading` bail、搬 hook 要保 guard
- **Local state cache of remote**（215-254）— 直 `supabase.from().update()` + `refreshCoreItems()`、optimistic UI、必須共用 setCategories
- **3 處 `as unknown as`**（279, 551, 691）— actions hook / QuoteHeader / PrintableQuotation props
- **直 `supabase.from()`**（line 215）+ **dynamic `await import('@/data')`**（line 721）— INV-P02 flags
- `tour-quote-tab-v2.tsx:452` 用 `QuoteDetailEmbed` 沒傳 `showHeader`、預設 true、refactor 後要維持

### 遷移路徑

1. `usePreviewState.ts`（simplest）
2. `useQuoteVisibilityToggle.ts`
3. `useLocalPricing.ts`
4. `useQuoteDetailState.ts`（biggest lift、保 init effect）
5. `sections/CostCategoriesTable.tsx`（pure）
6. `sections/QuoteDialogs.tsx`（pure）
7. `QuoteDetailCore/index.tsx` 組合
8. `QuoteDetailEmbed.tsx` 變 20-line re-export
9. （選做）新建 `/quotes/[id]/page.tsx`

---

## 3. customers/page.tsx (562 lines)

### 4 處 `supabase.from()` 直查（INV-P02 違反）

| 行  | 表                                | 用途                               | 目標 hook                              |
| --- | --------------------------------- | ---------------------------------- | -------------------------------------- |
| 99  | customers                         | row-click fetch passport_image_url | `useCustomerPassportImage(id)`         |
| 116 | order_members                     | 跨 order_members 找 passport       | 同上（合併）                           |
| 128 | customers                         | 寫回 passport_image_url            | `updateCustomerPassportImage` mutation |
| 152 | order_members + orders!inner join | delete 前檢查 customer 是否連訂單  | `useCustomerLinkedOrders(id)`          |

### 5 處 `as unknown as` LINE 欄位

lines 410, 415, 500, 510-513 — `customer.line_user_id` / `customer.line_linked_at`。

**建議**：擴充 `Customer` type（`src/types/customer.types.ts`）加 `line_user_id?: string | null; line_linked_at?: string | null;`、5 casts 全掉。

### 建議分解

```
src/app/(main)/customers/
├── page.tsx                                       (~50 LOC shell)
├── components/
│   ├── CustomerLineBindDialog.tsx                 (~85 LOC)
│   ├── CustomerTableColumns.tsx                   (~135 LOC)
│   ├── CustomerRowActions.tsx                     (~55 LOC)
│   └── CustomersPageContent.tsx                   (~140 LOC)
└── hooks/
    └── useCustomerRowActions.ts                   (~120 LOC)
src/features/customers/                            (NEW)
└── services/
    └── customer-passport.service.ts               (~55 LOC)
```

### 建議 shell（≤50 LOC）

```tsx
'use client'
import { CustomersPageContent } from './components/CustomersPageContent'
export default function CustomersPage() {
  return <CustomersPageContent />
}
```

### 執行順序

1. 擴充 Customer type（line_user_id / line_linked_at）
2. 建 `customer-passport.service.ts`（3 個 supabase call）
3. 建 `useCustomerRowActions.ts`
4. `CustomerLineBindDialog.tsx`
5. `CustomerTableColumns.tsx` + `CustomerRowActions.tsx`
6. `CustomersPageContent.tsx`
7. page.tsx 縮成 4-line shell

**強制**：跑 `gitnexus_impact({target:"CustomersPage", direction:"upstream"})`

---

## 跨三者注意事項

- **none blocking launch**（Wave 7 為可延後項）
- 建議順序：#3（低風險、小） → #2（中、isolated） → #1（高、critical path、動錢）
- 每步跑 `gitnexus_impact` + `npm run type-check`、絕不 `--no-verify`
- 不要把 INV-P02 migration 併進 decomposition commit、分階段
- **測試覆蓋不足**：三個目標都無 spec 檔、#1 前至少加「open → switch tabs → submit / open edit → save」smoke E2E
- 中文 label constants 已外化（`ADD_REQUEST_DIALOG_LABELS` 等）— 拆分要保 import path、漏一個就是 undefined 顯示在 production

---

## Critical Files

- `src/features/finance/requests/components/AddRequestDialog.tsx`
- `src/features/finance/requests/hooks/useRequestForm.ts`
- `src/features/quotes/components/QuoteDetailEmbed.tsx`
- `src/app/(main)/customers/page.tsx`
- `src/types/customer.types.ts`

---

_原 Plan agent 產出；主 session 代寫（agent 無 Write 權限）_
