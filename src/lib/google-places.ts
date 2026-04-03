/**
 * Google Places API 整合
 * 用於自動取得景點座標
 */

export interface PlaceCoordinates {
  lat: number
  lng: number
  name: string
  address: string
  placeId?: string
}

export interface GoogleMapsUrlCoords {
  lat: number
  lng: number
}

/**
 * 使用 Google Places API 搜尋景點座標
 * @param placeName 景點名稱
 * @param city 城市名稱（預設：清邁）
 * @param country 國家名稱（預設：泰國）
 * @returns 座標資訊或 null
 */
export async function getPlaceCoordinates(
  placeName: string,
  city: string = '清邁',
  country: string = 'Thailand'
): Promise<PlaceCoordinates | null> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    
    if (!apiKey) {
      console.error('Google Maps API key 未設定')
      return null
    }

    const query = `${placeName}, ${city}, ${country}`
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`
    
    const response = await fetch(url)
    const data = await response.json()

    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0]
      return {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        name: result.name,
        address: result.formatted_address,
        placeId: result.place_id,
      }
    }

    if (data.status === 'ZERO_RESULTS') {
      console.warn(`找不到「${query}」的座標`)
    } else if (data.status !== 'OK') {
      console.error('Google Places API 錯誤:', data.status, data.error_message)
    }

    return null
  } catch (error) {
    console.error('Google Places API 呼叫失敗:', error)
    return null
  }
}

/**
 * 從 Google Maps URL 解析座標
 * 支援多種 Google Maps URL 格式：
 * - https://maps.google.com/?q=18.788015,98.985934
 * - https://www.google.com/maps/place/.../@18.788015,98.985934
 * - https://goo.gl/maps/... (需要解析後的完整 URL)
 * 
 * @param url Google Maps URL
 * @returns 座標或 null
 */
export function extractCoordsFromUrl(url: string): GoogleMapsUrlCoords | null {
  try {
    // 格式 1: ?q=lat,lng
    const qMatch = url.match(/[?&]q=([-\d.]+),([-\d.]+)/)
    if (qMatch) {
      return {
        lat: parseFloat(qMatch[1]),
        lng: parseFloat(qMatch[2]),
      }
    }

    // 格式 2: /@lat,lng
    const atMatch = url.match(/@([-\d.]+),([-\d.]+)/)
    if (atMatch) {
      return {
        lat: parseFloat(atMatch[1]),
        lng: parseFloat(atMatch[2]),
      }
    }

    // 格式 3: /place/.../@lat,lng
    const placeMatch = url.match(/place\/[^/]+\/@([-\d.]+),([-\d.]+)/)
    if (placeMatch) {
      return {
        lat: parseFloat(placeMatch[1]),
        lng: parseFloat(placeMatch[2]),
      }
    }

    console.warn('無法從 URL 解析座標:', url)
    return null
  } catch (error) {
    console.error('解析 Google Maps URL 失敗:', error)
    return null
  }
}

/**
 * 驗證座標是否有效
 * @param lat 緯度
 * @param lng 經度
 * @returns 是否有效
 */
export function isValidCoordinates(lat?: number, lng?: number): boolean {
  if (lat === undefined || lng === undefined) return false
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}
