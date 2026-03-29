import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-client'

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
    const { requestId } = await params

    // 更新 tour_requests 狀態為不成交（RLS 自動過濾）
    const { error } = await supabase
      .from('tour_requests')
      .update({
        rejected_at: new Date().toISOString(),
        rejection_reason: reason || null,
        package_status: 'rejected',
        status: '取消',
      })
      .eq('id', requestId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '拒絕處理失敗' }, { status: 500 })
  }
}
