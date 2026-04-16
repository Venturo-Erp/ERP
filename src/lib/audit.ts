import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export'
export type AuditResource =
  | 'employee'
  | 'workspace'
  | 'customer'
  | 'tour'
  | 'order'
  | 'auth'
  | 'tenant'

interface AuditLogEntry {
  workspace_id?: string | null
  employee_id?: string | null
  employee_name?: string | null
  action: AuditAction
  resource_type: AuditResource
  resource_id?: string | null
  resource_name?: string | null
  changes?: Record<string, { old: unknown; new: unknown }> | null
  metadata?: Record<string, unknown> | null
}

/**
 * 寫入 audit log（非阻塞，失敗不影響主流程）
 */
export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = getSupabaseAdminClient()
    await supabase.from('audit_logs').insert(entry)
  } catch (err) {
    // audit log 失敗不應影響主業務流程
    console.warn('[audit] Failed to write audit log:', err)
  }
}
