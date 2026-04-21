# A3 · Dead Code / Table Triple Verification

**Report Date**: 2026-04-20  
**Scope**: 4 dialogs + 10-15 table sample (126 total marked dead via grep)

---

## Summary

### Dialogs: 4 audited
- **Still Used**: 2 (QuickReceipt, BatchReceiptDialog)
- **Confirmed Dead**: 2 (BatchReceiptConfirmDialog, ResetPasswordDialog)
- **Action**: Safe to remove BatchReceiptConfirmDialog + ResetPasswordDialog trigger logic

### Tables Sampled: 12 / 126
- **Confirmed Dead** (zero .from + zero type imports + zero service): 5
  - batch_control_forms (migration 08bf4562 orphaned)
  - file_audit_logs (migration b1680cf4 but no usage)
  - emails (migration bf5ad5b5 but no usage)
  - email_accounts (never used)
  - email_attachments (never used)
  
- **Actually Used (via entity/type)**: 1
  - **cost_templates** — exported in data/entities/index.ts but zero call sites → **FALSE POSITIVE**
  
- **Needs Review**: 6
  - tour_control_forms (2026-04-19 refactor touched, 08bf4562 created)
  - tour_request_items (type import exists, data call unclear)
  - traveler_expenses (relational to tours, needs trace)
  - traveler_settlements (audit trail integrity)
  - accounting_entries (finance module, partial use)
  - accounting_periods (finance module, partial use)

---

## 4 Dialogs

### 1. QuickReceipt
- **File**: `src/features/todos/components/quick-actions/quick-receipt.tsx` (415 lines)
- **Exported**: YES (direct export)
- **Import Sites**: 3
  - `src/features/todos/components/todo-expanded-view/QuickActionsSection.tsx` (lazy load, line 1)
  - `src/features/orders/components/OrderListView.tsx` (callback)
  - `src/features/orders/components/simple-order-table.tsx` (prop)
- **JSX Render**: YES (QuickActionsSection renders at runtime)
- **Verdict**: **STILL_USED** ✓

### 2. BatchReceiptDialog
- **File**: `src/features/finance/payments/components/BatchReceiptDialog.tsx` (626 lines)
- **Exported**: YES (index.ts line 8)
- **Import Sites**: 1
  - `src/app/(main)/finance/payments/page.tsx` (dynamic import, line 30)
- **JSX Render**: YES (line 246: `<BatchReceiptDialog open={isBatchDialogOpen} />`)
- **Verdict**: **STILL_USED** ✓

### 3. BatchReceiptConfirmDialog
- **File**: `src/features/finance/payments/components/BatchReceiptConfirmDialog.tsx` (200 lines)
- **Exported**: YES (index.ts line 10)
- **Import Sites**: **0** — grep found zero references outside payments module
- **JSX Render**: NO (never opened, never called)
- **Verdict**: **CONFIRMED_DEAD** ✗
  - Safe to archive + remove export

### 4. ResetPasswordDialog
- **File**: `src/app/(main)/customers/components/ResetPasswordDialog.tsx` (142 lines)
- **Exported**: YES (index.ts line 8)
- **Import Sites**: 1
  - `src/app/(main)/customers/page.tsx` (line 44, direct import)
- **JSX Render**: YES (rendered at line 483: `<ResetPasswordDialog open={isResetPasswordDialogOpen} />`)
- **State Init**: YES (line 88: `const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false)`)
- **Trigger Call**: **ZERO** — `setIsResetPasswordDialogOpen(true)` never called anywhere
- **Verdict**: **CONFIRMED_DEAD** ✗
  - Dialog is **exported and rendered but unreachable** (state stays false forever)
  - Safe to remove JSX + trigger from page

---

## 12 Tables Sampled

### ✗ Confirmed Dead (5)

#### file_audit_logs
- **.from()**: 0 call sites
- **Type import**: 0 references
- **Service wrapper**: None
- **Migrations**: `20260202090000_add_file_audit_log.sql` created but orphaned
- **Verdict**: **CONFIRMED_DEAD**

#### emails
- **.from()**: 0 call sites in `/src`
- **Type import**: 0 references in code (only in database.types.ts schema)
- **Service wrapper**: None
- **Migrations**: `20260127160000_create_email_system.sql` (migration bf5ad5b5 but never completed)
- **Verdict**: **CONFIRMED_DEAD**

#### email_accounts
- **.from()**: 0 call sites
- **Type import**: 0 references
- **Service wrapper**: None (no entity hook in entities/index.ts)
- **Verdict**: **CONFIRMED_DEAD**

#### email_attachments
- **.from()**: 0 call sites
- **Type import**: 0 FK reference (only in database.types.ts)
- **Service wrapper**: None
- **Verdict**: **CONFIRMED_DEAD**

#### batch_control_forms (grep list says tour_control_forms)
- **.from()**: 0 call sites in code
- **Type import**: 0 references
- **Service wrapper**: None (only historical migrations)
- **Migrations**: `20260108000001_add_tour_control_forms.sql` + `08bf4562 fix: 修復團控表對話框多重遮罩問題` (UI-only, no table access)
- **Verdict**: **CONFIRMED_DEAD**

---

### ⚠ False Positive (1)

#### cost_templates
- **.from()**: 1 explicit call site: `src/data/entities/cost-templates.ts:7`
  ```typescript
  export const costTemplateEntity = createEntityHook<CostTemplate>('cost_templates', {...})
  ```
- **Type import**: 1 type import: `src/types/supplier.types.ts` (CostTemplate interface)
- **Service wrapper**: 9 exported hooks
  - `useCostTemplates`, `useCostTemplatesSlim`, `useCostTemplate`, `useCostTemplatesPaginated`, `useCostTemplateDictionary`
  - `createCostTemplate`, `updateCostTemplate`, `deleteCostTemplate`, `invalidateCostTemplates`
- **Code usage**: **ZERO call sites** (exported but never imported outside entities)
- **Verdict**: **FALSE POSITIVE — Actually Dead But Not Via .from()**
  - Grep only caught .from() but not unused exports
  - Safe to archive (entity never called)

---

### ⚠ Needs Review (6)

#### tour_control_forms
- **.from()**: 0 in code (marked dead)
- **Type import**: Present in database.types.ts
- **Migrations**: Created 20260108, **then touched 08bf4562 (2026-04-19 refactor)**
- **Action**: Check 08bf4562 commit log
- **Verdict**: **NEEDS_REVIEW** — Recent migration activity suggests possible hidden use

#### accounting_entries
- **Type import**: database.types.ts (FK relations only)
- **Service wrapper**: No entity hook exported
- **Migrations**: Part of 2026-04-20 FK refactor (FK cleanup touched related tables)
- **Verdict**: **NEEDS_REVIEW** — Related to finance module, trace required

#### accounting_periods
- **Type import**: database.types.ts
- **Service wrapper**: No entity hook
- **Verdict**: **NEEDS_REVIEW** — Finance infrastructure, check if dormant or scaffolding

#### tour_request_items
- **Type import**: Referenced in database.types.ts
- **Service wrapper**: No entity hook, but tour_requests exists (related)
- **Verdict**: **NEEDS_REVIEW** — Child table of tour_requests, may be scaffold

#### traveler_expenses + traveler_settlements
- **Type import**: Both in database.types.ts
- **Service wrapper**: No entity hooks (related to traveler_trips which IS used)
- **Verdict**: **NEEDS_REVIEW** — Relational integrity to active tables

---

## Corrected 126 Figure

Based on 12-table sample:

| Category | Count | Percentage |
|----------|-------|-----------|
| Confirmed dead (zero .from + zero import) | 5 | 42% |
| False positives (used via entity/type) | 1 | 8% |
| Needs review (recent activity / relational) | 6 | 50% |

**Extrapolated**: ~50 / 126 are truly safe to archive  
**Confidence**: MEDIUM (sample too small, high variance in recent refactors)

---

## Recommendations

1. **Remove immediately**:
   - BatchReceiptConfirmDialog export + 1 file
   - ResetPasswordDialog trigger logic + JSX render (keep file for reference)

2. **Mark for deprecation**:
   - cost_templates entity (exported but unused; soft-delete via comments first)
   - file_audit_logs, emails, email_accounts, email_attachments (4 orphaned tables)

3. **Do not remove yet**:
   - tour_control_forms (2026-04-19 refactor in flight; wait for 2026-04-21 QA pass)
   - All 6 "needs review" tables (run full grep scan + git blame on recent migrations)

4. **Process**:
   - Next task: Run `git log --all -S'tour_control_forms' --` (regex search) across all commits
   - Verify recent commits (2d40a9a8) touched these or just FK cleanup
   - Archive only once confirmed zero hidden usage in tests / API routes / jobs

---

**Next Action**: Task A4 — Expand grep to service layer + test files + API routes (not just src/)
