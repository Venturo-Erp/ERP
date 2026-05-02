# Endpoint → Capability Mapping (81 routes)

| Path | Method | 推算 capability | 現況 |
|---|---|---|---|
| `/api/accounting/period-closing` | POST | accounting.write | 🔴 無守門 |
| `/api/accounting/vouchers/auto-create` | POST | accounting.write | 🟠 只 auth、未細分 |
| `/api/accounting/vouchers/create` | POST | accounting.write | 🔴 無守門 |
| `/api/ai-settings` | GET | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/ai-settings` | PATCH | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/ai-workflow/execute` | POST | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/ai/edit-image` | GET | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/ai/edit-image` | POST | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/ai/generate-itinerary-copy` | POST | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/ai/suggest-attraction` | POST | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/airports` | POST | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/amadeus-totp` | DELETE | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/amadeus-totp/current` | GET | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/amadeus-totp/setup` | POST | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/auth/change-password` | POST | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/auth/layout-context` | GET | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/auth/logout` | POST | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/auth/reset-employee-password` | POST | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/auth/sync-employee` | POST | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/auth/validate-login` | POST | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/bank-accounts` | GET | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/bank-accounts` | POST | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/bank-accounts` | PUT | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/bank-accounts` | DELETE | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/contracts/[id]/pdf` | GET | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/contracts/create` | POST | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/contracts/list` | GET | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/contracts/members` | GET | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/contracts/paper-sign` | POST | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/contracts/sign` | POST | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/cron/process-tasks` | GET | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/cron/process-tasks` | POST | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/customers/by-line` | GET | database.customers.read | 🔴 無守門 |
| `/api/customers/match` | POST | database.customers.write | 🔴 無守門 |
| `/api/d/[code]` | GET | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/employees/by-ref/[ref]` | GET | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/employees/create` | POST | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/fetch-image` | POST | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/finance/accounting-subjects` | GET | finance.read | 🔴 無守門 |
| `/api/finance/accounting-subjects` | POST | finance.write | 🔴 無守門 |
| `/api/finance/accounting-subjects` | PUT | finance.write | 🔴 無守門 |
| `/api/finance/accounting-subjects` | DELETE | finance.write | 🔴 無守門 |
| `/api/finance/expense-categories` | GET | finance.read | 🔴 無守門 |
| `/api/finance/expense-categories` | POST | finance.write | 🔴 無守門 |
| `/api/finance/expense-categories` | PUT | finance.write | 🔴 無守門 |
| `/api/finance/expense-categories` | DELETE | finance.write | 🔴 無守門 |
| `/api/finance/payment-methods` | GET | finance.read | 🔴 無守門 |
| `/api/finance/payment-methods` | POST | finance.write | 🔴 無守門 |
| `/api/finance/payment-methods` | PUT | finance.write | 🔴 無守門 |
| `/api/finance/payment-methods` | DELETE | finance.write | 🔴 無守門 |
| `/api/gemini/generate-image` | POST | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/health` | GET | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/health/db` | GET | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/health/detailed` | GET | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/itineraries/[id]` | GET | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/itineraries/by-tour/[tourId]` | GET | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/itineraries/generate` | POST | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/job-roles/selector-fields` | GET | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/job-roles/selector-fields` | POST | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/job-roles/selector-fields/[fieldId]` | PUT | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/job-roles/selector-fields/[fieldId]` | DELETE | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/line/connections` | GET | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/line/connections` | PUT | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/line/conversations` | GET | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/line/conversations` | PATCH | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/line/groups` | GET | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/line/knowledge` | GET | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/line/knowledge` | POST | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/line/knowledge/[id]` | PUT | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/line/knowledge/[id]` | DELETE | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/line/messages/[conversationId]` | GET | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/line/messages/[conversationId]` | PATCH | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/line/push` | POST | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/line/setup` | GET | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/line/setup` | POST | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/line/test-ai` | GET | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/line/webhook` | GET | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/line/webhook` | POST | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/line/webhook/[workspaceId]` | GET | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/line/webhook/[workspaceId]` | POST | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/linkpay` | POST | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/linkpay/webhook` | GET | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/linkpay/webhook` | POST | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/log-error` | POST | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/meta/setup` | GET | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/meta/setup` | POST | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/meta/setup` | DELETE | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/meta/webhook` | GET | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/meta/webhook` | POST | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/ocr/passport` | POST | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/ocr/passport/batch-reprocess` | GET | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/ocr/passport/batch-reprocess` | POST | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/orders/create-from-booking` | POST | orders.write | 🔴 無守門 |
| `/api/permissions/features` | GET | — (平台/系統/webhook) | 🟡 getApiContext |
| `/api/permissions/features` | PUT | — (平台/系統/webhook) | 🟡 getApiContext |
| `/api/quotes/confirmation/customer` | GET | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/quotes/confirmation/customer` | POST | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/quotes/confirmation/logs` | GET | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/quotes/confirmation/revoke` | POST | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/quotes/confirmation/send` | POST | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/quotes/confirmation/staff` | POST | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/roles` | GET | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/roles` | POST | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/roles/[roleId]` | DELETE | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/roles/[roleId]/tab-permissions` | GET | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/roles/[roleId]/tab-permissions` | PUT | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/settings/env` | GET | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/storage/upload` | POST | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/storage/upload` | DELETE | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/suppliers` | GET | database.suppliers.read | 🟠 只 auth、未細分 |
| `/api/suppliers` | POST | database.suppliers.write | 🟠 只 auth、未細分 |
| `/api/tasks/create` | POST | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/tenants/create` | POST | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/todo-columns` | GET | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/todo-columns` | POST | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/todo-columns` | PUT | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/todo-columns` | DELETE | — (平台/系統/webhook) | 🔴 無守門 |
| `/api/users/[userId]/role` | GET | — (平台/系統/webhook) | 🟡 getApiContext |
| `/api/workspaces` | GET | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/workspaces` | POST | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/workspaces/[id]` | GET | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
| `/api/workspaces/[id]` | DELETE | — (平台/系統/webhook) | 🟠 只 auth、未細分 |
