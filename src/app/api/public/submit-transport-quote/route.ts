import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      tourId,
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

    if (!tourId || !contact || !phone || !totalFare) {
      return NextResponse.json({ error: '缺少必填欄位' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 查找現有的遊覽車需求單
    const { data: existingRequest } = await supabase
      .from('tour_requests')
      .select('id')
      .eq('tour_id', tourId)
      .eq('request_type', 'transport')
      .maybeSingle()

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

    if (existingRequest) {
      // 更新現有需求單的 supplier_response
      await supabase
        .from('tour_requests')
        .update({
          supplier_response: quoteData,
          replied_at: new Date().toISOString(),
          status: '已回覆',
        })
        .eq('id', existingRequest.id)
    } else {
      // 建立新需求單
      await supabase.from('tour_requests').insert({
        tour_id: tourId,
        request_type: 'transport',
        request_scope: 'individual_item',
        supplier_name: '車行',
        status: '已回覆',
        supplier_response: quoteData,
        replied_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('提交遊覽車報價失敗:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
