import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getServerAuth } from '@/lib/auth/server-auth'

/**
 * GET /api/line/knowledge
 * 取得知識庫列表
 * - 支援篩選 category
 * - 支援關鍵字搜尋
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    const workspaceId = auth.data.workspaceId
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const keyword = searchParams.get('keyword')

    const supabase = getSupabaseAdminClient() as unknown as SupabaseClient

    let query = supabase
      .from('knowledge_base')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
      console.error('knowledge_base 查詢失敗:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 關鍵字搜尋（在前端過濾）
    let results = data || []
    if (keyword) {
      const kw = keyword.toLowerCase()
      results = results.filter(
        (item) =>
          item.question?.toLowerCase().includes(kw) ||
          item.answer?.toLowerCase().includes(kw) ||
          item.keywords?.some((k: string) => k.toLowerCase().includes(kw))
      )
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('API /api/line/knowledge 錯誤:', error)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}

/**
 * POST /api/line/knowledge
 * 新增知識庫項目
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    const workspaceId = auth.data.workspaceId
    const body = await request.json()
    const { category, question, answer, keywords } = body

    if (!category) {
      return NextResponse.json({ error: '缺少 category' }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient() as unknown as SupabaseClient

    const { data, error } = await supabase
      .from('knowledge_base')
      .insert({
        workspace_id: workspaceId,
        category,
        question: question || '',
        answer: answer || '',
        keywords: keywords || [],
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('knowledge_base 新增失敗:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('API POST /api/line/knowledge 錯誤:', error)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}