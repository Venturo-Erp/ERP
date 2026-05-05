/**
 * 收款單號生成工具
 *
 * 新格式：{團號}-R{2位數}
 * 範例：CNX250128A-R01 (清邁團的第1張收款單)
 *
 * 舊格式（向後相容）：TP-R2501280001
 */

interface Receipt {
  receipt_number?: string
  code?: string
}

/**
 * 生成收款單號（新格式）
 *
 * @param tourCode - 團號（如 CNX250128A）
 * @param existingReceipts - 現有收款單列表（同團）
 * @returns 收款單號（例如：CNX250128A-R01）
 *
 * @example
 * generateReceiptNumber('CNX250128A', existingReceipts)
 * // => 'CNX250128A-R01', 'CNX250128A-R02'...
 */
export function generateReceiptNumber(tourCode: string, existingReceipts: Receipt[]): string {
  const prefix = `${tourCode}-R`
  let maxNumber = 0

  existingReceipts.forEach(receipt => {
    const code = receipt.receipt_number || receipt.code
    if (code?.startsWith(prefix)) {
      const numberPart = code.substring(prefix.length)
      const number = parseInt(numberPart, 10)
      if (!isNaN(number) && number > maxNumber) {
        maxNumber = number
      }
    }
  })

  const nextNumber = (maxNumber + 1).toString().padStart(2, '0')
  return `${prefix}${nextNumber}`
}

/**
 * 驗證收款單號格式
 *
 * @param receiptNumber - 收款單號
 * @returns 是否為有效格式
 *
 * @example
 * isValidReceiptNumber('CNX250128A-R01')  // => true (新格式)
 * isValidReceiptNumber('TP-R2501280001')  // => true (舊格式)
 */
export function isValidReceiptNumber(receiptNumber: string): boolean {
  // 新格式：{團號}-R{2位數}（如 CNX250128A-R01）
  const newFormatRegex = /^[A-Z]{3}\d{6}[A-Z]-R\d{2}$/
  // 舊格式：TP-R + 日期 + 流水號
  const oldFormatRegex = /^(TP|TC)-R\d{10}$/
  // 更舊的格式：R + 日期 + 流水號
  const legacyFormatRegex = /^R\d{10}$/

  return (
    newFormatRegex.test(receiptNumber) ||
    oldFormatRegex.test(receiptNumber) ||
    legacyFormatRegex.test(receiptNumber)
  )
}

/**
 * 解析收款單號
 *
 * @param receiptNumber - 收款單號
 * @returns 解析結果
 */
export function parseReceiptNumber(receiptNumber: string): {
  tourCode?: string
  sequence: number
  isNewFormat: boolean
  // 舊格式欄位
  year?: number
  month?: number
  day?: number
  workspaceCode?: string
} | null {
  if (!isValidReceiptNumber(receiptNumber)) {
    return null
  }

  // 新格式：CNX250128A-R01
  const newFormatMatch = receiptNumber.match(/^([A-Z]{3}\d{6}[A-Z])-R(\d{2})$/)
  if (newFormatMatch) {
    return {
      tourCode: newFormatMatch[1],
      sequence: parseInt(newFormatMatch[2], 10),
      isNewFormat: true,
    }
  }

  // 舊格式：TP-R2501280001 或 R2501280001
  let workspaceCode: string | undefined
  let datePart: string

  if (receiptNumber.startsWith('TP-') || receiptNumber.startsWith('TC-')) {
    workspaceCode = receiptNumber.substring(0, 2)
    datePart = receiptNumber.substring(4) // 跳過 "TP-R"
  } else {
    datePart = receiptNumber.substring(1) // 跳過 "R"
  }

  const year = parseInt(`20${datePart.slice(0, 2)}`, 10)
  const month = parseInt(datePart.slice(2, 4), 10)
  const day = parseInt(datePart.slice(4, 6), 10)
  const sequence = parseInt(datePart.slice(6, 10), 10)

  return {
    sequence,
    isNewFormat: false,
    year,
    month,
    day,
    workspaceCode,
  }
}

/**
 * 格式化收款單號顯示
 */
export function formatReceiptNumber(
  receiptNumber: string,
  format: 'full' | 'short' | 'date' = 'full'
): string {
  if (!isValidReceiptNumber(receiptNumber)) {
    return receiptNumber
  }

  switch (format) {
    case 'short':
      // 新格式顯示 -R01，舊格式顯示最後4碼
      if (receiptNumber.includes('-R')) {
        return receiptNumber.split('-R')[1] ? `-R${receiptNumber.split('-R')[1]}` : receiptNumber
      }
      return `...${receiptNumber.slice(-4)}`

    case 'date': {
      const parsed = parseReceiptNumber(receiptNumber)
      if (!parsed) return receiptNumber
      if (parsed.isNewFormat && parsed.tourCode) {
        // 從團號提取日期 CNX250128A → 2025-01-28
        const dateStr = parsed.tourCode.slice(3, 9) // 250128
        return `20${dateStr.slice(0, 2)}-${dateStr.slice(2, 4)}-${dateStr.slice(4, 6)}`
      }
      if (parsed.year && parsed.month && parsed.day) {
        return `${parsed.year}-${parsed.month.toString().padStart(2, '0')}-${parsed.day.toString().padStart(2, '0')}`
      }
      return receiptNumber
    }

    case 'full':
    default:
      return receiptNumber
  }
}
