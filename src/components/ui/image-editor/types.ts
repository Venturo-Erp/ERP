/**
 * ImageEditor 類型定義
 */

import React from 'react'
import {
  Sparkles,
  Trees,
  Camera,
  Utensils,
  Building,
  Sun,
  Cloud,
  Leaf,
  Snowflake,
} from 'lucide-react'

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

// AI 編輯動作
export type AiEditAction =
  | 'clean_scene'
  | 'landscape_pro'
  | 'travel_magazine'
  | 'food_delicious'
  | 'architecture_dramatic'
  | 'golden_hour'
  | 'blue_hour'
  | 'season_spring'
  | 'season_summer'
  | 'season_autumn'
  | 'season_winter'

export interface AiAction {
  action: AiEditAction
  label: string
  icon: React.ElementType
}

export const AI_ACTIONS: AiAction[] = [
  { action: 'clean_scene', label: '淨空場景', icon: Sparkles },
  { action: 'landscape_pro', label: '風景大師', icon: Trees },
  { action: 'travel_magazine', label: '旅遊雜誌', icon: Camera },
  { action: 'food_delicious', label: '美食攝影', icon: Utensils },
  { action: 'architecture_dramatic', label: '建築攝影', icon: Building },
  { action: 'golden_hour', label: '黃金時刻', icon: Sun },
  { action: 'blue_hour', label: '藍調時刻', icon: Cloud },
  { action: 'season_spring', label: '春季櫻花', icon: Leaf },
  { action: 'season_autumn', label: '秋楓紅葉', icon: Leaf },
  { action: 'season_winter', label: '冬季雪景', icon: Snowflake },
]
