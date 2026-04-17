import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getServerAuth } from '@/lib/auth/server-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { dynamicFrom } from '@/lib/supabase/typed-client'
import { logger } from '@/lib/utils/logger'

interface MetaConfig {
  workspace_id: string
  verify_token?: string
  page_access_token?: string
  app_secret?: string
  app_id?: string
  is_connected: boolean
  setup_step: number
  connected_at?: string | null
  [key: string]: unknown
}

/**
 * GET /api/meta/setup — 取得當前 workspace 的 Meta 設定狀態
 */
export async function GET() {
  try {
    const auth = await getServerAuth()
    if (!auth.success) return NextResponse.json({ error: '請先登入' }, { status: 401 })

    // 用 admin client 繞過 RLS（server 端已驗證 workspace 所有權）
    const admin = getSupabaseAdminClient() as unknown as SupabaseClient
    const { data: workspaceData } = await admin
      .from('workspace_meta_config')
      .select('setup_step, is_connected, app_id, connected_at')
      .eq('workspace_id', auth.data.workspaceId)
      .maybeSingle()

    if (workspaceData) {
      return NextResponse.json(workspaceData)
    }

    return NextResponse.json({ setup_step: 0, is_connected: false })
  } catch (error) {
    logger.error('Meta setup GET error:', error)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}

/**
 * POST /api/meta/setup — 儲存 Meta 設定並測試連線
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) return NextResponse.json({ error: '請先登入' }, { status: 401 })

    const body = await req.json()
    const { verify_token, page_access_token, app_secret, app_id, setup_step } = body

    // 驗證必要欄位
    if (!app_id && !page_access_token && !app_secret) {
      return NextResponse.json(
        { error: '請至少填寫 App ID、Page Access Token 或 App Secret' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdminClient() as unknown as SupabaseClient
    const workspaceId = auth.data.workspaceId

    // 檢查是否已有設定
    const { data: existingConfig } = await supabase
      .from('workspace_meta_config')
      .select('workspace_id')
      .eq('workspace_id', workspaceId)
      .single()

    const now = new Date().toISOString()

    // 根據 setup_step 判斷連線狀態
    // step 0: 未開始
    // step 1: 已填寫基本資料
    // step 2: 已驗證 Webhook
    // step 3: 測試連線成功
    const isConnected = setup_step >= 3
    const connectedAt = isConnected ? now : null

    if (existingConfig) {
      // 更新現有設定
      const { error: updateError } = await supabase
        .from('workspace_meta_config')
        .update({
          verify_token,
          page_access_token,
          app_secret,
          app_id,
          setup_step: setup_step || 1,
          is_connected: isConnected,
          connected_at: connectedAt,
          updated_at: now,
        })
        .eq('workspace_id', workspaceId)

      if (updateError) {
        logger.error('Meta setup update error:', updateError)
        return NextResponse.json({ error: '更新設定失敗' }, { status: 500 })
      }
    } else {
      // 建立新設定
      const { error: insertError } = await supabase.from('workspace_meta_config').insert({
        workspace_id: workspaceId,
        verify_token,
        page_access_token,
        app_secret,
        app_id,
        setup_step: setup_step || 1,
        is_connected: isConnected,
        connected_at: connectedAt,
      })

      if (insertError) {
        logger.error('Meta setup insert error:', insertError)
        return NextResponse.json({ error: '建立設定失敗' }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      setup_step: setup_step || 1,
      is_connected: isConnected,
    })
  } catch (error) {
    logger.error('Meta setup POST error:', error)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}

/**
 * DELETE /api/meta/setup — 刪除 Meta 設定（取消連線）
 */
export async function DELETE() {
  try {
    const auth = await getServerAuth()
    if (!auth.success) return NextResponse.json({ error: '請先登入' }, { status: 401 })

    const supabase = getSupabaseAdminClient() as unknown as SupabaseClient
    const workspaceId = auth.data.workspaceId

    const { error: deleteError } = await supabase
      .from('workspace_meta_config')
      .delete()
      .eq('workspace_id', workspaceId)

    if (deleteError) {
      logger.error('Meta setup delete error:', deleteError)
      return NextResponse.json({ error: '刪除設定失敗' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Meta setup DELETE error:', error)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}
