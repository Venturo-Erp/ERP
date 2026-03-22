/**
 * 租戶（Tenant）相關工具
 * 用於多租戶系統的公司資訊管理
 */

/**
 * 取得當前租戶的公司名稱
 * TODO: 未來從 Supabase companies 表讀取
 */
export function getCompanyName(): string {
  return process.env.NEXT_PUBLIC_COMPANY_NAME || '角落旅行社'
}

/**
 * 取得當前租戶的英文公司名稱
 */
export function getCompanyNameEn(): string {
  return process.env.NEXT_PUBLIC_COMPANY_NAME_EN || 'Corner Travel'
}

/**
 * 取得版權聲明（自動更新年份 + 公司名稱）
 * @param companyName - 可選的公司名稱（預設使用當前租戶）
 */
export function getCopyright(companyName?: string): string {
  const name = companyName || getCompanyName()
  const year = new Date().getFullYear()
  return `© ${year} ${name}`
}

/**
 * 取得當前年份
 */
export function getCurrentYear(): number {
  return new Date().getFullYear()
}

/**
 * 取得品牌標語（帶年份）
 * @param season - 季節（如「秋季精選」）
 */
export function getBrandTagline(season?: string): string {
  const company = getCompanyName()
  const year = getCurrentYear()
  return season ? `${company} ${year} ${season}` : `${company} ${year}`
}
