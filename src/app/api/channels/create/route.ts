import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/utils/logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tour, creatorId } = body

    if (!tour || !creatorId) {
      return NextResponse.json(
        { success: false, error: 'Missing tour or creatorId' },
        { status: 400 }
      )
    }

    // 1. 檢查是否已有頻道
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
      console.error('[API] 建立頻道失敗:', channelError)
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
          // assistant 可能是 employee_id 或名字，需要查詢
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
                .eq('workspace_id', tour.workspace_id)
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
    console.error('[API] 建立頻道時發生錯誤:', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
