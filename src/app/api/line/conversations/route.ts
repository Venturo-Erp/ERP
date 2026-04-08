import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getServerAuth } from '@/lib/auth/server-auth'

/**
 * GET /api/line/conversations
 * 兩種模式：
 * 1. ?view=threads - 返回聚合的對話串列表（按用戶聚合）
 * 2. 預設模式 - 返回所有對話訊息
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    const workspaceId = auth.data.workspaceId
    const searchParams = request.nextUrl.searchParams
    const view = searchParams.get('view')
    const threadUserId = searchParams.get('thread')
    
    const supabase = getSupabaseAdminClient()
    
    // 模式 1：查看特定用戶的對話串
    if (threadUserId) {
      const { data, error } = await supabase
        .from('customer_service_conversations')
        .select('*')
        .eq('platform_user_id', threadUserId)
        .order('created_at', { ascending: false })
        .limit(100)
      
      if (error) {
        console.warn('查詢特定用戶對話失敗:', error.message)
        return NextResponse.json([])
      }
      
      // 確保返回的是陣列，並轉換為前端需要的格式
      const conversations = Array.isArray(data) ? data.map(item => ({
        id: item.id,
        platform: item.platform || 'line',
        platform_user_id: item.platform_user_id || '',
        user_display_name: item.user_display_name || '未知用戶',
        user_message: item.user_message || '',
        ai_response: item.ai_response || '',
        created_at: item.created_at || new Date().toISOString(),
        follow_up_status: item.follow_up_status || null,
        // is_read 欄位不存在，用 false 代替
        is_read: false
      })) : []
      
      return NextResponse.json(conversations)
    }
    
    // 模式 2：聚合的對話串列表
    if (view === 'threads') {
      // 先取得所有對話
      const { data: allData, error: allError } = await supabase
        .from('customer_service_conversations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)
      
      if (allError) {
        console.warn('對話查詢失敗:', allError.message)
        return NextResponse.json([])
      }
      
      if (!Array.isArray(allData) || allData.length === 0) {
        return NextResponse.json([])
      }
      
      // 前端聚合邏輯（暫時方案，之後可以改用 SQL GROUP BY）
      const threadMap = new Map()
      
      for (const item of allData) {
        const userId = item.platform_user_id || 'unknown'
        
        if (!threadMap.has(userId)) {
          threadMap.set(userId, {
            platform_user_id: userId,
            user_display_name: item.user_display_name || '未知用戶',
            platform: item.platform || 'line',
            last_message: item.user_message || '',
            last_ai_response: item.ai_response || '',
            last_time: item.created_at || new Date().toISOString(),
            message_count: 1,
            unread_count: 0, // 原始表沒有 is_read 欄位，先設為 0
            needs_followup: item.follow_up_status !== null && item.follow_up_status !== 'resolved',
            // 原始資料引用（用於點擊後顯示詳細對話）
            raw_messages: [item]
          })
        } else {
          const thread = threadMap.get(userId)
          thread.message_count++
          // 原始表沒有 is_read 欄位，暫時不計數
          if (item.follow_up_status !== null && item.follow_up_status !== 'resolved') {
            thread.needs_followup = true
          }
          thread.raw_messages.push(item)
        }
      }
      
      // 轉換為陣列並排序（最新對話在前）
      const threads = Array.from(threadMap.values())
        .sort((a, b) => new Date(b.last_time).getTime() - new Date(a.last_time).getTime())
      
      return NextResponse.json(threads)
    }
    
    // 模式 3：預設模式 - 返回所有對話訊息（現有邏輯）
    const { data, error } = await supabase
      .from('customer_service_conversations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (error) {
      console.warn('customer_service_conversations 查詢失敗:', error.message)
      // 返回空陣列，不讓前端報錯
      return NextResponse.json([])
    }
    
    // 確保返回的是陣列，並轉換為前端需要的格式
    const conversations = Array.isArray(data) ? data.map(item => ({
      id: item.id,
      platform: item.platform || 'line',
      platform_user_id: item.platform_user_id || '',
      user_display_name: item.user_display_name || '未知用戶',
      user_message: item.user_message || '',
      ai_response: item.ai_response || '',
      created_at: item.created_at || new Date().toISOString(),
      follow_up_status: item.follow_up_status || null,
      // is_read 欄位不存在，用 false 代替
      is_read: false
    })) : []
    
    return NextResponse.json(conversations)
    
  } catch (error) {
    console.error('API /api/line/conversations 錯誤:', error)
    // 發生任何錯誤都返回空陣列
    return NextResponse.json([])
  }
}

/**
 * PATCH /api/line/conversations
 * 更新對話狀態
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    const body = await request.json()
    const { id, follow_up_status, follow_up_note } = body

    if (!id) {
      return NextResponse.json({ error: '缺少 id' }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()
    const updateData: Record<string, unknown> = {}
    
    if (follow_up_status !== undefined) updateData.follow_up_status = follow_up_status
    if (follow_up_note !== undefined) updateData.follow_up_note = follow_up_note

    const { error } = await supabase
      .from('customer_service_conversations')
      .update(updateData)
      .eq('id', id)
      .eq('workspace_id', auth.data.workspaceId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('API PATCH /api/line/conversations 錯誤:', error)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}