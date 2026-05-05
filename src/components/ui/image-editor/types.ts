/**
 * ImageEditor 類型定義
 */

/**
 * 圖片色彩調整設定（Lightroom 風格）
 * 所有數值範圍為 -100 到 100，0 為預設值
 */
export interface ImageAdjustments {
  exposure: number
  contrast: number
  highlights: number
  shadows: number
  clarity: number
  saturation: number
  temperature: number
  tint: number
  vignette: number
}

export interface ImageEditorSettings {
  /** 縮放倍率 */
  scale: number
  /** 位置 X (0-100) */
  x: number
  /** 位置 Y (0-100) */
  y: number
  /** 旋轉角度 (0, 90, 180, 270) */
  rotation: number
  /** 水平翻轉 */
  flipH: boolean
  /** 色彩調整 */
  adjustments: ImageAdjustments
}

export const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  saturation: 0,
  temperature: 0,
  tint: 0,
  clarity: 0,
  vignette: 0,
}

export const DEFAULT_SETTINGS: ImageEditorSettings = {
  scale: 1,
  x: 50,
  y: 50,
  rotation: 0,
  flipH: false,
  adjustments: { ...DEFAULT_ADJUSTMENTS },
}

