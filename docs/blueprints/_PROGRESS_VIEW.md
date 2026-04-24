# VENTURO 路由自動化進度 VIEW（人讀）

> ⚠️ **這是 view、state 在 `_PROGRESS.json`**。不要人工編輯、由 cron 從 JSON 重新渲染。
> **啟動**: 2026-04-18
> **節奏**: 30 分 / wake
> **當前輪**: 第 1 輪（scope 砍到 12 核心、119 標 BLOCKED_SHALLOW 留第二輪）
> **狀態圖例**: ⚪ 未開始 / 🔵 audit done / 🟡 Blueprint done / 🟢 fix done / ✅ verified / 🔴 blocked / 🛑 DB pending

---

## 🛑 手動停止

放一個空檔 `docs/blueprints/_STOP` 即可、下次 wake 會立即終止。

---

## 🔥 第一批：12 核心（audit 已完、優先 Blueprint + 修）

| #   | 路由                                             | Audit | Blueprint | Fix 🟢   | Verified |
| --- | ------------------------------------------------ | ----- | --------- | -------- | -------- |
| 01  | /login                                           | 🔵    | ⚪        | ⚪       | ⚪       |
| 02  | /dashboard                                       | 🔵    | ⚪        | ⚪       | ⚪       |
| 03  | /tools (flight-itinerary/hotel-voucher/reset-db) | 🔵    | ⚪        | ⚪       | ⚪       |
| 04  | /quotes                                          | 🔵    | ⚪        | ⚪       | ⚪       |
| 05  | /quotes/[id]                                     | 🔵    | ⚪        | ⚪       | ⚪       |
| 06  | /quotes/quick/[id]                               | 🔵    | 🟡        | 🟢 (8條) | ⚪       |
| 07  | /tours                                           | 🔵    | ⚪        | ⚪       | ⚪       |
| 08  | /tours/[code]                                    | 🔵    | ⚪        | ⚪       | ⚪       |
| 09  | /finance/requests                                | 🔵    | ⚪        | ⚪       | ⚪       |
| 10  | /finance/payments                                | 🔵    | ⚪        | ⚪       | ⚪       |
| 11  | /finance/travel-invoice                          | 🔵    | ⚪        | ⚪       | ⚪       |
| 12  | /orders                                          | 🔵    | ⚪        | ⚪       | ⚪       |
| 13  | /customers                                       | 🔵    | ⚪        | ⚪       | ⚪       |
| 14  | /calendar                                        | 🔵    | ⚪        | ⚪       | ⚪       |
| 15  | /channel                                         | 🔵    | ⚪        | ⚪       | ⚪       |

---

## 🟦 第二批：(main) 後台其他路由

### Finance

| 路由                                  | Audit | BP  | Fix | V   |
| ------------------------------------- | ----- | --- | --- | --- |
| /finance                              | ⚪    | ⚪  | ⚪  | ⚪  |
| /finance/settings                     | ⚪    | ⚪  | ⚪  | ⚪  |
| /finance/treasury                     | ⚪    | ⚪  | ⚪  | ⚪  |
| /finance/treasury/disbursement        | ⚪    | ⚪  | ⚪  | ⚪  |
| /finance/travel-invoice/[id]          | ⚪    | ⚪  | ⚪  | ⚪  |
| /finance/travel-invoice/create        | ⚪    | ⚪  | ⚪  | ⚪  |
| /finance/reports                      | ⚪    | ⚪  | ⚪  | ⚪  |
| /finance/reports/monthly-disbursement | ⚪    | ⚪  | ⚪  | ⚪  |
| /finance/reports/monthly-income       | ⚪    | ⚪  | ⚪  | ⚪  |
| /finance/reports/unclosed-tours       | ⚪    | ⚪  | ⚪  | ⚪  |
| /finance/reports/unpaid-orders        | ⚪    | ⚪  | ⚪  | ⚪  |

### Accounting

| 路由                                 | A   | BP  | Fix | V   |
| ------------------------------------ | --- | --- | --- | --- |
| /accounting                          | ⚪  | ⚪  | ⚪  | ⚪  |
| /accounting/accounts                 | ⚪  | ⚪  | ⚪  | ⚪  |
| /accounting/checks                   | ⚪  | ⚪  | ⚪  | ⚪  |
| /accounting/period-closing           | ⚪  | ⚪  | ⚪  | ⚪  |
| /accounting/vouchers                 | ⚪  | ⚪  | ⚪  | ⚪  |
| /accounting/reports                  | ⚪  | ⚪  | ⚪  | ⚪  |
| /accounting/reports/balance-sheet    | ⚪  | ⚪  | ⚪  | ⚪  |
| /accounting/reports/general-ledger   | ⚪  | ⚪  | ⚪  | ⚪  |
| /accounting/reports/income-statement | ⚪  | ⚪  | ⚪  | ⚪  |
| /accounting/reports/trial-balance    | ⚪  | ⚪  | ⚪  | ⚪  |

### HR

| 路由              | A   | BP  | Fix | V   |
| ----------------- | --- | --- | --- | --- |
| /hr               | ⚪  | ⚪  | ⚪  | ⚪  |
| /hr/announcements | ⚪  | ⚪  | ⚪  | ⚪  |
| /hr/attendance    | ⚪  | ⚪  | ⚪  | ⚪  |
| /hr/clock-in      | ⚪  | ⚪  | ⚪  | ⚪  |
| /hr/deductions    | ⚪  | ⚪  | ⚪  | ⚪  |
| /hr/leave         | ⚪  | ⚪  | ⚪  | ⚪  |
| /hr/missed-clock  | ⚪  | ⚪  | ⚪  | ⚪  |
| /hr/my-attendance | ⚪  | ⚪  | ⚪  | ⚪  |
| /hr/my-leave      | ⚪  | ⚪  | ⚪  | ⚪  |
| /hr/my-payslip    | ⚪  | ⚪  | ⚪  | ⚪  |
| /hr/overtime      | ⚪  | ⚪  | ⚪  | ⚪  |
| /hr/payroll       | ⚪  | ⚪  | ⚪  | ⚪  |
| /hr/reports       | ⚪  | ⚪  | ⚪  | ⚪  |
| /hr/roles         | ⚪  | ⚪  | ⚪  | ⚪  |
| /hr/settings      | ⚪  | ⚪  | ⚪  | ⚪  |
| /hr/training      | ⚪  | ⚪  | ⚪  | ⚪  |

### Database / 資料庫管理

| 路由                           | A   | BP  | Fix | V   |
| ------------------------------ | --- | --- | --- | --- |
| /database                      | ⚪  | ⚪  | ⚪  | ⚪  |
| /database/archive-management   | ⚪  | ⚪  | ⚪  | ⚪  |
| /database/attractions          | ⚪  | ⚪  | ⚪  | ⚪  |
| /database/company-assets       | ⚪  | ⚪  | ⚪  | ⚪  |
| /database/fleet                | ⚪  | ⚪  | ⚪  | ⚪  |
| /database/suppliers            | ⚪  | ⚪  | ⚪  | ⚪  |
| /database/tour-leaders         | ⚪  | ⚪  | ⚪  | ⚪  |
| /database/transportation-rates | ⚪  | ⚪  | ⚪  | ⚪  |
| /database/workspaces           | ⚪  | ⚪  | ⚪  | ⚪  |

### Settings

| 路由                   | A   | BP  | Fix | V   |
| ---------------------- | --- | --- | --- | --- |
| /settings              | ⚪  | ⚪  | ⚪  | ⚪  |
| /settings/appearance   | ⚪  | ⚪  | ⚪  | ⚪  |
| /settings/bot-line     | ⚪  | ⚪  | ⚪  | ⚪  |
| /settings/company      | ⚪  | ⚪  | ⚪  | ⚪  |
| /settings/menu         | ⚪  | ⚪  | ⚪  | ⚪  |
| /settings/modules      | ⚪  | ⚪  | ⚪  | ⚪  |
| /settings/receipt-test | ⚪  | ⚪  | ⚪  | ⚪  |
| /settings/workspaces   | ⚪  | ⚪  | ⚪  | ⚪  |

### Supplier

| 路由                    | A   | BP  | Fix | V   |
| ----------------------- | --- | --- | --- | --- |
| /supplier/dispatch      | ⚪  | ⚪  | ⚪  | ⚪  |
| /supplier/finance       | ⚪  | ⚪  | ⚪  | ⚪  |
| /supplier/requests      | ⚪  | ⚪  | ⚪  | ⚪  |
| /supplier/requests/[id] | ⚪  | ⚪  | ⚪  | ⚪  |
| /supplier/trips         | ⚪  | ⚪  | ⚪  | ⚪  |

### Local（地接）

| 路由              | A   | BP  | Fix | V   |
| ----------------- | --- | --- | --- | --- |
| /local            | ⚪  | ⚪  | ⚪  | ⚪  |
| /local/cases      | ⚪  | ⚪  | ⚪  | ⚪  |
| /local/cases/[id] | ⚪  | ⚪  | ⚪  | ⚪  |
| /local/requests   | ⚪  | ⚪  | ⚪  | ⚪  |

### 其他 (main)

| 路由                   | A   | BP  | Fix | V   |
| ---------------------- | --- | --- | --- | --- |
| / (main root)          | ⚪  | ⚪  | ⚪  | ⚪  |
| /ai-bot                | ⚪  | ⚪  | ⚪  | ⚪  |
| /brochure              | ⚪  | ⚪  | ⚪  | ⚪  |
| /brochures             | ⚪  | ⚪  | ⚪  | ⚪  |
| /confirmations         | ⚪  | ⚪  | ⚪  | ⚪  |
| /confirmations/[id]    | ⚪  | ⚪  | ⚪  | ⚪  |
| /contracts             | ⚪  | ⚪  | ⚪  | ⚪  |
| /customers/companies   | ⚪  | ⚪  | ⚪  | ⚪  |
| /customized-tours      | ⚪  | ⚪  | ⚪  | ⚪  |
| /customized-tours/[id] | ⚪  | ⚪  | ⚪  | ⚪  |
| /design                | ⚪  | ⚪  | ⚪  | ⚪  |
| /design/new            | ⚪  | ⚪  | ⚪  | ⚪  |
| /esims                 | ⚪  | ⚪  | ⚪  | ⚪  |
| /files                 | ⚪  | ⚪  | ⚪  | ⚪  |
| /inquiries             | ⚪  | ⚪  | ⚪  | ⚪  |
| /marketing             | ⚪  | ⚪  | ⚪  | ⚪  |
| /monitoring            | ⚪  | ⚪  | ⚪  | ⚪  |
| /office                | ⚪  | ⚪  | ⚪  | ⚪  |
| /office/editor         | ⚪  | ⚪  | ⚪  | ⚪  |
| /reports/tour-closing  | ⚪  | ⚪  | ⚪  | ⚪  |
| /scheduling            | ⚪  | ⚪  | ⚪  | ⚪  |
| /tenants               | ⚪  | ⚪  | ⚪  | ⚪  |
| /tenants/[id]          | ⚪  | ⚪  | ⚪  | ⚪  |
| /todos                 | ⚪  | ⚪  | ⚪  | ⚪  |
| /unauthorized          | ⚪  | ⚪  | ⚪  | ⚪  |
| /visas                 | ⚪  | ⚪  | ⚪  | ⚪  |
| /war-room              | ⚪  | ⚪  | ⚪  | ⚪  |

---

## 🟩 第三批：(public) / public / mobile / root

### (public) 客製/行銷

| 路由                       | A   | BP  | Fix | V   |
| -------------------------- | --- | --- | --- | --- |
| /p/customized              | ⚪  | ⚪  | ⚪  | ⚪  |
| /p/customized/[slug]       | ⚪  | ⚪  | ⚪  | ⚪  |
| /p/customized/track/[code] | ⚪  | ⚪  | ⚪  | ⚪  |
| /p/tour/[code]             | ⚪  | ⚪  | ⚪  | ⚪  |

### Mobile

| 路由            | A   | BP  | Fix | V   |
| --------------- | --- | --- | --- | --- |
| /m              | ⚪  | ⚪  | ⚪  | ⚪  |
| /m/members/[id] | ⚪  | ⚪  | ⚪  | ⚪  |
| /m/profile      | ⚪  | ⚪  | ⚪  | ⚪  |
| /m/search       | ⚪  | ⚪  | ⚪  | ⚪  |
| /m/todos        | ⚪  | ⚪  | ⚪  | ⚪  |
| /m/tours/[id]   | ⚪  | ⚪  | ⚪  | ⚪  |
| /m/workbench    | ⚪  | ⚪  | ⚪  | ⚪  |

### public 供應商 / 客戶

| 路由                                             | A   | BP  | Fix | V   |
| ------------------------------------------------ | --- | --- | --- | --- |
| /public/accommodation-quote/[tourId]/[requestId] | ⚪  | ⚪  | ⚪  | ⚪  |
| /public/activity-quote/[tourId]/[requestId]      | ⚪  | ⚪  | ⚪  | ⚪  |
| /public/booking/[tourCode]                       | ⚪  | ⚪  | ⚪  | ⚪  |
| /public/contract/sign/[code]                     | ⚪  | ⚪  | ⚪  | ⚪  |
| /public/insurance/[code]                         | ⚪  | ⚪  | ⚪  | ⚪  |
| /public/itinerary/[tourCode]                     | ⚪  | ⚪  | ⚪  | ⚪  |
| /public/meal-quote/[tourId]/[requestId]          | ⚪  | ⚪  | ⚪  | ⚪  |
| /public/request/[token]                          | ⚪  | ⚪  | ⚪  | ⚪  |
| /public/transport-quote/[tourId]                 | ⚪  | ⚪  | ⚪  | ⚪  |
| /public/transport-quote/[tourId]/[requestId]     | ⚪  | ⚪  | ⚪  | ⚪  |

### 根路由

| 路由                    | A   | BP  | Fix | V   |
| ----------------------- | --- | --- | --- | --- |
| /about                  | ⚪  | ⚪  | ⚪  | ⚪  |
| /confirm/[token]        | ⚪  | ⚪  | ⚪  | ⚪  |
| /landing                | ⚪  | ⚪  | ⚪  | ⚪  |
| /transport/[id]/confirm | ⚪  | ⚪  | ⚪  | ⚪  |
| /view/[id]              | ⚪  | ⚪  | ⚪  | ⚪  |

---

## 📊 統計（cron 每輪更新）

| 指標            | 當前     |
| --------------- | -------- |
| Audit 🔵/✅     | 15 / 134 |
| Blueprint 🟡/✅ | 1 / 134  |
| Fix 🟢/✅       | 1 / 134  |
| Verified ✅     | 0 / 134  |
| Blocked 🔴      | 0        |
| DB pending 🛑   | 0        |
