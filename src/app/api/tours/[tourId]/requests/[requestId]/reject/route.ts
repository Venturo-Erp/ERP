import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    const { reason } = await req.json()
    const { requestId } = await params

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 更新 tour_requests 狀態為不成交
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
      console.error('更新需求單失敗:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('拒絕處理失敗:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
