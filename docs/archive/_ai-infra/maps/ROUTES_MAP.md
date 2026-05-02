# Routes Map

> 所有頁面路由及其用途。路徑基於 `src/app/(main)/`

---

## Dashboard

| Route      | Purpose                              |
| ---------- | ------------------------------------ |
| /dashboard | 首頁儀表板，顯示本月訂單、收款、待辦 |

## Orders（訂單）

| Route   | Purpose                      |
| ------- | ---------------------------- |
| /orders | 訂單列表（搜尋、篩選、分頁） |

## Tours（出團）

| Route         | Purpose                              |
| ------------- | ------------------------------------ |
| /tours        | 團列表                               |
| /tours/[code] | 單團詳情（團員、行程、需求、確認單） |

## Itinerary（行程）

| Route                   | Purpose    |
| ----------------------- | ---------- |
| /itinerary              | 行程列表   |
| /itinerary/new          | 新增行程   |
| /itinerary/block-editor | 區塊編輯器 |
| /itinerary/print        | 行程列印   |

## Finance（財務）

| Route                                 | Purpose          |
| ------------------------------------- | ---------------- |
| /finance                              | 財務總覽         |
| /finance/payments                     | 收款管理         |
| /finance/requests                     | 請款管理         |
| /finance/treasury                     | 出納             |
| /finance/treasury/disbursement        | 撥款明細         |
| /finance/travel-invoice               | 代收轉付收據列表 |
| /finance/travel-invoice/create        | 開立收據         |
| /finance/travel-invoice/[id]          | 收據詳情         |
| /finance/reports                      | 財務報表         |
| /finance/reports/monthly-income       | 月收入報表       |
| /finance/reports/monthly-disbursement | 月支出報表       |
| /finance/reports/tour-pnl             | 團損益           |
| /finance/reports/unclosed-tours       | 未結團           |
| /finance/reports/unpaid-orders        | 未收款訂單       |

## Quotes（報價）

| Route              | Purpose                  |
| ------------------ | ------------------------ |
| /quotes            | 報價單列表               |
| /quotes/[id]       | 報價單詳情（編輯、版本） |
| /quotes/quick/[id] | 快速報價                 |

## Confirmations（團確單）

| Route               | Purpose    |
| ------------------- | ---------- |
| /confirmations      | 團確單列表 |
| /confirmations/[id] | 團確單詳情 |

## Customers（客戶）

| Route                | Purpose  |
| -------------------- | -------- |
| /customers           | 客戶列表 |
| /customers/companies | 公司客戶 |
| /customer-groups     | 客戶群組 |

## Contracts（合約）

| Route      | Purpose  |
| ---------- | -------- |
| /contracts | 合約列表 |

## Supplier（供應商端）

| Route              | Purpose            |
| ------------------ | ------------------ |
| /supplier/requests | 供應商收到的需求單 |
| /supplier/dispatch | 供應商派遣         |
| /supplier/finance  | 供應商財務         |

## Database（資料庫）

| Route                          | Purpose    |
| ------------------------------ | ---------- |
| /database                      | 資料庫總覽 |
| /database/suppliers            | 供應商資料 |
| /database/attractions          | 景點資料庫 |
| /database/tour-leaders         | 領隊資料   |
| /database/fleet                | 車隊       |
| /database/company-assets       | 公司資產   |
| /database/transportation-rates | 交通費率   |
| /database/archive-management   | 封存管理   |
| /database/workspaces           | 工作區管理 |

## Visa & eSIM

| Route  | Purpose       |
| ------ | ------------- |
| /visas | 簽證管理      |
| /esims | eSIM 銷售管理 |

## Design（手冊設計）

| Route       | Purpose      |
| ----------- | ------------ |
| /design     | 手冊設計列表 |
| /design/new | 新增手冊設計 |
| /brochure   | 手冊檢視     |
| /brochures  | 手冊列表     |

## HR（人事）

| Route          | Purpose  |
| -------------- | -------- |
| /hr            | 人事總覽 |
| /hr/attendance | 出勤     |
| /hr/leave      | 請假     |
| /hr/payroll    | 薪資     |

## Tools（工具）

| Route                   | Purpose              |
| ----------------------- | -------------------- |
| /tools/flight-itinerary | 航班行程產生器       |
| /tools/hotel-voucher    | 飯店 Voucher 產生器  |
| /tools/reset-db         | 資料庫重置（開發用） |

## Meeting（會議，獨立路由）

| Route    | Purpose                         |
| -------- | ------------------------------- |
| /meeting | AI 會議頁面（不在 main layout） |

## About

| Route  | Purpose      |
| ------ | ------------ |
| /about | 關於威拓 ERP |

## Other

| Route                 | Purpose        |
| --------------------- | -------------- |
| /calendar             | 日曆           |
| /scheduling           | 排程           |
| /marketing            | 行銷           |
| /office               | 辦公室         |
| /office/editor        | 辦公室文件編輯 |
| /files                | 檔案管理       |
| /todos                | 待辦事項       |
| /reports/tour-closing | 結團報表       |
| /traveler-chat        | 旅客通訊       |
| /workspace            | 工作區設定     |

## Admin

| Route                 | Purpose                |
| --------------------- | ---------------------- |
| /settings             | 系統設定               |
| /settings/company     | 公司設定               |
| /settings/menu        | 選單設定               |
| /settings/modules     | 模組開關               |
| /settings/permissions | 權限管理               |
| /settings/workspaces  | 工作區管理             |
| /tenants              | 租戶管理（超級管理員） |
| /login                | 登入頁                 |
| /unauthorized         | 無權限頁               |
