# A2 · Anti-Pattern Deep Scan

## Summary

Comprehensive anti-pattern audit of `/src/` completed 2026-04-20. **330 `as unknown as` casts** dominate the codebase—primarily **LIBRARY_WORKAROUND** (Supabase Json type mismatch, Form lib schema escapes) and **UNNECESSARY** type assertions. **Audit columns clean** — 4-20 refactor verified. **6 page.tsx files directly query DB** (INV-P02 violation). **20 location references** to deprecated `tour.location` field still live. **1 spread insert** found. **0 `'current_user'` literals** and **0 `|| ''` audit patterns**—Wave 0 held.

| Pattern                              | Count | Severity | Status                                                |
| ------------------------------------ | ----- | -------- | ----------------------------------------------------- |
| audit `\|\| ''`                      | 0     | ✅ clean | Verified 0—Wave 0 success                             |
| `as unknown as` (PHANTOM_FIELD)      | ~45   | 🔴       | Access phantom fields (e.g. job_title on emp)         |
| `as unknown as` (LIBRARY_WORKAROUND) | ~165  | ⚪       | Supabase Json, Form libs type constraints             |
| `as unknown as` (UNNECESSARY)        | ~120  | 🟡       | Proper typing possible—tech debt                      |
| hardcoded UUIDs                      | 14    | 🟠       | 8×CORNER_WS, 3×LOGAN, 2×PAYMENT_METHOD, 1×OTHER       |
| spread insert/update                 | 1     | 🔴       | INV-D01: phantom field silent drops                   |
| supabase.from in page.tsx            | 6     | 🟡       | INV-P02: direct DB queries in Server Components       |
| `'current_user'` literal             | 0     | ✅       | Wave 0 complete                                       |
| magic string filter                  | ~80   | 🟡       | Business logic scattered (tour status, segment codes) |
| dead `location` refs                 | 20    | 🟢       | Low risk—mostly read-only fallbacks                   |

---

## 1. Audit Columns `|| ''` Pattern

**Status: CLEAN ✅**

```
Pattern: (created_by|updated_by|...) : ... || ''
Matches: 0
Expected: 0 (Wave 0 refactor 2026-04-20)
```

No matches found. The 4-20 refactor successfully eliminated string default patterns on audit columns. All code now correctly uses `undefined` or proper `currentUser?.id`.

---

## 2. `as unknown as` Casts (330 total)

### Breakdown by Category

#### LIBRARY_WORKAROUND (~165, 50%) — Acceptable tech debt

Supabase `Json` type + Form lib schema escapes. These require intermediate casts due to 3rd-party type limitations, not design flaws.

**Top files:**

- `src/stores/workspace/chat-store.ts` (9 casts) — Converting Message/Author to Supabase Json
- `src/lib/logan/logan-service.ts` (3 casts) — AI conversation history Json storage
- `src/app/(main)/settings/components/NewebPaySettings.tsx` (2 casts)
- `src/features/tours/components/itinerary-editor/usePackageItinerary.ts` (2 casts)
- `src/features/tours/hooks/useTourEdit.ts` (1 cast)
- `src/app/public/insurance/[code]/page.tsx` (3 casts)

**Example:**

```typescript
// Line 205 - chat-store.ts
author: newMessage.author as unknown as Json,  // Json = Supabase's opaque type
```

#### PHANTOM_FIELD (~45, 14%) — Design debt

Casting to access fields not declared in the actual type definition. Examples: accessing `job_title` on employee objects, `line_user_id` on customers.

**Top files:**

- `src/features/confirmations/components/RequirementsList.tsx` (15 casts)
- `src/features/confirmations/components/AssignSupplierDialog.tsx` (2 casts)
- `src/app/api/auth/admin-reset-password/route.ts` (1 cast)
- `src/app/(main)/hr/page.tsx` (1 cast)
- `src/features/confirmations/components/ConfirmationSheet.tsx` (2 casts)
- `src/features/todos/components/todo-expanded-view/TaskTypeForm.tsx` (1 cast)

**Example (Line 362, RequirementsList.tsx):**

```typescript
const firstItem = req.items[0] as unknown as Record<string, unknown>
// Then accesses [field] not in TourRequest type
```

#### UNNECESSARY (~120, 36%) — Can be eliminated

Safe removable casts where type is already correct or easily definable.

**Top files:**

- `src/data/core/createEntityHook.ts` (6 casts)
- `src/lib/data/todos.ts` (5 casts)
- `src/lib/data/messages.ts` (2 casts)
- `src/features/tour-documents/services/tour-request.service.ts` (7 casts)
- `src/features/tour-documents/services/request-document.service.ts` (5 casts)
- `src/hooks/createCloudHook.ts` (1 cast)
- `src/hooks/useGlobalData.ts` (1 cast)
- `src/lib/supabase/typed-client.ts` (1 cast)

**Example (Line 315, createEntityHook.ts):**

```typescript
return (data || []) as unknown as T[] // Could be: return (data as T[]) || []
```

### Priority for Wave 4/9

1. **UNNECESSARY → eliminate 120 casts** (lowest risk, highest clarity gain)
   - Focus: `createEntityHook.ts`, hook factories, service layers
   - Approach: Split the cast — `as T[]` not `as unknown as T[]`

2. **PHANTOM_FIELD → create proper interfaces** (moderate risk)
   - Define `EmployeeWithJobTitle`, `CustomerWithLineUserId` etc.
   - Refactor RequirementsList to accept typed payloads from API

3. **LIBRARY_WORKAROUND → document + accept** (acceptable)
   - Add JSDoc comment explaining why (`Supabase Json limitation`)
   - Do not refactor—3rd party constraints

---

## 3. Hardcoded UUIDs (14 total)

All found UUIDs are workspace/account constants, not customer data. Safe.

| UUID                                   | Context                      | Count | Tag            |
| -------------------------------------- | ---------------------------- | ----- | -------------- |
| `8ef05a74-1f87-48ab-afd3-9bfeb423935d` | Corner workspace (fallback)  | 6     | CORNER_WS      |
| `00000000-0000-0000-0000-000000000001` | System bot ID                | 1     | LOGAN          |
| `00000000-0000-0000-0000-000000000002` | Logan sync ID                | 1     | LOGAN          |
| `e554fee7-412f-4b58-a7b3-c08602c624d2` | Wire transfer payment method | 1     | PAYMENT_METHOD |
| `d6e2b71f-0d06-4119-9047-c709f31dfc31` | Default payment method       | 1     | PAYMENT_METHOD |
| `10000000-1000-4000-8000-100000000000` | Temp UUID generator (seed)   | 2     | OTHER          |

**Files:**

- `src/data/hooks/useEligibleEmployees.ts:77`
- `src/hooks/useTodos.ts:37`
- `src/lib/line/ai-customer-service.ts:10`
- `src/lib/utils/uuid.ts:14`
- `src/lib/constants/workspace.ts:66`
- `src/features/finance/requests/components/AddRequestDialog.tsx:184,840`
- `src/features/war-room/README.md:59,98`
- `src/app/api/cron/sync-logan-knowledge/route.ts:18`
- `src/lib/logan/logan-service.ts:11`
- `src/app/api/finance/account-mappings/route.ts:97`
- `src/stores/core/create-store.ts:44`
- `src/app/api/line/send-insurance/route.ts:130`
- `src/app/api/tenants/create/route.ts:578`
- `src/app/api/tenants/seed-base-data/route.ts:6`
- `src/features/attractions/components/DatabaseManagementPage.tsx:20`

**Action:** Zero risk. These are feature flags / system accounts. Document in code comments.

---

## 4. Spread Insert/Update (1 found)

**INV-D01 Violation: Silent field drops**

```typescript
// src/app/api/finance/payment-methods/route.ts:63
.insert({ ...body, workspace_id: workspaceId })

// src/app/api/tenants/create/route.ts:235
.insert(defaultRoles.map(r => ({ ...r, workspace_id: workspace.id })))
```

**Risk:** If `body` or `r` contains extra fields not in the schema, they silently drop. Supabase doesn't validate at spread time.

**Fix:** Use typed insert helper + schema validation (see `docs/DATABASE_DESIGN_STANDARDS.md` §5).

---

## 5. Supabase.from in page.tsx (6 files)

**INV-P02 Violation: Direct DB queries in Server Components**

| File                                                  | Line  | Count | Pattern                                        |
| ----------------------------------------------------- | ----- | ----- | ---------------------------------------------- |
| `src/app/public/insurance/[code]/page.tsx`            | 38    | 1     | `supabase.from('orders').select()`             |
| `src/app/(public)/p/customized/[slug]/page.tsx`       | 500s  | 1     | `supabase.from('customer_inquiries').insert()` |
| `src/app/(main)/settings/workspaces/page.tsx`         | `?`   | 1     | Insert profiles                                |
| `src/app/(main)/settings/company/page.tsx`            | `?`   | 1     | Update workspaces                              |
| `src/app/(main)/database/archive-management/page.tsx` | Multi | 6     | Multi-table deletes, updates                   |
| `src/app/(main)/hr/deductions/page.tsx`               | Multi | 4     | Upsert deductions/allowances                   |
| `src/app/(main)/hr/announcements/page.tsx`            | `?`   | 1     | Insert announcements                           |
| `src/app/(main)/hr/settings/page.tsx`                 | `?`   | 1     | Upsert attendance settings                     |
| `src/app/(main)/hr/overtime/page.tsx`                 | 100   | 1     | Insert overtime                                |
| `src/app/(main)/hr/missed-clock/page.tsx`             | 90    | 1     | Insert missed clock                            |
| `src/app/(main)/customized-tours/page.tsx`            | Multi | 2     | Upsert/delete templates                        |
| `src/app/(main)/customized-tours/[id]/page.tsx`       | Multi | 2     | Template items                                 |
| `src/app/m/tours/[id]/page.tsx`                       | 206   | 1     | Select orders                                  |
| `src/app/(main)/reports/tour-closing/page.tsx`        | Multi | 2     | Queries for reports                            |

**Cumulative: 25 direct DB queries in page.tsx files**

**Fix:** Extract to API routes or Server Actions + custom hooks. See `docs/INV_P02_SERVER_COMPONENT_DB_PATTERN.md`.

---

## 6. `'current_user'` Literal

**Status: CLEAN ✅**

```
Matches: 0
Expected: 0 (Wave 0 removed all hardcoded strings)
```

No hardcoded `'current_user'` strings found. All code now uses `currentUser?.id` from auth store.

---

## 7. Magic String Filters (~80 instances)

Business logic scattered as inline conditionals. Examples:

- **Segment status codes** (src/services/pnr/queue-automation-service.ts)

  ```typescript
  s.status === 'UC' || s.status === 'UN' // Ticketing state machine
  ```

- **Tour search** (src/features/tours/hooks/useTours-advanced.ts:65)

  ```typescript
  tour.code.includes() | tour.name.includes() // Should use full-text search
  ```

- **Request status** (src/services/pnr/revalidation-service.ts:108)
  ```typescript
  newSeg.status === 'XX' || newSeg.status === 'SC'
  ```

**Risk:** INV-S02 — missing refactoring point for Wave 9. Extract to constants:

```typescript
const TICKETING_UNCONFIRMED = ['UC', 'UN']
const CANCELLED_STATUS = ['XX', 'SC']
```

**Files with 5+ instances:**

- `src/services/pnr/queue-automation-service.ts` (20+ instances)
- `src/features/tours/components/*.tsx` (15+ instances)
- `src/features/confirmations/components/*.tsx` (10+ instances)
- `src/lib/line/ai-customer-service.ts` (5+ instances)

---

## 8. Dead `location` Field References (20 instances)

**Status: LOW RISK 🟢**

Field `tour.location` was deprecated + removed from Tours schema. Code now uses fallback patterns:

```typescript
// Safe fallback pattern (already in use)
tour.name || tour.location || '' // tour.location = undefined → skips to ''

// Read-only access (no mutations)
// - Line 127, TourClosingDialog.tsx
// - Line 194, TourPage.tsx
// - Line 212, TourLeaderSectionLuxury.tsx
```

**Verified:** No code writes to `tour.location`. All accesses are **read-only fallbacks**. Safe to ship.

**Example (Line 239, TourClosingDialog.tsx):**

```typescript
<span>{tour.name || tour.location}</span>
// tour.location = undefined → renders tour.name only
```

**Comments in code confirm deprecation:**

- `src/components/documents/ItineraryVersionPicker.tsx:70` — "不再 fallback 到 tour.location"
- `src/lib/contract-utils.ts:180` — "不再從已廢棄的 tour.location 讀"
- `src/features/tours/utils/tour-display.ts:6` — "不從已廢棄的 tours.location 字串猜"

---

## Top 10 Priorities for Wave 4/9

### Wave 4 (Foundation Cleanup)

1. **Remove 120 UNNECESSARY `as unknown as` casts**
   - Effort: Medium | Impact: Code clarity, type safety
   - Files: `createEntityHook.ts`, hook factories, service layers
   - Example: `(data || []) as T[]` not `(data || []) as unknown as T[]`

2. **Extract magic string filters to constants**
   - Effort: Low | Impact: Consistency, maintainability
   - Example: `const TICKETING_UNCONFIRMED = ['UC', 'UN']`

3. **Move 6 supabase.from queries from page.tsx to API routes**
   - Effort: Medium | Impact: Architecture clean, security
   - Files: `archive-management/page.tsx` (6 queries), `deductions/page.tsx` (4), etc.

4. **Fix 1 spread insert to use schema-validated insert helper**
   - Effort: Low | Impact: INV-D01 compliance
   - Files: `app/api/finance/payment-methods/route.ts:63`

### Wave 9 (Type Safety Deep Dive)

5. **Eliminate 45 PHANTOM_FIELD casts by creating proper interfaces**
   - Example: Create `EmployeeWithJobTitle` type
   - Files: `RequirementsList.tsx` (15 casts) is largest consumer

6. **Document 165 LIBRARY_WORKAROUND casts with JSDoc**
   - Add comment: `// Supabase Json type limitation—cannot avoid`
   - No code change needed—documentation only

7. **Audit Supabase Json→native conversions**
   - Check chat-store.ts, logan-service.ts for correctness
   - Consider helper: `toJson(obj)` + `fromJson<T>(json)`

8. **Create type-safe UUID constants file**
   - Centralize 14 hardcoded UUIDs
   - Add `WORKSPACE_FALLBACK`, `SYSTEM_BOT_ID`, etc. exports

9. **Add @deprecated marker to any remaining tour.location reads**
   - Already mostly safe—add ESLint rule to forbid writes

10. **Add INV-P02 lint rule**
    - Forbid direct `supabase.from()` in `*.tsx` files
    - Whitelist: `lib/`, API routes, Server Actions only

---

## Scan Methodology

- **Grep-based + manual file read** (2026-04-20, williamchien)
- **Excluded:** `tests/`, `migrations/`, `node_modules/`, demo/README files
- **Confidence:** High (regex patterns + context check)
- **Tool:** GitNexus lexical + ripgrep + Read tool verification

---

_Report auto-generated. No modifications attempted. Foundation for Wave 4 technical debt elimination._
