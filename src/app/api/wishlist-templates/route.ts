/**
 * 客製化模板 API
 * GET /api/wishlist-templates - 取得列表
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerAuth } from '@/lib/auth/server-auth'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    const workspaceId = auth.data.workspaceId
    if (!workspaceId) {
      return NextResponse.json({ error: '無工作空間' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('wishlist_templates')
      .select(`
        *,
        wishlist_template_items(count),
        customer_inquiries(count)
      `)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('查詢失敗:', error)
      return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('API 錯誤:', error)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}
