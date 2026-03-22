import { COMPANY_NAME, COMPANY_NAME_EN } from '@/lib/tenant'

export const INVOICE_LABELS = {
  LABEL_2201: '團別',
  LABEL_5934: '訂單',
  LABEL_4782: '開立日期',
  SELECT_5234: '選擇日期',
  LABEL_8296: '統一編號',
  LABEL_6444: '8 碼數字',
  LABEL_7311: '電子收據信箱',
  LABEL_7287: '手機',
  LABEL_2931: '申報狀態',
  LABEL_5921: '未申報',
  LABEL_7889: '已申報',
  LABEL_9447: '品名',
  QUANTITY: '數量',
  LABEL_9413: '單價',
  LABEL_9062: '單位',
  AMOUNT: '金額',
  LABEL_6937: '商品名稱',
  ADD_8750: '新增品項',
  REMARKS: '備註',
  LABEL_3060: '備註（限 50 字）',

  TOTAL: '總計',

  // Combobox placeholders
  LOADING: '載入中...',
  SEARCH_TOUR: '搜尋團號...',
  TOUR_NOT_FOUND: '找不到符合的團',
  SEARCH_ORDER: '搜尋訂單...',
  SELECT_TOUR_FIRST: '請先選擇團',
  ORDER_NOT_FOUND: '找不到符合的訂單',

  // Buyer
  COMPANY_NAME_REQUIRED: '公司名稱 *',
  BUYER_REQUIRED: '買受人 *',
  COMPANY_NAME_PLACEHOLDER: '公司名稱',
  BUYER_NAME_PLACEHOLDER: '買受人名稱',

  // useInvoiceDialog
  UNIT: '式',
  ERROR: '錯誤',
  ENTER_BUYER_NAME: '請輸入買受人名稱',
  FILL_PRODUCT_INFO: '請完整填寫商品資訊',
  AMOUNT_EXCEED_CONFIRM: (invoiceAmount: string, paidAmount: string) =>
    `發票金額 NT$ ${invoiceAmount} 超過已收款金額 NT$ ${paidAmount}，確定要開立嗎？`,
  AMOUNT_EXCEED_TITLE: '金額超開提醒',
  SCHEDULED_MESSAGE: (date: string) => `已預約於 ${date} 開立`,
  ISSUE_SUCCESS: '開立成功',
  SCHEDULE_SUCCESS: '預約成功',
  PROXY_INVOICE: (customNo: string, message: string) => `代轉發票 ${customNo} ${message}`,
  ISSUE_FAILED: '開立發票失敗',
}
