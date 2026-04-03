// ============================================
// 餐廳選擇系統型別定義
// ============================================

export interface Restaurant {
  id: string
  city: string
  name: string
  name_en?: string
  category?: string  // 泰式/中式/西式/日式/咖啡廳/甜點/酒吧
  cuisine_type?: string
  description?: string
  latitude?: number
  longitude?: number
  tags?: string[]
  image_url?: string
  price_range?: string  // 💰/💰💰/💰💰💰
  michelin_star?: number
  must_try_dish?: string
  opening_hours?: Record<string, string>
  phone?: string
  address?: string
  google_maps_url?: string
  priority: number
  created_at: string
  updated_at: string
}

export interface CustomerRestaurantPick {
  id: string
  line_user_id: string
  restaurant_id: string
  session_id?: string
  meal_type?: string  // 早餐/午餐/晚餐/下午茶
  selected_at: string
  // Join 欄位
  restaurant?: Restaurant
}

// 餐廳類別
export const RESTAURANT_CATEGORIES = {
  THAI: '泰式',
  CHINESE: '中式',
  WESTERN: '西式',
  JAPANESE: '日式',
  CAFE: '咖啡廳',
  DESSERT: '甜點',
  BAR: '酒吧',
  VEGETARIAN: '素食',
} as const

export type RestaurantCategory = typeof RESTAURANT_CATEGORIES[keyof typeof RESTAURANT_CATEGORIES]

// 價格範圍
export const PRICE_RANGES = {
  BUDGET: '💰',      // 平價（< 200 THB）
  MODERATE: '💰💰',  // 中價（200-500 THB）
  EXPENSIVE: '💰💰💰' // 高級（> 500 THB）
} as const

// 餐廳分組
export interface RestaurantGroup {
  category: RestaurantCategory
  emoji: string
  restaurants: Restaurant[]
}
