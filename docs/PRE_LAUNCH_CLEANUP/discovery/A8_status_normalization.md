# A8 · Status Value Normalization

## Summary

**10 status columns** across **9 tables**. **18 Chinese values** to normalize to English. **UI translation layer** exists partially via `status-maps.ts`.

Current state: Mixed Chinese/English across database. Tours/Visas/Payments entirely Chinese; Quotes/Orders mixed; Todos/Employees/Syncqueue already English.

**Decision**: Normalize all to English in DB, keep translation at UI layer (status-maps.ts).

---

## Current Distribution

### tours.status

| value    | proposed English    | context                       |
| -------- | ------------------- | ----------------------------- |
| `開團`   | `proposal`          | Proposal/planning phase       |
| `待出發` | `pending_departure` | Confirmed, awaiting departure |
| `已結團` | `completed`         | Tour finished                 |
| `取消`   | `cancelled`         | Cancelled tour                |

**Schema**: No CHECK constraint, VARCHAR(20) default `'提案'` (should be `'proposal'`)
**Stored as**: Chinese directly (開團, 待出發, 已結團, 取消)
**UI mapping**: `TOUR_STATUS` constants (status-maps.ts:30-39), `getTourStatusLabel()` returns value as-is (no translation)
**UI usage**: status-maps has 3 display functions but tours directly stored Chinese

---

### tours.contract_status

| value    | proposed English | context             |
| -------- | ---------------- | ------------------- |
| `未簽署` | `unsigned`       | Contract not signed |
| `已簽署` | `signed`         | Contract signed     |

**Schema**: No CHECK constraint, VARCHAR(20) default `'未簽署'`
**Stored as**: Chinese directly
**UI mapping**: `CONTRACT_STATUS_MAP` (status-maps.ts:147-158)
**UI usage**: Fetched and displayed via label function

---

### orders.status

| value    | proposed English | context               |
| -------- | ---------------- | --------------------- |
| `進行中` | `in_progress`    | Order being fulfilled |

**Schema**: No CHECK constraint, VARCHAR(20) default `'進行中'`
**Stored as**: Chinese directly (only 1 value observed, but schema allows arbitrary)
**UI mapping**: `ORDER_STATUS_MAP` maps `pending/confirmed/completed/cancelled` (status-maps.ts:59-74), but DB has `進行中`
**Conflict**: Type expects English keys, DB stores Chinese — mismatch

---

### orders.payment_status

| value      | proposed English | context                  |
| ---------- | ---------------- | ------------------------ |
| `未收款`   | `unpaid`         | Payment not received     |
| `部分收款` | `partial`        | Partial payment received |
| `已收款`   | `paid`           | Full payment received    |
| `已退款`   | `refunded`       | Refund issued            |

**Schema**: No CHECK constraint, VARCHAR(20) default `'未收款'`
**Stored as**: Chinese directly
**UI mapping**: `PAYMENT_STATUS_MAP` (status-maps.ts:80-95) expects English keys
**Conflict**: Mismatch between DB (Chinese) and expected UI mapping (English)

---

### payments.status

| value    | proposed English | context          |
| -------- | ---------------- | ---------------- |
| `已收款` | `received`       | Payment received |

**Schema**: No CHECK constraint, VARCHAR(20) default `'已收款'`
**Stored as**: Chinese directly

---

### payment_requests.status

| value             | proposed English | context           |
| ----------------- | ---------------- | ----------------- |
| `待審核`          | `pending_review` | Awaiting approval |
| (derived from UI) | `approved`       | Approved          |
| (derived from UI) | `rejected`       | Rejected          |

**Schema**: No CHECK constraint, VARCHAR(20) default `'待審核'`
**Stored as**: Chinese directly
**UI mapping**: No status-maps entry; UI labels in `tour-labels.ts` line ~1700s

---

### disbursement_orders.status

| value    | proposed English | context           |
| -------- | ---------------- | ----------------- |
| `已支付` | `paid`           | Disbursement paid |

**Schema**: No CHECK constraint, VARCHAR(20) default `'已支付'`
**Stored as**: Chinese directly

---

### receipt_orders.status

| value    | proposed English | context          |
| -------- | ---------------- | ---------------- |
| `已收款` | `received`       | Receipt received |

**Schema**: No CHECK constraint, VARCHAR(20) default `'已收款'`
**Stored as**: Chinese directly

---

### quotes.status

| value      | proposed English | context                      |
| ---------- | ---------------- | ---------------------------- |
| `draft`    | `draft`          | ✅ Already English (default) |
| (expected) | `proposed`       | Proposed to customer         |
| (expected) | `revised`        | Under revision               |
| (expected) | `approved`       | Customer approved            |
| (expected) | `converted`      | Converted to tour            |
| (expected) | `rejected`       | Customer rejected            |

**Schema**: VARCHAR(20) default `'draft'` **✅ Already English**
**Stored as**: Quotes already use English (draft, proposed, revised, approved, converted, rejected)
**UI mapping**: `QUOTE_STATUS_MAP` (status-maps.ts:101-122) has bidirectional Chinese/English map
**Status**: ✅ Quotes already compliant — DO NOT CHANGE

---

### visas.status

| value      | proposed English     | context             |
| ---------- | -------------------- | ------------------- |
| `待送件`   | `pending_submission` | Awaiting submission |
| (observed) | `已送件`             | Submitted           |
| (observed) | `已取件`             | Collected           |
| (observed) | `退件`               | Rejected            |
| (observed) | `已歸還`             | Returned            |

**Schema**: No CHECK constraint, VARCHAR(20) default `'待送件'`
**Stored as**: Chinese directly
**UI mapping**: `VISA_STATUS_MAP` (status-maps.ts:185-202) expects English keys (pending, submitted, collected, rejected, returned)
**Conflict**: DB Chinese vs map English

---

### todos.status

| value         | proposed English | context            |
| ------------- | ---------------- | ------------------ |
| `pending`     | `pending`        | ✅ Already English |
| `in_progress` | `in_progress`    | ✅ Already English |
| `completed`   | `completed`      | ✅ Already English |
| `cancelled`   | `cancelled`      | ✅ Already English |

**Schema**: ✅ Has CHECK constraint, ✅ already English with valid values
**Status**: ✅ No change needed

---

### employees.status

| value        | proposed English | context            |
| ------------ | ---------------- | ------------------ |
| `active`     | `active`         | ✅ Already English |
| `probation`  | `probation`      | ✅ Already English |
| `leave`      | `leave`          | ✅ Already English |
| `terminated` | `terminated`     | ✅ Already English |

**Schema**: ✅ Has CHECK constraint, ✅ already English
**Status**: ✅ No change needed

---

### syncQueue.status

| value        | proposed English | context            |
| ------------ | ---------------- | ------------------ |
| `pending`    | `pending`        | ✅ Already English |
| `processing` | `processing`     | ✅ Already English |
| `completed`  | `completed`      | ✅ Already English |
| `failed`     | `failed`         | ✅ Already English |

**Schema**: ✅ Has CHECK constraint, ✅ already English
**Status**: ✅ No change needed

---

## Proposed Enums for Each Table

### tours.status

```typescript
export type TourStatus = 'proposal' | 'pending_departure' | 'completed' | 'cancelled'

// DB default:
ALTER TABLE tours ALTER COLUMN status SET DEFAULT 'proposal';

// CHECK constraint:
ALTER TABLE tours ADD CONSTRAINT check_tours_status
  CHECK (status IN ('proposal', 'pending_departure', 'completed', 'cancelled'));
```

### tours.contract_status

```typescript
export type ContractStatus = 'unsigned' | 'signed'

ALTER TABLE tours ADD CONSTRAINT check_tours_contract_status
  CHECK (contract_status IN ('unsigned', 'signed'));
```

### orders.status

```typescript
export type OrderStatus = 'in_progress' | 'completed' | 'cancelled'

ALTER TABLE orders ADD CONSTRAINT check_orders_status
  CHECK (status IN ('in_progress', 'completed', 'cancelled'));
```

### orders.payment_status

```typescript
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded'

ALTER TABLE orders ADD CONSTRAINT check_orders_payment_status
  CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'refunded'));
```

### payments.status

```typescript
export type PaymentRecordStatus = 'received' | 'cancelled'

ALTER TABLE payments ADD CONSTRAINT check_payments_status
  CHECK (status IN ('received', 'cancelled'));
```

### payment_requests.status

```typescript
export type PaymentRequestStatus = 'pending_review' | 'approved' | 'rejected' | 'paid'

ALTER TABLE payment_requests ADD CONSTRAINT check_payment_requests_status
  CHECK (status IN ('pending_review', 'approved', 'rejected', 'paid'));
```

### disbursement_orders.status

```typescript
export type DisbursementStatus = 'paid' | 'cancelled'

ALTER TABLE disbursement_orders ADD CONSTRAINT check_disbursement_orders_status
  CHECK (status IN ('paid', 'cancelled'));
```

### receipt_orders.status

```typescript
export type ReceiptStatus = 'received' | 'cancelled'

ALTER TABLE receipt_orders ADD CONSTRAINT check_receipt_orders_status
  CHECK (status IN ('received', 'cancelled'));
```

---

## UI Translation Strategy

**Current state**: `src/lib/constants/status-maps.ts` has bidirectional maps for most status types.

### Option A: DB = English, UI = Translated (RECOMMENDED)

- DB stores English enums
- `status-maps.ts` contains `STATUS_MAP` (English → Chinese) and `STATUS_REVERSE_MAP` (Chinese → English)
- All UI `<StatusBadge status={record.status} />` looks up label via `getXxxStatusLabel(status)`
- Filters accept both English (DB) and Chinese (for user visibility)

**Pros**:

- DB is language-neutral (easier for multi-tenant)
- Single source of truth for business logic
- Backward compatible with current `status-maps.ts` structure
- Supports future i18n easily (just add more maps: `status-maps.fr.ts`)

**Cons**:

- Requires all UI to use label function (audit current usage)

### Option B: DB = Chinese, Create Reverse Map (NOT RECOMMENDED)

- Keep DB as-is (Chinese values)
- Create `REVERSE_MAP` to get English for API contracts
- Not feasible — breaks existing `quotes.status` which is already English

**Decision**: Implement **Option A**.

---

## Migration Plan

### Phase 1: Update status-maps.ts

Ensure all maps have bidirectional English ↔ Chinese:

```typescript
// src/lib/constants/status-maps.ts

export const TOUR_STATUS_MAP = {
  proposal: '開團',
  pending_departure: '待出發',
  completed: '已結團',
  cancelled: '取消',
} as const

export const TOUR_STATUS_REVERSE_MAP = {
  開團: 'proposal',
  待出發: 'pending_departure',
  已結團: 'completed',
  取消: 'cancelled',
} as const

// ... similarly for ORDERS, PAYMENTS, PAYMENT_REQUESTS, DISBURSEMENT, RECEIPT
```

### Phase 2: DB Migration (Single Transaction)

Execute all UPDATEs before adding CHECK constraints:

```sql
-- Step 1: Back up current state (informational)
-- SELECT status, count(*) FROM tours GROUP BY status;
-- SELECT payment_status, count(*) FROM orders GROUP BY payment_status;
-- ... (for all tables)

-- Step 2: Update Chinese → English

BEGIN TRANSACTION;

-- tours.status
UPDATE tours SET status = 'proposal' WHERE status = '開團';
UPDATE tours SET status = 'pending_departure' WHERE status = '待出發';
UPDATE tours SET status = 'completed' WHERE status = '已結團';
UPDATE tours SET status = 'cancelled' WHERE status = '取消';
UPDATE tours SET status = 'proposal' WHERE status = '提案'; -- old default

-- tours.contract_status
UPDATE tours SET contract_status = 'unsigned' WHERE contract_status = '未簽署';
UPDATE tours SET contract_status = 'signed' WHERE contract_status = '已簽署';

-- orders.status
UPDATE orders SET status = 'in_progress' WHERE status = '進行中';

-- orders.payment_status
UPDATE orders SET payment_status = 'unpaid' WHERE payment_status = '未收款';
UPDATE orders SET payment_status = 'partial' WHERE payment_status = '部分收款';
UPDATE orders SET payment_status = 'paid' WHERE payment_status = '已收款';
UPDATE orders SET payment_status = 'refunded' WHERE payment_status = '已退款';

-- payments.status
UPDATE payments SET status = 'received' WHERE status = '已收款';

-- payment_requests.status
UPDATE payment_requests SET status = 'pending_review' WHERE status = '待審核';

-- disbursement_orders.status
UPDATE disbursement_orders SET status = 'paid' WHERE status = '已支付';

-- receipt_orders.status
UPDATE receipt_orders SET status = 'received' WHERE status = '已收款';

-- visas.status
UPDATE visas SET status = 'pending_submission' WHERE status = '待送件';
UPDATE visas SET status = 'submitted' WHERE status = '已送件';
UPDATE visas SET status = 'collected' WHERE status = '已取件';
UPDATE visas SET status = 'rejected' WHERE status = '退件';
UPDATE visas SET status = 'returned' WHERE status = '已歸還';

-- Step 3: Add CHECK constraints

ALTER TABLE tours ADD CONSTRAINT check_tours_status
  CHECK (status IN ('proposal', 'pending_departure', 'completed', 'cancelled'));

ALTER TABLE tours ADD CONSTRAINT check_tours_contract_status
  CHECK (contract_status IN ('unsigned', 'signed'));

ALTER TABLE orders ADD CONSTRAINT check_orders_status
  CHECK (status IN ('in_progress', 'completed', 'cancelled'));

ALTER TABLE orders ADD CONSTRAINT check_orders_payment_status
  CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'refunded'));

ALTER TABLE payments ADD CONSTRAINT check_payments_status
  CHECK (status IN ('received', 'cancelled'));

ALTER TABLE payment_requests ADD CONSTRAINT check_payment_requests_status
  CHECK (status IN ('pending_review', 'approved', 'rejected', 'paid'));

ALTER TABLE disbursement_orders ADD CONSTRAINT check_disbursement_orders_status
  CHECK (status IN ('paid', 'cancelled'));

ALTER TABLE receipt_orders ADD CONSTRAINT check_receipt_orders_status
  CHECK (status IN ('received', 'cancelled'));

ALTER TABLE visas ADD CONSTRAINT check_visas_status
  CHECK (status IN ('pending_submission', 'submitted', 'collected', 'rejected', 'returned'));

-- Step 4: Update defaults
ALTER TABLE tours ALTER COLUMN status SET DEFAULT 'proposal';
ALTER TABLE tours ALTER COLUMN contract_status SET DEFAULT 'unsigned';
ALTER TABLE orders ALTER COLUMN payment_status SET DEFAULT 'unpaid';
ALTER TABLE payment_requests ALTER COLUMN status SET DEFAULT 'pending_review';
ALTER TABLE visas ALTER COLUMN status SET DEFAULT 'pending_submission';

COMMIT;
```

### Phase 3: UI Layer Updates

After DB migration, update all UI to use label functions:

**Pattern 1: Status displays**

```typescript
// ❌ Before
<span>{order.payment_status}</span> // Shows "已收款"

// ✅ After
<span>{getPaymentStatusLabel(order.payment_status)}</span> // Shows Chinese from map
```

**Pattern 2: Status filters/selects**

```typescript
// ❌ Before
<Select options={['未收款', '已收款', ...]} />

// ✅ After
<Select
  options={['unpaid', 'paid', ...].map(key => ({
    value: key,
    label: getPaymentStatusLabel(key)
  }))}
/>
```

**Pattern 3: API contracts**
All API responses already return English (post-migration), frontend filters/maps transparently.

---

## UI File Changes (Site Scan Results)

**Critical UI files using raw status strings** (50 files grepped for Chinese status):

### Tours Module

- `src/features/tours/components/TourFilters.tsx:42, 44` — uses `'待出發'`, `'已結團'` as tab values (need translation)
- `src/features/tours/components/ToursPage.tsx` — filters by tour status
- `src/features/tours/components/TourFormShell.tsx` — displays tour status badge

### Orders Module

- `src/features/orders/components/add-order-form.tsx` — order status select
- `src/features/orders/components/order-edit-dialog.tsx` — order status edit

### Quotes Module

- `src/features/quotes/components/QuotesList.tsx` — quote status filter (already English ✅)
- `src/features/quotes/components/QuoteDetailEmbed.tsx` — quote status display

### Finance Module

- `src/features/finance/requests/components/RequestItemList.tsx` — payment request status
- `src/features/finance/payments/components/BatchReceiptConfirmDialog.tsx` — payment status

### Other Modules

- Public/booking pages, confirmations, visas — all use status-maps for display

**Summary**: 40-50 files need audit. Most already use `getTourStatusLabel()` / `getPaymentStatusLabel()` pattern, but 5-10 files directly interpolate Chinese strings in filters/tabs.

---

## Implementation Order

1. **Wave 8a** (S): Update `status-maps.ts` bidirectional maps
2. **Wave 8b** (M): Execute DB migration SQL (all UPDATEs + CHECK constraints + defaults)
3. **Wave 8c** (M): Audit & update UI files to use label functions consistently
4. **Wave 8d** (S): Update type definitions (`quote.types.ts`, `order.types.ts`, etc.) to reflect English enums

**Effort**: ~2 days (M)
**Risk**: LOW (translation layer already exists; migration is pure data rename)
**Testing**: Verify all status filters, badges, dropdowns display correct Chinese labels after migration

---

## Notes

- **Quotes**: Already fully English (✅ no change needed)
- **Todos**: Already fully English with CHECK constraint (✅ no change)
- **Employees**: Already fully English with CHECK constraint (✅ no change)
- **SyncQueue**: Already fully English with CHECK constraint (✅ no change)
- **Visas**: Partially mapped in `status-maps.ts` but DB is Chinese — include in migration

---

_Research phase complete. Awaiting William decision on execution scope._
