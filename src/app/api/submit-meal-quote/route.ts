import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tourId, requestId, contact, phone, pax, unitPrice, totalCost, notes, submitted_at } = body

    // 更新 tour_requests
    const { error } = await supabase
      .from('tour_requests')
      .update({
        supplier_response: {
          contact,
          phone,
          pax,
          unitPrice,
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
      console.error('Supabase update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('提交餐食報價失敗:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
