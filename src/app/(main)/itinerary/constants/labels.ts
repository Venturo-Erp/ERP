export const LABELS = {
  // Status filters
  ALL: '團體',
  STATUS_TEMPLATE: '模板',
  STATUS_PROPOSAL: '提案',
  SEARCH_ITINERARY: '搜尋行程...',

  // 页面标题和导航
  ITINERARY: '行程',
  ITINERARY_MANAGEMENT: '行程管理',
  NEW_ITINERARY: '新建行程',
  NEW_ITINERARY_TABLE: '新增行程表',
  ITINERARY_EDITOR: '行程編輯器',

  // 按钮文字
  SAVE: '儲存',
  CANCEL: '取消',
  PREVIEW: '預覽',
  PRINT: '列印',
  ADD: '新增',
  DELETE: '刪除',
  EDIT: '編輯',
  APPLY: '套用',
  SEARCH_BUTTON: '查詢',
  CREATE_ITINERARY: '建立行程',
  COPY_ITINERARY: '複製行程',
  CONFIRM_COPY: '確認複製',

  // 状态和消息
  LOADING: '載入中...',
  SAVING: '儲存中...',
  CREATING: '建立中...',
  COPYING: '複製中...',
  COPYING_PREFIX: '正在複製：',

  // 筛选和选择
  MY_ITINERARY: '我的行程',
  ALL_AUTHORS: '全部作者',
  ALL_COMPANIES: '全部分公司',

  // 行程相关
  DAY: '第',
  DAY_SUFFIX: '天',
  ACTIVITY: '活動',
  TIME: '時間',
  LOCATION: '地點',
  DESCRIPTION: '描述',
  NOTES: '備註',
  DAILY_ITINERARY: '每日行程',
  DAILY_TITLE: '每日標題',

  // 表单字段
  ITINERARY_NAME_REQUIRED: '行程名稱 *',
  ITINERARY_CODE_OPTIONAL: '行程編號（選填）',
  ITINERARY_CODE_REQUIRED: '行程編號 *',
  COUNTRY: '國家',
  DEPARTURE_DATE_REQUIRED: '出發日期 *',
  DAYS_REQUIRED: '行程天數 *',

  // 航班相关
  FLIGHT_INFO_OPTIONAL: '航班資訊（選填）',
  OUTBOUND: '去程',
  RETURN: '回程',
  FLIGHT: '航班',
  AIRLINE: '航空',
  DEPARTURE: '出發',
  ARRIVAL: '抵達',
  TAKEOFF: '起飛',
  LANDING: '降落',
  MULTIPLE_SEGMENTS_SELECT: '此航班有多個航段，請選擇：',

  // 餐食和住宿
  BREAKFAST: '早餐',
  LUNCH: '午餐',
  DINNER: '晚餐',
  ACCOMMODATION_HOTEL: '住宿飯店',
  SAME_ACCOMMODATION: '續住',
  WARM_HOME: '溫暖的家',

  // 旅游相关
  ARRIVE_DESTINATION: '抵達目的地',
  RETURN_TAIWAN: '返回台灣',

  // 占位符文字
  EXAMPLE_OKINAWA: '例：沖繩五日遊',
  EXAMPLE_TOUR_CODE: '例：25JOK21CIG',
  SELECT_COUNTRY: '選擇國家',
  SELECT_DEPARTURE_DATE: '選擇出發日期',
  SELECT_DAYS: '選擇天數',
  ENTER_NEW_CODE: '請輸入新的行程編號',
  ENTER_NEW_NAME: '請輸入新的行程名稱',
  SELECT_DAYS_FIRST: '請先選擇行程天數',

  // 密码和安全
  EDIT_ONGOING_ITINERARY: '編輯待出發行程',
  EDIT_PASSWORD_WARNING: '此行程已綁定旅遊團，為避免誤觸修改，請輸入公司密碼以解鎖編輯。',
  ENTER_COMPANY_PASSWORD: '請輸入公司密碼',

  // 复制相关
  COPY_DESCRIPTION1: '封面、行程內容、圖片等將會完整複製。',
  COPY_DESCRIPTION2: '關聯的報價單也會一併複製（客戶資料會清空，價格保留）。',
}

export const PRINT_LABELS = {
  DEFAULT_COMPANY: '旅行社',
  DEFAULT_TITLE: '行程表',
  DAY_UNIT: '天',
  NOT_FOUND: '找不到行程表',
  DESTINATION: '目的地：',
  DEPARTURE_DATE: '出發日期：',
  TRIP_DAYS: '行程天數：',
  TOUR_CODE: '團號：',
  FLIGHT_INFO: '航班資訊',
  OUTBOUND: '去程：',
  RETURN: '回程：',
  DATE: '日期',
  ITINERARY_CONTENT: '行程內容',
  BREAKFAST: '早餐',
  LUNCH: '午餐',
  DINNER: '晚餐',
  ACCOMMODATION: '住宿',
  FOOTER_PROVIDED_BY: '本行程表由',
  FOOTER_PRINT_DATE: '提供 | 列印日期：',

  BACK: '返回',
  PRINT: '列印',
}

export const EDITOR_LABELS = {
  LOADING: '載入中...',
  EDIT_FORM: '編輯表單',
  PRINT_PREVIEW: '列印預覽',
  HANDOVER_NOTICE: '此行程已交接給領隊',
  HANDOVER_DESC: '行程內容已同步到 Online App，編輯功能已停用',

  ADD_9998: '新增紙本行程表',
  PRINT: '列印',
  A4_SIZE: 'A4 尺寸 (210mm × 297mm)',
  BREADCRUMB_HOME: '首頁',
  BREADCRUMB_ITINERARY_MGMT: '行程管理',
  THIS_ITINERARY: '此行程',
}

export const BLOCK_EDITOR_LABELS = {
  LOADING: '載入中...',
  BLOCK_EDITOR: '區塊編輯器',
  LIVE_PREVIEW: '即時預覽',
  DEVICE_DESKTOP: '💻 電腦',
  DEVICE_MOBILE: '📱 手機',

  LABEL_2827: '存檔中...',
  SAVING_4294: '已儲存',
  LABEL_6397: '存檔失敗',
  STATUS_PROPOSAL: '開團',
  MANUAL_SAVE: '手動存檔',
  MANUAL_SAVING: '存檔中...',
  AUTO_SAVE_FAILED: '自動存檔失敗',
  HOME: '首頁',
  ITINERARY_MGMT: '行程管理',
}

// Itinerary Actions
export const ITINERARY_ACTIONS_LABELS = {
  FILL_CODE_AND_NAME: '請填寫行程編號和行程名稱',
  STATUS_PROPOSAL: '開團',
  TO_BE_FILLED: '（待填寫）',
  COPY_WITH_QUOTES: (count: number) =>
    `行程已複製成功！同時複製了 ${count} 個報價單（客戶資料已清空）`,
  COPY_SUCCESS: '行程已複製成功！',
  COPY_FAILED: '複製失敗，請稍後再試',
  ARCHIVE_WITH_QUOTES: (count: number) =>
    `此行程有 ${count} 個關聯的報價單。\n\n請選擇封存方式：\n• 同步封存：報價單也一併封存\n• 僅封存行程：斷開關聯，報價單保留`,
  ARCHIVE_TITLE: '封存行程',
  ARCHIVE_SYNC: '同步封存',
  ARCHIVE_ONLY: '僅封存行程',
  ARCHIVE_CONFIRM: '確定要封存此行程嗎？',
  ARCHIVE_SUCCESS: '行程已封存',
  ARCHIVE_FAILED: '封存失敗',
  DELETE_FAILED: '刪除失敗',
  UNARCHIVE_SUCCESS: '行程已取消封存',
  UNARCHIVE_FAILED: '取消封存失敗',
  DELETE_WITH_QUOTES: (count: number) =>
    `此行程有 ${count} 個關聯的報價單。\n\n刪除行程會同時刪除這些報價單，確定要刪除嗎？`,
  DELETE_SIMPLE: '確定要刪除此行程嗎？此操作無法復原。',
  DELETE_TITLE: '刪除行程',
  DELETE_SUCCESS: '行程已刪除',
  DELETE_LINKED_FAILED: '刪除關聯報價單失敗',
  WORKSPACE_ERROR: '無法取得 workspace code',
  CREATE_FAILED: '建立行程表失敗',
  CREATE_SUCCESS: '行程表已建立',
  SAVE_SUCCESS: '行程表已儲存',
  SAVE_FAILED: '儲存失敗，請稍後再試',
  NO_LINKED_QUOTE: '無關聯報價單，跳過同步',
}

// Itinerary Data Loader
export const ITINERARY_DATA_LOADER_LABELS = {
  STATUS_PROPOSAL: '開團',
  TRANSPORT_COST: '行程表所列之交通費用',
  ACCOMMODATION_COST: '行程表所列之住宿費用',
  MEAL_COST: '行程表所列之餐食費用',
  TICKET_COST: '行程表所列之門票費用',
  GUIDE_SERVICE: '專業導遊服務',
  INSURANCE: '旅遊責任險 500 萬元',
  PASSPORT_VISA: '個人護照及簽證費用',
  PERSONAL_EXPENSE: '行程中之個人消費',
  OPTIONAL_TOUR: '非列入行程中之自費活動',
  AIRPORT_TAX: '機場稅、燃油附加費',
  TIP: '司機、導遊、領隊小費',
  LUGGAGE_OVERWEIGHT: '行李超重費',
  SINGLE_ROOM: '單人房差額',
}

// Itinerary Editor
export const ITINERARY_EDITOR_LABELS = {
  STATUS_PROPOSAL: '開團',
  STATUS_ACTIVE: '待出發',
  SAVE_LEADER_CONFIRM: (name: string) =>
    `要將「${name}」新增到領隊資料庫嗎？\n下次可以直接搜尋選用。`,
  SAVE_LEADER_TITLE: '儲存領隊資料',
  AUTO_SAVE_FAILED: '自動存檔失敗，請手動儲存',
  UNSAVED_CHANGES: '您有未儲存的變更，確定要離開嗎？',
  LOAD_FAILED: '載入行程表失敗',
  VERSION_SAVE_SUCCESS: '版本已儲存',
  VERSION_SAVE_FAILED: '版本儲存失敗',
  VERSION_CREATED: '已建立新版本',
  VERSION_CREATE_FAILED: '建立版本失敗',
  ITINERARY_CREATED: '行程表已建立',
  CREATE_FAILED: '建立行程表失敗',
  TRANSPORT_COST: '行程表所列之交通費用',
  ACCOMMODATION_COST: '行程表所列之住宿費用',
  MEAL_COST: '行程表所列之餐食費用',
  TICKET_COST: '行程表所列之門票費用',
  GUIDE_SERVICE: '專業導遊服務',
  INSURANCE: '旅遊責任險 500 萬元',
  PASSPORT_VISA: '個人護照及簽證費用',
  OPTIONAL_TOUR: '行程外之自費行程',
  PERSONAL_EXPENSE: '個人消費及小費',
  LUGGAGE_OVERWEIGHT: '行李超重費用',
  SINGLE_ROOM: '單人房差價',
}
