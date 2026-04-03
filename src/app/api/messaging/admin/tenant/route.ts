import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const ADMIN_API_KEY = process.env.MESSAGING_ADMIN_API_KEY || ''

/**
 * 驗證管理員權限
 */
function validateAdminAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization')
  return authHeader === `Bearer ${ADMIN_API_KEY}`
}

/**
 * 新增租戶配置（POST）
 */
export async function POST(req: NextRequest) {
  if (!validateAdminAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const {
      workspace_id,
      tenant_name,
      platform, // 'messenger' | 'instagram'
      page_id,
      page_access_token,
      webhook_secret,
      system_prompt,
    } = body

    if (!workspace_id || !tenant_name || !platform || !page_id || !page_access_token) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('messaging_tenants')
      .insert({
        workspace_id,
        tenant_name,
        platform,
        page_id,
        page_access_token,
        webhook_secret,
        system_prompt,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      logger.error('[Messaging Admin] Insert error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    logger.info(`[Messaging Admin] Tenant created: ${tenant_name} (${platform})`)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    logger.error('[Messaging Admin] POST error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/**
 * 查詢租戶配置（GET）
 */
export async function GET(req: NextRequest) {
  if (!validateAdminAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspace_id')

    let query = supabase
      .from('messaging_tenants')
      .select('id, workspace_id, tenant_name, platform, page_id, is_active, created_at')

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      logger.error('[Messaging Admin] Query error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    logger.error('[Messaging Admin] GET error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/**
 * 更新租戶配置（PATCH）
 */
export async function PATCH(req: NextRequest) {
  if (!validateAdminAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { id, page_access_token, webhook_secret, system_prompt, is_active } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing tenant id' }, { status: 400 })
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (page_access_token !== undefined) updates.page_access_token = page_access_token
    if (webhook_secret !== undefined) updates.webhook_secret = webhook_secret
    if (system_prompt !== undefined) updates.system_prompt = system_prompt
    if (is_active !== undefined) updates.is_active = is_active

    const { data, error } = await supabase
      .from('messaging_tenants')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('[Messaging Admin] Update error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    logger.info(`[Messaging Admin] Tenant updated: ${id}`)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    logger.error('[Messaging Admin] PATCH error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/**
 * 刪除租戶配置（DELETE）
 */
export async function DELETE(req: NextRequest) {
  if (!validateAdminAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing tenant id' }, { status: 400 })
    }

    const { error } = await supabase
      .from('messaging_tenants')
      .delete()
      .eq('id', id)

    if (error) {
      logger.error('[Messaging Admin] Delete error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    logger.info(`[Messaging Admin] Tenant deleted: ${id}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('[Messaging Admin] DELETE error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
