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
  CUSTOMERS: 'customers',
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
  // Workspace 相關
  WORKSPACES: 'workspaces',
  CHANNELS: 'channels',
  CHANNEL_GROUPS: 'channel_groups',
  CHANNEL_MEMBERS: 'channel_members',
  MESSAGES: 'messages',
  BULLETINS: 'bulletins',
  ADVANCE_LISTS: 'advance_lists',
  SHARED_ORDER_LISTS: 'shared_order_lists',
  RICH_DOCUMENTS: 'rich_documents',
  ATTRACTIONS: 'attractions',
  RECEIPTS: 'receipts',
  LINKPAY_LOGS: 'linkpay_logs',
  VENDOR_COSTS: 'vendor_costs',
  TOUR_LEADERS: 'tour_leaders',
  // 會計系統
  JOURNAL_VOUCHERS: 'journal_vouchers',
  JOURNAL_LINES: 'journal_lines',
} as const

export type TableName = (typeof TABLES)[keyof typeof TABLES]
