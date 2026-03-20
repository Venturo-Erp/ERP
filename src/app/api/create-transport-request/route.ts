import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      tourId,
      supplierName,
      vehicleDesc,
      note,
      totalPax,
      workspaceId,
    } = body

    if (!tourId || !workspaceId) {
      return NextResponse.json({ error: '缺少必填欄位' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 檢查是否已有同廠商的遊覽車需求單
    const { data: existingRequest } = await supabase
      .from('tour_requests')
      .select('id, status, supplier_response, replied_at')
      .eq('tour_id', tourId)
      .eq('request_type', 'transport')
      .eq('supplier_name', supplierName || '車行')
      .maybeSingle()

    if (existingRequest) {
      // 已有需求單
      const hasReplied = existingRequest.supplier_response && existingRequest.replied_at
      
      if (hasReplied) {
        // 已回覆 → 需要使用者確認是否重新發送
        return NextResponse.json({ 
          success: false, 
          alreadyExists: true, 
          hasReplied: true,
          requestId: existingRequest.id,
          message: '此廠商已報價' 
        })
      } else {
        // 未回覆 → 更新現有需求單（使用同一個 requestId）
        const { error: updateError } = await supabase
          .from('tour_requests')
          .update({
            note: `${vehicleDesc ? vehicleDesc + '\n' : ''}${note || ''}`.trim(),
          })
          .eq('id', existingRequest.id)

        if (updateError) {
          console.error('更新需求單失敗:', updateError)
          return NextResponse.json({ error: updateError.message }, { status: 500 })
        }

        return NextResponse.json({ 
          success: true, 
          requestId: existingRequest.id,
          updated: true 
        })
      }
    }

    // 建立新的遊覽車需求單
    const { data: newRequest, error } = await supabase
      .from('tour_requests')
      .insert({
        workspace_id: workspaceId,
        tour_id: tourId,
        request_type: 'transport',
        request_scope: 'individual_item',
        supplier_name: supplierName || '車行',
        status: 'draft',
        note: `${vehicleDesc ? vehicleDesc + '\n' : ''}${note || ''}`.trim(),
        items: [],
      })
      .select('id')
      .single()

    if (error) {
      console.error('建立需求單失敗:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, requestId: newRequest.id })
  } catch (error) {
    console.error('建立需求單錯誤:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
