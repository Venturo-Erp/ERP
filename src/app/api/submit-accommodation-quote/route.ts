import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tourId, requestId, contact, phone, rooms, totalCost, notes, submitted_at } = body

    // 更新 tour_requests
    const { error } = await supabase
      .from('tour_requests')
      .update({
        supplier_response: {
          contact,
          phone,
          rooms,
          totalCost,
          notes,
          submitted_at,
        },
        replied_at: submitted_at,
        status: 'replied',
      })
      .eq('id', requestId)
      .eq('tour_id', tourId)

    if (error) {
      logger.error('Supabase update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 同步核心表：更新 reply_cost 和 request_status
    const { data: reqData } = await supabase
      .from('tour_requests')
      .select('supplier_name')
      .eq('id', requestId)
      .single()

    if (reqData) {
      await supabase
        .from('tour_itinerary_items')
        .update({
          request_status: 'replied',
          reply_cost: totalCost,
        } as Record<string, unknown>)
        .eq('tour_id', tourId)
        .eq('supplier_name', reqData.supplier_name)
        .eq('category', 'accommodation')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('提交住宿報價失敗:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
