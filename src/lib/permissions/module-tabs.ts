/**
 * 模組分頁權限定義
 * 
 * 每個模組可以有多個分頁，每個分頁可以獨立設定讀/寫權限
 */

export interface ModuleTab {
  code: string
  name: string
}

export interface ModuleDefinition {
  code: string
  name: string
  tabs: ModuleTab[]
}

// 模組與分頁定義
export const MODULES: ModuleDefinition[] = [
  {
    code: 'tours',
    name: '旅遊團管理',
    tabs: [
      { code: 'basic', name: '基本資料' },
      { code: 'itinerary', name: '行程' },
      { code: 'members', name: '團員名單' },
      { code: 'orders', name: '訂單' },
      { code: 'confirmations', name: '團確單' },
      { code: 'contracts', name: '合約' },
      { code: 'finance', name: '財務' },
      { code: 'closing', name: '結案' },
    ],
  },
  {
    code: 'orders',
    name: '訂單管理',
    tabs: [
      { code: 'list', name: '訂單列表' },
      { code: 'payments', name: '付款記錄' },
    ],
  },
  {
    code: 'finance',
    name: '財務系統',
    tabs: [
      { code: 'payments', name: '收款管理' },
      { code: 'requests', name: '請款管理' },
      { code: 'treasury', name: '金庫總覽' },
      { code: 'disbursement', name: '出納管理' },
      { code: 'reports', name: '報表管理' },
    ],
  },
  {
    code: 'accounting',
    name: '會計系統',
    tabs: [
      { code: 'vouchers', name: '傳票管理' },
      { code: 'accounts', name: '科目管理' },
      { code: 'period-closing', name: '期末結轉' },
      { code: 'reports', name: '會計報表' },
    ],
  },
  {
    code: 'hr',
    name: '人資管理',
    tabs: [
      { code: 'employees', name: '員工管理' },
      { code: 'roles', name: '角色管理' },
      { code: 'attendance', name: '出勤管理' },
      { code: 'leave', name: '請假管理' },
      { code: 'payroll', name: '薪資管理' },
    ],
  },
  {
    code: 'database',
    name: '資料管理',
    tabs: [
      { code: 'customers', name: '顧客管理' },
      { code: 'attractions', name: '旅遊資料庫' },
      { code: 'suppliers', name: '供應商管理' },
      { code: 'archive', name: '封存管理' },
    ],
  },
  // 以下模組沒有子分頁
  {
    code: 'dashboard',
    name: '首頁',
    tabs: [],
  },
  {
    code: 'calendar',
    name: '行事曆',
    tabs: [],
  },
  {
    code: 'todos',
    name: '待辦事項',
    tabs: [],
  },
  {
    code: 'visas',
    name: '簽證管理',
    tabs: [],
  },
  {
    code: 'itinerary',
    name: '行程管理',
    tabs: [],
  },
  {
    code: 'quotes',
    name: '報價單',
    tabs: [],
  },
  {
    code: 'design',
    name: '設計工具',
    tabs: [],
  },
  {
    code: 'office',
    name: '文件管理',
    tabs: [],
  },
  {
    code: 'settings',
    name: '系統設定',
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
