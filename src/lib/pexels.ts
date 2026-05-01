/**
 * Pexels API 工具
 *
 * 提供免費圖庫搜尋功能
 * 需要在 .env.local 設定 NEXT_PUBLIC_PEXELS_API_KEY
 * 前往 https://www.pexels.com/api/ 申請（免費）
 */

export interface PexelsPhoto {
  id: number
  width: number
  height: number
  url: string
  photographer: string
  photographer_url: string
  photographer_id: number
  avg_color: string
  src: {
    original: string
    large2x: string
    large: string
    medium: string
    small: string
    portrait: string
    landscape: string
    tiny: string
  }
  alt: string
}

interface PexelsSearchResult {
  total_results: number
  page: number
  per_page: number
  photos: PexelsPhoto[]
  next_page?: string
}

const PEXELS_API_URL = 'https://api.pexels.com/v1'
const API_KEY = process.env.NEXT_PUBLIC_PEXELS_API_KEY

/**
 * 檢查 Pexels API 是否已設定
 */
export function isPexelsConfigured(): boolean {
  return Boolean(API_KEY && API_KEY.length > 0)
}

/**
 * 搜尋 Pexels 圖片
 */
export async function searchPexelsPhotos(
  query: string,
  options?: {
    page?: number
    perPage?: number
    orientation?: 'landscape' | 'portrait' | 'square'
    size?: 'large' | 'medium' | 'small'
  }
): Promise<PexelsSearchResult> {
  if (!API_KEY) {
    throw new Error('Pexels API 未設定。請在 .env.local 設定 NEXT_PUBLIC_PEXELS_API_KEY')
  }

  const params = new URLSearchParams({
    query,
    page: String(options?.page ?? 1),
    per_page: String(options?.perPage ?? 20),
    ...(options?.orientation && { orientation: options.orientation }),
    ...(options?.size && { size: options.size }),
  })

  const response = await fetch(`${PEXELS_API_URL}/search?${params}`, {
    headers: {
      Authorization: API_KEY,
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Pexels API 驗證失敗，請檢查 API Key 是否正確')
    }
    if (response.status === 429) {
      throw new Error('Pexels API 請求次數過多，請稍後再試')
    }
    throw new Error(`Pexels API 錯誤: ${response.status}`)
  }

  return response.json()
}

/**
 * 取得精選圖片
 */
async function getCuratedPhotos(options?: {
  page?: number
  perPage?: number
}): Promise<PexelsSearchResult> {
  if (!API_KEY) {
    throw new Error('Pexels API 未設定')
  }

  const params = new URLSearchParams({
    page: String(options?.page ?? 1),
    per_page: String(options?.perPage ?? 20),
  })

  const response = await fetch(`${PEXELS_API_URL}/curated?${params}`, {
    headers: {
      Authorization: API_KEY,
    },
  })

  if (!response.ok) {
    throw new Error(`Pexels API 錯誤: ${response.status}`)
  }

  return response.json()
}

/**
 * 取得旅遊相關的推薦搜尋關鍵字
 */
export const PEXELS_TRAVEL_KEYWORDS = {
  zh: [
    '旅行',
    '海灘',
    '山景',
    '都市',
    '建築',
    '美食',
    '咖啡廳',
    '夜景',
    '黃昏',
    '日出',
    '度假村',
    '機場',
    '寺廟',
    '古城',
    '街道',
    '熱帶',
    '雪景',
    '楓葉',
    '花海',
    '叢林',
  ],
  en: [
    'travel',
    'beach',
    'mountain',
    'city',
    'architecture',
    'food',
    'cafe',
    'night',
    'sunset',
    'sunrise',
    'resort',
    'airport',
    'temple',
    'ancient',
    'street',
    'tropical',
    'snow',
    'autumn',
    'flowers',
    'jungle',
  ],
}
