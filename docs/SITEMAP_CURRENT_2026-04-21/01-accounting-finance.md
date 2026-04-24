# 會計+財務模組 Sitemap（現況 2026-04-21）

## 會計模組概念

會計模組是帳務核心，負責「記帳→查帳→結帳」全流程。操作對象是科目表、傳票、票據、期末結轉，最後產出試算表、損益表、總帳、資產負債表等帳務基本報表。主要使用者是會計人員，關鍵動作是建立傳票（借貸分錄）、確認金額、月結/年結，確保帳務借貸平衡。這裡的資料直接餵入財務報表，所以精準性最高。

## 財務模組概念

財務模組是現金流管理，負責「收款→請款→撥款→報告」。操作對象是代轉發票、收款單、請款單、撥款單，以及現金池狀態（本月收入、支出、餘額、待確認項）。主要使用者是出納/財務人員，關鍵動作是產生收款連結（LinkPay）、確認實收金額、核准請款單、下帳撥款。與會計的界限：財務記錄「錢進進出出」，會計記錄「怎麼記帳」，一個收款單可能對應會計上的多筆傳票。

---

## 頁面清單

### /accounting

- **標題**：會計系統
- **做什麼**：會計模組首頁，快速連結到五大功能（傳票、科目、報表、票據、期末結轉），並顯示本月統計卡片（本月傳票數、未兌現支票、本月淨利）。進入時自動檢查科目表是否為空，若為空自動初始化。
- **主要資料**：chart_of_accounts（科目表初始化檢查）
- **主要動作**：點擊卡片進入各子功能；自動初始化科目表
- **紅旗**：自動初始化邏輯在頁面 useEffect 中執行（初載時偶發呼叫 API），無錯誤邊界

### /accounting/accounts

- **標題**：會計科目管理（共 N 個科目）
- **做什麼**：階層科目表編輯，支援展開/折疊、新增子科目、常用標記、啟用/停用。科目按 code 排序、代碼長度決定層級（1 碼=大類、2 碼=中類、4 碼=明細、帶減號=子明細），支援樹狀縮排顯示。
- **主要資料**：chart_of_accounts（id, code, name, account_type, parent_id, is_favorite, is_system_locked）
- **主要動作**：新增科目、編輯科目（CreateAccountDialog、EditAccountDialog）、標記常用、全部展開/折疊
- **紅旗**：is_favorite 欄位在 DB 可能缺失（預設 false）；CreateAccountDialog、EditAccountDialog 元件未讀取故不確定實作完成度

### /accounting/checks

- **標題**：票據管理
- **做什麼**：支票及票據生命週期管理，追蹤開票日、到期日、支票號碼、受款人、金額、狀態（未兌現/已兌現/作廢/退票），頁面頂部顯示統計卡片（未兌現支票數、未兌現金額、逾期支票數），未兌現支票可標記為已兌現或作廢。
- **主要資料**：checks（check_number, check_date, due_date, amount, payee_name, status, memo）
- **主要動作**：新增票據、標記已兌現、作廢、檢視詳情
- **紅旗**：注釋掉的 Supabase 查詢（37~57 行）、setChecks([]) 暫時返回空陣列（第 59 行），功能未實裝；CreateCheckDialog 元件未讀取

### /accounting/vouchers

- **標題**：傳票管理
- **做什麼**：會計傳票（日記帳）管理，記錄所有的借貸分錄。支援依日期、狀態（草稿/已過帳/已反沖/已鎖定）篩選，傳票包含傳票號、日期、說明、借方總額、貸方總額、狀態，已過帳傳票可反沖（產生反沖傳票）。
- **主要資料**：journal_vouchers、journal_lines（關連查詢取得明細）
- **主要動作**：新增傳票（CreateVoucherDialog）、檢視詳情（VoucherDetailDialog）、反沖
- **紅旗**：handleReverse 函數為空（第 184 行）；反沖邏輯未實裝

### /accounting/period-closing

- **標題**：期末結轉
- **做什麼**：月結、季結、年結流程頁面。選擇期間類型及時間，系統會計算該期損益科目餘額並結轉到「本期損益」，年結時額外結轉到「保留盈餘」，同時生成結轉傳票（已鎖定狀態，防重複結轉）。頁面下方顯示結轉歷史（期間、淨利/淨損、結轉時間）。
- **主要資料**：accounting_period_closings、journal_vouchers（會動作 API：/api/accounting/period-closing）
- **主要動作**：執行結轉（POST /api/accounting/period-closing）、查看結轉歷史
- **紅旗**：月選擇為全年 12 月，無該月檢驗；年份下拉只列前 5 年（無客製範圍選項）；結轉後自動重載但無成功提示

### /accounting/reports

- **標題**：會計報表
- **做什麼**：報表模組首頁，四個卡片快速連結（總帳、試算表、損益表、資產負債表），純導航頁。
- **主要資料**：無（只是連結）
- **主要動作**：點擊進入各報表
- **紅旗**：無明顯

### /accounting/reports/trial-balance

- **標題**：試算表
- **做什麼**：按截止日期查詢所有科目的借貸合計及餘額。結果按科目類型分組，頁面下方檢查借貸是否平衡，若不平衡顯示警告。只顯示有交易的科目。
- **主要資料**：chart_of_accounts、journal_lines（joined with journal_vouchers）
- **主要動作**：選擇截止日期、查詢
- **紅旗**：日期預設為「今天」，不建議；query 時在 journal_lines 內用 lte voucher.voucher_date，但未先篩選 is_active=true 的科目

### /accounting/reports/income-statement

- **標題**：損益表
- **做什麼**：期間內（開始~結束日期）的損益報告，列示營業收入、營業成本、毛利、營業費用、淨利，並計算毛利率、淨利率。取絕對值顯示成本/費用（用括號表示負數）。
- **主要資料**：chart_of_accounts（revenue, cost, expense）、journal_lines
- **主要動作**：選擇開始/結束日期、查詢
- **紅旗**：預設日期為「本月」，邏輯正確；無明顯

### /accounting/reports/general-ledger

- **標題**：總帳
- **做什麼**：單一科目的詳細分錄記錄，含日期、傳票號、摘要、借方、貸方、累計餘額。主要供會計人員逐筆審核特定科目。
- **主要資料**：chart_of_accounts（供選擇）、journal_lines（joined with journal_vouchers）
- **主要動作**：選擇科目、選擇日期範圍、查詢
- **紅旗**：預設選中第一個科目（自動載入）；無明顯

### /accounting/reports/balance-sheet

- **標題**：資產負債表
- **做什麼**：截至指定日期的資產、負債、權益狀況。頁面分左右：左側資產、右側負債+權益。額外計算本期損益（年初至今的收入-費用），加入權益合計。頁面下方驗證會計等式（資產 = 負債+權益）。
- **主要資料**：chart_of_accounts（asset, liability, equity, revenue, cost, expense）、journal_lines
- **主要動作**：選擇截止日期、查詢
- **紅旗**：本期損益計算分開查詢損益科目（額外執行 query），效率一般；計算邏輯正確但複雜

---

## 頁面清單（續）

### /finance

- **標題**：財務系統
- **做什麼**：財務模組首頁，四個統計卡片（本月收入、本月支出、淨利、待確認款項），三個功能模組卡片（收款管理、金庫、報表），以及近期交易列表（交易類型、金額、日期）。交易列表來自 useAccountingStore（transactions）。
- **主要資料**：useAccountingStore（transactions, stats）、useReceipts（receipts.filter status===0）
- **主要動作**：點擊卡片進入子模組、查看近期交易列表
- **紅旗**：待確認款項用 receipts.filter(r => r.status === '0')，字串比對；stats 物件命名不清（total_income 名稱 vs 實際用途）；FINANCE_PAGE_LABELS 常數從外部 import

### /finance/travel-invoice

- **標題**：代轉發票管理
- **做什麼**：開立、管理代轉電子發票，追蹤發票狀態（待開立/預排/已開立/作廢/允存/失敗），支援單筆開立或批次開立，發票資訊包含交易單號、發票號碼、開立日期、買受人、金額、狀態。
- **主要資料**：useTravelInvoiceStore（invoices）、useToursListSlim（tours，用於批次開立時的選項）
- **主要動作**：新增發票（InvoiceDialog）、檢視詳情（TravelInvoiceDetailDialog）、批次開立（BatchInvoiceDialog）
- **紅旗**：無明顯

### /finance/travel-invoice/create

- **標題**：開立代轉發票
- **做什麼**：逐項填入發票資訊（基本資訊、買受人資訊、商品明細）並計算小計，最後送出開立。支援手動加減商品行，自動計算行金額、總金額。
- **主要資料**：TravelInvoiceItem（item_name, item_count, item_unit, item_price, itemAmt）、BuyerInfo（buyerName, buyerUBN, buyerAddress, buyerEmail, buyerMobileCode, buyerMobile, carrierType, carrierNum, loveCode, printFlag）
- **主要動作**：填寫表單、新增商品行、移除商品行、送出（issueInvoice）
- **紅旗**：addItem 有初始狀態硬編碼（UNIT_LABEL）；商品備註限制 50 字（maxLength=50）但無前端驗證

### /finance/travel-invoice/[id]

- **標題**：[發票交易單號]
- **做什麼**：發票詳情頁，顯示基本資訊、買受人資訊、商品明細、發票號碼/隨機碼/條碼（已開立時），以及作廢資訊（已作廢時）。已開立狀態可執行作廢（填入作廢原因）。
- **主要資料**：useTravelInvoiceStore（currentInvoice）
- **主要動作**：作廢發票（填入原因、確認）
- **紅旗**：fetchInvoiceById 結果存在 currentInvoice（指 store state），若為空時判定 notFound；無驗證 Invoice 是否存在

### /finance/treasury

- **標題**：金庫總覽
- **做什麼**：財務快照頁，本月統計四卡（本月收入、本月支出、本月餘額、待處理撥款數），快速連結三按鈕（收款管理、請款管理、撥款管理），近期交易表（收款+請款合併，按日期倒序，最多 50 筆）。
- **主要資料**：useReceipts、usePaymentRequests、useDisbursementOrders
- **主要動作**：點擊快速連結、點擊交易列表行進入詳情（收款→/finance/payments，請款→/finance/requests）
- **紅旗**：近期交易合併邏輯手動拼接（transactions 陣列），無分頁（slice(0,30) 硬編碼）

### /finance/treasury/disbursement

- **標題**：撥款管理
- **做什麼**：出納單（Disbursement Order）管理。根據 page.tsx 只有一行 export，實作在 @/features/disbursement。
- **主要資料**：不詳（need check feature file）
- **主要動作**：不詳
- **紅旗**：實作委託 feature，無法直接審閱

### /finance/payments

- **標題**：收款管理
- **做什麼**：收款單（Receipt）管理，支援五種收款方式（現金/匯款/刷卡/支票/LinkPay），列表顯示收款單號、日期、訂單號、團名、收款金額、實收金額、方式、狀態。待確認狀態可核准或標記異常，確認後變成已確認狀態。支援編輯（待確認時可編輯，已確認時僅檢視）、刪除、批次收款。
- **主要資料**：Receipt（receipt_number, receipt_date, receipt_account, tour_name, receipt_amount, actual_amount, payment_method, status）、usePaymentData hook（管理收款資料及業務邏輯）
- **主要動作**：新增收款（AddReceiptDialog）、編輯、核准/異常標記、刪除、批次處理（BatchReceiptDialog）、批次確認
- **紅旗**：URL 參數 order_id 可自動開啟新增對話框（快速收款），但關閉後需清除參數；handleConfirmReceipt 邏輯未讀取

### /finance/requests

- **標題**：請款管理
- **做什麼**：請款單（Payment Request）管理，支援按團、按供應商請款，列表顯示單號、日期、請款人、金額、狀態。狀態流程未詳述，需讀 hook/component。
- **主要資料**：PaymentRequest（code, request_number, request_date, supplier_name, tour_name, amount, status）、usePayments hook
- **主要動作**：新增請款（AddRequestDialog）、編輯
- **紅旗**：URL 參數 tour_id 可自動開啟新增（快速請款），邏輯與收款類似；useRequestTable hook 未讀取故欄位不詳

### /finance/reports

- **標題**：財務報表
- **做什麼**：財務報告首頁，六個 tab（收支總覽/請款報表/收款報表/未結團/未收款/損益表）。每個 tab 支援日期範圍篩選（除 unclosed/unpaid/pnl），收支總覽額外支援細節顆粒度選擇（按筆/按日/按團/按供應商）。
- **主要資料**：各 tab 各自查詢不同資料（見各 tab component）
- **主要動作**：切換 tab、選擇日期、選擇顆粒度、查看報表
- **紅旗**：NO_DATE_TABS 和 GRANULARITY_TABS 白名單決定顯示，邏輯正確但若新增 tab 需同步更新

### /finance/reports/monthly-income

- **標題**：無（重導頁）
- **做什麼**：重導到 /finance/reports?tab=income
- **主要資料**：無
- **主要動作**：自動重導
- **紅旗**：無

### /finance/reports/monthly-disbursement

- **標題**：無（重導頁）
- **做什麼**：重導到 /finance/reports?tab=disbursement
- **主要資料**：無
- **主要動作**：自動重導
- **紅旗**：無

### /finance/reports/unclosed-tours

- **標題**：無（重導頁）
- **做什麼**：重導到 /finance/reports?tab=unclosed
- **主要資料**：無
- **主要動作**：自動重導
- **紅旗**：無

### /finance/reports/unpaid-orders

- **標題**：未收款訂單
- **做什麼**：查詢未完全付款的訂單（payment_status = unpaid/partial/pending_deposit），按出發日期倒序，支援篩選（全部/逾期/未付/部分付/待定金）。表格顯示訂單號、聯絡人、團代碼、出發日、支付狀態、合計金額、已付金額、待收金額、出發天數（超期醒目）。頁面上方顯示待收總額。
- **主要資料**：orders（與 tours 關連取出發日期），計算邏輯（今日 - 出發日 = 超期天數）
- **主要動作**：篩選、搜尋、排序
- **紅旗**：尋日期時在客戶端計算（getTime() 差值），未考慮時區

### /finance/settings

- **標題**：財務設定
- **做什麼**：財務模組組態中心，七個 tab（收款方式/付款方式/團體請款類別/公司支出項目/公司收入項目/銀行帳戶/獎金設定）。前五個支援 CRUD，每項可綁定會計科目（借方/貸方），排序可自訂，系統預設項無法刪除。銀行帳戶可標記預設。獎金設定未開放（「即將推出」）。
- **主要資料**：payment_methods、bank_accounts、chart_of_accounts、expense_categories
- **主要動作**：新增/編輯/刪除方式、帳戶、類別；啟用/停用方式
- **紅旗**：MethodDialog、BankDialog、CategoryDialog 三個對話框內嵌在同一檔案（1432 行），結構冗長；科目篩選邏輯在 CategoryDialog 內硬編碼（code.startsWith('1/2/4/5')），非常脆弱

---

## 共通紅旗

1. **已實裝但未完成的功能**
   - checks 頁面：查詢邏輯全註釋，暫時空陣列
   - vouchers 反沖：handleReverse 為空函數
   - 諸多 Dialog 元件（CreateAccountDialog、EditAccountDialog、CreateCheckDialog 等）未讀取，無法確認實裝狀態

2. **硬編碼與脆弱邏輯**
   - expense_categories 科目篩選用 code.startsWith()，假設科目 code 規律性
   - 日期預設為「今天」而非合理業務日期
   - 近期交易 slice(0,30) 無分頁

3. **跨模組資料邊界模糊**
   - /finance 首頁用 useAccountingStore 查 transactions，但這通常是會計概念
   - finance/treasury 合併 receipts + payment_requests，但兩者資料來源、狀態管理分散

4. **缺漏驗證與邊界處理**
   - period-closing 無月份範圍驗證
   - travel-invoice 修改時無樂觀更新確認
   - unpaid-orders 時區計算未考慮

---

## 會計 vs 財務模組概念模糊之處

### 邊界問題

1. **傳票 vs 收款/請款**：會計的傳票（journal_vouchers）何時與財務的收款/請款單同步？目前似乎分離（頁面分開、資料來源分開），未見明確「確認收款 → 自動產生傳票」的流程。

2. **科目 vs 支付方式科目綁定**：支付方式可綁定借/貸科目（settings 頁），但建立收款單時如何自動產生傳票？邏輯未在頁面體現。

3. **期末結轉只在會計層**：財務報表（損益/資產負債）似乎是從 journal_lines 計算，不是從結轉後的餘額計算。若未結轉，報表數字可能與帳務不符。

### 建議澄清方向

- 確認「收款單確認 → 自動/手動產生傳票」的流程及擁有者
- 明確「財務報表」與「會計報表」的資料源差異（是否都來自 journal_lines）
- 統一科目編碼規律（目前假設 1=資產、2=負債、4=收入、5=費用）
