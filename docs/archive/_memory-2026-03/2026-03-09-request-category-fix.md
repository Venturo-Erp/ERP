# 請款單類別預設值修正

**日期**: 2026-03-09 14:30  
**負責人**: Matthew  
**問題**: 請款單的「大項」（類別）預設為「其他」，應該讓用戶自己選擇

---

## 修改內容

### 1️⃣ 初始項目不預設類別

**檔案**: `src/features/finance/requests/hooks/useRequestForm.ts`

**Before**:

```typescript
category: REQUEST_FORM_HOOK_LABELS.OTHER as PaymentItemCategory, // Default category
```

**After**:

```typescript
category: '' as PaymentItemCategory, // 不預設類別，由用戶選擇
```

---

### 2️⃣ 新增項目不預設類別

**檔案**: `src/features/finance/requests/hooks/useRequestForm.ts` (addNewEmptyItem 函數)

**Before**:

```typescript
category: REQUEST_FORM_HOOK_LABELS.OTHER as PaymentItemCategory,
```

**After**:

```typescript
category: '' as PaymentItemCategory, // 不預設類別，由用戶選擇
```

---

### 3️⃣ 批量請款不預設類別

**檔案**: `src/features/finance/requests/components/AddRequestDialog.tsx`

**Before**:

```typescript
const [batchCategory, setBatchCategory] = useState<PaymentItemCategory>(
  REQUEST_TYPE_LABELS.CAT_OTHER as PaymentItemCategory
)
```

**After**:

```typescript
const [batchCategory, setBatchCategory] = useState<PaymentItemCategory>('' as PaymentItemCategory) // 不預設類別，由用戶選擇
```

---

### 4️⃣ 加上 Placeholder 提示

**批量請款** (`AddRequestDialog.tsx`):

```typescript
<SelectValue placeholder="請選擇類別" />
```

**項目清單** (`RequestItemList.tsx`):

```typescript
<SelectValue placeholder="類別" />
```

---

## 結果

✅ 所有新增項目不再預設「其他」  
✅ 下拉選單顯示 placeholder 提示  
✅ TypeScript 編譯零錯誤  
✅ 強迫用戶手動選擇類別

---

**Updated**: 2026-03-09 14:30
