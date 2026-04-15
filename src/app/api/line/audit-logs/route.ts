import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getServerAuth } from '@/lib/auth/server-auth'

/**
 * POST /api/line/audit-logs
 * 记录用户操作到审计日志
 * 
 * 请求体:
 * {
 *   action: string,        // 操作类型: 'view_conversation', 'send_manual_reply' 等
 *   targetType?: string,  // 目标类型: 'conversation', 'message' 等
 *   targetId?: string,    // 目标ID
 *   metadata?: object     // 额外数据
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    const { userId, workspaceId } = auth.data

    const body = await request.json()
    const { action, targetType, targetId, metadata = {} } = body

    if (!action) {
      return NextResponse.json({ error: '缺少 action 參數' }, { status: 400 })
    }

    // 获取客户端 IP
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || request.headers.get('x-real-ip') 
      || 'unknown'

    // 获取 User Agent
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const supabase = getSupabaseAdminClient()

    // 插入审计日志
    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        action,
        target_type: targetType || null,
        target_id: targetId || null,
        metadata,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select()
      .single()

    if (error) {
      console.error('插入审计日志失败:', error)
      return NextResponse.json({ error: '記錄失敗' }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data.id })
  } catch (error) {
    console.error('API /api/line/audit-logs 錯誤:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

/**
 * GET /api/line/audit-logs
 * 查询审计日志（可选，用于调试）
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    const { workspaceId } = auth.data
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const targetType = searchParams.get('targetType')
    const limit = parseInt(searchParams.get('limit') || '50')

    const supabase = getSupabaseAdminClient()

    let query = supabase
      .from('audit_logs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (action) {
      query = query.eq('action', action)
    }

    if (targetType) {
      query = query.eq('target_type', targetType)
    }

    const { data, error } = await query

    if (error) {
      console.error('查询审计日志失败:', error)
      return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('API /api/line/audit-logs GET 錯誤:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
