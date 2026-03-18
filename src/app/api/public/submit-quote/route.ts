import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    const {
      tourId,
      tourCode,
      contact,
      phone,
      tierPrices, // { 20: "5000", 30: "4500", ... }
      singleRoomSupplement,
      tipNote,
      supplierNote,
    } = body

    if (!tourId || !contact || !phone) {
      return NextResponse.json({ error: '缺少必填欄位' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 儲存報價到資料庫（先存到一個暫存表或日誌表）
    // 這裡簡單起見，先用 JSON 格式存到 tour_requests 的 supplier_response 欄位
    // 或建立新表 local_quotes

    // 查詢這個團是否有對應的需求單
    const { data: existingRequest } = await supabase
      .from('tour_requests')
      .select('id')
      .eq('tour_id', tourId)
      .eq('request_type', 'other')
      .single()

    const quoteData = {
      contact,
      phone,
      tierPrices,
      singleRoomSupplement,
      tipNote,
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
          package_status: 'quoted',
        })
        .eq('id', existingRequest.id)
    } else {
      // 建立新需求單
      // 這裡簡單處理，先存到 tour_requests
      await supabase
        .from('tour_requests')
        .insert({
          tour_id: tourId,
          request_type: 'other',
          request_scope: 'full_package', // 標記為整包報價
          supplier_name: 'Local 供應商',
          status: '已回覆',
          supplier_response: quoteData,
          replied_at: new Date().toISOString(),
          package_status: 'quoted',
        })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Submit quote error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
