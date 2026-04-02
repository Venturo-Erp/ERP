import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { DEFAULT_ACCOUNTS } from '@/types/accounting.types'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    // 驗證 session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 取得 workspace_id（從 user metadata 或 RPC）
    let workspaceId = session.user.user_metadata?.workspace_id

    if (!workspaceId) {
      // 備用方案：從資料庫查詢
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('workspace_id')
        .eq('id', session.user.id)
        .single()

      if (userError || !userData?.workspace_id) {
        return NextResponse.json({ error: 'User workspace not found' }, { status: 400 })
      }
      workspaceId = userData.workspace_id
    }

    const stats = {
      accounts_created: 0,
      payment_vouchers: 0,
      request_vouchers: 0,
      errors: [] as string[],
    }

    // ============================================
    // 1. 初始化科目表
    // ============================================
    const { data: existingAccounts } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('workspace_id', workspaceId)
      .limit(1)

    if (!existingAccounts || existingAccounts.length === 0) {
      // 插入預設科目
      if (!DEFAULT_ACCOUNTS || DEFAULT_ACCOUNTS.length === 0) {
        return NextResponse.json({ error: 'DEFAULT_ACCOUNTS 未定義或為空' }, { status: 500 })
      }

      const accountsToInsert = DEFAULT_ACCOUNTS.map(account => {
        // 移除 type 欄位（資料庫只有 account_type）
        const { type, ...accountData } = account
        return {
          ...accountData,
          workspace_id: workspaceId,
        }
      })

      logger.info(`準備插入 ${accountsToInsert.length} 個科目到 workspace ${workspaceId}`)

      const { error: accountsError, data: insertedAccounts } = await supabase
        .from('chart_of_accounts')
        .insert(accountsToInsert)
        .select()

      if (accountsError) {
        logger.error('科目表插入失敗:', accountsError)
        return NextResponse.json(
          {
            error: `科目表初始化失敗: ${accountsError.message}`,
            details: accountsError,
            hint: '請檢查 chart_of_accounts 表是否存在，以及 RLS 政策是否正確',
            workspace_id: workspaceId,
            accounts_count: accountsToInsert.length,
          },
          { status: 500 }
        )
      }

      logger.info(`成功插入 ${insertedAccounts?.length || 0} 個科目`)
      stats.accounts_created = insertedAccounts?.length || accountsToInsert.length
    }

    // 初始化完成
    return NextResponse.json({
      success: true,
      stats,
      message: `科目表初始化完成：${stats.accounts_created} 個科目`,
    })
  } catch (error) {
    logger.error('Accounting initialization error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
