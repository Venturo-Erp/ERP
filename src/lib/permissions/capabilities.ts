/**
 * 統一的權限常數定義
 *
 * 所有權限檢查都通過這些常數，避免到處寫 canWrite('hr', 'roles')
 * 改權限邏輯時只需改這個檔案
 */

export const CAPABILITIES = {
  // ========== HR 系統 ==========
  HR_MANAGE_ROLES: { module: 'hr', tab: 'roles', action: 'write' } as const,
  HR_READ_ROLES: { module: 'hr', tab: 'roles', action: 'read' } as const,
  HR_MANAGE_EMPLOYEES: { module: 'hr', tab: 'employees', action: 'write' } as const,
  HR_READ_EMPLOYEES: { module: 'hr', tab: 'employees', action: 'read' } as const,
  HR_MANAGE_SETTINGS: { module: 'hr', tab: 'settings', action: 'write' } as const,
  HR_READ_SETTINGS: { module: 'hr', tab: 'settings', action: 'read' } as const,

  // ========== 系統設定 ==========
  SETTINGS_MANAGE_COMPANY: { module: 'settings', tab: 'company', action: 'write' } as const,
  SETTINGS_READ_COMPANY: { module: 'settings', tab: 'company', action: 'read' } as const,
  SETTINGS_MANAGE_PERSONAL: { module: 'settings', tab: 'personal', action: 'write' } as const,
  MANAGE_ENV_SETTINGS: { module: 'settings', tab: 'env', action: 'write' } as const,

  // ========== 財務系統 ==========
  FINANCE_MANAGE_PAYMENTS: { module: 'finance', tab: 'payments', action: 'write' } as const,
  FINANCE_READ_PAYMENTS: { module: 'finance', tab: 'payments', action: 'read' } as const,
  FINANCE_READ_PAYMENTS_COMPANY: { module: 'finance', tab: 'payments-company', action: 'read' } as const,
  FINANCE_CONFIRM_PAYMENTS: { module: 'finance', tab: 'payments-confirm', action: 'write' } as const,
  FINANCE_MANAGE_REQUESTS: { module: 'finance', tab: 'requests', action: 'write' } as const,
  FINANCE_READ_REQUESTS: { module: 'finance', tab: 'requests', action: 'read' } as const,
  FINANCE_READ_REQUESTS_COMPANY: { module: 'finance', tab: 'requests-company', action: 'read' } as const,
  FINANCE_READ_REQUESTS_SALARY: { module: 'finance', tab: 'requests-salary', action: 'read' } as const,
  FINANCE_MANAGE_SETTINGS: { module: 'finance', tab: 'settings', action: 'write' } as const,
  FINANCE_READ_SETTINGS: { module: 'finance', tab: 'settings', action: 'read' } as const,
  FINANCE_READ_TREASURY: { module: 'finance', tab: 'treasury', action: 'read' } as const,
  FINANCE_READ_REPORTS: { module: 'finance', tab: 'reports', action: 'read' } as const,
  FINANCE_MANAGE_DISBURSEMENT: { module: 'finance', tab: 'disbursement', action: 'write' } as const,
  FINANCE_READ_DISBURSEMENT: { module: 'finance', tab: 'disbursement', action: 'read' } as const,

  // ========== 資料庫 ==========
  DATABASE_MANAGE_ATTRACTIONS: { module: 'database', tab: 'attractions', action: 'write' } as const,
  DATABASE_READ_ATTRACTIONS: { module: 'database', tab: 'attractions', action: 'read' } as const,

  // ========== Workspace/Channel ==========
  WORKSPACE_MANAGE_CHANNELS: { module: 'workspace', tab: null, action: 'write' } as const,
  WORKSPACE_MANAGE_MEMBERS: { module: 'workspace', tab: null, action: 'write' } as const,

  // ========== 日曆 ==========
  CALENDAR_MANAGE: { module: 'calendar', tab: null, action: 'write' } as const,
} as const

export type Capability = typeof CAPABILITIES[keyof typeof CAPABILITIES]
