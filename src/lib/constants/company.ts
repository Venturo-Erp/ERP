import { COMPANY_NAME, COMPANY_NAME_EN } from '@/lib/tenant'

/**
 * 公司相關常數（預設值）
 * SaaS 模式下應從 workspace 讀取，這裡只提供 fallback
 * 正確做法：使用 useWorkspaceSettings() hook 或從 workspace 表讀取
 */

export const COMPANY = {
  /** 公司名稱（fallback，應從 workspace.name 讀取） */
  name: COMPANY_NAME,

  /** 公司法定名稱（fallback，應從 workspace.legal_name 讀取） */
  legalName: `${COMPANY_NAME}`,

  /** 公司副標題/標語（fallback，應從 workspace.subtitle 讀取） */
  subtitle: '',

  /** 公司副標題（帶裝飾線） */
  subtitleWithDash: '',

  /** 以下欄位應從 workspace 表讀取，不再寫死 */
  address: '',
  phone: '',
  fax: '',
  email: '',
} as const
