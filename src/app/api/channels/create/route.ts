import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

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

    // 3. 將創建者加入為頻道擁有者
    const membersToAdd = [{ employeeId: creatorId, role: 'owner' }]

    if (tour.controller_id && tour.controller_id !== creatorId) {
      membersToAdd.push({ employeeId: tour.controller_id, role: 'admin' })
    }

    if (membersToAdd.length > 0) {
      const memberInserts = membersToAdd.map(member => ({
        workspace_id: tour.workspace_id,
        channel_id: newChannel.id,
        employee_id: member.employeeId,
        role: member.role,
      }))

      await supabase.from('channel_members').insert(memberInserts)
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
