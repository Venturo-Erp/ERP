/**
 * Print Design Palette
 *
 * 列印專用色板（不走 CSS Variables）
 *
 * 原因：
 * 1. 列印用 window.open() + inline style，CSS Variables 在新視窗中不一定能繼承
 * 2. 列印需要 print-color-adjust: exact，色值必須是固定的 hex
 * 3. 紙上色彩需求與螢幕不同——金色要更深才看得到
 *
 * 使用: import { PRINT_PALETTE } from '@/lib/design-tokens'
 */

export const PRINT_PALETTE = {
  // ─────────────────────────────────────
  // Primary Colors (for print)
  // ─────────────────────────────────────

  primary: {
    main: '#4A4A4A', // Darker for print visibility
    light: '#888888',
    lighter: '#CCCCCC',
  },

  gold: {
    light: '#D4C5A9',
    standard: '#B5986D', // 深於螢幕版 #c9aa7c，紙上才明顯
    dark: '#A08968',
  },

  green: {
    main: '#9FA68F',
    light: '#B8C4A8',
  },

  red: {
    main: '#C08374',
    light: '#D4A8A0',
  },

  brown: '#3a3633',

  // ─────────────────────────────────────
  // Structural Colors
  // ─────────────────────────────────────

  background: '#FFFFFF',
  surface: '#FFFFFF',
  border: '#D4C4B0',
  divider: '#E8E5E0',
  shadow: '#00000015', // 15% black

  // ─────────────────────────────────────
  // Text Colors
  // ─────────────────────────────────────

  text: {
    primary: '#3a3633', // 深褐色，高對比
    secondary: '#8b8680',
    muted: '#b8b2aa',
  },

  // ─────────────────────────────────────
  // Status Colors (for print)
  // ─────────────────────────────────────

  status: {
    success: '#9FA68F',
    warning: '#D4A574',
    danger: '#C08374',
    info: '#8ba4b4',
    neutral: '#8b8680',
  },

  // ─────────────────────────────────────
  // Category Colors (for print)
  // ─────────────────────────────────────

  category: {
    purple: '#a08ab5',
    orange: '#c49a74',
    pink: '#c48a9e',
    indigo: '#8a95b5',
  },

  // ─────────────────────────────────────
  // Brand Colors
  // ─────────────────────────────────────

  brand: {
    line: '#06c755',
    telegram: '#0088cc',
    facebook: '#1877f2',
  },

  // ─────────────────────────────────────
  // Calendar Colors (for printed calendars/timelines)
  // ─────────────────────────────────────

  calendar: {
    proposal: '#9bb5d6',
    inProgress: '#a8c4a2',
    pendingClose: '#d4b896',
    closed: '#b8b3ae',
    special: '#d4a5a5',
    personal: '#b8a9d1',
    birthday: '#e6b8c8',
    company: '#e0c3a0',
  },
} as const

// ─────────────────────────────────────
// Type Exports
// ─────────────────────────────────────

export type PrintPaletteKey = keyof typeof PRINT_PALETTE
export type PrintColor = string

/**
 * 取得印刷色值
 * @param colorPath 色值路徑 e.g. 'gold.standard', 'status.danger'
 * @returns hex color value
 */
export function getPrintColor(colorPath: string): string {
  const keys = colorPath.split('.')
  let value: any = PRINT_PALETTE

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key]
    } else {
      console.warn(`Print color not found: ${colorPath}`)
      return '#000000' // fallback to black
    }
  }

  return typeof value === 'string' ? value : '#000000'
}

/**
 * 驗證色碼是否有效（開發時用）
 */
export function validatePrintPalette(): string[] {
  const errors: string[] = []

  const validateHex = (value: any, path: string) => {
    if (typeof value === 'string') {
      if (!/^#[0-9a-fA-F]{6}$/.test(value) && !/^#[0-9a-fA-F]{8}$/.test(value)) {
        errors.push(`Invalid hex color at ${path}: ${value}`)
      }
    } else if (typeof value === 'object' && value !== null) {
      Object.entries(value).forEach(([key, val]) => {
        validateHex(val, `${path}.${key}`)
      })
    }
  }

  validateHex(PRINT_PALETTE, 'PRINT_PALETTE')
  return errors
}

// 開發環境驗證
if (process.env.NODE_ENV === 'development') {
  const errors = validatePrintPalette()
  if (errors.length > 0) {
    console.error('Print palette validation errors:', errors)
  }
}
