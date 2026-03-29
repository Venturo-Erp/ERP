/**
 * 模組分頁權限定義
 * 
 * 每個模組可以有多個分頁，每個分頁可以獨立設定讀/寫權限
 */

export interface ModuleTab {
  code: string
  name: string
  description?: string
}

export interface ModuleDefinition {
  code: string
  name: string
  description?: string
  tabs: ModuleTab[]
}

// 模組與分頁定義
export const MODULES: ModuleDefinition[] = [
  // ===== 核心模組（有分頁） =====
  {
    code: 'tours',
    name: '旅遊團管理',
    description: '團務管理核心功能',
    tabs: [
      { code: 'basic', name: '基本資料', description: '團號、日期、目的地、負責人' },
      { code: 'itinerary', name: '行程', description: '每日行程內容' },
      { code: 'members', name: '團員名單', description: '團員資料、護照、聯絡資訊' },
      { code: 'orders', name: '訂單', description: '報名訂單、付款狀態' },
      { code: 'confirmations', name: '團確單', description: '供應商確認單' },
      { code: 'contracts', name: '合約', description: '旅遊合約、電子簽約' },
      { code: 'requirements', name: '需求單', description: '供應商需求發送' },
      { code: 'files', name: '檔案', description: '團務相關文件' },
      { code: 'finance', name: '財務', description: '團收支、成本、利潤' },
      { code: 'closing', name: '結案', description: '結團報表、損益確認' },
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
      { code: 'requests', name: '請款管理', description: '團體請款、公司支出' },
      { code: 'treasury', name: '金庫總覽', description: '資金狀況總覽' },
      { code: 'disbursement', name: '出納管理', description: '撥款作業' },
      { code: 'travel-invoice', name: '代轉發票', description: '代收代付發票' },
      { code: 'reports', name: '報表管理', description: '財務報表' },
      { code: 'settings', name: '財務設定', description: '付款方式、科目設定' },
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
    code: 'hr',
    name: '人資管理',
    description: '員工、出勤、薪資',
    tabs: [
      { code: 'employees', name: '員工管理', description: '員工資料、到職離職' },
      { code: 'roles', name: '角色管理', description: '職務角色與權限' },
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
    code: 'quotes',
    name: '報價單',
    description: '報價製作與管理',
    tabs: [
      { code: 'list', name: '報價列表', description: '所有報價單' },
      { code: 'create', name: '新增報價', description: '建立新報價' },
      { code: 'edit', name: '編輯報價', description: '修改報價內容' },
      { code: 'templates', name: '報價範本', description: '常用報價範本' },
    ],
  },
  {
    code: 'itinerary',
    name: '行程管理',
    description: '行程編輯與範本',
    tabs: [
      { code: 'list', name: '行程列表', description: '所有行程' },
      { code: 'editor', name: '行程編輯器', description: '拖拉式編輯' },
      { code: 'templates', name: '行程範本', description: '可重用範本' },
      { code: 'blocks', name: '行程區塊', description: '區塊元件庫' },
    ],
  },
  {
    code: 'visas',
    name: '簽證管理',
    description: '簽證申請與追蹤',
    tabs: [
      { code: 'list', name: '簽證列表', description: '所有簽證申請' },
      { code: 'create', name: '新增申請', description: '建立簽證申請' },
      { code: 'tracking', name: '進度追蹤', description: '申請進度' },
    ],
  },
  {
    code: 'design',
    name: '設計工具',
    description: '手冊、行銷素材',
    tabs: [
      { code: 'brochures', name: '手冊設計', description: '旅遊手冊' },
      { code: 'marketing', name: '行銷素材', description: '廣告、DM' },
      { code: 'templates', name: '設計範本', description: '可重用範本' },
    ],
  },
  {
    code: 'office',
    name: '文件管理',
    description: '文件編輯與儲存',
    tabs: [
      { code: 'list', name: '文件列表', description: '所有文件' },
      { code: 'editor', name: '文件編輯', description: '線上編輯器' },
      { code: 'files', name: '檔案管理', description: '檔案上傳下載' },
    ],
  },
  {
    code: 'settings',
    name: '系統設定',
    description: '公司與系統配置',
    tabs: [
      { code: 'company', name: '公司設定', description: '公司資訊、Logo' },
      { code: 'line', name: 'LINE 設定', description: 'LINE Bot 串接' },
      { code: 'preferences', name: '偏好設定', description: '個人偏好' },
      { code: 'dev-tools', name: '開發工具', description: '開發者選項' },
    ],
  },

  // ===== 簡單模組（無分頁） =====
  {
    code: 'dashboard',
    name: '首頁',
    description: '儀表板總覽',
    tabs: [],
  },
  {
    code: 'calendar',
    name: '行事曆',
    description: '出團日曆',
    tabs: [],
  },
  {
    code: 'todos',
    name: '待辦事項',
    description: '任務管理',
    tabs: [],
  },
  {
    code: 'workspace',
    name: '工作空間',
    description: '團隊頻道',
    tabs: [],
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
