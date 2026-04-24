# A6 · Multi-Tenant Isolation Deep Scan

## Executive Summary

Wave 3 (multi-tenant isolation) cannot proceed safely without consolidating hardcoded IDs. Found:

- **CORNER_WORKSPACE_ID**: 6 files (legitimate in 1, hardcoded danger in 5)
- **LOGAN_ID conflict**: 3 files with disagreement — `000...001` vs `000...002`
- **SYSTEM_BOT_ID**: 1 file, currently unused outside workspace.ts
- **Payment method UUIDs**: 2 hardcoded in AddRequestDialog (should be DB config)
- **LINE Bot ID**: 2 files with `@745gftqd` fallback (should be env-only)
- **Total occurrence count**: 14 files, 22 direct hardcodes

**Risk**: Partner deployments will leak Corner's workspace data or mix up bot identities.

---

## Full Occurrence Inventory

| UUID / ID (Type)         | File:line                                                           | Current Value                                          | Context                                                    | Severity |
| ------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------- | -------- |
| CORNER_WORKSPACE_ID      | `src/lib/line/ai-customer-service.ts:10`                            | `8ef05a74-1f87-48ab-afd3-9bfeb423935d`                 | FALLBACK for webhook (needs env override)                  | HIGH     |
| CORNER_WORKSPACE_ID      | `src/features/attractions/components/DatabaseManagementPage.tsx:20` | `8ef05a74-1f87-48ab-afd3-9bfeb423935d`                 | Hardcoded, locked to Corner milestones (LEGITIMATE)        | MEDIUM   |
| CORNER_WORKSPACE_ID      | `src/app/api/tenants/seed-base-data/route.ts:6`                     | `8ef05a74-1f87-48ab-afd3-9bfeb423935d`                 | Template source (correct pattern, but needs env)           | MEDIUM   |
| CORNER_WS                | `src/app/api/tenants/create/route.ts:578`                           | `8ef05a74-1f87-48ab-afd3-9bfeb423935d`                 | Duplicate seed logic (should deduplicate)                  | MEDIUM   |
| workspace_id (hardcoded) | `src/app/api/line/send-insurance/route.ts:130`                      | `8ef05a74-1f87-48ab-afd3-9bfeb423935d`                 | Hardcoded in tour_documents insert                         | HIGH     |
| sourceId (fallback)      | `src/app/api/finance/account-mappings/route.ts:97`                  | `8ef05a74-1f87-48ab-afd3-9bfeb423935d`                 | Fallback if no source_workspace_id provided                | MEDIUM   |
| **LOGAN_ID**             | `src/lib/logan/logan-service.ts:11`                                 | `000...001`                                            | Main service (says "00000000-0000-0000-0000-000000000001") | CRITICAL |
| **LOGAN_ID**             | `src/lib/constants/workspace.ts:66`                                 | `000...001`                                            | SYSTEM_BOT_ID (aliased, confirms 001)                      | CRITICAL |
| **LOGAN_ID**             | `src/app/api/cron/sync-logan-knowledge/route.ts:18`                 | `000...002`                                            | Cron job uses DIFFERENT ID (000...002)                     | CRITICAL |
| LOGAN_EMPLOYEE_NUMBER    | `src/lib/logan/logan-service.ts:12`                                 | `BOT001`                                               | Consistent with 001 UUID                                   | -        |
| Payment method UUID      | `src/features/finance/requests/components/AddRequestDialog.tsx:184` | `e554fee7-412f-4b58-a7b3-c08602c624d2`                 | Hardcoded default "wire transfer"                          | HIGH     |
| Payment method UUID      | `src/features/finance/requests/components/AddRequestDialog.tsx:840` | `d6e2b71f-0d06-4119-9047-c709f31dfc31`                 | Hardcoded fallback for batch payment                       | HIGH     |
| LINE Bot ID              | `src/app/(main)/customers/page.tsx:523`                             | `process.env.NEXT_PUBLIC_LINE_BOT_ID \|\| '@745gftqd'` | QR code generation fallback                                | MEDIUM   |
| LINE Bot ID              | `src/app/(main)/customers/page.tsx:540`                             | `process.env.NEXT_PUBLIC_LINE_BOT_ID \|\| '@745gftqd'` | URL copy link fallback                                     | MEDIUM   |

---

## LOGAN_ID Conflict — Resolution Required

### The Problem

```typescript
// src/lib/logan/logan-service.ts (line 11)
export const LOGAN_ID = '00000000-0000-0000-0000-000000000001'

// src/app/api/cron/sync-logan-knowledge/route.ts (line 18)
const LOGAN_ID = '00000000-0000-0000-0000-000000000002'
```

**Impact**:

- Cron job (`sync-logan-knowledge`) writes memories with `000...002` as `created_by`
- Main service (`logan-service.ts`) reads/processes as `000...001`
- If 002 record is queried with filter `created_by = 001`, it's invisible → orphaned memories

### Resolution Proposal

**Action**: Query DB to determine which is the actual Logan employee row.

```sql
SELECT id, employee_number, name FROM public.employees
WHERE employee_number LIKE 'BOT%' OR id LIKE '00000000%'
ORDER BY created_at;
```

**Expected outcome**: One of these:

- **Option A**: Only one exists (e.g., 001 is correct) → Remove duplicate, unify to one
- **Option B**: Both exist with roles → Rename cron to use 002 consistently, document why
- **Option C**: Neither exists → Create proper Logan employee with assigned UUID, migrate both hardcodes

**Recommendation**: Option A (single unified Logan). If cron needs separate identity, make it explicit with `CRON_SYSTEM_ID` env var, not buried in code.

### Interim Guard (Before Resolution)

Add to `src/lib/logan/logan-service.ts`:

```typescript
const LOGAN_ID = process.env.LOGAN_ID || '00000000-0000-0000-0000-000000000001'
const LOGAN_CRON_ID = process.env.LOGAN_CRON_ID || LOGAN_ID

// Warn if mismatch
if (LOGAN_ID !== LOGAN_CRON_ID) {
  console.warn('[LOGAN] Multiple IDs in use — consolidation needed')
}
```

---

## seed-base-data Exception Analysis

### Is `CORNER_WORKSPACE_ID` hardcode legitimate here?

**File**: `src/app/api/tenants/seed-base-data/route.ts`

```typescript
const CORNER_WORKSPACE_ID = '8ef05a74-1f87-48ab-afd3-9bfeb423935d'

// Called as:
await supabase.rpc('seed_tenant_base_data', {
  source_workspace_id: CORNER_WORKSPACE_ID,
  target_workspace_id: targetWorkspaceId,
})
```

**Assessment**: **Legitimate, but should be env-driven.**

- **Why legitimate**: Partners should seed from Corner's template (countries, cities, airports)
- **Why not hardcode**: What if we later support "partner A is template source for partner B"?

**Recommendation**:

```typescript
const CORNER_WORKSPACE_ID =
  process.env.CORNER_WORKSPACE_ID || '8ef05a74-1f87-48ab-afd3-9bfeb423935d'
// Throw error if missing:
if (!CORNER_WORKSPACE_ID) {
  throw new Error('CORNER_WORKSPACE_ID env not set — cannot seed base data')
}
```

### DatabaseManagementPage Exception

**File**: `src/features/attractions/components/DatabaseManagementPage.tsx:20`

```typescript
const CORNER_WORKSPACE_ID = '8ef05a74-1f87-48ab-afd3-9bfeb423935d'
```

**Purpose**: Gate "Michelin" / "Premium Experiences" tabs — these are Corner-only features (sourced from our research, copyright concerns).

**Assessment**: **Legitimate hardcode for feature gating.**

- **Why**: Competitors/partners have no business seeing this tab
- **Why keep hardcoded**: Feature roadmap won't change per tenant, it's a product decision
- **Guard**: Add RLS check at DB level, don't rely only on client-side gate

**No change needed**, but add comment:

```typescript
// CORNER workspace ID — Michelin/premium data is Corner-exclusive
// RLS policy guards DB queries too (src/app/api/attractions/route.ts)
const CORNER_WORKSPACE_ID = '8ef05a74-1f87-48ab-afd3-9bfeb423935d'
```

---

## Payment Method UUIDs — Storage Strategy

### Current State

```typescript
// src/features/finance/requests/components/AddRequestDialog.tsx

// Line 184: Hardcoded default "wire transfer"
const [batchPaymentMethodId, setBatchPaymentMethodId] = useState<string | undefined>(
  'e554fee7-412f-4b58-a7b3-c08602c624d2' // 預設：匯款
)

// Line 840: Hardcoded fallback for batch
payment_method_id: batchPaymentMethodId || 'd6e2b71f-0d06-4119-9047-c709f31dfc31'
```

### Problem

- Different tenants have different payment methods (Corner uses wire transfer + credit card; Partner X might use only crypto)
- Hardcoding breaks when seeding new tenants
- No DB lookup = stale UUIDs if payment method records are deleted

### Solution

**Store payment methods per workspace**, expose via API:

```typescript
// New API: src/app/api/finance/payment-methods/route.ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace_id')

  const { data: methods } = await supabase
    .from('payment_methods')
    .select('id, name, is_default')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)

  return NextResponse.json(methods)
}
```

**Update AddRequestDialog**:

```typescript
const { data: paymentMethods } = useFetch(
  `/api/finance/payment-methods?workspace_id=${currentWorkspaceId}`
)

const defaultPaymentMethod = paymentMethods?.find(m => m.is_default)
const [batchPaymentMethodId, setBatchPaymentMethodId] = useState<string | undefined>(
  defaultPaymentMethod?.id
)
```

---

## LINE Bot ID — Env-Only Pattern

### Current Risky Pattern

```typescript
// src/app/(main)/customers/page.tsx
value={`https://line.me/R/oaMessage/${process.env.NEXT_PUBLIC_LINE_BOT_ID || '@745gftqd'}?...`}
```

**Risk**: If env var missing, fallback to hardcoded `@745gftqd` (Corner's bot ID).

### Solution

**Enforce env requirement**:

```typescript
// src/lib/constants/well-known-ids.ts
export const LINE_BOT_ID = (() => {
  const id = process.env.NEXT_PUBLIC_LINE_BOT_ID
  if (!id) {
    throw new Error('NEXT_PUBLIC_LINE_BOT_ID env not set')
  }
  return id
})()

// Usage in component
value={`https://line.me/R/oaMessage/${LINE_BOT_ID}?...`}
```

**Error at build time** if env missing, no silent fallback.

---

## Design: `src/lib/constants/well-known-ids.ts`

### Proposed File (200 lines)

```typescript
/**
 * Well-known IDs: System identities that must be consistent across all tenants.
 *
 * All values are env-driven with **NO SILENT FALLBACKS**.
 * Missing env var → build/runtime error (fail-fast).
 *
 * Usage:
 * - Import: import { LOGAN_ID, CORNER_WORKSPACE_ID } from '@/lib/constants/well-known-ids'
 * - Never: '00000000...' hardcodes outside this file
 */

// =============================================================================
// SYSTEM BOTS
// =============================================================================

/**
 * Logan AI Assistant ID
 * Used as created_by/updated_by in ai_memories, conversations
 * Must match employees.id where employee_number = 'BOT001'
 *
 * Env: LOGAN_ID (no default)
 */
export const LOGAN_ID = (() => {
  const id = process.env.LOGAN_ID
  if (!id) {
    throw new Error(
      'LOGAN_ID env not set. ' +
        'Set to the UUID of the Logan employee record (e.g., 00000000-0000-0000-0000-000000000001)'
    )
  }
  return id
})()

export const LOGAN_EMPLOYEE_NUMBER = 'BOT001'

/**
 * System bot ID (fallback workspace-scoped bot)
 * Used for background jobs, scheduled tasks
 * Deprecated in multi-tenant: prefer LOGAN_ID
 *
 * Env: SYSTEM_BOT_ID (fallback: LOGAN_ID)
 */
export const SYSTEM_BOT_ID = process.env.SYSTEM_BOT_ID || LOGAN_ID

// =============================================================================
// CORNER WORKSPACE (Feature Gating + Seed Template)
// =============================================================================

/**
 * Corner workspace ID
 * Used for:
 * 1. Seed template source (new tenants copy from Corner)
 * 2. Feature gate: Michelin/premium experiences are Corner-exclusive
 *
 * Env: CORNER_WORKSPACE_ID (no default)
 */
export const CORNER_WORKSPACE_ID = (() => {
  const id = process.env.CORNER_WORKSPACE_ID
  if (!id) {
    throw new Error(
      'CORNER_WORKSPACE_ID env not set. ' + 'Required for multi-tenant seeding and feature gating.'
    )
  }
  return id
})()

// =============================================================================
// LINE PLATFORM
// =============================================================================

/**
 * LINE Official Account ID
 * Format: @abc123def456 (or just abc123def456)
 * Used for:
 * - QR code generation in customer binding
 * - Direct messaging URLs
 *
 * Env: NEXT_PUBLIC_LINE_BOT_ID (no default, required)
 * Must be set in .env.local and .env.production
 */
export const LINE_BOT_ID = (() => {
  const id = process.env.NEXT_PUBLIC_LINE_BOT_ID
  if (!id) {
    throw new Error(
      'NEXT_PUBLIC_LINE_BOT_ID env not set. ' +
        'Set to your LINE Official Account ID (format: @abc123def456)'
    )
  }
  return id.startsWith('@') ? id : `@${id}`
})()

// =============================================================================
// PAYMENT METHODS (Database-Driven, Not Hardcoded)
// =============================================================================

/**
 * Payment methods are per-workspace and stored in the database.
 * DO NOT hardcode here. Use:
 *   const { data } = await supabase
 *     .from('payment_methods')
 *     .select('id, name, is_default')
 *     .eq('workspace_id', workspaceId)
 *
 * Legacy hardcodes (to be migrated):
 * - e554fee7-412f-4b58-a7b3-c08602c624d2 (wire transfer)
 * - d6e2b71f-0d06-4119-9047-c709f31dfc31 (batch payment default)
 *
 * These should only exist in:
 * - Database seed scripts (migrations)
 * - Initial tenant setup
 * - Test fixtures
 */

// =============================================================================
// VALIDATION & HEALTH CHECK
// =============================================================================

/**
 * Validates all well-known IDs at startup.
 * Call from src/app/layout.tsx or API middleware.
 *
 * Returns: { success: true } or throws error
 */
export function validateWellKnownIds(): { success: boolean; errors: string[] } {
  const errors: string[] = []

  // Check LOGAN_ID exists and is UUID format
  if (!isValidUUID(LOGAN_ID)) {
    errors.push(`LOGAN_ID invalid format: ${LOGAN_ID}`)
  }

  // Check CORNER_WORKSPACE_ID exists and is UUID format
  if (!isValidUUID(CORNER_WORKSPACE_ID)) {
    errors.push(`CORNER_WORKSPACE_ID invalid format: ${CORNER_WORKSPACE_ID}`)
  }

  // Check LINE_BOT_ID format
  if (!LINE_BOT_ID.match(/^@[a-z0-9]{6,}$/)) {
    errors.push(`LINE_BOT_ID invalid format: ${LINE_BOT_ID}`)
  }

  if (errors.length > 0) {
    console.error('[Well-Known IDs] Validation failed:', errors)
    return { success: false, errors }
  }

  console.info('[Well-Known IDs] All validations passed')
  return { success: true, errors: [] }
}

/**
 * Simple UUID v4 validation
 */
function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(value)
}
```

### Usage Examples

```typescript
// ✅ Correct: Import from well-known-ids
import { LOGAN_ID, CORNER_WORKSPACE_ID, LINE_BOT_ID } from '@/lib/constants/well-known-ids'

// ❌ Hardcoded (now forbidden)
const LOGAN_ID = '00000000-0000-0000-0000-000000000001'

// ✅ Memory creation
await supabase.from('ai_memories').insert({
  workspace_id: currentWorkspace.id,
  created_by: LOGAN_ID,  // Always from well-known-ids
  ...
})

// ✅ QR code generation
<QRCodeSVG value={`https://line.me/R/oaMessage/${LINE_BOT_ID}?绑定...`} />
```

---

## Wave 3 Migration Outline

### Phase 1: Consolidation (1-2 days)

1. **Create** `src/lib/constants/well-known-ids.ts` (proposed above)
2. **Resolve LOGAN_ID conflict**:
   - Query DB for actual Logan employee record
   - Update both `logan-service.ts` and `sync-logan-knowledge/route.ts` to match
   - Add integration test: `tests/unit/well-known-ids.test.ts`
3. **Add validation hook** in `src/app/layout.tsx`:
   ```typescript
   useEffect(() => {
     const { success, errors } = validateWellKnownIds()
     if (!success) {
       console.error('Well-known IDs validation failed:', errors)
       // Show banner or block app startup
     }
   }, [])
   ```

### Phase 2: Hardcode Replacement (2-3 days)

| File                                                            | Change                                          | Complexity |
| --------------------------------------------------------------- | ----------------------------------------------- | ---------- |
| `src/lib/line/ai-customer-service.ts:10`                        | `FALLBACK_WORKSPACE_ID` → env-driven            | Low        |
| `src/app/api/line/send-insurance/route.ts:130`                  | Extract workspace_id from request context       | Medium     |
| `src/app/api/finance/account-mappings/route.ts:97`              | Env fallback → require env                      | Low        |
| `src/features/finance/requests/components/AddRequestDialog.tsx` | Query payment methods from DB, remove hardcodes | Medium     |
| `src/app/(main)/customers/page.tsx:523,540`                     | Use `LINE_BOT_ID` from well-known-ids           | Low        |

### Phase 3: Tenant Template Setup (1 day)

Update `src/app/api/tenants/seed-base-data/route.ts` and `create/route.ts`:

```typescript
// Before
const CORNER_WS = '8ef05a74-1f87-48ab-afd3-9bfeb423935d'

// After
import { CORNER_WORKSPACE_ID } from '@/lib/constants/well-known-ids'

// Reuse constant
const sourceWorkspaceId = CORNER_WORKSPACE_ID
```

Deduplicate seed logic between `seed-base-data` and `create` routes (both call same DB function).

### Phase 4: .env.example Update (1 day)

```bash
# .env.example
LOGAN_ID=00000000-0000-0000-0000-000000000001
CORNER_WORKSPACE_ID=8ef05a74-1f87-48ab-afd3-9bfeb423935d
NEXT_PUBLIC_LINE_BOT_ID=@745gftqd
SYSTEM_BOT_ID=00000000-0000-0000-0000-000000000001
CRON_SECRET=<generated per deployment>
```

### Phase 5: Testing (2 days)

- **Unit**: `well-known-ids.test.ts` — validation, format checking
- **Integration**: `tests/e2e/tenant-isolation.spec.ts` — new partner seed, data leaks
- **Manual**: Deploy to staging, verify LINE QR codes, payment method fallback

### Phase 6: Verification (1 day)

1. Run `npx gitnexus detect_changes --base_ref=main` — confirm only intended files changed
2. Search codebase for remaining hardcodes: `grep -r "8ef05a74\|@745gftqd" src/`
3. No production hardcodes remain (except migrations & test fixtures)

---

## Risk Assessment

| Risk                                                | Likelihood | Impact   | Mitigation                                 |
| --------------------------------------------------- | ---------- | -------- | ------------------------------------------ |
| LOGAN_ID mismatch → orphaned memories               | HIGH       | MEDIUM   | Consolidate before Phase 1                 |
| Partner data leaks via CORNER_WORKSPACE_ID fallback | MEDIUM     | CRITICAL | Env-only, no silent fallback               |
| Missing LINE Bot → QR codes fail silently           | HIGH       | LOW      | Build-time error, not runtime              |
| Payment method UUIDs stale after migration          | MEDIUM     | MEDIUM   | DB-driven, seed script validation          |
| Inconsistent env vars across deployments            | MEDIUM     | MEDIUM   | Document in .env.example, add health check |

---

## Success Criteria

- [ ] No hardcoded UUIDs outside `well-known-ids.ts` and migrations
- [ ] LOGAN_ID unified: one UUID, one `BOT001`
- [ ] All env vars in `.env.example` with clear descriptions
- [ ] `validateWellKnownIds()` passes at app startup
- [ ] New partner seed test passes without Corner data leakage
- [ ] QR code generation uses env-driven LINE_BOT_ID
- [ ] Payment method defaults come from DB, not hardcodes

---

## References

- CLAUDE.md § DB 紅線 (audit trail FK rules)
- `docs/DATABASE_DESIGN_STANDARDS.md` § 8 (created_by / updated_by)
- Phase A notes: `docs/PRE_LAUNCH_CLEANUP/discovery/A1-A5.md`
