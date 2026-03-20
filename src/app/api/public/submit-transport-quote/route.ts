import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      tourId,
      requestId, // 單一性：綁定到特定需求單
      contact,
      phone,
      totalFare,
      includesParking,
      includesToll,
      includesAccommodation,
      accommodationFee,
      includesTip,
      tipAmount,
      supplierNote,
    } = body

    if (!requestId || !tourId || !contact || !phone || !totalFare) {
      return NextResponse.json({ error: '缺少必填欄位' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const quoteData = {
      contact,
      phone,
      totalFare,
      includesParking,
      includesToll,
      includesAccommodation,
      accommodationFee: includesAccommodation ? null : accommodationFee,
      includesTip,
      tipAmount: includesTip ? null : tipAmount,
      supplierNote,
      submitted_at: new Date().toISOString(),
    }

    // 更新指定的需求單（單一性：不覆蓋，固定在這個 requestId）
    const { error } = await supabase
      .from('tour_requests')
      .update({
        supplier_response: quoteData,
        replied_at: new Date().toISOString(),
        status: 'replied',
      })
      .eq('id', requestId)
      .eq('tour_id', tourId)

    if (error) {
      console.error('更新需求單失敗:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 同步核心表：更新 reply_cost 和 request_status
    const { data: request } = await supabase
      .from('tour_requests')
      .select('supplier_name')
      .eq('id', requestId)
      .single()

    if (request) {
      await supabase
        .from('tour_itinerary_items')
        .update({
          request_status: 'replied',
          reply_cost: totalFare,
        })
        .eq('tour_id', tourId)
        .eq('supplier_name', request.supplier_name)
        .in('category', ['transport', 'group-transport'])
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('提交遊覽車報價失敗:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
