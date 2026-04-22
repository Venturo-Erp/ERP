/**
 * 模組分頁權限定義
 *
 * 每個模組可以有多個分頁，每個分頁可以獨立設定讀/寫權限
 */

export interface ModuleTab {
  code: string
  name: string
  description?: string
  /**
   * 是否為「下拉資格」tab（非功能權限、而是「可否出現在某下拉」的開關）
   * - true：admin 也可以個別取消（例：老闆不想出現在代墊款下拉）
   * - false/undefined：admin 鎖死全開（一般功能權限）
   */
  isEligibility?: boolean
  /**
   * 分頁級功能分類（用於 workspace 層級開關）
   * - 'basic' / undefined：預設開、workspace 可選擇關
   * - 'premium'：預設關、workspace 付費/勾選後才開
   * workspace_features 用 `{module}.{tab}` 格式存（例：'tours.contract'）
   */
  category?: 'basic' | 'premium'
}

export interface ModuleDefinition {
  code: string
  name: string
  description?: string
  tabs: ModuleTab[]
}

// 模組與分頁定義（順序與側邊欄一致）
// 註：首頁（dashboard）為個人工作空間（筆記 / 打卡 / widget 偏好）、不受職務權限控管
// 註：租戶管理（tenants）為 Venturo 超管內部功能、不開放給租戶職務管理
export const MODULES: ModuleDefinition[] = [
  {
    code: 'calendar',
    name: '行事曆',
    description: '出團日曆',
    tabs: [],
  },
  {
    code: 'workspace',
    name: '頻道',
    description: '團隊頻道',
    tabs: [],
  },
  {
    code: 'todos',
    name: '待辦事項',
    description: '任務管理',
    tabs: [],
  },
  {
    code: 'tours',
    name: '旅遊團管理',
    description: '團務管理核心功能',
    tabs: [
      { code: 'overview', name: '總覽', description: '團號、日期、目的地、負責人' },
      { code: 'orders', name: '訂單', description: '報名訂單、付款狀態' },
      { code: 'members', name: '團員', description: '團員資料、護照、聯絡資訊' },
      { code: 'itinerary', name: '行程', description: '每日行程內容' },
      {
        code: 'display-itinerary',
        name: '展示行程',
        description: '對客展示用行程頁面編輯器',
        category: 'premium',
      },
      { code: 'quote', name: '報價', description: '報價計算、成本' },
      { code: 'requirements', name: '需求', description: '供應商需求發送' },
      { code: 'confirmation-sheet', name: '團確單', description: '供應商確認單' },
      { code: 'contract', name: '合約', description: '旅遊合約、電子簽約', category: 'premium' },
      { code: 'checkin', name: '報到', description: '團員報到狀態' },
      { code: 'closing', name: '結案', description: '結團報表、損益確認' },
      // ===== 下拉資格（勾寫入 = 出現在該下拉、admin 可個別取消）=====
      {
        code: 'as_sales',
        name: '可當承辦業務',
        description: '勾寫入 → 出現在訂單「承辦業務」下拉',
        isEligibility: true,
      },
      {
        code: 'as_assistant',
        name: '可當助理',
        description: '勾寫入 → 出現在訂單「助理」下拉',
        isEligibility: true,
      },
      {
        code: 'as_tour_controller',
        name: '可當團控',
        description: '勾寫入 → 出現在建團「團控」下拉',
        isEligibility: true,
      },
    ],
  },
  {
    code: 'orders',
    name: '訂單管理',
    description: '客戶訂單與報名',
    tabs: [
      { code: 'list', name: '訂單列表', description: '所有訂單總覽' },
      { code: 'create', name: '新增訂單', description: '建立新訂單' },
      { code: 'edit', name: '編輯訂單', description: '修改訂單內容' },
      { code: 'payments', name: '付款記錄', description: '訂單收款狀態' },
      { code: 'travelers', name: '旅客資料', description: '旅客護照、聯絡資訊' },
    ],
  },
  {
    code: 'finance',
    name: '財務系統',
    description: '收款、請款、出納',
    tabs: [
      { code: 'payments', name: '收款管理', description: '客戶收款記錄' },
      { code: 'payments-company', name: '公司收款', description: '非團體的公司收款' },
      { code: 'payments-confirm', name: '確認核帳', description: '收款確認與核帳' },
      { code: 'requests', name: '請款管理', description: '團體請款' },
      { code: 'requests-company', name: '公司請款', description: '非團體的公司支出' },
      { code: 'treasury', name: '金庫總覽', description: '資金狀況總覽' },
      { code: 'disbursement', name: '出納管理', description: '撥款作業' },
      { code: 'travel-invoice', name: '代轉發票', description: '代收代付發票' },
      { code: 'reports', name: '報表管理', description: '財務報表' },
      { code: 'settings', name: '財務設定', description: '付款方式、科目設定' },
      // ===== 下拉資格（admin 可個別取消）=====
      {
        code: 'advance_payment',
        name: '可代墊款',
        description: '勾寫入 → 出現在請款頁「代墊款人」下拉',
        isEligibility: true,
      },
      // 注意：發票開立人 復用現有 travel-invoice 權限、不另設
    ],
  },
  {
    code: 'accounting',
    name: '會計系統',
    description: '傳票、帳務、結算',
    tabs: [
      { code: 'vouchers', name: '傳票管理', description: '記帳傳票' },
      { code: 'accounts', name: '科目管理', description: '會計科目設定' },
      { code: 'period-closing', name: '期末結轉', description: '月結、年結' },
      { code: 'opening-balances', name: '期初餘額', description: '期初設定' },
      { code: 'checks', name: '票據管理', description: '支票、本票' },
      { code: 'reports', name: '會計報表', description: '損益表、資產負債表' },
    ],
  },
  {
    code: 'visas',
    name: '簽證管理',
    description: '簽證申請與追蹤',
    tabs: [],
  },
  {
    code: 'design',
    name: '設計工具',
    description: '手冊、行銷素材',
    tabs: [],
  },
  {
    code: 'office',
    name: '文件管理',
    description: '文件編輯與儲存',
    tabs: [],
  },
  {
    code: 'hr',
    name: '人資管理',
    description: '員工、出勤、薪資',
    tabs: [
      { code: 'employees', name: '員工管理', description: '員工資料、到職離職' },
      { code: 'roles', name: '職務管理', description: '職務角色與權限' },
      { code: 'attendance', name: '出勤管理', description: '上下班打卡記錄' },
      { code: 'leave', name: '請假管理', description: '請假申請、審核' },
      { code: 'payroll', name: '薪資管理', description: '薪資計算、發放' },
    ],
  },
  {
    code: 'database',
    name: '資料管理',
    description: '客戶、供應商、資源',
    tabs: [
      { code: 'customers', name: '顧客管理', description: '個人客戶、公司客戶' },
      { code: 'customer-groups', name: '客戶群組', description: '客戶分群' },
      { code: 'attractions', name: '旅遊資料庫', description: '景點、餐廳、飯店' },
      { code: 'suppliers', name: '供應商管理', description: '合作供應商' },
      { code: 'archive', name: '封存管理', description: '封存資料查閱' },
    ],
  },
  {
    code: 'settings',
    name: '系統設定',
    description: '公司與系統配置',
    tabs: [
      { code: 'personal', name: '個人設定', description: '密碼、頭像、個人資料' },
      { code: 'company', name: '公司設定', description: '公司名稱、Logo、聯絡方式' },
    ],
  },
]

// 取得模組定義
export function getModuleByCode(code: string): ModuleDefinition | undefined {
  return MODULES.find(m => m.code === code)
}

// 取得有分頁的模組
export function getModulesWithTabs(): ModuleDefinition[] {
  return MODULES.filter(m => m.tabs.length > 0)
}

// 取得沒有分頁的模組
export function getModulesWithoutTabs(): ModuleDefinition[] {
  return MODULES.filter(m => m.tabs.length === 0)
}

// 取得所有模組（有分頁的排前面）
export function getAllModulesSorted(): ModuleDefinition[] {
  return [...getModulesWithTabs(), ...getModulesWithoutTabs()]
}
