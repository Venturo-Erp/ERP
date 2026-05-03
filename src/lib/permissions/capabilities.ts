/**
 * 統一的權限常數定義
 *
 * 2026-05-01：值從 (module, tab, action) 三元組改成 capability_code 字串、
 * 跟 role_capabilities 表的 capability_code 欄位 1:1 對應。
 */

export const CAPABILITIES = {
  // ========== HR 系統 ==========
  HR_MANAGE_ROLES: 'hr.roles.write',
  HR_READ_ROLES: 'hr.roles.read',
  HR_MANAGE_EMPLOYEES: 'hr.employees.write',
  HR_READ_EMPLOYEES: 'hr.employees.read',
  HR_MANAGE_SETTINGS: 'hr.settings.write',
  HR_READ_SETTINGS: 'hr.settings.read',

  // ========== 系統設定 ==========
  SETTINGS_MANAGE_COMPANY: 'settings.company.write',
  SETTINGS_READ_COMPANY: 'settings.company.read',
  SETTINGS_MANAGE_PERSONAL: 'settings.personal.write',
  MANAGE_ENV_SETTINGS: 'settings.env.write',

  // ========== 財務系統 ==========
  FINANCE_MANAGE_PAYMENTS: 'finance.payments.write',
  FINANCE_READ_PAYMENTS: 'finance.payments.read',
  FINANCE_READ_PAYMENTS_COMPANY: 'finance.payments-company.read',
  FINANCE_CONFIRM_PAYMENTS: 'finance.payments-confirm.write',
  FINANCE_MANAGE_REQUESTS: 'finance.requests.write',
  FINANCE_READ_REQUESTS: 'finance.requests.read',
  FINANCE_READ_REQUESTS_COMPANY: 'finance.requests-company.read',
  FINANCE_READ_REQUESTS_SALARY: 'finance.requests-salary.read',
  FINANCE_MANAGE_SETTINGS: 'finance.settings.write',
  FINANCE_READ_SETTINGS: 'finance.settings.read',
  FINANCE_READ_TREASURY: 'finance.treasury.read',
  FINANCE_READ_REPORTS: 'finance.reports.read',
  FINANCE_MANAGE_DISBURSEMENT: 'finance.disbursement.write',
  FINANCE_READ_DISBURSEMENT: 'finance.disbursement.read',

  // ========== 資料庫 ==========
  DATABASE_MANAGE_ATTRACTIONS: 'database.attractions.write',
  DATABASE_READ_ATTRACTIONS: 'database.attractions.read',

  // ========== Workspace/Channel ==========
  WORKSPACE_MANAGE_CHANNELS: 'workspace.write',
  WORKSPACE_MANAGE_MEMBERS: 'workspace.write',

  // ========== 日曆 ==========
  CALENDAR_MANAGE: 'calendar.write',

  // ========== 平台 admin（取代散落 isAdmin flag） ==========
  PLATFORM_IS_ADMIN: 'platform.is_admin',

  // ========== CIS 工作流（漫途整合行銷專屬） ==========
  CIS_READ_CLIENTS: 'cis.clients.read',
  CIS_MANAGE_CLIENTS: 'cis.clients.write',
  CIS_READ_VISITS: 'cis.visits.read',
  CIS_MANAGE_VISITS: 'cis.visits.write',
  CIS_READ_PRICING: 'cis.pricing.read',
  CIS_MANAGE_PRICING: 'cis.pricing.write',
} as const

export type Capability = typeof CAPABILITIES[keyof typeof CAPABILITIES]
