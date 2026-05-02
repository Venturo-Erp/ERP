/**
 * Capability 自動推導
 *
 * 從表名 / endpoint 路徑自動推算對應的 capability code。
 * 對應規則 = 唯一 SSOT、加新表 / endpoint 時不用手動 mapping。
 *
 * 設計：
 *   - 純 prefix / pattern 規則、簡單可預期
 *   - 沒對應到的回 null（不歸業務 module、保持現狀）
 *   - MODULE 列表跟 src/lib/permissions/module-tabs.ts 的 MODULES 對齊
 */

/**
 * 把 DB 表名推算成 module code。
 * 不在 MODULES 註冊或無明確 module 歸屬的表回 null。
 */
export function tableToModule(tableName: string): string | null {
  const t = tableName.toLowerCase()

  // 明確 prefix 對應到 MODULES code
  if (t === 'calendar_events') return 'calendar'
  if (t === 'todos' || t === 'todo_columns' || t === 'tasks') return 'todos'
  if (t === 'visas') return 'visas'

  // tours 模組（含其下表）
  if (
    t === 'tours' ||
    t.startsWith('tour_') ||
    t === 'itineraries' ||
    t === 'quotes' ||
    t === 'cost_templates' ||
    t === 'contracts' ||
    t === 'leader_availability'
  )
    return 'tours'

  // orders 模組
  if (t === 'orders' || t === 'order_members') return 'orders'

  // finance 模組
  if (
    t.startsWith('payment_') ||
    t === 'receipts' ||
    t === 'disbursement_orders' ||
    t === 'linkpay_logs' ||
    t === 'vendor_costs' ||
    t === 'payment_methods' ||
    t === 'bank_accounts' ||
    t === 'expense_categories' ||
    t === 'travel_invoices'
  )
    return 'finance'

  // accounting 模組
  if (
    t.startsWith('accounting_') ||
    t.startsWith('journal_') ||
    t === 'chart_of_accounts' ||
    t === 'checks'
  )
    return 'accounting'

  // hr 模組
  if (t === 'employees' || t === 'workspace_roles' || t === 'workspace_attendance_settings')
    return 'hr'

  // database 模組（資料庫管理：客戶、景點、供應商等）
  if (
    t === 'customers' ||
    t === 'attractions' ||
    t === 'hotels' ||
    t === 'restaurants' ||
    t === 'michelin_restaurants' ||
    t === 'suppliers' ||
    t === 'supplier_categories' ||
    t === 'countries' ||
    t === 'cities' ||
    t === 'regions' ||
    t === 'airport_images' ||
    t === 'image_library' ||
    t === 'transportation_rates' ||
    t === 'premium_experiences' ||
    t === 'tour_leaders'
  )
    return 'database'

  // office 模組（文件 / 筆記）
  if (t === 'bulletins' || t === 'notes' || t === 'rich_documents' || t === 'knowledge_base')
    return 'office'

  // 平台 / 系統表（沒對應的業務 module）
  return null
}

/**
 * 把 API 路徑 + HTTP 方法推算成 capability code。
 *   GET → .read
 *   POST / PATCH / PUT / DELETE → .write
 *
 * 不在 MODULES 註冊的路徑回 null（不加守門、由呼叫者決定）。
 */
export function endpointToCapability(
  pathname: string,
  method: string
): string | null {
  // 規範化路徑：移除前綴、後綴、動態段
  const path = pathname
    .replace(/^\/api\//, '')
    .replace(/\/route$/, '')
    .replace(/\/\[[^\]]+\]/g, '/:id')
    .replace(/\/$/, '')

  const segments = path.split('/').filter(Boolean)
  if (segments.length === 0) return null

  const action = method.toUpperCase() === 'GET' ? 'read' : 'write'

  // 第一段就是 module code（簡化規則）
  const first = segments[0]

  // 已知 module
  const knownModules = [
    'calendar',
    'todos',
    'tours',
    'orders',
    'finance',
    'accounting',
    'visas',
    'hr',
    'database',
    'office',
    'customers',
    'attractions',
    'suppliers',
  ]

  if (knownModules.includes(first)) {
    // database 模組的子路徑（/api/customers/ → database.customers）
    if (first === 'customers') return `database.customers.${action}`
    if (first === 'attractions') return `database.attractions.${action}`
    if (first === 'suppliers') return `database.suppliers.${action}`

    // 其他直接用 first segment
    return `${first}.${action}`
  }

  // 平台 / 系統 endpoint
  if (
    first === 'auth' ||
    first === 'health' ||
    first === 'permissions' ||
    first === 'workspaces' ||
    first === 'tenants' ||
    first === 'roles' ||
    first === 'employees' ||
    first === 'job-roles' ||
    first === 'cron' ||
    first === 'webhook' ||
    first === 'meta' ||
    first === 'line' ||
    first === 'ai' ||
    first === 'ai-settings' ||
    first === 'ai-workflow' ||
    first === 'fetch-image' ||
    first === 'log-error' ||
    first === 'amadeus-totp' ||
    first === 'ocr' ||
    first === 'd' ||
    first === 'view' ||
    first === 'channels'
  )
    return null

  return null
}
