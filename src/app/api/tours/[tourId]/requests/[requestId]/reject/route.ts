import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-client'
import { logger } from '@/lib/utils/logger'

/**
 * POST /api/tours/[tourId]/requests/[requestId]/reject
 *
 * 標記報價為不成交
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tourId: string; requestId: string }> }
) {
  try {
    const supabase = await createApiClient()
    const { reason } = await req.json()
    const { tourId, requestId } = await params

    // P003-F（2026-04-22）：防止 tour ↔ request 錯配、加 tour_id 守門
    const { error } = await supabase
      .from('tour_requests')
      .update({
        rejected_at: new Date().toISOString(),
        rejection_reason: reason || null,
        package_status: 'rejected',
        status: '取消',
      })
      .eq('id', requestId)
      .eq('tour_id', tourId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('拒絕處理失敗:', error)
    return NextResponse.json({ error: '拒絕處理失敗' }, { status: 500 })
  }
}
