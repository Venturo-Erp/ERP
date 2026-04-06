/**
 * 綁定 LINE 到客戶
 * POST /api/customers/link-line
 *
 * body: { customerId: string, lineUserId: string }
 *
 * 或建立新客戶並綁定：
 * body: { lineUserId: string, name: string, phone?: string, workspaceId: string }
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
    const body = await request.json()
    const { customerId, lineUserId, name, phone, workspaceId } = body

    if (!lineUserId) {
      return NextResponse.json({ error: 'Missing lineUserId' }, { status: 400 })
    }

    // 綁定到現有客戶
    if (customerId) {
      const { data, error } = await supabaseAdmin
        .from('customers')
        .update({
          line_user_id: lineUserId,
          line_linked_at: new Date().toISOString(),
        })
        .eq('id', customerId)
        .select('id, code, name, phone, email')
        .single()

      if (error) {
        logger.error('Link error:', error)
        return NextResponse.json({ error: 'Link failed' }, { status: 500 })
      }

      return NextResponse.json({ customer: data })
    }

    // 建立新客戶並綁定
    if (name && workspaceId) {
      // 產生客戶編號
      const { data: lastCustomer } = await supabaseAdmin
        .from('customers')
        .select('code')
        .eq('workspace_id', workspaceId)
        .order('code', { ascending: false })
        .limit(1)
        .single()

      let nextCode = 'C0001'
      if (lastCustomer?.code) {
        const num = parseInt(lastCustomer.code.replace('C', '')) + 1
        nextCode = `C${num.toString().padStart(4, '0')}`
      }

      const { data, error } = await supabaseAdmin
        .from('customers')
        .insert({
          workspace_id: workspaceId,
          code: nextCode,
          name,
          phone: phone || null,
          member_type: 'general',
          line_user_id: lineUserId,
          line_linked_at: new Date().toISOString(),
        })
        .select('id, code, name, phone, email')
        .single()

      if (error) {
        logger.error('Create error:', error)
        return NextResponse.json({ error: 'Create failed' }, { status: 500 })
      }

      return NextResponse.json({ customer: data, created: true })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error) {
    logger.error('Link-line error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
