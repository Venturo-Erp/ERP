/**
 * PII 遮罩工具
 * 用於匯出時遮罩敏感個人資料
 */

export interface ExportPrivacySettings {
  mask_passport: boolean
  mask_id_number: boolean
  mask_phone: boolean
  mask_email: boolean
}

export const DEFAULT_PRIVACY_SETTINGS: ExportPrivacySettings = {
  mask_passport: true,
  mask_id_number: true,
  mask_phone: true,
  mask_email: false,
}

/**
 * 護照號碼遮罩：保留前 4 碼，其餘替換為 *
 * A12345678 → A123****
 */
export function maskPassport(value: string | null | undefined): string {
  if (!value) return ''
  const str = value.trim()
  if (str.length <= 4) return str
  return str.slice(0, 4) + '*'.repeat(str.length - 4)
}

/**
 * 身份證字號遮罩：保留前 4 碼，其餘替換為 *
 * A123456789 → A123******
 */
export function maskIdNumber(value: string | null | undefined): string {
  if (!value) return ''
  const str = value.trim()
  if (str.length <= 4) return str
  return str.slice(0, 4) + '*'.repeat(str.length - 4)
}

/**
 * 電話號碼遮罩：保留前 4 碼與後 3 碼，中間替換為 *
 * 0912345678 → 0912***678
 * +886912345678 → +886***678
 */
export function maskPhone(value: string | null | undefined): string {
  if (!value) return ''
  const str = value.trim()
  if (str.length <= 7) return str
  const keep_start = str.length > 10 ? 4 : 4
  const keep_end = 3
  const mid_len = str.length - keep_start - keep_end
  if (mid_len <= 0) return str
  return str.slice(0, keep_start) + '*'.repeat(mid_len) + str.slice(-keep_end)
}

/**
 * Email 遮罩：保留 @ 前 2 碼與完整 domain
 * william@gmail.com → wi***@gmail.com
 */
export function maskEmail(value: string | null | undefined): string {
  if (!value) return ''
  const str = value.trim()
  const atIndex = str.indexOf('@')
  if (atIndex <= 2) return str
  const local = str.slice(0, atIndex)
  const domain = str.slice(atIndex)
  return local.slice(0, 2) + '*'.repeat(local.length - 2) + domain
}

/**
 * 依設定決定是否遮罩各欄位
 */
export function applyPrivacyMask(
  value: string | null | undefined,
  type: keyof ExportPrivacySettings,
  settings: ExportPrivacySettings = DEFAULT_PRIVACY_SETTINGS
): string {
  if (!value) return ''
  if (!settings[type]) return value // 設定關閉則不遮罩

  switch (type) {
    case 'mask_passport':
      return maskPassport(value)
    case 'mask_id_number':
      return maskIdNumber(value)
    case 'mask_phone':
      return maskPhone(value)
    case 'mask_email':
      return maskEmail(value)
    default:
      return value
  }
}

/**
 * 從 workspace 取得隱私設定
 */
export function parsePrivacySettings(raw: unknown): ExportPrivacySettings {
  if (!raw || typeof raw !== 'object') return DEFAULT_PRIVACY_SETTINGS
  const obj = raw as Record<string, unknown>
  return {
    mask_passport: obj.mask_passport !== false,
    mask_id_number: obj.mask_id_number !== false,
    mask_phone: obj.mask_phone !== false,
    mask_email: obj.mask_email === true,
  }
}
