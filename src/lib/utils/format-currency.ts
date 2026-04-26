/**
 * 金額格式化工具
 * 統一全專案金額顯示格式
 */

/**
 * 格式化金額為標準貨幣顯示格式
 * @param amount - 金額數值
 * @param currency - 貨幣類型 (TWD, USD, CNY)
 * @returns 格式化的金額字串 (例: NT$ 1,000)
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency: 'TWD' | 'USD' | 'CNY' = 'TWD'
): string {
  if (amount === null || amount === undefined) return ''

  const prefix = {
    TWD: 'NT$',
    USD: '$',
    CNY: '¥',
  }[currency]

  const sign = amount < 0 ? '-' : ''
  return `${sign}${prefix}${Math.abs(amount).toLocaleString()}`
}

/**
 * 格式化金額（僅數字，無貨幣符號）
 * @param amount - 金額數值
 * @returns 格式化的數字字串 (例: 1,000)
 */
export function formatMoney(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return ''
  return amount.toLocaleString('zh-TW')
}

/**
 * 格式化金額為台幣（帶符號）
 * @param amount - 金額數值
 * @returns 格式化的台幣字串 (例: NT$ 1,000)
 */
export function formatTWD(amount: number | null | undefined): string {
  return formatCurrency(amount, 'TWD')
}

/**
 * 格式化金額為美元（帶符號）
 * @param amount - 金額數值
 * @returns 格式化的美元字串 (例: $ 1,000)
 */
export function formatUSD(amount: number | null | undefined): string {
  return formatCurrency(amount, 'USD')
}
