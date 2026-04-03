/**
 * LINE Bot - 清邁景點選擇流程
 * 
 * 流程：
 * 1. 客戶說「我想去清邁」
 * 2. Bot 顯示類別選擇（文化/自然/親子/浪漫/美食）
 * 3. 客戶選擇類別或「幫我推薦」
 * 4. 顯示景點清單（含圖片、簡介）
 * 5. 客戶多選景點
 * 6. 儲存選擇 → 建立需求單
 */

import { createClient } from '@supabase/supabase-js'
import type { Destination, DestinationCategory } from '@/features/destinations/types'
import { DESTINATION_CATEGORIES } from '@/features/destinations/types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''

// ============================================
// 1. 偵測清邁關鍵字
// ============================================
export function detectChiangMaiIntent(message: string): boolean {
  const keywords = ['清邁', 'เชียงใหม่', 'chiang mai', 'chiangmai']
  const lowerMessage = message.toLowerCase()
  return keywords.some(keyword => lowerMessage.includes(keyword))
}

// ============================================
// 2. 顯示類別選擇
// ============================================
export async function sendCategorySelection(replyToken: string) {
  const message = {
    type: 'template',
    altText: '清邁景點選擇',
    template: {
      type: 'buttons',
      thumbnailImageUrl: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=800',
      title: '清邁很棒！',
      text: '我們有 50 個精選景點，你想看哪類？',
      actions: [
        {
          type: 'postback',
          label: '🏛️ 文化古蹟',
          data: 'action=view_destinations&category=文化古蹟'
        },
        {
          type: 'postback',
          label: '🌿 自然風光',
          data: 'action=view_destinations&category=自然風光'
        },
        {
          type: 'postback',
          label: '👨‍👩‍👧 親子活動',
          data: 'action=view_destinations&category=親子活動'
        },
        {
          type: 'postback',
          label: '💑 浪漫悠閒',
          data: 'action=view_destinations&category=浪漫悠閒'
        }
      ]
    }
  }

  const secondMessage = {
    type: 'template',
    altText: '更多選項',
    template: {
      type: 'buttons',
      text: '或者...',
      actions: [
        {
          type: 'postback',
          label: '🛍️ 美食購物',
          data: 'action=view_destinations&category=美食購物'
        },
        {
          type: 'postback',
          label: '⭐ 幫我推薦 Top 20',
          data: 'action=recommend_top20'
        },
        {
          type: 'postback',
          label: '📋 全部 50 個景點',
          data: 'action=view_all_destinations'
        }
      ]
    }
  }

  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LINE_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [message, secondMessage],
    }),
  })
}

// ============================================
// 3. 載入景點（依類別或優先級）
// ============================================
export async function loadDestinations(
  category?: DestinationCategory,
  topOnly: boolean = false
): Promise<Destination[]> {
  let query = supabase
    .from('destinations')
    .select('*')
    .eq('city', '清邁')
    .order('priority', { ascending: true })

  if (category) {
    query = query.eq('category', category)
  }

  if (topOnly) {
    query = query.lte('priority', 20)
  }

  const { data, error } = await query

  if (error) {
    console.error('[Destinations] Load error:', error)
    return []
  }

  return data || []
}

// ============================================
// 4. 顯示景點清單（Carousel）
// ============================================
export async function sendDestinationCarousel(
  userId: string,
  destinations: Destination[],
  sessionId: string
) {
  // LINE Carousel 最多 10 個
  const displayDestinations = destinations.slice(0, 10)

  const columns = displayDestinations.map((dest) => ({
    thumbnailImageUrl: dest.image_url || 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=800',
    title: dest.name.substring(0, 40),
    text: dest.description?.substring(0, 60) || '精選景點',
    actions: [
      {
        type: 'postback',
        label: '✅ 選這個',
        data: `action=pick_destination&destination_id=${dest.id}&session_id=${sessionId}`
      },
      {
        type: 'uri',
        label: '🗺️ 查看位置',
        uri: dest.latitude && dest.longitude
          ? `https://www.google.com/maps?q=${dest.latitude},${dest.longitude}`
          : 'https://www.google.com/maps/search/清邁'
      }
    ]
  }))

  const message = {
    type: 'template',
    altText: '清邁景點清單',
    template: {
      type: 'carousel',
      columns
    }
  }

  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LINE_TOKEN}`,
    },
    body: JSON.stringify({
      to: userId,
      messages: [message],
    }),
  })

  // 如果超過 10 個，提示還有更多
  if (destinations.length > 10) {
    await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LINE_TOKEN}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [
          {
            type: 'text',
            text: `📌 還有 ${destinations.length - 10} 個景點，完成選擇後可繼續瀏覽`
          }
        ],
      }),
    })
  }
}

// ============================================
// 5. 記錄客戶選擇
// ============================================
export async function saveDestinationPick(
  lineUserId: string,
  destinationId: string,
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('customer_destination_picks')
    .insert({
      line_user_id: lineUserId,
      destination_id: destinationId,
      session_id: sessionId,
    })

  if (error) {
    console.error('[Picks] Save error:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// ============================================
// 6. 取得客戶已選景點
// ============================================
export async function getUserPicks(
  lineUserId: string,
  sessionId: string
): Promise<Destination[]> {
  const { data, error } = await supabase
    .from('customer_destination_picks')
    .select(`
      destination_id,
      destinations (*)
    `)
    .eq('line_user_id', lineUserId)
    .eq('session_id', sessionId)

  if (error) {
    console.error('[Picks] Load error:', error)
    return []
  }

  return (data || []).map((pick: any) => pick.destinations).filter(Boolean)
}

// ============================================
// 7. 顯示選擇摘要
// ============================================
export async function sendPicksSummary(
  replyToken: string,
  picks: Destination[]
) {
  const categoryCount: Record<string, number> = {}
  
  picks.forEach((dest) => {
    const cat = dest.category || '其他'
    categoryCount[cat] = (categoryCount[cat] || 0) + 1
  })

  const categoryText = Object.entries(categoryCount)
    .map(([cat, count]) => `${cat} ${count}`)
    .join(' / ')

  const destinationList = picks.map((d, i) => `${i + 1}. ${d.name}`).join('\n')

  const suggestedDays = Math.ceil(picks.length / 3)

  const message = {
    type: 'text',
    text: `✅ 收到！你選了 ${picks.length} 個景點：

${destinationList}

📊 類型分布：${categoryText}
📅 建議天數：${suggestedDays}-${suggestedDays + 1} 天

我幫你建立需求單，稍後客服會聯絡報價 😊`
  }

  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LINE_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [message],
    }),
  })
}

// ============================================
// 8. 產生 Session ID
// ============================================
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
