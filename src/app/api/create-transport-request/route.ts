import { NextRequest, NextResponse } from 'next/server'
import { createApiClient, getCurrentWorkspaceId } from '@/lib/supabase/api-client'

/**
 * POST /api/create-transport-request
 * 建立遊覽車需求單
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createApiClient()
    const workspaceId = await getCurrentWorkspaceId()

    if (!workspaceId) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    const body = await req.json()
    const { tourId, supplierName, vehicleDesc, note } = body

    if (!tourId) {
      return NextResponse.json({ error: '缺少 tourId' }, { status: 400 })
    }

    // 檢查是否已有同廠商的遊覽車需求單（RLS 自動過濾）
    const { data: existingRequest } = await supabase
      .from('tour_requests')
      .select('id, status, supplier_response, replied_at')
      .eq('tour_id', tourId)
      .eq('request_type', 'transport')
      .eq('supplier_name', supplierName || '車行')
      .maybeSingle()

    if (existingRequest) {
      const hasReplied = existingRequest.supplier_response && existingRequest.replied_at

      if (hasReplied) {
        return NextResponse.json({
          success: false,
          alreadyExists: true,
          hasReplied: true,
          requestId: existingRequest.id,
          message: '此廠商已報價',
        })
      } else {
        // 未回覆 → 更新現有需求單
        const { error: updateError } = await supabase
          .from('tour_requests')
          .update({
            note: `${vehicleDesc ? vehicleDesc + '\n' : ''}${note || ''}`.trim(),
          })
          .eq('id', existingRequest.id)

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          requestId: existingRequest.id,
          updated: true,
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
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      requestId: newRequest.id,
    })
  } catch {
    return NextResponse.json({ error: '建立需求單失敗' }, { status: 500 })
  }
}
