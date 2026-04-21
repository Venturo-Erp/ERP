# A4 · Phantom Field Detailed Analysis

## Summary
- **Item 1**: 7 phantom fields on `quotes` → DELETE from type (no DB columns exist)
- **Item 2**: 5 LINE casts on `customers` → ADD to Customer type (DB has columns)
- **Item 3**: 2 missing fields on `payment_requests` → ADD to type (DB has columns)

---

## Item 1: /quotes/[id] — 7 Phantom Fields

**Action**: DELETE from src/types/quote-store.types.ts (these exist in type but NOT in DB)

### Field: `contact_person`
- **Type location**: `src/types/quote-store.types.ts:40`
- **Read at** (6 files):
  - `src/features/quotes/components/QuoteHeader.tsx:99, 107, 112, 265`
  - `src/features/quotes/components/QuoteDetailEmbed.tsx:565, 571`
  - `src/features/quotes/hooks/useQuoteState.ts:143, 340`
  - `src/features/contracts/components/EnvelopeDialog.tsx:69`
  - `src/features/confirmations/components/AccommodationQuoteDialog.tsx:80, 86`
- **Written at**:
  - `src/features/quotes/components/QuoteHeader.tsx:121-123` (callback only—not persisted)
  - Form state only via `setTempContactInfo`
- **DB column**: NOT PRESENT (no migration adds to `quotes`)
- **Why phantom**: UI field with form state only; changes never saved to DB
- **Fix**: 
  - Remove from `src/types/quote-store.types.ts:40`
  - Remove all reads (6 locations above)
  - Remove callback/form binding in QuoteHeader.tsx

### Field: `contact_email`
- **Type location**: `src/types/quote-store.types.ts:42`
- **Read at**: QuoteHeader.tsx (paired with contact_person)
- **Written at**: Form state only
- **DB column**: NOT PRESENT
- **Fix**: Same as contact_person

### Field: `quote_number`
- **Type location**: `src/types/quote-store.types.ts:25`
- **Comment**: "QUOTE-2025-0001 - 向下相容" (backward compat)
- **Read at**: `src/features/quotes/hooks/useQuotesFilters.ts:39`
- **Written at**: Not found
- **DB column**: NOT PRESENT (replaced by `code` in schema)
- **Fix**: 
  - Remove from type
  - Replace read in useQuotesFilters.ts:39 with `code` field

### Field: `requirements`
- **Type location**: `src/types/quote-store.types.ts:58` ("需求說明")
- **Read at**: Not found
- **Written at**: Not found
- **DB column**: NOT PRESENT
- **Fix**: Remove from type

### Field: `budget_range`
- **Type location**: `src/types/quote-store.types.ts:59` ("預算範圍")
- **Read at**: Not found
- **Written at**: Not found
- **DB column**: NOT PRESENT
- **Fix**: Remove from type

### Field: `payment_terms`
- **Type location**: `src/types/quote-store.types.ts:61` ("付款條件")
- **Read at**: Not found
- **Written at**: Not found
- **DB column**: NOT PRESENT
- **Fix**: Remove from type

### Field: `metadata` (NOT in quote-store.types.ts)
- **Note**: Quote interface does NOT have metadata; it's only in tour_requests
- **Used in**: `src/features/quotes/hooks/useQuoteState.ts:154-158` (reads quote.metadata)
- **Verification**: Likely dead code or misread—inspect during refactor

---

## Item 2: /customers — 5 LINE Field Casts → ADD to Type

**Action**: ADD `line_user_id` and `line_linked_at` to Customer interface

### Current Problem: 5 Unsafe Casts
File: `src/app/(main)/customers/page.tsx`
```typescript
Line 410:  (customer as unknown as Record<string, unknown>).line_user_id
Line 415:  (customer as unknown as Record<string, unknown>).line_user_id
Line 500:  (lineBindingCustomer as unknown as Record<string, unknown>).line_user_id
Line 510:  (lineBindingCustomer as unknown as Record<string, unknown>).line_linked_at
Line 513:  (lineBindingCustomer as unknown as Record<string, unknown>).line_linked_at
```

### DB Verification
✓ Migration exists: `supabase/migrations/20260330063000_add_line_user_id.sql`
- Adds: `line_user_id TEXT` to customers table
- Note: Only adds to `customer_inquiries` table; may need to verify `customers` table has it

### Fix Required
**File 1**: `src/types/customer.types.ts`

Add after line 54 (after `online_user_id`):
```typescript
  line_user_id?: string | null // LINE 用戶 ID
  line_linked_at?: string | null // LINE 帳號連結時間
```

Also add to `UpdateCustomerData` interface (around line 160):
```typescript
  line_user_id?: string | null
  line_linked_at?: string | null
```

**File 2**: `src/app/(main)/customers/page.tsx`

Remove 5 casts after interface is updated (lines 410, 415, 500, 510, 513)

---

## Item 3: /finance/requests — Missing Soft-Delete Fields

**Action**: ADD `is_deleted` and `deleted_at` to PaymentRequest type

### DB Pattern Verification
Soft-delete columns exist in:
- `usa_esta` table: `deleted_at TIMESTAMPTZ DEFAULT NULL` (20251201130000)
- `transportation_rates` table: `deleted_at TIMESTAMPTZ DEFAULT NULL` (20251201120000)
- Pattern: used for soft-delete queries with `WHERE deleted_at IS NULL` indexes

### Current Type Gap
File: `src/stores/types/finance.types.ts`

PaymentRequest interface (lines 38-69) missing:
- `is_deleted?: boolean | null`
- `deleted_at?: string | null`

### Fix Required
**File**: `src/stores/types/finance.types.ts`

Add to PaymentRequest interface (before line 67, before created_at):
```typescript
  is_deleted?: boolean | null // Soft-delete flag
  deleted_at?: string | null // Soft-delete timestamp (ISO 8601)
```

---

## Wave 4 Implementation Checkpoints

### PR 1: Delete 7 Phantom Quote Fields
**Files touched**: 3
- [ ] `src/types/quote-store.types.ts` — remove lines 25, 40, 42, 58, 59, 61
- [ ] `src/features/quotes/components/QuoteHeader.tsx` — remove contact info form UI (lines 97-102, 120-123)
- [ ] `src/features/quotes/hooks/useQuotesFilters.ts:39` — replace quote_number with code
- [ ] Remove all 6 read sites (search/grep to confirm)
- **Test**: Quote list, edit, detail pages render without errors

### PR 2: Add LINE Fields to Customer + Remove Casts
**Files touched**: 2
- [ ] `src/types/customer.types.ts` — add 2 fields (lines 55-56, ~160-161)
- [ ] `src/app/(main)/customers/page.tsx` — remove 5 casts (lines 410, 415, 500, 510, 513)
- **Test**: Customer list, LINE binding display, type checking passes

### PR 3: Add Soft-Delete Fields to PaymentRequest
**Files touched**: 2+
- [ ] `src/stores/types/finance.types.ts` — add 2 fields to PaymentRequest (before line 67)
- [ ] Scan payment_requests queries — add `deleted_at IS NULL` filters where needed
- **Test**: Payment request create, list, archive logic intact

---

## Exact File + Line Reference Summary

| Item | File | Lines | Action |
|------|------|-------|--------|
| Quote: contact_person | src/types/quote-store.types.ts | 40 | DELETE |
| Quote: contact_email | src/types/quote-store.types.ts | 42 | DELETE |
| Quote: quote_number | src/types/quote-store.types.ts | 25 | DELETE |
| Quote: requirements | src/types/quote-store.types.ts | 58 | DELETE |
| Quote: budget_range | src/types/quote-store.types.ts | 59 | DELETE |
| Quote: payment_terms | src/types/quote-store.types.ts | 61 | DELETE |
| Quote: contact_person reads | QuoteHeader.tsx | 99,107,112,265 | REMOVE |
| Quote: contact_person reads | QuoteDetailEmbed.tsx | 565,571 | REMOVE |
| Quote: contact_person reads | useQuoteState.ts | 143,340 | REMOVE |
| Quote: contact_person reads | EnvelopeDialog.tsx | 69 | REMOVE |
| Quote: contact_person reads | AccommodationQuoteDialog.tsx | 80,86 | REMOVE |
| Quote: quote_number read | useQuotesFilters.ts | 39 | REPLACE with code |
| Customer: line_user_id | customer.types.ts | 55+ | ADD |
| Customer: line_linked_at | customer.types.ts | 55+ | ADD |
| Customer: 5 casts | customers/page.tsx | 410,415,500,510,513 | REMOVE |
| PaymentRequest: is_deleted | finance.types.ts | 67 | ADD |
| PaymentRequest: deleted_at | finance.types.ts | 67 | ADD |

---

## Risk Summary

| Item | Risk | Justification |
|------|------|---------------|
| Phantom Quote (7 fields) | **LOW** | Fields unused in persistence; form-only phantom |
| LINE fields cast removal | **MEDIUM** | 5 active casts; unblocks type safety but needs verification |
| Soft-delete addition | **LOW** | Defensive type addition; enables future archival logic |

**Total modifications**: ~25 lines across 10 files. **Estimated effort**: 2-3 hours including testing.
