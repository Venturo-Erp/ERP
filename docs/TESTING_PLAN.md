# Testing Plan

> Last updated: 2026-02-18

## Current State

- **Unit tests**: 223+ tests covering Zod schemas, LinkPay signature, PNR parsers, code generators, financial services
- All tests use mocked DB (no real Supabase connection)

## Integration Tests (Future)

These require a real or test Supabase database:

### 1. Receipt Creation → Stats Update

- Create a receipt via API
- Verify tour statistics (total_received) updates correctly
- Verify receipt_number auto-generation

### 2. Receipt Deletion → Stats Rollback

- Delete a confirmed receipt
- Verify tour statistics deducts the amount
- Verify linkpay_logs cleanup

### 3. Batch Confirmation → Multi-Order Update

- Create multiple receipts in pending state
- Run batch confirmation
- Verify all orders update to confirmed status
- Verify financial summaries recalculate

### 4. LinkPay Flow

- Create LinkPay request → verify linkpay_logs created
- Simulate webhook callback → verify receipt auto-fill
- Verify receipt stays in "pending confirmation" for accountant review

### 5. Employee Auth Flow

- Create employee auth account
- Validate login with correct/incorrect credentials
- Change password → verify old password invalid
- 系統主管密碼重設 → verify new password works

## Prerequisites for Integration Tests

- Test Supabase project or local Supabase instance
- Seed data scripts for test fixtures
- Test environment configuration (.env.test)
- CI pipeline integration

## Unit Tests Still Needed

- `src/lib/workspace-filter.ts`
- `src/lib/workspace-helpers.ts`
- `src/lib/tasks/task-queue.ts`
- `src/lib/rate-limit.ts`
