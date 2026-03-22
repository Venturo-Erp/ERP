/**
 * 團號辨識工具
 * 從檔名提取團號（格式：TW260321A）
 */

export interface ParseResult {
  tourCode: string | null
  isLegacy: boolean
  filename: string
}

/**
 * 解析檔名中的團號
 * @param filename 檔案名稱
 * @returns 解析結果
 *
 * @example
 * parseTourCode('TW260321A-行程表.pdf') // { tourCode: 'TW260321A', isLegacy: false }
 * parseTourCode('舊檔案.pdf') // { tourCode: null, isLegacy: true }
 */
export function parseTourCode(filename: string): ParseResult {
  // 正則：2個字母 + 6個數字 + 1個字母
  // 範例：TW260321A, JP250815B
  const regex = /([A-Z]{2}\d{6}[A-Z])/
  const match = filename.match(regex)

  if (match) {
    return {
      tourCode: match[1],
      isLegacy: false,
      filename,
    }
  }

  // 沒匹配到 = 舊檔或台中
  return {
    tourCode: null,
    isLegacy: true,
    filename,
  }
}

/**
 * 批次解析多個檔案
 */
export function parseMultipleTourCodes(filenames: string[]): ParseResult[] {
  return filenames.map(parseTourCode)
}
