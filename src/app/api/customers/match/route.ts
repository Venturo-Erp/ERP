/**
 * 比對客戶（用姓名+生日）
 * POST /api/customers/match
 * 
 * body: { name: string, birthDate?: string, phone?: string, workspaceId: string }
 * 
 * 回傳：
 * - 找到 → { matches: [{id, name, phone, ...}] }
 * - 沒找到 → { matches: [] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { name, birthDate, phone, workspaceId } = await request.json()

    if (!name || !workspaceId) {
      return NextResponse.json({ error: 'Missing name or workspaceId' }, { status: 400 })
    }

    let query = supabaseAdmin
      .from('customers')
      .select('id, code, name, phone, email, birth_date, line_user_id')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)

    // 優先用姓名 + 生日比對
    if (birthDate) {
      query = query.eq('name', name).eq('birth_date', birthDate)
    } 
    // 或用姓名 + 電話
    else if (phone) {
      query = query.eq('name', name).eq('phone', phone)
    }
    // 只有姓名就模糊查
    else {
      query = query.ilike('name', `%${name}%`)
    }

    const { data, error } = await query.limit(5)

    if (error) {
      logger.error('Match query error:', error)
      return NextResponse.json({ error: 'Query failed' }, { status: 500 })
    }

    return NextResponse.json({ matches: data || [] })
  } catch (error) {
    logger.error('Match error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
