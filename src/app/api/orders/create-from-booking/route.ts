import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'

/**
 * POST /api/orders/create-from-booking
 * 從公開行程報名建立訂單
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      tour_id,
      contact_person,
      contact_phone,
      contact_email,
      member_count,
      sales_person_id,
      travelers,
    } = body

    if (!tour_id || !contact_person || !contact_phone) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. 取得旅遊團資訊
    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .select('workspace_id, code')
      .eq('id', tour_id)
      .single()

    if (tourError || !tour) {
      return NextResponse.json({ error: '找不到旅遊團' }, { status: 404 })
    }

    // 2. 建立訂單
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        tour_id,
        workspace_id: tour.workspace_id,
        contact_person,
        contact_phone,
        contact_email,
        member_count: member_count || 1,
        sales_person: sales_person_id,
        total_amount: 0, // 之後業務會填入
        status: 'pending',
      })
      .select()
      .single()

    if (orderError || !order) {
      logger.error('建立訂單失敗:', orderError)
      return NextResponse.json({ error: '建立訂單失敗' }, { status: 500 })
    }

    // 3. 建立團員資料
    if (travelers && Array.isArray(travelers) && travelers.length > 0) {
      const members = travelers.map((t: Record<string, unknown>) => ({
        order_id: order.id,
        workspace_id: tour.workspace_id,
        chinese_name: t.chineseName as string,
        pinyin_name: t.pinyinName as string,
        date_of_birth: (t.dateOfBirth as string) || null,
      }))

      const { error: membersError } = await supabase.from('order_members').insert(members)

      if (membersError) {
        logger.error('建立團員失敗:', membersError)
        // 不中斷，繼續
      }
    }

    // 4. 發送通知給業務（可選）
    // TODO: 發送 Email 或 Telegram 通知

    return NextResponse.json({
      success: true,
      order_id: order.id,
      order_number: order.order_number,
    })
  } catch (error) {
    logger.error('API 錯誤:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '未知錯誤',
      },
      { status: 500 }
    )
  }
}
