import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

/**
 * GET /api/suppliers
 * 取得當前工作區的供應商列表
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    // 暫時：先返回空陣列，確保 API 不報錯
    // TODO: 修復資料庫查詢後再啟用
    return NextResponse.json([])
    
    /*
    const supabase = getSupabaseAdminClient()

    // 取得供應商（過渡期：暫時不限制 workspace_id）
    const { data: suppliers, error } = await supabase
      .from('suppliers')
      .select('id, name, code, category, contact_person, phone, email, note')
      .order('name', { ascending: true })

    if (error) {
      logger.error('suppliers 查詢錯誤:', error)
      return NextResponse.json({ error: '查詢供應商失敗' }, { status: 500 })
    }

    return NextResponse.json(suppliers || [])
    */
  } catch (error) {
    logger.error('API /api/suppliers 錯誤:', error)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}

/**
 * POST /api/suppliers
 * 建立新供應商
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    const body = await req.json()
    const { name, code, category, contact_person, phone, email, note } = body

    if (!name) {
      return NextResponse.json({ error: '供應商名稱必填' }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        workspace_id: auth.data.workspaceId,
        name,
        code: code || null,
        category: category || null,
        contact_person: contact_person || null,
        phone: phone || null,
        email: email || null,
        note: note || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      logger.error('建立供應商錯誤:', error)
      return NextResponse.json({ error: '建立供應商失敗' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    logger.error('API /api/suppliers POST 錯誤:', error)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}