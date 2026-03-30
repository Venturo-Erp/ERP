// finance 模組 UI 標籤常量

export const ADD_RECEIPT_DIALOG_LABELS = {
  編輯收款單: '編輯收款單',
  刪除中: '刪除中...',
  關閉: '關閉',
  LINKPAY_LINKS_GENERATED: 'LinkPay 付款連結已產生',
  表單驗證失敗: '表單驗證失敗',
  無法取得_workspace_ID: '無法取得 workspace ID',
  收款單更新成功: '收款單更新成功',
  收款單建立成功: '收款單建立成功',
  發生未知錯誤_請檢查必填欄位是否完整: '發生未知錯誤，請檢查必填欄位是否完整',
  建立失敗: '❌ 建立失敗',
  刪除收款單: '刪除收款單',
  刪除成功: '刪除成功',
  刪除失敗: '刪除失敗',
  請稍後再試: '請稍後再試',
  新增收款單: '新增收款單',
  收款單號將自動產生: '收款單號將自動產生',
  請選擇團體: '請選擇團體...',
  找不到團體: '找不到團體',
  請先選擇團體: '請先選擇團體',
  此團體沒有訂單: '此團體沒有訂單',
  請選擇訂單: '請選擇訂單...',
  無聯絡人: '無聯絡人',
  刪除: '刪除',
  取消: '取消',
  更新中: '更新中...',
  建立中: '建立中...',
  更新收款單: '更新收款單',

  CONFIRM_469: '已確認',
  LABEL_3406: '團體 *',
  LABEL_3874: '訂單 *',
  LABEL_4595: '收款項目',
  ADD_2089: '新增項目',
  LABEL_5187: '收款方式',
  LABEL_1182: '交易日期',
  LABEL_6465: '收款資訊',
  REMARKS: '備註',
  AMOUNT: '金額',
  COPYING_1937: '已複製',
  COPY: '複製',
  LABEL_1670: '開啟',
  TOTAL_6550: '總金額',
}

export const BATCH_RECEIPT_DIALOG_LABELS = {
  現金: '現金',
  匯款: '匯款',
  刷卡: '刷卡',
  支票: '支票',
  請至少選擇一個訂單並輸入金額: '請至少選擇一個訂單並輸入金額',
  收款金額不能為_0: '收款金額不能為 0',
  超出: '超出',
  建立失敗_請稍後再試: '建立失敗，請稍後再試',
  搜尋訂單: '搜尋訂單...',
  分配金額超過總金額: '分配金額超過總金額',
}

export const PAYMENT_ITEM_ROW_LABELS = {
  請填寫必要欄位: '請填寫必要欄位',
  Email_金額_付款截止日為必填: 'Email、金額、付款截止日為必填',
  連結產生成功: '連結產生成功',
  可複製連結發送給客戶: '可複製連結發送給客戶',
  產生連結失敗: '產生連結失敗',
  選擇日期: '選擇日期',
  收款對象_五字內: '收款對象(五字內)',
  帳號後五碼: '帳號後五碼',
  調閱編號: '調閱編號',
  到期日: '到期日',
  收款人: '收款人',
  備註_選填: '備註（選填）',
  例如_峇里島五日遊_尾款: '例如：峇里島五日遊 - 尾款',
  複製: '複製',

  LABEL_6186: '付款截止日 *',
  LABEL_4673: '付款名稱（客戶看到的）',
  LABEL_3875: '產生中...',
  LABEL_2899: '產生連結',
  LABEL_1487: '付款連結',
  LABEL_1670: '開啟',
}

export const RECEIPT_CONFIRM_DIALOG_LABELS = {
  已確認: '已確認',
  刪除中: '刪除中...',
  未知: '未知',
  確認成功: '確認成功',
  收款金額已確認: '收款金額已確認',
  確認失敗: '確認失敗',
  請輸入有效金額: '請輸入有效金額',
  已記錄實際收款金額_並通知建立者: '已記錄實際收款金額，並通知建立者',
  待確認: '待確認',
  金額正確: '金額正確',
  金額異常: '金額異常',
  確認後將通知建立者: (receiptNumber: string) =>
    `確認後將通知收款單建立者：${receiptNumber} 金額異常`,
  輸入實際金額: '輸入實際金額',
}

export const ADD_REQUEST_DIALOG_LABELS = {
  其他: '其他',
  特殊團: '特殊團',
  請選擇費用類型和日期: '請選擇費用類型和日期',
  請新增旅遊團分配: '請新增旅遊團分配',
  請先選擇旅遊團: '請先選擇旅遊團',
  無法取得工作空間_請重新登入: '無法取得工作空間，請重新登入',
  請至少選擇一個旅遊團並輸入金額: '請至少選擇一個旅遊團並輸入金額',
  請款金額不能為_0: '請款金額不能為 0',
  供應商支出: '供應商支出',
  搜尋團號或團名: '搜尋團號或團名...',
  輸入備註_可選: '輸入備註（可選）',
  輸入總金額: '輸入總金額',
  選擇供應商_選填: '選擇供應商（選填）',
  請款說明_選填: '請款說明（選填）',
  搜尋旅遊團: '搜尋旅遊團...',
  請款備註_選填: '請款備註（選填）',
  新增請款單: '新增請款單',
}

export const EXPENSE_TYPE_SELECTOR_LABELS = {
  選擇費用類型: '選擇費用類型...',

  LABEL_6005: '費用類型 *',
}

export const QUICK_REQUEST_FROM_ITEM_DIALOG_LABELS = {
  請輸入有效的金額: '請輸入有效的金額',
  請款單建立成功: '請款單建立成功',
  建立請款單失敗: '建立請款單失敗',
  確認請款: '確認請款',

  LABEL_8944: '快速請款',
  LABEL_7325: '項目',
  LABEL_4947: '供應商：',
  LABEL_1073: '旅遊團：',
  LABEL_3827: '請款金額 *',
  REMARKS: '備註',
  CANCEL: '取消',
}

export const REQUEST_DATE_INPUT_LABELS = {
  請款日期: '請款日期',
  一般請款_週四出帳: '一般請款：週四出帳',
}

export const REQUEST_DETAIL_DIALOG_LABELS = {
  未命名: '未命名',
  確定要刪除此請款單嗎_此操作無法復原: '確定要刪除此請款單嗎？此操作無法復原。',
  刪除請款單: '刪除請款單',
  請款單已刪除: '請款單已刪除',
  刪除請款單失敗: '刪除請款單失敗',
  請填寫說明和單價: '請填寫說明和單價',
  新增項目失敗: '新增項目失敗',
  更新項目失敗: '更新項目失敗',
  確定要刪除此項目嗎: '確定要刪除此項目嗎？',
  刪除項目: '刪除項目',
  刪除項目失敗: '刪除項目失敗',
  請先儲存或取消目前的編輯: '請先儲存或取消目前的編輯',
  無關聯團號: '無關聯團號',
  請款單號: '請款單號',
  團號: '團號',
  團名: '團名',
  訂單編號: '訂單編號',
  請款人: '請款人',
  選擇付款對象: '選擇付款對象...',
  說明: '說明',
}

export const REQUEST_ITEM_LIST_LABELS = {
  選擇供應商: '選擇供應商...',
  新增項目: '新增項目',

  LABEL_475: '請款項目',
  LABEL_2946: '類別',
  LABEL_561: '供應商',
  LABEL_6008: '項目描述',
  LABEL_9413: '單價',
  QUANTITY: '數量',
  LABEL_832: '小計',
  TOTAL_6550: '總金額',
}

export const USE_REQUEST_TABLE_LABELS = {
  金額: '金額',
  狀態: '狀態',
}

export const BATCH_INVOICE_DIALOG_LABELS = {
  請輸入買受人名稱: '請輸入買受人名稱',
  請選擇至少一筆訂單: '請選擇至少一筆訂單',
  批次開立失敗: '批次開立失敗',
  選擇團別: '選擇團別...',
  買受人名稱: '買受人名稱',
  n_8_碼數字: '8 碼數字',
  發票通知信箱: '發票通知信箱',

  LABEL_2624: '批次開立發票',
  LABEL_9860: '團別 *',
  LABEL_7017: '訂單編號',
  LABEL_7009: '聯絡人',
  LABEL_491: '可開金額',
  NOT_FOUND_8100: '此團沒有可開發票的訂單',
  已選: '已選',
  LABEL_3592: '筆訂單',
  LABEL_3678: '合計可開金額',
  LABEL_8775: '發票資訊',
  LABEL_7408: '名稱 *',
  LABEL_3729: '統編',
  LABEL_3494: '日期 *',
  CANCEL: '取消',
}

export const ISSUE_INVOICE_DIALOG_LABELS = {
  旅遊服務費: '旅遊服務費',
  發票金額必須大於_0: '發票金額必須大於 0',
  式: '式',
  發票開立成功: '發票開立成功',
  開立失敗: '開立失敗',
  輸入發票金額: '輸入發票金額',
  開立發票: '開立發票',
  ORDER_INFO: '訂單資訊',
  ORDER_NUMBER_LABEL: '訂單編號：',
  CONTACT_LABEL: '聯絡人：',
  LOADING: '載入中...',
  RECEIVED: '已收款',
  INVOICED: '已開發票',
  AVAILABLE: '可開金額',
  INVOICE_AMOUNT: '發票金額 *',
  EXCEEDS_AVAILABLE: '金額超過可開金額',
  PRODUCT_NAME: '品名',

  LABEL_7283: '買受人名稱 *',
  LABEL_8296: '統一編號',
  LABEL_3957: '開立日期 *',
  CANCEL: '取消',
}

// 請款單 (AddRequestDialog / RequestDetailDialog)
export const REQUEST_LABELS = {
  // 分類
  住宿: '住宿',
  交通: '交通',
  門票: '門票',
  餐食: '餐食',
  其他: '其他',
  // 訊息
  建立完成: (success: number, error: number) =>
    `建立完成：成功 ${success} 筆，失敗 ${error} 筆。請檢查失敗的請款單品項。`,
  成功建立: (count: number, batchId: string) =>
    `成功建立 ${count} 筆請款單（批次 ID: ${batchId.slice(0, 8)}...）`,
  請款單號: '請款單號',
  確認成本: (amount: string) => `確認成本：NT$ ${amount}`,
  預估成本: (amount: string) => `預估成本：NT$ ${amount}`,
  共N筆總金額: (count: number) => `共 ${count} 筆，總金額`,
  共N項總金額: (count: number) => `共 ${count} 項，總金額`,
  確定要刪除此請款單: (code: string) =>
    `確定要刪除此請款單（${code}）嗎？此操作無法復原。\n\n注意：只會刪除當前選中的請款單，同批次的其他請款單不受影響。`,
  訂單: (orderNumber: string) => ` | 訂單：${orderNumber}`,
  同批次請款單: '同批次請款單',
}

// 批次收款 (BatchReceiptDialog)
export const BATCH_RECEIPT_LABELS = {
  成功建立收款單: (count: number) => `成功建立 ${count} 筆收款單`,
}

// AddRequestDialog 額外標籤
export const ADD_REQUEST_FORM_LABELS = {
  新增請款單: '新增請款單',
  請款單號: '請款單號：',
  自動生成: '(自動生成)',
  選擇旅遊團_必填: '選擇旅遊團 *',
  選擇訂單_可選: '選擇訂單（可選）',
  備註: '備註',
  載入中: '載入中...',
  已選N項: (count: number) => `已選 ${count} 項`,
  此旅遊團沒有有供應商的需求單項目: '此旅遊團沒有有供應商的需求單項目',
  供應商: (name: string) => `供應商：${name}`,
  請款金額: '請款金額',
  請款日期: '請款日期',
  總金額: '總金額',
  請款項目資訊: '請款項目資訊',
  類別: '類別',
  供應商_label: '供應商',
  說明: '說明',
  旅遊團分配: '旅遊團分配',
  平均分配: '平均分配',
  新增旅遊團: '新增旅遊團',
  旅遊團: '旅遊團',
  分配金額: '分配金額',
  操作: '操作',
  還有金額未分配: '還有金額未分配',
  將建立N筆請款單: (count: number) => `將建立 ${count} 筆請款單`,
  未分配: '未分配',
  共N筆總金額: (count: number) => `共 ${count} 筆，總金額`,
  共N行: (count: number) => `共 ${count} 行`,

  LABEL_7551: '團體請款',
  LABEL_163: '批量請款',
  LABEL_9152: '公司請款',
  LABEL_4300: '從需求單帶入（自動列出有供應商的項目）',
  LABEL_6198: '需求單項目',
  ADD_3774: '點擊「新增旅遊團」開始分配',
  CANCEL: '取消',
  處理中: '處理中...',
}

// RequestDetailDialog 額外標籤
export const REQUEST_DETAIL_FORM_LABELS = {
  同批次請款單N張共金額: (count: number, amount: number) => `同批次請款單 (${count} 張，共 `,
  請款日期: '請款日期',
  總金額: '總金額',
  類別: '類別',
  付款對象: '付款對象',
  說明: '說明',
  單價: '單價',
  數量: '數量',
  小計: '小計',
  操作: '操作',
  合計: '合計',
  備註: '備註',

  ADD_2089: '新增項目',
  EMPTY_9932: '尚無請款項目',
  DELETE: '刪除',
}

// BatchReceiptDialog 額外標籤
export const BATCH_RECEIPT_FORM_LABELS = {
  過濾有選擇訂單且金額大於0的分配: '// 過濾有選擇訂單且金額 > 0 的分配',
  還有NT金額未分配: (amount: number, status: string) =>
    `還有 NT$ ${amount.toLocaleString('zh-TW')} ${status}，請確認分配金額`,
  未分配: '未分配',
  收款日期: '收款日期',
  收款方式: '收款方式',
  總金額: '總金額',
  訂單分配: '訂單分配',
  訂單: '訂單',
  團名: '團名',
  分配金額: '分配金額',
  備註: '備註',
  共N筆總金額: (count: number) => `共 ${count} 筆，總金額`,
  還有金額未分配: '還有金額未分配',

  LABEL_6021: '批量分配收款（一筆款分多訂單）',
  LABEL_2869: '平均分配',
  ADD_5419: '新增訂單',
  ADD_8367: '點擊「新增訂單」開始分配',
  CANCEL: '取消',
  LABEL_7330: '建立批量收款單',
}

export const RECEIPT_CONFIRM_LABELS = {
  TITLE: '收款單詳情',
  TOUR_NAME: '團名：',
  ORDER: '訂單：',
  STATUS: '狀態：',
  PAYMENT_METHOD: '收款方式',
  PAYMENT_METHOD_MAP: {
    cash: '現金',
    transfer: '匯款',
    credit_card: '刷卡',
    check: '支票',
    linkpay: 'LinkPay',
  } as Record<string, string>,
  TRANSACTION_DATE: '交易日期',
  PAYER: '付款人',
  REMARKS: '備註',
  RECEIVABLE: '應收金額',
  CONFIRM: '確認',

  LABEL_8417: '實收金額',
  PLEASE_ENTER_6193: '金額異常 - 請輸入實際收到金額',
  CANCEL: '取消',
  CONFIRM_9972: '確認異常金額',
  CLOSE: '關閉',
}
export const FINANCE_LABELS = {
  LABEL_953: '開立代轉發票',
  CANCEL: '取消',
  ISSUING: '開立中...',
  ISSUE_INVOICE: '開立發票',
}

// AddReceiptDialog
export const ADD_RECEIPT_TOAST_LABELS = {
  UPDATED: (receiptNumber: string, itemCount: number) =>
    `已更新收款單 ${receiptNumber}（${itemCount} 個項目）`,
  CREATED_WITH_LINKPAY: (itemCount: number, linkPayCount: number) =>
    `已新增 ${itemCount} 項收款，其中 ${linkPayCount} 項 LinkPay 已產生連結`,
  CREATE_SUCCESS: '收款單建立成功',
  CREATED: (itemCount: number, totalAmount: string) =>
    `已新增 ${itemCount} 項收款，總金額 NT$ ${totalAmount}`,
  ERROR_CODE: (code: string) => `錯誤代碼: ${code}`,
  DELETE_CONFIRM: (receiptNumber: string) =>
    `確定要刪除收款單 ${receiptNumber} 嗎？此操作無法復原。`,
  DELETED: (receiptNumber: string) => `收款單 ${receiptNumber} 已刪除`,
  CONFIRMED_READONLY: (receiptNumber: string) => `${receiptNumber} - 已確認的收款單無法編輯或刪除`,
  EDIT_TITLE: (receiptNumber: string) => `編輯 ${receiptNumber}`,
  ADD_TITLE: (itemCount: number) => `新增收款單 (共 ${itemCount} 項)`,
}

// BatchReceiptDialog
export const BATCH_RECEIPT_TOAST_LABELS = {
  SUCCESS: (count: number) => `成功建立 ${count} 筆收款單`,
}

// ReceiptConfirmDialog
export const RECEIPT_CONFIRM_TOAST_LABELS = {
  CONFIRM_SUCCESS: '確認成功',
  CONFIRM_FAILED: '確認失敗',
  PLEASE_TRY_LATER: '請稍後再試',
  DELETE_CONFIRM: (receiptNumber: string) =>
    `確定要刪除收款單 ${receiptNumber} 嗎？此操作無法復原。`,
  DELETED: (receiptNumber: string) => `收款單 ${receiptNumber} 已刪除`,
}

// usePaymentForm validation
export const PAYMENT_FORM_LABELS = {
  SELECT_TOUR: '請選擇團體',
  SELECT_ORDER: '請選擇訂單',
  AT_LEAST_ONE_ITEM: '至少需要一個收款項目',
  TOTAL_MUST_GT_ZERO: '總收款金額必須大於 0',
  ITEM_AMOUNT_GT_ZERO: (index: number) => `收款項目 ${index}: 金額必須大於 0`,
  ITEM_SELECT_DATE: (index: number) => `收款項目 ${index}: 請選擇交易日期`,
  ITEM_LINKPAY_EMAIL: (index: number) => `收款項目 ${index}: LinkPay 需要 Email`,
  ITEM_LINKPAY_DEADLINE: (index: number) => `收款項目 ${index}: LinkPay 需要付款截止日`,
}

// useReceiptMutations
export const RECEIPT_MUTATION_LABELS = {
  CANNOT_GET_TOUR_CODE: '無法取得團號，請確認訂單已關聯旅遊團',
  CREATE_FAILED: '建立收款單失敗',
}

// useUnclosedTours
export const UNCLOSED_TOURS_HOOK_LABELS = {
  CLOSED: '已結團',
  CANCELLED: '取消',
}

// useRequestForm
export const REQUEST_FORM_HOOK_LABELS = {
  SUPPLIER: '供應商',
  EMPLOYEE: '員工',
  OTHER: '其他',
}

// useRequestOperations
export const REQUEST_OPERATIONS_LABELS = {
  CANNOT_GET_WORKSPACE: '無法取得 workspace_id，請重新登入',
  COMPANY_EXPENSE_TYPE_REQUIRED: '公司請款必須選擇費用類型',
  SUPPLIER_EXPENSE: '供應商支出',
}

// useTourRequestItems
export const TOUR_REQUEST_ITEMS_LABELS = {
  UNKNOWN_SUPPLIER: '未知供應商',
  LOAD_FAILED: '載入需求單失敗',
}

// Request types
export const REQUEST_TYPE_LABELS = {
  STATUS_PENDING: '待處理',
  STATUS_CONFIRMED: '已確認',
  STATUS_BILLED: '已出帳',
  CAT_ACCOMMODATION: '住宿',
  CAT_TRANSPORTATION: '交通',
  CAT_MEAL: '餐食',
  CAT_TICKET: '活動',
  CAT_GUIDE: '導遊',
  CAT_INSURANCE: '保險',
  CAT_TOUR_ADVANCE: '出團款',
  CAT_TOUR_RETURN: '回團款',
  CAT_EMPLOYEE_ADVANCE: '員工代墊',
  CAT_PEER: '同業',
  CAT_OTHER: '其他',
}

// AddRequestDialog extra
export const ADD_REQUEST_EXTRA_LABELS = {
  CREATE_FAILED: '新增請款單失敗',
  CONFIRMED_COST: (amount: string) => `確認成本：NT$ ${amount}`,
  ESTIMATED_COST: (amount: string) => `預估成本：NT$ ${amount}`,
  BATCH_CREATE_LABEL: '建立批次請款',
}

// BatchInvoiceDialog
export const BATCH_INVOICE_TOAST_LABELS = {
  SUCCESS: (count: number) => `成功開立 ${count} 筆訂單的發票`,
  ISSUING: '開立中...',
  ISSUE_N: (count: number) => `開立 ${count} 張發票`,
}

// IssueInvoiceDialog
export const ISSUE_INVOICE_EXTRA_LABELS = {
  EXCEED_AVAILABLE: (amount: number) => `發票金額不能超過可開金額 ${amount}`,
  TRAVEL_SERVICE_FEE: '旅遊服務費',
}

// LinkConfirmationDialog
export const LINK_CONFIRMATION_LABELS = {
  TITLE: '關聯確認單項目',
  LOADING: '載入中...',
  EMPTY: '此團尚無確認單項目',
  CLEAR: '取消關聯',
  CANCEL: '取消',
  CONFIRM: '確認',
  LINK_BUTTON: '關聯',
  LINKED: '已關聯',
}
