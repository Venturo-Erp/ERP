/**
 * Logan 知識同步 Cron Job
 * 每天早上 10:00 (UTC+8) 執行
 * Vercel Cron: 0 2 * * * (UTC)
 *
 * 功能：
 * - 查詢過去 24 小時新增的景點、餐廳
 * - 寫入 ai_memories 讓 Logan 學習
 */

import { NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { ApiError, successResponse } from '@/lib/api/response'
import { subDays } from 'date-fns'
import { validateCronAuth, unauthorizedResponse } from '@/lib/auth/cron-auth'

// Logan 的 ID
const LOGAN_ID = '00000000-0000-0000-0000-000000000002'

interface SyncResult {
  attractions: number
  restaurants: number
  michelin: number
  total: number
}

export async function GET(_request: NextRequest) {
  // 🔒 驗證 Cron 身份
  const authResult = validateCronAuth(_request)
  if (!authResult.success) {
    logger.warn('Cron auth failed:', authResult.error)
    return unauthorizedResponse(authResult.error)
  }

  try {
    logger.info('開始執行 Logan 知識同步 Cron Job')

    const supabase = getSupabaseAdminClient()
    const yesterday = subDays(new Date(), 1).toISOString()

    // 取得第一個 workspace（用於寫入記憶）
    const { data: workspaces } = await supabase.from('workspaces').select('id').limit(1)

    if (!workspaces?.length) {
      return ApiError.internal('找不到 workspace')
    }

    const workspaceId = workspaces[0].id
    const memoriesInserted: Array<{
      workspace_id: string
      category: string
      title: string
      content: string
      tags: string[]
      importance: number
      source: string
      created_by: string
    }> = []

    // 1. 查詢新增的景點
    const { data: newAttractions } = await supabase
      .from('attractions')
      .select(
        `
        id, name, english_name, description, category, address,
        ticket_price, duration_minutes, notes,
        cities(name),
        countries(name)
      `
      )
      .gte('created_at', yesterday)
      .eq('is_active', true)

    if (newAttractions?.length) {
      for (const attraction of newAttractions) {
        const cityName = (attraction.cities as { name: string } | null)?.name || '未知城市'
        const countryName = (attraction.countries as { name: string } | null)?.name || ''

        memoriesInserted.push({
          workspace_id: workspaceId,
          category: 'poi_data',
          title: `景點：${attraction.name}`,
          content: formatAttractionContent(attraction, cityName, countryName),
          tags: ['景點', cityName, attraction.category || '觀光'].filter(Boolean),
          importance: 5,
          source: 'system_sync',
          created_by: LOGAN_ID,
        })
      }
    }

    // 2. 查詢新增的餐廳
    const { data: newRestaurants } = await supabase
      .from('restaurants')
      .select(
        `
        id, name, english_name, description, category, cuisine_type,
        price_range, avg_price_lunch, avg_price_dinner,
        specialties, address, max_group_size,
        cities(name),
        countries(name)
      `
      )
      .gte('created_at', yesterday)
      .eq('is_active', true)

    if (newRestaurants?.length) {
      for (const restaurant of newRestaurants) {
        const cityName = (restaurant.cities as { name: string } | null)?.name || '未知城市'
        const countryName = (restaurant.countries as { name: string } | null)?.name || ''

        memoriesInserted.push({
          workspace_id: workspaceId,
          category: 'poi_data',
          title: `餐廳：${restaurant.name}`,
          content: formatRestaurantContent(restaurant, cityName, countryName),
          tags: ['餐廳', cityName, ...(restaurant.cuisine_type || [])].filter(Boolean),
          importance: 5,
          source: 'system_sync',
          created_by: LOGAN_ID,
        })
      }
    }

    // 3. 查詢新增的米其林餐廳
    const { data: newMichelin } = await supabase
      .from('michelin_restaurants')
      .select(
        `
        id, name, english_name, description, cuisine_type,
        michelin_stars, bib_gourmand, green_star,
        price_range, avg_price_lunch, avg_price_dinner,
        signature_dishes, address, max_group_size,
        cities(name),
        countries(name)
      `
      )
      .gte('created_at', yesterday)
      .eq('is_active', true)

    if (newMichelin?.length) {
      for (const restaurant of newMichelin) {
        const cityName = (restaurant.cities as { name: string } | null)?.name || '未知城市'
        const countryName = (restaurant.countries as { name: string } | null)?.name || ''

        memoriesInserted.push({
          workspace_id: workspaceId,
          category: 'poi_data',
          title: `米其林餐廳：${restaurant.name}`,
          content: formatMichelinContent(restaurant, cityName, countryName),
          tags: ['米其林', '餐廳', cityName, ...(restaurant.cuisine_type || [])].filter(Boolean),
          importance: 7, // 米其林餐廳重要性較高
          source: 'system_sync',
          created_by: LOGAN_ID,
        })
      }
    }

    // 4. 寫入 ai_memories
    if (memoriesInserted.length > 0) {
      const { error: insertError } = await supabase.from('ai_memories').insert(memoriesInserted)

      if (insertError) {
        logger.error('寫入 ai_memories 失敗:', insertError)
        return ApiError.database('寫入記憶失敗')
      }
    }

    const result: SyncResult = {
      attractions: newAttractions?.length || 0,
      restaurants: newRestaurants?.length || 0,
      michelin: newMichelin?.length || 0,
      total: memoriesInserted.length,
    }

    // 記錄執行結果
    await supabase.from('cron_execution_logs').insert({
      job_name: 'sync_logan_knowledge',
      result: JSON.parse(JSON.stringify(result)),
      success: true,
    })

    logger.info('Logan 知識同步完成', result)

    return successResponse({
      message: `已同步 ${result.total} 筆新知識給 Logan`,
      ...result,
    })
  } catch (error) {
    logger.error('Logan 知識同步錯誤:', error)

    // 記錄錯誤
    try {
      const supabase = getSupabaseAdminClient()
      await supabase.from('cron_execution_logs').insert({
        job_name: 'sync_logan_knowledge',
        success: false,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
    } catch {
      // 忽略記錄失敗
    }

    return ApiError.internal('Internal error')
  }
}

// 格式化景點內容
function formatAttractionContent(
  attraction: {
    name: string
    english_name?: string | null
    description?: string | null
    category?: string | null
    address?: string | null
    ticket_price?: string | null
    duration_minutes?: number | null
    notes?: string | null
  },
  cityName: string,
  countryName: string
): string {
  const parts = [
    `${attraction.name}${attraction.english_name ? ` (${attraction.english_name})` : ''}`,
    `位於${countryName}${cityName}`,
  ]

  if (attraction.category) parts.push(`類型：${attraction.category}`)
  if (attraction.address) parts.push(`地址：${attraction.address}`)
  if (attraction.ticket_price) parts.push(`門票：${attraction.ticket_price}`)
  if (attraction.duration_minutes) parts.push(`建議停留：${attraction.duration_minutes} 分鐘`)
  if (attraction.description) parts.push(`簡介：${attraction.description}`)
  if (attraction.notes) parts.push(`備註：${attraction.notes}`)

  return parts.join('。')
}

// 格式化餐廳內容
function formatRestaurantContent(
  restaurant: {
    name: string
    english_name?: string | null
    description?: string | null
    category?: string | null
    cuisine_type?: string[] | null
    price_range?: string | null
    avg_price_lunch?: number | null
    avg_price_dinner?: number | null
    specialties?: string[] | null
    address?: string | null
    max_group_size?: number | null
  },
  cityName: string,
  countryName: string
): string {
  const parts = [
    `${restaurant.name}${restaurant.english_name ? ` (${restaurant.english_name})` : ''}`,
    `位於${countryName}${cityName}`,
  ]

  if (restaurant.cuisine_type?.length) parts.push(`料理類型：${restaurant.cuisine_type.join('、')}`)
  if (restaurant.category) parts.push(`分類：${restaurant.category}`)
  if (restaurant.price_range) parts.push(`價位：${restaurant.price_range}`)
  if (restaurant.avg_price_lunch) parts.push(`午餐約 ${restaurant.avg_price_lunch} 元`)
  if (restaurant.avg_price_dinner) parts.push(`晚餐約 ${restaurant.avg_price_dinner} 元`)
  if (restaurant.specialties?.length) parts.push(`推薦菜色：${restaurant.specialties.join('、')}`)
  if (restaurant.max_group_size) parts.push(`可容納團體：${restaurant.max_group_size} 人`)
  if (restaurant.address) parts.push(`地址：${restaurant.address}`)
  if (restaurant.description) parts.push(`簡介：${restaurant.description}`)

  return parts.join('。')
}

// 格式化米其林餐廳內容
function formatMichelinContent(
  restaurant: {
    name: string
    english_name?: string | null
    description?: string | null
    cuisine_type?: string[] | null
    michelin_stars?: number | null
    bib_gourmand?: boolean | null
    green_star?: boolean | null
    price_range?: string | null
    avg_price_lunch?: number | null
    avg_price_dinner?: number | null
    signature_dishes?: string[] | null
    address?: string | null
    max_group_size?: number | null
  },
  cityName: string,
  countryName: string
): string {
  const parts = [
    `${restaurant.name}${restaurant.english_name ? ` (${restaurant.english_name})` : ''}`,
  ]

  // 米其林評等
  const ratings: string[] = []
  if (restaurant.michelin_stars) ratings.push(`${restaurant.michelin_stars} 星`)
  if (restaurant.bib_gourmand) ratings.push('必比登推薦')
  if (restaurant.green_star) ratings.push('綠星')
  if (ratings.length) parts.push(`米其林${ratings.join('、')}`)

  parts.push(`位於${countryName}${cityName}`)

  if (restaurant.cuisine_type?.length) parts.push(`料理類型：${restaurant.cuisine_type.join('、')}`)
  if (restaurant.price_range) parts.push(`價位：${restaurant.price_range}`)
  if (restaurant.avg_price_lunch) parts.push(`午餐約 ${restaurant.avg_price_lunch} 元`)
  if (restaurant.avg_price_dinner) parts.push(`晚餐約 ${restaurant.avg_price_dinner} 元`)
  if (restaurant.signature_dishes?.length)
    parts.push(`招牌菜：${restaurant.signature_dishes.join('、')}`)
  if (restaurant.max_group_size) parts.push(`可容納團體：${restaurant.max_group_size} 人`)
  if (restaurant.address) parts.push(`地址：${restaurant.address}`)
  if (restaurant.description) parts.push(`簡介：${restaurant.description}`)

  return parts.join('。')
}
