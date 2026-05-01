// Finance module labels
export const FinanceLabels = {
  // Travel Invoice Create Page
  invoiceCreateTitle: '開立新發票',
  basicInfo: '基本資訊',
  issueDate: '開立日期',
  selectDate: '選擇日期',
  taxType: '課稅別',
  selectTaxType: '選擇課稅別',
  dutiable: '應稅',
  zeroRate: '零稅率',
  taxFree: '免稅',
  reportStatus: '申報註記',
  unreported: '未申報',
  reported: '已申報',
  buyerInfo: '買受人資訊',
  buyerName: '買受人名稱',
  buyerNameRequired: '買受人名稱 *',
  enterBuyerName: '請輸入買受人名稱',
  unifiedBusinessNumber: '統一編號',
  ubnPlaceholder: '8 碼數字',
  email: 'Email',
  emailForReceipt: '用於寄送電子收據',
  mobileNumber: '手機號碼',
  mobilePlaceholder: '09xxxxxxxx',
  productDetails: '商品明細',
  summary: '摘要',
  quantity: '數量',
  unitPrice: '單價',
  unit: '單位',
  amount: '金額',
  handle: '處理',
  productName: '商品名稱',
  addRow: '新增一列',
  remarks: '備註',
  remarksPlaceholder: '請輸入備註（限 50 字）',
  remarksNote: '可輸入大小寫英文、中文（限 50 字，不可輸入符號，例如：/ , - = 等）',
  total: '總計',
  cancel: '取消',
  issuing: '開立中...',
  issueInvoice: '開立發票',
  enterBuyerNameError: '請輸入買受人名稱',
  completeProductInfoError: '請完整填寫商品資訊',
  unknownError: '發生未知錯誤',

  // Payments Page
  paymentManagement: '收款管理',
  searchReceiptPlaceholder: '搜尋收款單號、團名...',
  exportExcel: '匯出 Excel',
  batchConfirm: '批量確認',
  batchPayment: '批量收款',
  addPayment: '新增收款',
  receiptNumber: '收款單號',
  receiptDate: '收款日期',
  orderNumber: '收款明細',
  tourName: '團名',
  receiptAmount: '應收金額',
  actualAmount: '實收金額',
  status: '狀態',
  paymentMethod: '收款方式',
  actions: '操作',
  edit: '編輯',
  view: '檢視',
  createReceiptFailedPrefix: '建立收款單失敗',
  createReceiptFailedTitle: '建立收款單失敗',
}
export const FINANCE_PAGE_LABELS = {
  LOADING_DATA: '正在載入財務資料...',
  TOTAL_INCOME: '總收入',
  TOTAL_EXPENSE: '總支出',
  NET_PROFIT: '淨利潤',
  PENDING_ITEMS: '待確認款項',
  TRANSACTION_RECORDS: '交易紀錄',

  MANAGE_8421: '財務管理中心',
  LABEL_5163: '上一頁',
  LABEL_9383: '下一頁',

  // Column labels
  COL_TYPE: '類型',
  COL_DESCRIPTION: '說明',
  COL_AMOUNT: '金額',
  COL_DATE: '日期',
  TYPE_INCOME: '收入',
  TYPE_EXPENSE: '支出',
  TYPE_TRANSFER: '轉帳',

  // Module cards
  MODULE_FINANCE_TITLE: '財務管理',
  MODULE_FINANCE_DESC: '管理所有收款和請款記錄',
  MODULE_FINANCE_STATS: (count: number) => `${count} 筆記錄`,
  MODULE_TREASURY_TITLE: '出納管理',
  MODULE_TREASURY_DESC: '日常收支與現金流管理',
  MODULE_TREASURY_STATS: '即時現金流',
  MODULE_REPORTS_TITLE: '報表管理',
  MODULE_REPORTS_DESC: '財務分析與統計報表',
  MODULE_REPORTS_STATS: '即時財務分析',

  // Pagination
  PAGINATION_SUMMARY: (total: number, page: number, totalPages: number) =>
    `共 ${total} 筆交易，目前在第 ${page} / ${totalPages} 頁`,
}

const BATCH_CONFIRM_LABELS = {
  NO_PENDING_ITEMS: '沒有待確認的收款品項',
  ALL_CONFIRMED: '所有收款品項都已確認完成',

  CONFIRM_2930: '批量確認收款',
  LABEL_6427: '收款單號',
  LABEL_7017: '訂單編號',
  LABEL_4272: '團名',
  LABEL_5187: '收款方式',
  LABEL_6261: '應收金額',
  LABEL_8417: '實收金額',
  CONFIRM_4237: '部分收款品項的實收金額與應收金額不同，請確認',
  CANCEL: '取消',

  SELECT_AT_LEAST_ONE: '請至少選擇一筆收款品項',
  ACTUAL_AMOUNT_ZERO: '實收金額不能為 0',
  UNKNOWN_ERROR: '未知錯誤',
  CONFIRM_SUCCESS: (count: number) => `成功確認 ${count} 筆收款品項`,
  CONFIRM_FAILED: (numbers: string) => `確認失敗：${numbers}`,
  CONFIRM_PARTIAL: (success: number, failed: number, numbers: string) =>
    `成功確認 ${success} 筆\n失敗 ${failed} 筆：${numbers}`,
  CONFIRMING: '確認中...',
  CONFIRM_N_RECEIPTS: (count: number) => `確認 ${count} 筆收款`,
  SELECTED_STATS: (selected: number, total: number) => `已選擇 ${selected} / ${total} 筆`,
  TOTAL_PREFIX: '總計：',
}

const TOUR_PNL_LABELS = {
  INCOME: '收入',
  COST: '成本',
  GROSS_PROFIT: '毛利',
  ALL_STATUS: '全部狀態',
  CONFIRMED: '已確認',
  OPERATING: '出團中',
  COMPLETED: '已完成',
  CLOSED: '已結團',

  TOTAL_2832: '團收支總覽',

  // Status map
  STATUS_DRAFT: '草稿',
  STATUS_CONFIRMED: '已確認',
  STATUS_OPERATING: '出團中',
  STATUS_COMPLETED: '已完成',
  STATUS_CLOSED: '已結團',
  STATUS_CANCELLED: '已取消',

  // Column labels
  COL_TOUR_CODE: '團號',
  COL_TOUR_NAME: '團名',
  COL_DEPARTURE_DATE: '出發日',
  COL_PARTICIPANTS: '人數',
  COL_STATUS: '狀態',
  COL_REVENUE: '收入',
  COL_COST: '成本',
  COL_PROFIT: '毛利',
  COL_MARGIN: '毛利率',

  // Breadcrumb
  BREADCRUMB_HOME: '首頁',
  BREADCRUMB_FINANCE: '財務',
  BREADCRUMB_REPORTS: '報表管理',

  // Toast
  TOAST_LOAD_FAILED: '載入團收支資料失敗',

  // Search
  SEARCH_PLACEHOLDER: '搜尋團號、團名...',
}

const UNCLOSED_TOURS_LABELS = {
  DESCRIPTION: '此報表顯示<strong>回程日 + 7 天已過</strong>但尚未執行結團的團體。',
  DESCRIPTION_SUFFIX: '建議儘快完成結團作業以確保財務數據準確。',

  LABEL_996: '未結團團體報表',
  LABEL_9947: '未結團團體數',
  TOTAL_7262: '總收入',
  TOTAL_582: '總支出',
  TOTAL_8800: '總利潤',
  LABEL_332: '未結團團體列表',

  // Column labels
  COL_TOUR_CODE: '團號',
  COL_TOUR_NAME: '團名',
  COL_RETURN_DATE: '回程日',
  COL_EXPECTED_CLOSING_DATE: '應結團日',
  COL_DAYS_OVERDUE: '逾期天數',
  COL_TOTAL_REVENUE: '總收入',
  COL_TOTAL_COST: '總支出',
  COL_PROFIT: '利潤',
  COL_STATUS: '狀態',
  DAYS_SUFFIX: ' 天',
  STATUS_DEFAULT: '待出發',

  // Breadcrumb
  BREADCRUMB_HOME: '首頁',
  BREADCRUMB_FINANCE: '財務',
  BREADCRUMB_REPORTS: '報表管理',

  // Table
  EMPTY_MESSAGE: '目前沒有需要結團的團體',
  SEARCH_PLACEHOLDER: '搜尋團號或團名...',
}

export const UNPAID_ORDERS_LABELS = {
  TODAY: '今天',
  NOT_DEPARTED: '尚未出發',
  ALL: '全部',
  OVERDUE: '已出發未收',
  UNPAID: '完全未付',
  PARTIAL: '部分付款',
  PENDING_DEPOSIT: '待收訂金',

  LABEL_1474: '未收款報表',
  DAYS_SUFFIX: ' 天',
  TOTAL_REMAINING_PREFIX: '未收總額：',

  // Payment status map
  STATUS_UNPAID: '未付款',
  STATUS_PARTIAL: '部分付款',
  STATUS_PENDING_DEPOSIT: '待收訂金',

  // Column labels
  COL_ORDER_NUMBER: '訂單編號',
  COL_CONTACT_PERSON: '聯絡人',
  COL_TOUR_CODE: '團號',
  COL_DEPARTURE_DATE: '出發日',
  COL_PAYMENT_STATUS: '付款狀態',
  COL_TOTAL_AMOUNT: '訂單金額',
  COL_PAID_AMOUNT: '已收金額',
  COL_REMAINING_AMOUNT: '未收金額',
  COL_DAYS_SINCE_DEPARTURE: '出發後天數',

  // Breadcrumb
  BREADCRUMB_HOME: '首頁',
  BREADCRUMB_FINANCE: '財務',
  BREADCRUMB_REPORTS: '報表管理',

  // Toast
  TOAST_LOAD_FAILED: '載入未收款資料失敗',

  // Search
  SEARCH_PLACEHOLDER: '搜尋訂單編號、聯絡人、團號...',

  // Count suffix
  COUNT_SUFFIX: ' 筆',
}

export const PAYMENT_DATA_LABELS = {
  LINKPAY_SUCCESS: 'LinkPay 付款連結生成成功',
  LINKPAY_FAILED: (message: string) => `LinkPay 生成失敗: ${message}`,
  LINKPAY_ERROR: 'LinkPay 連結生成失敗',
  FILL_COMPLETE_INFO: '請填寫完整資訊',
  CANNOT_GET_TOUR_CODE: '無法取得團號，請確認訂單已關聯旅遊團',
  PLEASE_LOGIN: '請先登入',
  CONFIRMED_CANNOT_DELETE: '已確認的收款單無法刪除',
}

export const REQUESTS_PAGE_LABELS = {
  LOADING: '載入中',

  MANAGE_3483: '請款管理',
  ADD_9640: '新增請款',
}

const TRAVEL_INVOICE_LABELS = {
  LOADING: '載入中...',
  BASIC_INFO: '基本資訊',
  INVOICE_NUMBER: '發票號碼',
  ISSUE_DATE: '開立日期',
  TAX_TYPE: '課稅別',
  TOTAL_AMOUNT: '總金額',
  BUYER_INFO: '買受人資訊',
  NAME: '名稱',
  TAX_ID: '統一編號',
  MOBILE: '手機',

  // Status
  STATUS_PENDING: '待處理',
  STATUS_ISSUED: '已開立',
  STATUS_VOIDED: '已作廢',
  STATUS_ALLOWANCE: '已折讓',
  STATUS_FAILED: '失敗',

  // Detail
  FILL_VOID_REASON: '請填寫作廢原因',
  UNKNOWN_ERROR: '發生未知錯誤',
  BACK_TO_LIST: '返回發票列表',
  NOT_OBTAINED: '尚未取得',
  TAX_DUTIABLE: '應稅',
  TAX_ZERO_RATE: '零稅率',
  TAX_FREE: '免稅',
  UNIT_LABEL: '式',
}

// Additional TRAVEL_INVOICE_LABELS - append to existing
const TRAVEL_INVOICE_DETAIL_LABELS = {
  PRODUCT_DETAILS: '商品明細',
  INVOICE_INFO: '發票資訊',
  RANDOM_CODE: '隨機碼',
  BARCODE: '條碼',
  VOID_INFO: '作廢資訊',
  VOID_TIME: '作廢時間',
  VOID_REASON: '作廢原因',
  VOID_INVOICE: '作廢發票',
  VOID_REASON_REQUIRED: '作廢原因 *',

  LABEL_6889: '發票詳情',
  NOT_FOUND_6549: '找不到該發票',
  DELETE_4958: '您要找的發票可能已被刪除或不存在',
  LABEL_6937: '商品名稱',
  QUANTITY: '數量',
  LABEL_9062: '單位',
  LABEL_9413: '單價',
  AMOUNT: '金額',
  PLEASE_ENTER_7085: '請輸入作廢原因',
  CANCEL: '取消',
  CONFIRM_8486: '確認作廢',
}

export const PAYMENT_METHOD_MAP: Record<string, string> = {
  transfer: '匯款',
  cash: '現金',
  card: '刷卡',
  check: '支票',
  linkpay: 'LinkPay',
}
