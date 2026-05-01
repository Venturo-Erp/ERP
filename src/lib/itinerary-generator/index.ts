/**
 * 行程自動生成器模組
 * 提供一鍵生成行程草稿功能
 */

// 主要生成器
export { generateItinerary } from './generator'

// Gemini AI 生成器（當資料庫景點不足時使用）
export { generateItineraryWithGemini, convertToGeminiRequest } from './gemini-generator'

// 類型定義
export type {
  GenerateItineraryRequest,
  
  
  
  
  
  AccommodationPlan,
  ItineraryStyle,
} from './types'



// 工具函數



