// 列印函式
export { printHtml, printElement, type PrintOptions } from './print-service'

// 簡易模板（輕量版）
export { PrintTemplate, PageBreak, NoBreak, A4, type PrintTemplateProps } from './PrintTemplate'

// 完整列印系統（含預覽、頁首頁尾、多頁支援）
export { PrintableWrapper } from './PrintableWrapper'
export { PrintHeader } from './PrintHeader'
export { PrintFooter } from './PrintFooter'
export { PrintControls } from './PrintControls'
export { usePrintLogo } from './usePrintLogo'
export { MORANDI_COLORS, PRINT_STYLES, TABLE_STYLES } from './print-styles'
