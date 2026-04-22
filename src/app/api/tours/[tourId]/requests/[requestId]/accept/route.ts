import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-client'
import { logger } from '@/lib/utils/logger'

/**
 * POST /api/tours/[tourId]/requests/[requestId]/accept
 *
 * 確認成交 Local 報價，並自動產生協作確認單
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tourId: string; requestId: string }> }
) {
  try {
    const supabase = await createApiClient()
    const { selectedTier } = await req.json()
    const { tourId, requestId } = await params

    if (!selectedTier) {
      return NextResponse.json({ error: '缺少人數梯次' }, { status: 400 })
    }

    // P003-F（2026-04-22）：防止 tour ↔ request 錯配攻擊。
    //   原本只靠 RLS 擋跨租戶、但同租戶內 user 可以打 /tours/T1/requests/R2/accept
    //   讓 R2（原屬 T2）被掛到 T1 的行程項目、資料錯亂。
    //   修法：先驗 request.tour_id === path tourId、不符直接 404。
    const { data: reqCheck } = await supabase
      .from('tour_requests')
      .select('tour_id')
      .eq('id', requestId)
      .single()
    if (!reqCheck || reqCheck.tour_id !== tourId) {
      return NextResponse.json({ error: '此需求單不屬於此團' }, { status: 404 })
    }

    // 1. 更新 tour_requests 狀態為已成交（RLS 自動過濾 + tour_id 守門）
    const { error: updateError } = await supabase
      .from('tour_requests')
      .update({
        accepted_at: new Date().toISOString(),
        selected_tier: selectedTier,
        package_status: 'accepted',
        status: '已確認',
      })
      .eq('id', requestId)
      .eq('tour_id', tourId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // 2. 從核心表抓取所有項目
    const { data: coreItems, error: fetchError } = await supabase
      .from('tour_itinerary_items')
      .select('id, title, category, service_date, day_number, sort_order')
      .eq('tour_id', tourId)
      .order('day_number', { ascending: true })
      .order('sort_order', { ascending: true })

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    // 3. 取得 workspace_id（從 tour_requests）
    const { data: request } = await supabase
      .from('tour_requests')
      .select('workspace_id')
      .eq('id', requestId)
      .single()

    if (!request) {
      return NextResponse.json({ error: '找不到需求單' }, { status: 404 })
    }

    // 4. 產生 tour_request_items（協作確認單細項）
    const requestItems = (coreItems || []).map((item, index) => ({
      workspace_id: request.workspace_id,
      request_id: requestId,
      tour_id: tourId,
      item_name: item.title || `項目 ${index + 1}`,
      item_category: item.category,
      service_date: item.service_date,
      day_number: item.day_number,
      sort_order: item.sort_order || index,
      source: 'auto_generated',
      source_item_id: item.id,
      handled_by: 'local',
      local_status: 'pending',
    }))

    if (requestItems.length > 0) {
      const { error: insertError } = await supabase.from('tour_request_items').insert(requestItems)

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }

    // 5. 更新 tour_requests 的 covered_item_ids
    const coveredIds = (coreItems || []).map(item => item.id)
    await supabase
      .from('tour_requests')
      .update({ covered_item_ids: coveredIds })
      .eq('id', requestId)

    // 6. 標記核心表項目為 Local 負責
    if (coveredIds.length > 0) {
      await supabase
        .from('tour_itinerary_items')
        .update({ handled_by: 'local' })
        .in('id', coveredIds)
    }

    return NextResponse.json({
      success: true,
      itemsCreated: requestItems.length,
    })
  } catch (error) {
    logger.error('成交處理失敗:', error)
    return NextResponse.json({ error: '成交處理失敗' }, { status: 500 })
  }
}
