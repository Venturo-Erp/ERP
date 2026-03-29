/**
 * 資料表名稱常數
 * 純雲端架構：僅定義表名常數供 Store 使用
 */

/**
 * 資料表名稱常數（用於型別安全）
 */
export const TABLES = {
  EMPLOYEES: 'employees',
  TOURS: 'tours',
  ITINERARIES: 'itineraries',
  ORDERS: 'orders',
  MEMBERS: 'members',
  TOUR_ADDONS: 'tour_addons',
  CUSTOMERS: 'customers',
  PAYMENTS: 'payments',
  PAYMENT_REQUESTS: 'payment_requests',
  PAYMENT_REQUEST_ITEMS: 'payment_request_items',
  DISBURSEMENT_ORDERS: 'disbursement_orders',
  // RECEIPT_ORDERS: 'receipt_orders',  // 表尚未建立
  QUOTES: 'quotes',
  TODOS: 'todos',
  VISAS: 'visas',
  SUPPLIERS: 'suppliers',
  COST_TEMPLATES: 'cost_templates',
  SUPPLIER_CATEGORIES: 'supplier_categories',
  // 企業客戶系統
  COMPANIES: 'companies',
  COMPANY_CONTACTS: 'company_contacts',
  COMPANY_ANNOUNCEMENTS: 'company_announcements',
  // 地區管理系統（三層架構）
  COUNTRIES: 'countries',
  REGIONS: 'regions',
  CITIES: 'cities',
  CALENDAR_EVENTS: 'calendar_events',
  ACCOUNTS: 'accounts',
  CATEGORIES: 'categories',
  TRANSACTIONS: 'transactions',
  WORKSPACE_ITEMS: 'workspace_items',
  // Workspace 相關
  WORKSPACES: 'workspaces',
  CHANNELS: 'channels',
  CHANNEL_GROUPS: 'channel_groups',
  CHANNEL_MEMBERS: 'channel_members',
  MESSAGES: 'messages',
  BULLETINS: 'bulletins',
  ADVANCE_LISTS: 'advance_lists',
  SHARED_ORDER_LISTS: 'shared_order_lists',
  PERSONAL_CANVASES: 'personal_canvases',
  RICH_DOCUMENTS: 'rich_documents',
  ESIMS: 'esims',
  CONFIRMATIONS: 'confirmations',
  PNRS: 'pnrs',
  ATTRACTIONS: 'attractions',
  RECEIPTS: 'receipts',
  LINKPAY_LOGS: 'linkpay_logs',
  VENDOR_COSTS: 'vendor_costs',
  TOUR_LEADERS: 'tour_leaders',
  // 車隊調度系統
  FLEET_VEHICLES: 'fleet_vehicles',
  FLEET_DRIVERS: 'fleet_drivers',
  FLEET_VEHICLE_LOGS: 'fleet_vehicle_logs',
  FLEET_SCHEDULES: 'fleet_schedules',
  LEADER_SCHEDULES: 'leader_schedules',
  // 會計系統
  ACCOUNTING_SUBJECTS: 'accounting_subjects',
  JOURNAL_VOUCHERS: 'journal_vouchers',
  JOURNAL_LINES: 'journal_lines',
  // Workspace 模組
  WORKSPACE_MODULES: 'workspace_modules',
} as const

export type TableName = (typeof TABLES)[keyof typeof TABLES]
