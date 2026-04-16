'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, LogIn, LogOut, Plus, Trash2, Pencil, Download, type LucideIcon } from 'lucide-react'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'

interface AuditLog {
  id: string
  workspace_id: string | null
  employee_id: string | null
  employee_name: string | null
  action: string
  resource_type: string
  resource_id: string | null
  resource_name: string | null
  changes: Record<string, { old: unknown; new: unknown }> | null
  metadata: Record<string, unknown> | null
  created_at: string
}

const ACTION_CONFIG: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  login: { label: '登入', icon: LogIn, color: 'text-green-600' },
  logout: { label: '登出', icon: LogOut, color: 'text-gray-500' },
  create: { label: '建立', icon: Plus, color: 'text-blue-600' },
  update: { label: '修改', icon: Pencil, color: 'text-yellow-600' },
  delete: { label: '刪除', icon: Trash2, color: 'text-red-600' },
  export: { label: '匯出', icon: Download, color: 'text-purple-600' },
}

const RESOURCE_LABELS: Record<string, string> = {
  employee: '員工',
  workspace: '工作區',
  customer: '客戶',
  tour: '旅遊團',
  order: '訂單',
  auth: '認證',
  tenant: '租戶',
}

export default function AuditLogsPage() {
  const workspaceId = useAuthStore(state => state.user?.workspace_id)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!workspaceId) return
    const fetchLogs = async () => {
      setLoading(true)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('audit_logs')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(100)
      setLogs((data as AuditLog[]) || [])
      setLoading(false)
    }
    fetchLogs()
  }, [workspaceId])

  return (
    <ContentPageLayout
      title="操作記錄"
      icon={Shield}
    >
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-morandi-secondary">載入中...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-morandi-secondary">尚無操作記錄</div>
        ) : (
          <div className="divide-y divide-border">
            {logs.map(log => {
              const actionConfig: { label: string; icon: LucideIcon; color: string } = ACTION_CONFIG[log.action] ?? { label: log.action, icon: Shield, color: 'text-gray-500' }
              const Icon = actionConfig.icon
              return (
                <div key={log.id} className="flex items-start gap-4 p-4 hover:bg-morandi-container/5">
                  <div className={`mt-0.5 ${actionConfig.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-morandi-primary">
                        {log.employee_name || '未知使用者'}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {actionConfig.label}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {RESOURCE_LABELS[log.resource_type] || log.resource_type}
                      </Badge>
                      {log.resource_name && (
                        <span className="text-sm text-morandi-secondary">{log.resource_name}</span>
                      )}
                    </div>
                    <p className="text-xs text-morandi-muted mt-1">
                      {format(new Date(log.created_at), 'yyyy/MM/dd HH:mm:ss', { locale: zhTW })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </ContentPageLayout>
  )
}
