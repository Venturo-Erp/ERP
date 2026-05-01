/**
 * PDF 字體載入器
 *
 * 支援多種字體的動態載入與嵌入
 * - 從 /public/assets/fonts/ 載入 TTF 檔案
 * - 快取已載入的字體避免重複下載
 */

import type jsPDF from 'jspdf'
import { logger } from '@/lib/utils/logger'

// ============================================
// 類型定義
// ============================================

type FontStyle = 'normal' | 'bold' | 'italic' | 'bolditalic'

interface FontInfo {
  /** jsPDF 中的字體名稱 */
  pdfName: string
  /** TTF 檔案路徑 */
  files: {
    normal?: string
    bold?: string
    italic?: string
    bolditalic?: string
  }
}

// ============================================
// 字體對照表
// ============================================

/**
 * Google Fonts 名稱 → TTF 檔案對照表
 */
const FONT_MAP: Record<string, FontInfo> = {
  // === 中文字體 ===
  'Noto Sans TC': {
    pdfName: 'NotoSansTC',
    files: {
      normal: '/assets/fonts/NotoSansTC-Regular.ttf',
      bold: '/assets/fonts/NotoSansTC-Bold.ttf',
    },
  },
  'Noto Serif TC': {
    pdfName: 'NotoSerifTC',
    files: {
      normal: '/assets/fonts/NotoSerifTC-Regular.ttf',
      bold: '/assets/fonts/NotoSerifTC-Bold.ttf',
    },
  },
  'LXGW WenKai TC': {
    pdfName: 'LXGWWenKaiTC',
    files: {
      normal: '/assets/fonts/LXGWWenKaiTC-Regular.ttf',
      bold: '/assets/fonts/LXGWWenKaiTC-Bold.ttf',
    },
  },
  'Zen Maru Gothic': {
    pdfName: 'ZenMaruGothic',
    files: {
      normal: '/assets/fonts/ZenMaruGothic-Regular.ttf',
      bold: '/assets/fonts/ZenMaruGothic-Bold.ttf',
    },
  },
  'Taipei Sans TC': {
    pdfName: 'TaipeiSansTC',
    files: {
      normal: '/assets/fonts/TaipeiSansTC-Regular.ttf',
      bold: '/assets/fonts/TaipeiSansTC-Bold.ttf',
    },
  },
  // === 日文字體 ===
  'Noto Sans JP': {
    pdfName: 'NotoSansJP',
    files: {
      normal: '/assets/fonts/NotoSansJP-Regular.ttf',
      bold: '/assets/fonts/NotoSansJP-Bold.ttf',
    },
  },
  'Noto Serif JP': {
    pdfName: 'NotoSerifJP',
    files: {
      normal: '/assets/fonts/NotoSerifJP-Regular.ttf',
      bold: '/assets/fonts/NotoSerifJP-Bold.ttf',
    },
  },
  // === 英文字體 ===
  Inter: {
    pdfName: 'Inter',
    files: {
      normal: '/assets/fonts/Inter-Regular.ttf',
      bold: '/assets/fonts/Inter-Bold.ttf',
    },
  },
  'Playfair Display': {
    pdfName: 'PlayfairDisplay',
    files: {
      normal: '/assets/fonts/PlayfairDisplay-Regular.ttf',
      bold: '/assets/fonts/PlayfairDisplay-Bold.ttf',
      italic: '/assets/fonts/PlayfairDisplay-Italic.ttf',
    },
  },
  Roboto: {
    pdfName: 'Roboto',
    files: {
      normal: '/assets/fonts/Roboto-Regular.ttf',
      bold: '/assets/fonts/Roboto-Bold.ttf',
    },
  },
  Montserrat: {
    pdfName: 'Montserrat',
    files: {
      normal: '/assets/fonts/Montserrat-Regular.ttf',
      bold: '/assets/fonts/Montserrat-Bold.ttf',
    },
  },
  // === 預設/備用字體 ===
  ChironHeiHK: {
    pdfName: 'ChironHeiHK',
    files: {
      normal: '/assets/fonts/ChironHeiHK-N.ttf',
      bold: '/assets/fonts/ChironHeiHK-B.ttf',
    },
  },
}

// 預設字體（作為 fallback）
const DEFAULT_FONT = 'ChironHeiHK'

// ============================================
// 字體快取
// ============================================

/** 已載入的字體快取 */
const loadedFonts = new Map<string, boolean>()

/** 字體 Base64 快取 */
const fontBase64Cache = new Map<string, string>()

// ============================================
// 工具函數
// ============================================

/**
 * 將 ArrayBuffer 轉換為 Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * 載入單個字體檔案
 */
async function loadFontFile(path: string): Promise<string | null> {
  // 檢查快取
  if (fontBase64Cache.has(path)) {
    return fontBase64Cache.get(path)!
  }

  try {
    const response = await fetch(path)
    if (!response.ok) {
      logger.warn(`[FontLoader] Failed to load font: ${path}`)
      return null
    }

    const buffer = await response.arrayBuffer()
    const base64 = arrayBufferToBase64(buffer)
    fontBase64Cache.set(path, base64)
    return base64
  } catch (error) {
    logger.error(`[FontLoader] Error loading font ${path}:`, error)
    return null
  }
}

/**
 * 將字體添加到 jsPDF
 */
async function addFontToDoc(doc: jsPDF, fontFamily: string, fontInfo: FontInfo): Promise<boolean> {
  const cacheKey = `${fontFamily}`

  // 檢查是否已載入
  if (loadedFonts.has(cacheKey)) {
    return true
  }

  let hasAnyFont = false

  // 載入各種樣式
  for (const [style, path] of Object.entries(fontInfo.files)) {
    if (!path) continue

    const base64 = await loadFontFile(path)
    if (base64) {
      const fileName = path.split('/').pop()!
      doc.addFileToVFS(fileName, base64)
      doc.addFont(fileName, fontInfo.pdfName, style as FontStyle)
      hasAnyFont = true
      logger.log(`[FontLoader] Loaded ${fontInfo.pdfName} ${style}`)
    }
  }

  if (hasAnyFont) {
    loadedFonts.set(cacheKey, true)
  }

  return hasAnyFont
}

// ============================================
// 匯出函數
// ============================================

/**
 * 根據字體列表載入所有需要的字體到 jsPDF
 *
 * @param doc - jsPDF 實例
 * @param fontFamilies - 需要的字體列表
 */
async function loadFontsForPDF(doc: jsPDF, fontFamilies: string[]): Promise<void> {
  // 確保預設字體一定會載入
  const fontsToLoad = new Set([DEFAULT_FONT, ...fontFamilies])

  logger.log(`[FontLoader] Loading fonts: ${Array.from(fontsToLoad).join(', ')}`)

  for (const fontFamily of fontsToLoad) {
    const fontInfo = FONT_MAP[fontFamily]

    if (fontInfo) {
      await addFontToDoc(doc, fontFamily, fontInfo)
    } else {
      logger.warn(`[FontLoader] Font "${fontFamily}" not in map, will use fallback`)
    }
  }

  // 設定預設字體
  try {
    doc.setFont(FONT_MAP[DEFAULT_FONT].pdfName, 'normal')
  } catch {
    logger.warn('[FontLoader] Failed to set default font')
  }
}

/**
 * 取得字體在 PDF 中的名稱
 *
 * @param fontFamily - CSS 字體名稱（如 "Noto Sans TC"）
 * @returns jsPDF 字體名稱
 */
export function getFontName(fontFamily: string): string {
  const fontInfo = FONT_MAP[fontFamily]
  if (fontInfo) {
    return fontInfo.pdfName
  }
  // 找不到就用預設字體
  return FONT_MAP[DEFAULT_FONT].pdfName
}

/**
 * 檢查字體是否已載入
 */
export function isFontLoaded(fontFamily: string): boolean {
  return loadedFonts.has(fontFamily)
}

/**
 * 取得所有支援的字體列表
 */
export function getSupportedFonts(): string[] {
  return Object.keys(FONT_MAP)
}

/**
 * 清除字體快取
 */
export function clearFontCache(): void {
  loadedFonts.clear()
  fontBase64Cache.clear()
  logger.log('[FontLoader] Cache cleared')
}
