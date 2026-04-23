# Venturo ERP 資料庫完整審計報告

> 生成日期：2026-01-12
> 目的：全面審計所有表格的 workspace 隔離、RLS 狀態、命名規範

---

## 一、核心業務表格（需要 workspace 隔離）

### 1.1 旅遊團管理

| 表格                       | 中文名稱   | 功能說明                             | 生命週期                             | workspace_id         | RLS 建議 |
| -------------------------- | ---------- | ------------------------------------ | ------------------------------------ | -------------------- | -------- |
| `tours`                    | 旅遊團     | 團號、出發日期、目的地、人數上限     | 提案轉開團時建立 → 出團完成後歸檔    | ✅ 有                | 啟用     |
| `orders`                   | 訂單       | 客戶訂購記錄，關聯團號和付款         | 開團時建立 → 出團後結算完成          | ✅ 有                | 啟用     |
| `order_members`            | 訂單成員   | 每筆訂單的旅客名單（護照、聯絡方式） | 訂單建立後新增旅客 → 出團後保留      | 透過 order_id        | 啟用     |
| `tour_leaders`             | 領隊指派   | 旅遊團指派的領隊人員                 | 出團前指派 → 出團後記錄保留          | 透過 tour_id         | 啟用     |
| `tour_addons`              | 團體加購   | 旅遊團的額外付費選項（保險、WiFi）   | 開團時設定 → 隨團結束                | ❌ 缺少              | 啟用     |
| `tour_rooms`               | 房間分配   | 旅遊團的住宿房間安排                 | 出團前規劃 → 出團後記錄保留          | 透過 tour_id         | 啟用     |
| `tour_room_assignments`    | 房間人員   | 每個房間的入住旅客                   | 出團前分配 → 可調整至出發            | 透過 tour_room_id    | 啟用     |
| `tour_vehicles`            | 交通安排   | 旅遊團的車輛安排                     | 出團前規劃 → 出團後記錄保留          | 透過 tour_id         | 啟用     |
| `tour_vehicle_assignments` | 車輛人員   | 每台車的乘客分配                     | 出團前分配 → 可調整至出發            | 透過 tour_vehicle_id | 啟用     |
| `tour_departure_data`      | 出發資訊   | 集合時間、地點、注意事項             | 出團前設定 → 出團後保留              | 透過 tour_id         | 啟用     |
| `tour_destinations`        | 行程目的地 | 旅遊團的多目的地設定                 | 開團時設定 → 隨團結束                | 透過 tour_id         | 啟用     |
| `tour_members`             | 團員名單   | 旅遊團的所有成員彙總                 | 訂單成員彙整 → 出團後保留            | 透過 tour_id         | 啟用     |
| `tour_control_forms`       | 團控表     | 領隊用的團控管理表單                 | 出團前建立 → 出團中更新 → 回團後歸檔 | ✅ 有                | 啟用     |
| `tour_documents`           | 團體文件   | 旅遊團相關的文件附件                 | 隨時上傳 → 長期保留                  | ✅ 有                | 啟用     |

### 1.2 提案系統

| 表格                | 中文名稱 | 功能說明                           | 生命週期                          | workspace_id | RLS 建議 |
| ------------------- | -------- | ---------------------------------- | --------------------------------- | ------------ | -------- |
| `proposals`         | 提案     | 客戶詢價的提案記錄                 | 客戶詢價時建立 → 轉開團或封存     | ✅ 有        | 啟用     |
| `proposal_packages` | 團體套件 | 提案的不同版本方案（含報價、行程） | 提案建立後新增版本 → 選定後轉開團 | ❌ 缺少      | 啟用     |

### 1.3 行程與報價

| 表格                      | 中文名稱     | 功能說明                           | 生命週期                               | workspace_id  | RLS 建議 |
| ------------------------- | ------------ | ---------------------------------- | -------------------------------------- | ------------- | -------- |
| `itineraries`             | 行程表       | 每日行程安排（景點、餐食、住宿）   | 提案階段建立 → 開團後更新 → 出團後保留 | ✅ 有         | 啟用     |
| `quotes`                  | 報價單       | 給客戶的報價文件                   | 提案階段建立 → 確認後鎖定              | ✅ 有         | 啟用     |
| `quote_items`             | 報價項目     | 報價單的費用明細                   | 隨報價單建立 → 報價確認後鎖定          | ✅ 有         | 啟用     |
| `quote_versions`          | 報價版本     | 報價單的歷史版本記錄               | 每次修改報價時建立                     | 透過 quote_id | 啟用     |
| `quote_categories`        | 報價分類     | 報價項目的分類（機票、住宿、餐食） | 隨報價單建立                           | 透過 quote_id | 啟用     |
| `quote_regions`           | 報價地區     | 多地區報價設定                     | 隨報價單建立                           | 透過 quote_id | 啟用     |
| `quote_confirmation_logs` | 報價確認記錄 | 客戶確認報價的簽核記錄             | 客戶確認時建立                         | ✅ 有         | 啟用     |
| `confirmations`           | 確認書       | 客戶確認的文件記錄                 | 報價確認後建立                         | ✅ 有         | 啟用     |

### 1.4 需求與採購

| 表格                           | 中文名稱 | 功能說明               | 生命週期                       | workspace_id         | RLS 建議 |
| ------------------------------ | -------- | ---------------------- | ------------------------------ | -------------------- | -------- |
| `tour_requests`                | 需求單   | 向供應商發出的採購需求 | 開團後建立 → 供應商回覆 → 確認 | ✅ 有                | 啟用     |
| `tour_request_items`           | 需求項目 | 需求單的詳細項目       | 隨需求單建立                   | 透過 tour_request_id | 啟用     |
| `tour_request_messages`        | 需求訊息 | 與供應商的溝通記錄     | 隨時新增                       | 透過 tour_request_id | 啟用     |
| `tour_request_member_vouchers` | 成員憑證 | 團員的訂房確認等憑證   | 供應商回覆後建立               | 透過 tour_request_id | 啟用     |
| `request_responses`            | 需求回覆 | 供應商對需求單的回覆   | 供應商回覆時建立               | ✅ 有                | 啟用     |
| `request_response_items`       | 回覆項目 | 回覆的詳細項目         | 隨回覆建立                     | ❌ 缺少              | 啟用     |

### 1.5 財務管理

| 表格                    | 中文名稱     | 功能說明             | 生命週期                        | workspace_id          | RLS 建議 |
| ----------------------- | ------------ | -------------------- | ------------------------------- | --------------------- | -------- |
| `payment_requests`      | 請款單       | 向供應商請款的記錄   | 需求確認後建立 → 付款後結案     | ✅ 有                 | 啟用     |
| `payment_request_items` | 請款項目     | 請款單的費用明細     | 隨請款單建立                    | ✅ 有                 | 啟用     |
| `receipt_orders`        | 收款單       | 客戶付款的收款記錄   | 客戶付款時建立 → 全額收齊後結案 | ✅ 有                 | 啟用     |
| `receipts`              | 收據         | 單筆收款的收據記錄   | 每次收款時建立                  | 透過 receipt_order_id | 啟用     |
| `receipt_payment_items` | 收款項目     | 收據的付款項目明細   | 隨收據建立                      | 透過 receipt_id       | 啟用     |
| `disbursement_orders`   | 出納單       | 公司支出的出納記錄   | 付款時建立 → 核銷後結案         | ✅ 有                 | 啟用     |
| `payments`              | 付款記錄     | 實際付款的交易記錄   | 付款時建立                      | ✅ 有                 | 啟用     |
| `travel_invoices`       | 代收轉付發票 | 旅行業特殊的發票記錄 | 開立發票時建立                  | ✅ 有                 | 啟用     |
| `linkpay_logs`          | 藍新金流記錄 | 線上付款的交易記錄   | 交易時自動建立                  | ✅ 有                 | 啟用     |

### 1.6 會計系統

| 表格                         | 中文名稱   | 功能說明           | 生命週期                        | workspace_id            | RLS 建議 |
| ---------------------------- | ---------- | ------------------ | ------------------------------- | ----------------------- | -------- |
| `journal_vouchers`           | 傳票       | 會計傳票記錄       | 財務事件發生時建立 → 過帳後鎖定 | ✅ 有                   | 啟用     |
| `journal_lines`              | 傳票分錄   | 傳票的借貸分錄明細 | 隨傳票建立                      | 透過 journal_voucher_id | 啟用     |
| `accounting_events`          | 會計事件   | 觸發傳票的業務事件 | 業務操作時自動建立              | ✅ 有                   | 啟用     |
| `chart_of_accounts`          | 會計科目表 | 公司的會計科目設定 | 初始設定 → 長期使用             | ✅ 有                   | 啟用     |
| `posting_rules`              | 過帳規則   | 自動過帳的規則設定 | 初始設定 → 長期使用             | ✅ 有                   | 啟用     |
| `erp_bank_accounts`          | 銀行帳戶   | 公司的銀行帳戶資訊 | 初始設定 → 長期使用             | ✅ 有                   | 啟用     |
| `accounting_period_closings` | 會計期結帳 | 月結、年結記錄     | 每月/年結帳時建立               | ✅ 有                   | 啟用     |

### 1.7 簽證管理

| 表格       | 中文名稱 | 功能說明             | 生命週期                | workspace_id | RLS 建議 |
| ---------- | -------- | -------------------- | ----------------------- | ------------ | -------- |
| `visas`    | 簽證申請 | 客戶的簽證代辦記錄   | 收件時建立 → 取件後結案 | ✅ 有        | 啟用     |
| `usa_esta` | 美國ESTA | 美國電子旅行授權申請 | 申請時建立 → 核准後保留 | ✅ 有        | 啟用     |

### 1.8 PNR/機票系統

| 表格                          | 中文名稱     | 功能說明               | 生命週期                           | workspace_id | RLS 建議 |
| ----------------------------- | ------------ | ---------------------- | ---------------------------------- | ------------ | -------- |
| `pnr_records`                 | PNR記錄      | Amadeus 訂位記錄       | 訂位時建立 → 出票後更新 → 長期保留 | ✅ 有        | 啟用     |
| `pnr_passengers`              | PNR旅客      | 訂位記錄的旅客名單     | 隨 PNR 建立                        | 透過 pnr_id  | 啟用     |
| `pnr_segments`                | 航班段       | 訂位的航班資訊         | 隨 PNR 建立                        | 透過 pnr_id  | 啟用     |
| `pnr_ssr_elements`            | 特殊服務     | 餐食、輪椅等特殊需求   | 隨 PNR 建立或更新                  | 透過 pnr_id  | 啟用     |
| `pnr_remarks`                 | PNR備註      | 訂位的文字備註         | 隨 PNR 建立或更新                  | 透過 pnr_id  | 啟用     |
| `pnrs`                        | 簡易PNR      | 簡化版的訂位記錄       | 快速建立時使用                     | ✅ 有        | 啟用     |
| `pnr_fare_history`            | 票價歷史     | 票價變動追蹤           | 票價變動時自動記錄                 | ✅ 有        | 啟用     |
| `pnr_fare_alerts`             | 票價警報     | 票價變動通知設定       | 使用者設定 → 觸發後通知            | ✅ 有        | 啟用     |
| `pnr_flight_status_history`   | 航班動態歷史 | 航班狀態變更記錄       | 自動追蹤更新                       | ✅ 有        | 啟用     |
| `flight_status_subscriptions` | 航班追蹤訂閱 | 使用者訂閱的航班       | 使用者設定 → 航班結束後刪除        | ✅ 有        | 啟用     |
| `pnr_queue_items`             | PNR佇列      | 待處理的 PNR 項目      | 加入佇列 → 處理後移除              | ✅ 有        | 啟用     |
| `pnr_schedule_changes`        | 航班異動     | 航班時間變更記錄       | 航空公司通知時建立                 | ✅ 有        | 啟用     |
| `pnr_ai_queries`              | AI查詢記錄   | PNR 智慧助手的查詢記錄 | 查詢時建立 → 定期清理              | ✅ 有        | 啟用     |

### 1.9 HR與排班

| 表格                  | 中文名稱     | 功能說明                   | 生命週期                  | workspace_id | RLS 建議 |
| --------------------- | ------------ | -------------------------- | ------------------------- | ------------ | -------- |
| `leader_schedules`    | 領隊排班     | 領隊的值班表               | 每月排班 → 執行後記錄保留 | ✅ 有        | 啟用     |
| `leader_availability` | 領隊可用狀態 | 領隊的可用時段設定         | 領隊自行設定 → 持續更新   | ✅ 有        | 啟用     |
| `attendance_records`  | 出勤記錄     | 員工打卡記錄               | 每日打卡建立 → 月結後歸檔 | ✅ 有        | 啟用     |
| `leave_requests`      | 請假申請     | 員工請假記錄               | 申請時建立 → 核准/駁回    | ✅ 有        | 啟用     |
| `leave_balances`      | 假期餘額     | 員工的假期餘額             | 年初設定 → 請假後扣除     | ✅ 有        | 啟用     |
| `leave_types`         | 假期類型     | 假期種類設定（特休、病假） | 初始設定 → 長期使用       | ✅ 有        | 啟用     |
| `payroll_records`     | 薪資記錄     | 員工月薪計算結果           | 每月計薪時建立            | ✅ 有        | 啟用     |
| `payroll_periods`     | 薪資期間     | 發薪週期設定               | 初始設定 → 長期使用       | ✅ 有        | 啟用     |

### 1.10 車隊管理

| 表格                 | 中文名稱 | 功能說明           | 生命週期                | workspace_id          | RLS 建議 |
| -------------------- | -------- | ------------------ | ----------------------- | --------------------- | -------- |
| `fleet_vehicles`     | 車隊車輛 | 公司車輛登記       | 購入時建立 → 報廢後標記 | ✅ 有                 | 啟用     |
| `fleet_drivers`      | 車隊司機 | 司機人員資料       | 入職時建立 → 離職後標記 | ✅ 有                 | 啟用     |
| `fleet_schedules`    | 車輛排程 | 車輛使用排程       | 出團前建立 → 執行後記錄 | ✅ 有                 | 啟用     |
| `fleet_vehicle_logs` | 車輛日誌 | 車輛維保、里程記錄 | 隨時記錄 → 長期保留     | 透過 fleet_vehicle_id | 啟用     |

### 1.11 協作與溝通

| 表格              | 中文名稱   | 功能說明       | 生命週期                    | workspace_id    | RLS 建議 |
| ----------------- | ---------- | -------------- | --------------------------- | --------------- | -------- |
| `channels`        | 頻道       | 團隊聊天頻道   | 建立後長期使用 → 可封存     | ✅ 有           | 啟用     |
| `channel_members` | 頻道成員   | 頻道的成員權限 | 加入頻道時建立 → 離開時刪除 | 透過 channel_id | 啟用     |
| `channel_threads` | 討論串     | 頻道內的子話題 | 發起討論時建立              | 透過 channel_id | 啟用     |
| `messages`        | 訊息       | 聊天訊息內容   | 發送時建立 → 可刪除         | 透過 channel_id | 啟用     |
| `todos`           | 待辦事項   | 個人或團隊待辦 | 建立 → 完成後標記           | ✅ 有           | 啟用     |
| `calendar_events` | 行事曆事件 | 重要日期提醒   | 建立 → 過期後可刪除         | ✅ 有           | 啟用     |
| `notes`           | 筆記       | 個人筆記       | 隨時建立/更新               | ✅ 有           | 啟用     |

### 1.12 其他業務表格

| 表格                    | 中文名稱   | 功能說明           | 生命週期                  | workspace_id    | RLS 建議 |
| ----------------------- | ---------- | ------------------ | ------------------------- | --------------- | -------- |
| `companies`             | 廠商公司   | 供應商資料         | 建立後長期使用            | ✅ 有           | 啟用     |
| `company_contacts`      | 廠商聯絡人 | 廠商的聯絡窗口     | 隨時新增/更新             | 透過 company_id | 啟用     |
| `company_announcements` | 廠商公告   | 供應商發布的公告   | 發布時建立 → 過期後隱藏   | ✅ 有           | 啟用     |
| `designer_drafts`       | 設計草稿   | 行程設計的草稿     | 設計時建立 → 完成後可刪除 | ✅ 有           | 啟用     |
| `image_library`         | 圖庫       | 行程素材圖片       | 上傳時建立 → 長期保留     | ✅ 有           | 啟用     |
| `airport_images`        | 機場圖片   | 機場相關圖片       | 上傳時建立 → 長期保留     | ✅ 有           | 啟用     |
| `vendor_costs`          | 代辦商成本 | 代辦服務的成本設定 | 設定後長期使用            | ✅ 有           | 啟用     |
| `transportation_rates`  | 交通費率   | 車資費率設定       | 設定後長期使用            | ✅ 有           | 啟用     |

---

## 二、參考資料表格（全公司共用，禁用 RLS）

### 2.1 地理與航空參考

| 表格                  | 中文名稱     | 功能說明               | 資料來源  | workspace_id | RLS 建議 |
| --------------------- | ------------ | ---------------------- | --------- | ------------ | -------- |
| `countries`           | 國家         | 全球國家代碼           | IATA 標準 | ❌ 不需要    | 禁用     |
| `cities`              | 城市         | 全球城市資料           | IATA 標準 | ❌ 不需要    | 禁用     |
| `regions`             | 地區         | 區域分組（亞洲、歐洲） | 自訂分類  | ❌ 不需要    | 禁用     |
| `ref_airports`        | 機場代碼     | 全球機場 IATA/ICAO     | Amadeus   | ❌ 不需要    | 禁用     |
| `ref_airlines`        | 航空公司代碼 | 航空公司 IATA/ICAO     | Amadeus   | ❌ 不需要    | 禁用     |
| `ref_booking_classes` | 艙等代碼     | 機票艙等定義           | Amadeus   | ❌ 不需要    | 禁用     |
| `ref_ssr_codes`       | SSR代碼      | 特殊服務代碼           | Amadeus   | ❌ 不需要    | 禁用     |
| `ref_status_codes`    | 狀態代碼     | PNR 狀態定義           | Amadeus   | ❌ 不需要    | 禁用     |

### 2.2 系統設定

| 表格                    | 中文名稱 | 功能說明     | 資料來源   | workspace_id | RLS 建議 |
| ----------------------- | -------- | ------------ | ---------- | ------------ | -------- |
| `system_settings`       | 系統設定 | 全域系統參數 | 系統主管設定 | ❌ 不需要    | 禁用     |
| `accounting_categories` | 會計分類 | 費用科目分類 | 初始設定   | ❌ 不需要    | 禁用     |
| `accounting_periods`    | 會計期間 | 月份定義     | 初始設定   | ❌ 不需要    | 禁用     |
| `accounting_subjects`   | 會計主體 | 組織結構     | 初始設定   | ❌ 不需要    | 禁用     |

### 2.3 模板資料

| 表格                    | 中文名稱   | 功能說明       | 資料來源   | workspace_id | RLS 建議 |
| ----------------------- | ---------- | -------------- | ---------- | ------------ | -------- |
| `cover_templates`       | 封面模板   | 行程表封面設計 | 設計師上傳 | ❌ 不需要    | 禁用     |
| `daily_templates`       | 日程模板   | 每日行程模板   | 設計師上傳 | ❌ 不需要    | 禁用     |
| `flight_templates`      | 航班模板   | 常用航班模板   | 業務設定   | ❌ 不需要    | 禁用     |
| `hotel_templates`       | 飯店模板   | 常用飯店模板   | 業務設定   | ❌ 不需要    | 禁用     |
| `leader_templates`      | 領隊模板   | 領隊職責模板   | 管理設定   | ❌ 不需要    | 禁用     |
| `cost_templates`        | 成本模板   | 費用估算模板   | 業務設定   | ❌ 不需要    | 禁用     |
| `pricing_templates`     | 定價模板   | 報價定價模板   | 業務設定   | ❌ 不需要    | 禁用     |
| `travel_card_templates` | 旅遊卡模板 | 會員卡設計模板 | 設計師上傳 | ❌ 不需要    | 禁用     |

### 2.4 客戶與供應商（共用資料）

| 表格                        | 中文名稱   | 功能說明          | 說明             | workspace_id  | RLS 建議 |
| --------------------------- | ---------- | ----------------- | ---------------- | ------------- | -------- |
| `customers`                 | 客戶       | 旅客基本資料      | 跨分公司共用客戶 | ✅ 有         | 啟用     |
| `customer_groups`           | 客戶分組   | VIP、一般客戶分類 | 分組管理         | ✅ 有         | 啟用     |
| `customer_group_members`    | 分組成員   | 客戶分組的成員    | 分組管理         | 透過 group_id | 啟用     |
| `suppliers`                 | 供應商     | 食宿交通供應商    | 全公司共用       | ❌ 不需要     | 禁用     |
| `supplier_categories`       | 供應商分類 | 供應商類型        | 全公司共用       | ❌ 不需要     | 禁用     |
| `supplier_price_list`       | 供應商價目 | 供應商報價        | 全公司共用       | ❌ 不需要     | 禁用     |
| `supplier_service_areas`    | 服務範圍   | 供應商服務區域    | 全公司共用       | ❌ 不需要     | 禁用     |
| `supplier_payment_accounts` | 供應商帳戶 | 供應商收款帳戶    | 全公司共用       | ❌ 不需要     | 禁用     |

### 2.5 景點與餐廳

| 表格                   | 中文名稱   | 功能說明       | 資料來源 | workspace_id | RLS 建議 |
| ---------------------- | ---------- | -------------- | -------- | ------------ | -------- |
| `attractions`          | 景點       | 旅遊景點資訊   | 業務建立 | ❌ 不需要    | 禁用     |
| `restaurants`          | 餐廳       | 用餐地點資訊   | 業務建立 | ❌ 不需要    | 禁用     |
| `hotels`               | 飯店       | 住宿飯店資訊   | 業務建立 | ❌ 不需要    | 禁用     |
| `michelin_restaurants` | 米其林餐廳 | 米其林餐廳清單 | 外部資料 | ❌ 不需要    | 禁用     |
| `premium_experiences`  | 高級體驗   | 特色活動項目   | 業務建立 | ❌ 不需要    | 禁用     |

---

## 三、用戶與權限表格

| 表格               | 中文名稱 | 功能說明               | 生命週期                | workspace_id | RLS 建議 |
| ------------------ | -------- | ---------------------- | ----------------------- | ------------ | -------- |
| `workspaces`       | 工作空間 | 公司/分公司            | 系統初始化時建立        | ❌ 不需要    | 禁用     |
| `employees`        | 員工     | 員工帳戶資料           | 入職時建立 → 離職後停用 | ✅ 有        | 啟用     |
| `user_roles`       | 用戶角色 | 角色與權限定義         | 初始設定                | ❌ 不需要    | 禁用     |
| `user_preferences` | 用戶偏好 | 個人設定（語言、主題） | 使用者設定              | ✅ 有        | 啟用     |
| `profiles`         | 個人檔案 | 用戶個人資料           | 註冊時建立              | ✅ 有        | 啟用     |

---

## 四、會員功能表格（venturo-online 共用）

### 4.1 旅客資料

| 表格                            | 中文名稱 | 功能說明       | 生命週期       | workspace_id | RLS 建議 |
| ------------------------------- | -------- | -------------- | -------------- | ------------ | -------- |
| `traveler_profiles`             | 旅客檔案 | 會員個人資料   | 註冊時建立     | ❌ 不需要    | 禁用     |
| `traveler_trips`                | 旅客行程 | 會員購買的行程 | 訂購時建立     | ❌ 不需要    | 禁用     |
| `traveler_trip_members`         | 行程成員 | 同行旅伴       | 訂購時設定     | 透過 trip_id | 禁用     |
| `traveler_trip_flights`         | 行程航班 | 行程的航班資訊 | 出票後同步     | 透過 trip_id | 禁用     |
| `traveler_trip_accommodations`  | 行程住宿 | 行程的住宿資訊 | 確認後同步     | 透過 trip_id | 禁用     |
| `traveler_trip_itinerary_items` | 行程項目 | 每日行程明細   | 出團前同步     | 透過 trip_id | 禁用     |
| `traveler_trip_briefings`       | 行前說明 | 出發前說明事項 | 出團前發布     | 透過 trip_id | 禁用     |
| `traveler_trip_invitations`     | 行程邀請 | 邀請同行的功能 | 發送邀請時建立 | 透過 trip_id | 禁用     |
| `traveler_tour_cache`           | 行程快取 | 效能優化快取   | 自動更新       | ❌ 不需要    | 禁用     |

### 4.2 會員互動

| 表格                            | 中文名稱 | 功能說明     | 生命週期       | workspace_id         | RLS 建議 |
| ------------------------------- | -------- | ------------ | -------------- | -------------------- | -------- |
| `traveler_conversations`        | 旅客群組 | 會員聊天群組 | 出團時建立     | ✅ 有                | 啟用     |
| `traveler_conversation_members` | 群組成員 | 聊天群組成員 | 加入時建立     | 透過 conversation_id | 啟用     |
| `traveler_messages`             | 旅客訊息 | 群組聊天訊息 | 發送時建立     | 透過 conversation_id | 啟用     |
| `traveler_friends`              | 旅客好友 | 會員好友關係 | 加好友時建立   | ❌ 不需要            | 禁用     |
| `customer_travel_cards`         | 會員卡   | 會員點數卡   | 成為會員時建立 | 透過 customer_id     | 禁用     |
| `traveler_badges`               | 旅客徽章 | 會員成就徽章 | 達成條件時授予 | ❌ 不需要            | 禁用     |
| `customer_badges`               | 客戶徽章 | 客戶成就徽章 | 達成條件時授予 | 透過 customer_id     | 禁用     |

### 4.3 分帳功能

| 表格                           | 中文名稱 | 功能說明         | 生命週期       | workspace_id | RLS 建議 |
| ------------------------------ | -------- | ---------------- | -------------- | ------------ | -------- |
| `traveler_expenses`            | 旅客費用 | 行程中的費用記錄 | 旅途中記錄     | ❌ 不需要    | 禁用     |
| `traveler_expense_splits`      | 費用分攤 | 費用分攤計算     | 費用輸入後計算 | ❌ 不需要    | 禁用     |
| `traveler_split_groups`        | 分帳群組 | 分帳的群組設定   | 建立分帳時設定 | ❌ 不需要    | 禁用     |
| `traveler_split_group_members` | 分帳成員 | 分帳群組的成員   | 設定時加入     | ❌ 不需要    | 禁用     |
| `traveler_settlements`         | 結算記錄 | 分帳結算結果     | 結算時建立     | ❌ 不需要    | 禁用     |

---

## 五、輔助功能表格

### 5.1 Timebox 健身追蹤（個人功能）

| 表格                        | 中文名稱 | 功能說明     | workspace_id | RLS 建議 |
| --------------------------- | -------- | ------------ | ------------ | -------- |
| `timebox_boxes`             | 時間盒   | 時間管理區塊 | ❌ 不需要    | 禁用     |
| `timebox_weeks`             | 週計畫   | 每週規劃     | ❌ 不需要    | 禁用     |
| `timebox_schedules`         | 排程     | 排程設定     | ❌ 不需要    | 禁用     |
| `timebox_scheduled_boxes`   | 排程項目 | 排程的時間盒 | ❌ 不需要    | 禁用     |
| `timebox_blocks`            | 區塊     | 時間區塊     | ❌ 不需要    | 禁用     |
| `timebox_workout_templates` | 健身模板 | 運動模板     | ❌ 不需要    | 禁用     |
| `workout_sessions`          | 健身紀錄 | 運動紀錄     | ❌ 不需要    | 禁用     |
| `workout_sets`              | 健身組數 | 運動組數     | ❌ 不需要    | 禁用     |
| `body_measurements`         | 身體量測 | 體重、體脂等 | ❌ 不需要    | 禁用     |
| `fitness_goals`             | 健身目標 | 目標設定     | ❌ 不需要    | 禁用     |
| `progress_photos`           | 進度照片 | 健身照片     | ❌ 不需要    | 禁用     |

### 5.2 系統日誌與監控

| 表格                  | 中文名稱 | 功能說明         | workspace_id | RLS 建議 |
| --------------------- | -------- | ---------------- | ------------ | -------- |
| `api_usage`           | API用量  | API 呼叫統計     | ✅ 有        | 啟用     |
| `api_usage_log`       | API日誌  | API 呼叫詳細記錄 | ✅ 有        | 啟用     |
| `cron_execution_logs` | 排程日誌 | 定時任務執行記錄 | ❌ 不需要    | 禁用     |
| `syncqueue`           | 同步佇列 | 資料同步佇列     | ❌ 不需要    | 禁用     |

---

## 六、修復完成記錄（2026-01-12）

> **所有問題已修復** ✅

### 6.1 缺少 workspace_id 的表格（3 個）✅ 已修復

| 表格                     | 修復方式                                    | Migration                                           |
| ------------------------ | ------------------------------------------- | --------------------------------------------------- |
| `proposal_packages`      | ✅ 新增 workspace_id，從 proposals 回填     | `20260112200000_workspace_isolation_complete.sql`   |
| `tour_addons`            | ✅ 新增 workspace_id，從 tours 回填         | `20260112210000_naming_convention_complete_fix.sql` |
| `request_response_items` | ✅ 新增 workspace_id，從 tour_requests 回填 | `20260112210000_naming_convention_complete_fix.sql` |

### 6.2 欄位命名不符合 snake_case（43 個欄位）✅ 已修復

所有欄位已在 `20260112100000_consolidate_naming_convention.sql` 中修復為 snake_case：

| 表格                    | 已修復欄位                                                                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `payments`              | ✅ created_at, order_id, payment_date, payment_number, payment_type, received_by, tour_id, updated_at                               |
| `price_list_items`      | ✅ created_at, item_code, item_name, minimum_order, supplier_id, unit_price, updated_at, valid_from, valid_until                    |
| `quote_categories`      | ✅ created_at, quote_id, updated_at                                                                                                 |
| `quote_versions`        | ✅ change_note, created_at, created_by, quote_id                                                                                    |
| `receipt_payment_items` | ✅ created_at, item_name, receipt_id                                                                                                |
| `tour_refunds`          | ✅ created_at, member_id, order_id, processed_by, processing_status, refund_amount, refund_date, refund_reason, tour_id, updated_at |
| `payment_request_items` | ✅ unit_price                                                                                                                       |

### 6.3 表格命名不符合規範（2 個）✅ 已修復

| 舊名稱                  | 新名稱                     | Migration                                           |
| ----------------------- | -------------------------- | --------------------------------------------------- |
| `Itinerary_Permissions` | ✅ `itinerary_permissions` | `20260112210000_naming_convention_complete_fix.sql` |
| `Tour_Expenses`         | ✅ `tour_expenses`         | `20260112210000_naming_convention_complete_fix.sql` |

---

## 七、WORKSPACE_SCOPED_TABLES 目前清單

> 更新日期：2026-01-12

以下表格已在 `createCloudHook.ts` 的 `WORKSPACE_SCOPED_TABLES` 中：

```typescript
const WORKSPACE_SCOPED_TABLES = [
  // 旅遊核心
  'tours',
  'orders',
  'visas',
  'tour_addons', // ✅ 2026-01-12 已添加 workspace_id
  'tour_control_forms',
  'tour_documents',

  // 提案系統
  'proposals',
  'proposal_packages', // ✅ 2026-01-12 已添加 workspace_id

  // 行程與報價
  'itineraries',
  'quotes',
  'quote_items',
  'confirmations',
  'quote_confirmation_logs',

  // 需求採購
  'tour_requests',
  'request_responses',
  'request_response_items', // ✅ 2026-01-12 已添加 workspace_id

  // 財務管理
  'payment_requests',
  'payment_request_items',
  'receipt_orders',
  'disbursement_orders',
  'payments',
  'travel_invoices',
  'linkpay_logs',

  // 會計系統
  'journal_vouchers',
  'accounting_events',
  'chart_of_accounts',
  'posting_rules',
  'erp_bank_accounts',
  'accounting_period_closings',

  // PNR 系統
  'pnr_records',
  'pnrs',
  'pnr_fare_history',
  'pnr_fare_alerts',
  'pnr_flight_status_history',
  'flight_status_subscriptions',
  'pnr_queue_items',
  'pnr_schedule_changes',
  'pnr_ai_queries',

  // HR 與排班
  'leader_schedules',
  'leader_availability',
  'attendance_records',
  'leave_requests',
  'leave_balances',
  'leave_types',
  'payroll_records',
  'payroll_periods',

  // 車隊管理
  'fleet_vehicles',
  'fleet_drivers',
  'fleet_schedules',

  // 協作溝通
  'channels',
  'todos',
  'calendar_events',
  'notes',

  // 客戶管理
  'customers',
  'customer_groups',

  // 其他業務
  'companies',
  'company_announcements',
  'designer_drafts',
  'image_library',
  'airport_images',
  'vendor_costs',
  'transportation_rates',

  // 旅客互動
  'traveler_conversations',

  // 系統監控
  'api_usage',
  'api_usage_log',

  // 員工
  'employees',
  'user_preferences',
  'profiles',
]
```

---

## 八、已解決問題（2026-01-12）

1. ✅ **proposal_packages 的 proposal_id = null 情況**：已添加 workspace_id，現在可以透過 workspace_id 做資料隔離，不再依賴 proposal_id 關聯。

2. ✅ **欄位命名修復策略**：43 個欄位已在 `20260112100000_consolidate_naming_convention.sql` 中修復為 snake_case。

3. ✅ **表格命名修復**：`Itinerary_Permissions` 和 `Tour_Expenses` 已重命名為 snake_case。

4. ✅ **workspace_id 添加**：`proposal_packages`、`tour_addons`、`request_response_items` 已添加 workspace_id 欄位。

---

_報告更新日期：2026-01-12_
_所有審計問題已修復 ✅_
