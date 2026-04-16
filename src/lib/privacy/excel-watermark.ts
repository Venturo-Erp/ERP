import type ExcelJS from 'exceljs'

interface WatermarkOptions {
  exportedBy: string   // 員工姓名
  workspaceCode: string
  exportedAt?: Date
}

/**
 * 在 Excel 每頁頁首/頁尾加上匯出者浮水印
 * 印出或截圖時都會帶著這個資訊
 */
export function applyExcelWatermark(
  worksheet: ExcelJS.Worksheet,
  options: WatermarkOptions
): void {
  const { exportedBy, workspaceCode, exportedAt = new Date() } = options

  const dateStr = exportedAt
    .toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Taipei',
    })
    .replace(/\//g, '-')

  // ExcelJS header/footer 格式：
  // &L = 左側  &C = 中間  &R = 右側
  // &"字體名稱"  &8 = 字體大小 8pt
  const watermarkText = `機密文件｜匯出者：${exportedBy}｜${workspaceCode}｜${dateStr}`

  worksheet.headerFooter = {
    oddHeader: `&C&8&K808080${watermarkText}`,
    oddFooter: `&L&8&K808080${watermarkText}&R&8&K808080第 &P 頁，共 &N 頁`,
    evenHeader: `&C&8&K808080${watermarkText}`,
    evenFooter: `&L&8&K808080${watermarkText}&R&8&K808080第 &P 頁，共 &N 頁`,
  }
}
