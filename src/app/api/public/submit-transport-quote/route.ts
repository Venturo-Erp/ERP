import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      tourId,
      requestId, // 單一性：綁定到特定需求單
      itemId, // 核心表項目 ID
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
      status = 'quoted', // quoted = 僅報價, confirmed = 報價+留車
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

    // 根據 status 決定需求單狀態
    // quoted = 僅報價（等待旅行社確認）
    // confirmed = 報價+留車（已預訂）
    const requestStatus = status === 'confirmed' ? 'accepted' : 'quoted'

    // 更新指定的需求單
    if (requestId) {
      const { error } = await supabase
        .from('tour_requests')
        .update({
          supplier_response: quoteData,
          replied_at: new Date().toISOString(),
          status: requestStatus,
        })
        .eq('id', requestId)
        .eq('tour_id', tourId)

      if (error) {
        logger.error('更新需求單失敗:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // 同步核心表：更新 reply_cost 和 request_status
    if (itemId) {
      // 直接用 itemId 更新
      await supabase
        .from('tour_itinerary_items')
        .update({
          request_status: requestStatus,
          reply_cost: totalFare,
          estimated_cost: totalFare,
        } as Record<string, unknown>)
        .eq('id', itemId)
    } else if (requestId) {
      // 用 requestId 找 supplier_name 再更新
      const { data: reqData } = await supabase
        .from('tour_requests')
        .select('supplier_name')
        .eq('id', requestId)
        .single()

      if (reqData) {
        await supabase
          .from('tour_itinerary_items')
          .update({
            request_status: requestStatus,
            reply_cost: totalFare,
            estimated_cost: totalFare,
          } as Record<string, unknown>)
          .eq('tour_id', tourId)
          .eq('supplier_name', reqData.supplier_name)
          .in('category', ['transport', 'group-transport'])
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('提交遊覽車報價失敗:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
