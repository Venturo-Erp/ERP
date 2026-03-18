import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    const { selectedTier } = await req.json()
    const { tourId, requestId } = await params
    
    if (!selectedTier) {
      return NextResponse.json({ error: '缺少人數梯次' }, { status: 400 })
    }
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // 1. 更新 tour_requests 狀態為已成交
    const { error: updateError } = await supabase
      .from('tour_requests')
      .update({
        accepted_at: new Date().toISOString(),
        selected_tier: selectedTier,
        package_status: 'accepted',
        status: '已確認',
      })
      .eq('id', requestId)
    
    if (updateError) {
      console.error('更新需求單失敗:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
    
    // 2. 從核心表抓取所有項目，產生協作確認單
    const { data: coreItems, error: fetchError } = await supabase
      .from('tour_itinerary_items')
      .select('*')
      .eq('tour_id', tourId)
      .order('day_number', { ascending: true })
      .order('sort_order', { ascending: true })
    
    if (fetchError) {
      console.error('讀取核心表失敗:', fetchError)
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
      handled_by: 'local', // 預設由 Local 處理
      local_status: 'pending', // 預設待處理
    }))
    
    if (requestItems.length > 0) {
      const { error: insertError } = await supabase
        .from('tour_request_items')
        .insert(requestItems)
      
      if (insertError) {
        console.error('產生協作確認單失敗:', insertError)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }
    
    // 5. 更新 tour_requests 的 covered_item_ids
    const coveredIds = (coreItems || []).map(item => item.id)
    await supabase
      .from('tour_requests')
      .update({ covered_item_ids: coveredIds })
      .eq('id', requestId)
    
    return NextResponse.json({ 
      success: true,
      itemsCreated: requestItems.length,
    })
  } catch (error) {
    console.error('成交處理失敗:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
