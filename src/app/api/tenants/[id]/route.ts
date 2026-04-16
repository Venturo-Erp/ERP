/**
 * 退租完整刪除 API
 * DELETE /api/tenants/[id]
 *
 * 刪除順序：
 * 1. 取得所有員工的 supabase_user_id
 * 2. 刪除 Supabase Auth 帳號
 * 3. 刪除 Storage bucket 內的 workspace 檔案（company-assets）
 * 4. 刪除 employees（cascade 會處理相關的）
 * 5. 刪除 workspace（會 cascade 刪除剩餘關聯資料）
 */
import { NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api/response'
import { getServerAuth } from '@/lib/auth/server-auth'
import { logger } from '@/lib/utils/logger'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params

    // 🔒 權限檢查：需要「租戶管理」寫入權限
    const auth = await getServerAuth()
    if (!auth.success) {
      return errorResponse('請先登入', 401, ErrorCode.UNAUTHORIZED)
    }

    const supabase = getSupabaseAdminClient()

    // 確認有租戶管理寫入權限
    const currentEmployee = await supabase
      .from('employees')
      .select('job_info, role_id')
      .eq('id', auth.data.employeeId)
      .single()

    const jobInfo = currentEmployee.data?.job_info as { role_id?: string } | null
    const effectiveRoleId = currentEmployee.data?.role_id || jobInfo?.role_id

    let canDelete = false
    if (effectiveRoleId) {
      const { data: perm } = await supabase
        .from('role_tab_permissions')
        .select('can_write')
        .eq('role_id', effectiveRoleId)
        .eq('module_code', 'settings')
        .eq('tab_code', 'tenants')
        .single()
      canDelete = perm?.can_write ?? false
    }

    if (!canDelete) {
      return errorResponse('沒有刪除租戶的權限', 403, ErrorCode.FORBIDDEN)
    }

    // 防止刪除自己的 workspace
    if (workspaceId === auth.data.workspaceId) {
      return errorResponse('無法刪除自己所在的工作區', 400, ErrorCode.VALIDATION_ERROR)
    }

    // 確認 workspace 存在
    const { data: workspace, error: wsErr } = await supabase
      .from('workspaces')
      .select('id, name, code')
      .eq('id', workspaceId)
      .single()

    if (wsErr || !workspace) {
      return errorResponse('找不到此租戶', 404, ErrorCode.NOT_FOUND)
    }

    logger.log(`[tenant-delete] 開始刪除租戶 ${workspace.code} (${workspaceId})`)

    // 1. 取得所有員工的 supabase_user_id
    const { data: employees } = await supabase
      .from('employees')
      .select('id, supabase_user_id')
      .eq('workspace_id', workspaceId)

    // 2. 刪除 Supabase Auth 帳號
    if (employees && employees.length > 0) {
      for (const emp of employees) {
        if (emp.supabase_user_id) {
          try {
            await supabase.auth.admin.deleteUser(emp.supabase_user_id)
            logger.log(`[tenant-delete] 刪除 auth user: ${emp.supabase_user_id}`)
          } catch (e) {
            logger.warn(`[tenant-delete] 刪除 auth user 失敗: ${emp.supabase_user_id}`, e)
          }
        }
      }
    }

    // 3. 刪除 Storage 檔案（company-assets bucket 內的 workspace 相關檔案）
    try {
      const { data: files } = await supabase.storage.from('company-assets').list(workspaceId)

      if (files && files.length > 0) {
        const paths = files.map(f => `${workspaceId}/${f.name}`)
        await supabase.storage.from('company-assets').remove(paths)
        logger.log(`[tenant-delete] 刪除 storage 檔案: ${paths.length} 個`)
      }
    } catch (e) {
      logger.warn('[tenant-delete] 刪除 storage 失敗（繼續）', e)
    }

    // 4. 刪除 workspace（資料庫的 CASCADE 會處理關聯資料）
    const { error: deleteErr } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', workspaceId)

    if (deleteErr) {
      logger.error('[tenant-delete] 刪除 workspace 失敗:', deleteErr)
      return errorResponse(`刪除失敗: ${deleteErr.message}`, 500, ErrorCode.OPERATION_FAILED)
    }

    logger.log(`[tenant-delete] 租戶 ${workspace.code} 刪除完成`)

    return successResponse({ deleted: true, workspace: { id: workspaceId, name: workspace.name } })
  } catch (error) {
    logger.error('[tenant-delete] 未預期錯誤:', error)
    return errorResponse('刪除失敗', 500, ErrorCode.INTERNAL_ERROR)
  }
}
