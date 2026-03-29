import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-client'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createApiClient()
    const body = await request.json()
    const { tour, creatorId } = body

    if (!tour || !creatorId) {
      return NextResponse.json(
        { success: false, error: 'Missing tour or creatorId' },
        { status: 400 }
      )
    }

    // 1. 檢查是否已有頻道（RLS 自動過濾）
    const { data: existingChannel } = await supabase
      .from('channels')
      .select('id')
      .eq('tour_id', tour.id)
      .maybeSingle()

    if (existingChannel) {
      return NextResponse.json({ success: true, channelId: existingChannel.id })
    }

    // 2. 建立頻道
    const channelName = `${tour.code} ${tour.name}`
    const { data: newChannel, error: channelError } = await supabase
      .from('channels')
      .insert({
        workspace_id: tour.workspace_id,
        name: channelName,
        description: `${tour.name} - ${tour.departure_date || ''} 出發`,
        type: 'public',
        channel_type: 'PUBLIC',
        tour_id: tour.id,
        created_by: creatorId,
      })
      .select()
      .single()

    if (channelError) {
      return NextResponse.json(
        { success: false, error: channelError.message },
        { status: 500 }
      )
    }

    // 3. 將相關人員加入頻道
    const membersToAdd: Array<{ employeeId: string; role: string }> = []
    const addedIds = new Set<string>()

    // 創建者 → owner
    if (creatorId && !addedIds.has(creatorId)) {
      membersToAdd.push({ employeeId: creatorId, role: 'owner' })
      addedIds.add(creatorId)
    }

    // 業務 (controller_id) → admin
    if (tour.controller_id && !addedIds.has(tour.controller_id)) {
      membersToAdd.push({ employeeId: tour.controller_id, role: 'admin' })
      addedIds.add(tour.controller_id)
    }

    // 查詢訂單的助理
    if (tour.id) {
      const { data: orders } = await supabase
        .from('orders')
        .select('assistant')
        .eq('tour_id', tour.id)
        .not('assistant', 'is', null)

      if (orders) {
        for (const order of orders) {
          if (order.assistant && !addedIds.has(order.assistant)) {
            // 先嘗試當作 employee_id
            const { data: emp } = await supabase
              .from('employees')
              .select('id')
              .eq('id', order.assistant)
              .maybeSingle()

            if (emp) {
              membersToAdd.push({ employeeId: emp.id, role: 'member' })
              addedIds.add(emp.id)
            } else {
              // 如果不是 UUID，嘗試用名字查詢
              const { data: empByName } = await supabase
                .from('employees')
                .select('id')
                .eq('chinese_name', order.assistant)
                .maybeSingle()

              if (empByName && !addedIds.has(empByName.id)) {
                membersToAdd.push({ employeeId: empByName.id, role: 'member' })
                addedIds.add(empByName.id)
              }
            }
          }
        }
      }
    }

    if (membersToAdd.length > 0) {
      const memberInserts = membersToAdd.map(member => ({
        workspace_id: tour.workspace_id,
        channel_id: newChannel.id,
        employee_id: member.employeeId,
        role: member.role,
      }))

      await supabase.from('channel_members').insert(memberInserts)
      logger.info(`[API] 已加入 ${membersToAdd.length} 位成員到頻道 ${channelName}`)
    }

    return NextResponse.json({ success: true, channelId: newChannel.id })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
