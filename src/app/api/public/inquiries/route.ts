/**
 * 公開 API: 建立客戶詢價單
 * POST /api/public/inquiries
 */

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

    const {
      templateId,
      workspaceId,
      customerName,
      phone,
      email,
      travelDate,
      peopleCount,
      notes,
      selectedItems,
    } = body

    // 驗證必填欄位
    if (!customerName || !phone) {
      return NextResponse.json({ error: '請填寫姓名和電話' }, { status: 400 })
    }

    if (!selectedItems || selectedItems.length === 0) {
      return NextResponse.json({ error: '請至少選擇一個景點' }, { status: 400 })
    }

    // 建立詢價單
    const { data, error } = await supabase
      .from('customer_inquiries')
      .insert({
        template_id: templateId,
        workspace_id: workspaceId,
        customer_name: customerName,
        phone,
        email: email || null,
        travel_date: travelDate || null,
        people_count: peopleCount || 1,
        notes: notes || null,
        selected_items: selectedItems,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      logger.error('建立詢價單失敗:', error)
      return NextResponse.json({ error: '送出失敗，請稍後再試' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      code: data.code,
    })
  } catch (error) {
    logger.error('API 錯誤:', error)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}
