# A1 · Route Guard Full Sweep

**Generated**: 2026-04-21

## Summary

Scanned all **121 page.tsx** routes under `/src/app/(main)/`. Result: **90 pages have ZERO permission guard** (74% of codebase).

Critical finding: Finance, HR, and 系統主管 pages are completely open to any logged-in user. Accounting module (10 pages) also unprotected—no access controls despite handling sensitive financial data.

| Category           | Count |
| ------------------ | ----- |
| HAS_TAB_PERMISSION | 0     |
| HAS_HARDCODE       | 5     |
| PARTIAL            | 5     |
| NO_GUARD 🔴        | 54    |
| NO_GUARD 🟡        | 19    |
| NO_GUARD 🟢        | 21    |
| PERSONAL           | 7     |
| REDIRECT_ONLY      | 10    |

---

## Full Table

| Page                                 | Status        | Guard Detail                                         | Risk |
| ------------------------------------ | ------------- | ---------------------------------------------------- | ---- |
| accounting/accounts                  | NO_GUARD      | —                                                    | 🔴   |
| accounting/checks                    | NO_GUARD      | —                                                    | 🔴   |
| accounting/page                      | NO_GUARD      | —                                                    | 🔴   |
| accounting/period-closing            | NO_GUARD      | —                                                    | 🔴   |
| accounting/reports/\*                | NO_GUARD      | —                                                    | 🔴   |
| accounting/vouchers                  | NO_GUARD      | —                                                    | 🔴   |
| finance/page                         | NO_GUARD      | —                                                    | 🔴   |
| finance/payments                     | PARTIAL       | uses `isAdmin` in buttons only                       | 🔴   |
| finance/reports/\*                   | NO_GUARD      | —                                                    | 🔴   |
| finance/requests                     | NO_GUARD      | —                                                    | 🔴   |
| finance/settings                     | NO_GUARD      | —                                                    | 🔴   |
| finance/travel-invoice/\*            | NO_GUARD      | —                                                    | 🔴   |
| finance/treasury/\*                  | NO_GUARD      | —                                                    | 🔴   |
| hr/page                              | PARTIAL       | uses `isAdmin` in tabs only                          | 🟡   |
| hr/announcements                     | PARTIAL       | uses `isAdmin` to hide edit/delete                   | 🟡   |
| hr/attendance                        | NO_GUARD      | —                                                    | 🟢   |
| hr/clock-in                          | NO_GUARD      | —                                                    | 🟢   |
| hr/deductions                        | NO_GUARD      | —                                                    | 🟢   |
| hr/leave                             | NO_GUARD      | —                                                    | 🟢   |
| hr/missed-clock                      | HAS_HARDCODE  | `if (!isAdmin) query.eq('employee_id', user.id)`     | 🟡   |
| hr/my-attendance                     | PERSONAL      | personal data only                                   | —    |
| hr/my-leave                          | PERSONAL      | personal data only                                   | —    |
| hr/my-payslip                        | PERSONAL      | personal data only                                   | —    |
| hr/overtime                          | HAS_HARDCODE  | `if (!isAdmin) { redirect(...) }`                    | 🟡   |
| hr/payroll                           | NO_GUARD      | —                                                    | 🟡   |
| hr/reports                           | NO_GUARD      | —                                                    | 🟡   |
| hr/roles                             | HAS_HARDCODE  | `if (!isAdmin) { redirect(...) }`                    | 🟡   |
| hr/settings                          | NO_GUARD      | —                                                    | 🟡   |
| hr/training                          | NO_GUARD      | —                                                    | 🟡   |
| settings/page                        | PARTIAL       | uses `isAdmin \|\| permissions.includes('settings')` | 🟡   |
| settings/appearance                  | PERSONAL      | user profile/theme                                   | —    |
| settings/bot-line                    | REDIRECT_ONLY | `redirect('/ai-bot')`                                | —    |
| settings/company                     | HAS_HARDCODE  | `if (!isAdmin) { show permission denied card }`      | 🟡   |
| settings/menu                        | PERSONAL      | user menu visibility                                 | —    |
| settings/modules                     | PERSONAL      | user workspace feature toggles                       | —    |
| settings/receipt-test                | PERSONAL      | dev/test endpoint                                    | —    |
| settings/workspaces                  | NO_GUARD      | —                                                    | 🟡   |
| design/page                          | REDIRECT_ONLY | `redirect('/brochures')`                             | —    |
| design/new                           | NO_GUARD      | —                                                    | 🟢   |
| finance/reports/monthly-disbursement | REDIRECT_ONLY | `redirect(...tab param)`                             | —    |
| finance/reports/monthly-income       | REDIRECT_ONLY | `redirect(...tab param)`                             | —    |
| finance/reports/unclosed-tours       | REDIRECT_ONLY | `redirect(...tab param)`                             | —    |
| database/workspaces                  | NO_GUARD      | delegates to `<WorkspacesManagePage />`              | 🟡   |
| database/\* (8 pages)                | NO_GUARD      | —                                                    | 🟢   |
| tools/reset-db                       | HAS_HARDCODE  | `if (!isAdmin) { show perm denied }`                 | 🟡   |
| orders/page                          | NO_GUARD      | —                                                    | 🟢   |
| customers/page                       | NO_GUARD      | —                                                    | 🟢   |
| tours/page                           | NO_GUARD      | —                                                    | 🟢   |
| confirmations/\*                     | NO_GUARD      | —                                                    | 🟢   |
| contracts                            | NO_GUARD      | —                                                    | 🟢   |
| visas                                | NO_GUARD      | —                                                    | 🟢   |
| esims                                | NO_GUARD      | —                                                    | 🟢   |
| inquiries                            | NO_GUARD      | —                                                    | 🟢   |
| files                                | NO_GUARD      | —                                                    | 🟢   |
| todos                                | NO_GUARD      | —                                                    | 🟢   |
| calendar                             | PARTIAL       | uses `isAdmin` in component                          | 🟢   |
| channel                              | NO_GUARD      | —                                                    | 🟢   |
| monitoring                           | NO_GUARD      | —                                                    | 🟢   |
| war-room                             | NO_GUARD      | —                                                    | 🟢   |
| local/\*                             | NO_GUARD      | —                                                    | 🟢   |
| supplier/\*                          | NO_GUARD      | —                                                    | 🟢   |
| office/\*                            | NO_GUARD      | —                                                    | 🟢   |
| reports/tour-closing                 | NO_GUARD      | —                                                    | 🟢   |
| scheduling                           | NO_GUARD      | —                                                    | 🟢   |
| tenants/\*                           | NO_GUARD      | —                                                    | 🟢   |
| brochure(s)                          | NO_GUARD      | —                                                    | 🟢   |
| ai-bot                               | NO_GUARD      | —                                                    | 🟢   |
| marketing                            | NO_GUARD      | —                                                    | 🟢   |
| tools/flight-itinerary               | NO_GUARD      | —                                                    | 🟢   |
| tools/hotel-voucher                  | NO_GUARD      | —                                                    | 🟢   |
| customized-tours/\*                  | NO_GUARD      | —                                                    | 🟢   |
| page (root dashboard)                | NO_GUARD      | —                                                    | 🟢   |
| login                                | NO_GUARD      | (expected)                                           | —    |
| unauthorized                         | NO_GUARD      | (expected)                                           | —    |

---

## Top 10 High-Risk NO_GUARD Pages

1. **finance/travel-invoice** — 🔴 Legal/financial docs, anyone can create invoices
2. **finance/payments** — 🔴 Money movement, receipt confirmation by any user
3. **finance/treasury** — 🔴 Disbursement, bank data, any user can trigger
4. **accounting/** (10 pages) — 🔴 Trial balance, GL, P&L, journal entries, all unprotected
5. **finance/requests** — 🔴 Payment requests, advance approval
6. **finance/settings** — 🔴 Payment method config, ledger setup
7. **database/workspaces** — 🟡 Workspace management, any user can view/edit
8. **hr/payroll** — 🟡 Salary data, all staff visible
9. **hr/settings** — 🟡 HR module config, any user can edit
10. **settings/workspaces** — 🟡 Workspace settings, any user can modify

---

## Root Cause Analysis

- **No `useTabPermissions` integration**: Zero pages use the official guard hook from `src/lib/permissions/useTabPermissions.tsx`.
- **Hardcode checks only on admin pages**: 5 pages use `!isAdmin` redirect (hr/roles, hr/overtime, settings/company, tools/reset-db, hr/missed-clock).
- **Button-level guards insufficient**: 5 pages hide/show buttons based on `isAdmin` but don't block page entry (finance/payments, hr/announcements, hr/page, calendar, settings/page).
- **Redirects don't guard**: 10 pages use `redirect()` to bounce to other pages—safe pattern but not a guard.
- **PERSONAL pages correctly identified**: 7 pages under `my-*` or `settings/` subpage have legitimate reason to be unguarded (user's own data).

---

## Wave 2 Recommended Ordering

### Batch 1: 🔴 Finance (13 pages) — CRITICAL

Guard with `canRead('finance', tab)` / `canWrite('finance', tab)`:

- finance/travel-invoice, finance/payments, finance/treasury, finance/requests
- finance/reports (all 5 sub-reports)
- finance/settings, finance/page, accounting/\* (10 pages)

**Why first**: Highest legal/compliance risk. Any user can currently create invoices, approve payments, generate financial statements.

### Batch 2: 🟡 HR 系統主管 (11 pages) — HIGH PRIORITY

Guard with `canRead('hr', tab)` / `canWrite('hr', tab)`:

- hr/payroll, hr/settings, hr/reports, hr/training, hr/deductions, hr/leave, hr/attendance
- hr/roles (already has `!isAdmin` → replace with `useTabPermissions`)
- hr/overtime, hr/missed-clock (already have partial hardcode → upgrade)
- hr/page (nav only)

**Why second**: Salary visibility, role assignment, disciplinary records. Sensitive but less legal exposure than finance.

### Batch 3: 🟡 系統主管/Settings (7 pages)

Guard with `canRead('settings', tab)` / `canWrite('settings', tab)`:

- settings/page, settings/company, settings/workspaces, database/workspaces
- tools/reset-db (already has `!isAdmin` → replace with `useTabPermissions`)

**Why third**: Workspace config, company data. Lower business impact than finance/HR.

### Batch 4: 🟢 Operational (21 pages) — LOW PRIORITY

Guard with `canRead('operational', tab)` / `canWrite('operational', tab)`:

- orders, customers, tours, confirmations, visas, esims, contracts, inquiries
- customized-tours, local, supplier, office, reports/tour-closing, scheduling, tenants, brochures, files, todos, calendar, channel, design, monitoring, war-room

**Why last**: These are mostly read-only or team-viewing pages. Less sensitive data exposure.

---

## Implementation Checklist

**Phase A1 (Current)**

- [x] Enumerate all pages
- [x] Classify guard status
- [x] Identify risk tiers

**Phase A2 (Next)**

- [ ] Define module+tab matrix in `MODULES` config (`src/lib/permissions/index.ts`)
- [ ] Map each page to module+tab code
- [ ] Update 13 finance pages (Batch 1)

**Phase A3**

- [ ] Update 11 HR pages (Batch 2)
- [ ] Update 7 系統主管 pages (Batch 3)

**Phase A4**

- [ ] Update 21 operational pages (Batch 4)

**Verification**

- [ ] Run `tests/e2e/login-api.spec.ts` after each batch
- [ ] No guest/沒有系統主管資格 can access guarded pages
- [ ] 系統主管 can still access all pages

---

## Notes

- `PERSONAL` pages (my-attendance, my-leave, my-payslip, settings/appearance, settings/menu, settings/modules, settings/receipt-test) are intentionally unguarded—each user sees only their own data via RLS or Supabase client filters.
- `REDIRECT_ONLY` pages (design, bot-line, finance/reports/monthly-\*) are navigation shortcuts—not security risks.
- None of the 121 pages currently use `useTabPermissions` hook. This is Phase A finding #1.
- Existing `!isAdmin` checks can be kept as fallback but must be wrapped with `useTabPermissions` primary guard.
