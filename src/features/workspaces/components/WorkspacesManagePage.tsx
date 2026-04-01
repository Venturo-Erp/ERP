'use client'
/**
 * WorkspacesManagePage - 公司管理頁面
 * 僅限 admin 存取
 */

import { useState, useEffect, useCallback } from 'react'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import { StatusCell, ActionCell, DateCell } from '@/components/table-cells'
import { Building2, Edit2, Trash2, UserPlus, Settings } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { confirm, alert } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'
import { AddWorkspaceDialog } from './AddWorkspaceDialog'
import { AddAdminDialog } from './AddAdminDialog'
import { EditWorkspaceDialog } from './EditWorkspaceDialog'
import type { WorkspaceWithDetails } from '../types'
import { WORKSPACE_TYPE_LABELS } from '../types'
import { WORKSPACES_LABELS } from '../constants/labels'

export function WorkspacesManagePage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isAddAdminDialogOpen, setIsAddAdminDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceWithDetails | null>(null)

  // 載入公司列表
  const fetchWorkspaces = useCallback(async () => {
    setIsLoading(true)
    try {
      // 取得所有 workspaces
      const { data: workspacesData, error: wsError } = await supabase
        .from('workspaces')
        .select(
          'id, name, code, type, is_active, description, created_at, updated_at, employee_number_prefix, default_password'
        )
        .order('created_at', { ascending: true })

      if (wsError) throw wsError

      setWorkspaces(workspacesData || [])
    } catch (error) {
      logger.error(WORKSPACES_LABELS.載入公司列表失敗_2, error)
      await alert(WORKSPACES_LABELS.載入公司列表失敗, 'error')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWorkspaces()
  }, [fetchWorkspaces])

  // 刪除公司
  const handleDelete = useCallback(
    async (workspace: WorkspaceWithDetails) => {
      // 檢查是否有員工
      const { count } = await supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspace.id)

      if (count && count > 0) {
        await alert(`無法刪除「${workspace.name}」，此公司還有 ${count} 位員工`, 'error')
        return
      }

      const confirmed = await confirm(`確定要刪除公司「${workspace.name}」嗎？`, {
        title: WORKSPACES_LABELS.刪除公司,
        type: 'warning',
      })
      if (!confirmed) return

      try {
        const { error } = await supabase.from('workspaces').delete().eq('id', workspace.id)

        if (error) throw error

        await alert(WORKSPACES_LABELS.公司已刪除, 'success')
        fetchWorkspaces()
      } catch (error) {
        logger.error(WORKSPACES_LABELS.刪除公司失敗, error)
        await alert(WORKSPACES_LABELS.刪除失敗, 'error')
      }
    },
    [fetchWorkspaces]
  )

  // 新增管理員
  const handleAddAdmin = useCallback((workspace: WorkspaceWithDetails) => {
    setSelectedWorkspace(workspace)
    setIsAddAdminDialogOpen(true)
  }, [])

  // 編輯設定
  const handleEdit = useCallback((workspace: WorkspaceWithDetails) => {
    setSelectedWorkspace(workspace)
    setIsEditDialogOpen(true)
  }, [])

  // 表格欄位
  const columns = [
    {
      key: 'name' as const,
      label: WORKSPACES_LABELS.名稱,
      width: '200',
      render: (_: unknown, row: WorkspaceWithDetails) => (
        <div>
          <div className="font-medium text-morandi-primary">{row.name}</div>
          <div className="text-xs text-morandi-secondary">{row.code}</div>
        </div>
      ),
    },
    {
      key: 'type' as const,
      label: WORKSPACES_LABELS.類型,
      width: '100',
      render: (_: unknown, row: WorkspaceWithDetails) => (
        <span className="text-sm text-morandi-secondary">
          {row.type
            ? WORKSPACE_TYPE_LABELS[row.type as keyof typeof WORKSPACE_TYPE_LABELS] || row.type
            : '-'}
        </span>
      ),
    },
    {
      key: 'settings' as const,
      label: WORKSPACES_LABELS.設定,
      width: '150',
      render: (_: unknown, row: WorkspaceWithDetails) => (
        <div className="text-xs text-morandi-secondary">
          <div>
            {WORKSPACES_LABELS.LABEL_535}
            {row.employee_number_prefix || 'E'}
          </div>
          <div>
            {WORKSPACES_LABELS.LABEL_243}
            {row.default_password || '1234'}
          </div>
        </div>
      ),
    },
    {
      key: 'is_active' as const,
      label: WORKSPACES_LABELS.狀態,
      width: '100',
      render: (_: unknown, row: WorkspaceWithDetails) => (
        <span
          className={`px-2 py-1 rounded-full text-xs ${
            row.is_active
              ? 'bg-status-success-bg text-morandi-green'
              : 'bg-status-error-bg text-morandi-red'
          }`}
        >
          {row.is_active ? WORKSPACES_LABELS.啟用 : WORKSPACES_LABELS.停用}
        </span>
      ),
    },
    {
      key: 'created_at' as const,
      label: WORKSPACES_LABELS.建立時間,
      width: '150',
      render: (_: unknown, row: WorkspaceWithDetails) => (
        <DateCell date={row.created_at} format="short" />
      ),
    },
    {
      key: 'actions' as const,
      label: '',
      width: '120',
      render: (_: unknown, row: WorkspaceWithDetails) => (
        <ActionCell
          actions={[
            {
              icon: Settings,
              label: WORKSPACES_LABELS.設定,
              onClick: () => handleEdit(row),
            },
            {
              icon: UserPlus,
              label: WORKSPACES_LABELS.新增管理員,
              onClick: () => handleAddAdmin(row),
            },
            {
              icon: Trash2,
              label: WORKSPACES_LABELS.刪除,
              onClick: () => handleDelete(row),
              variant: 'danger' as const,
            },
          ]}
        />
      ),
    },
  ]

  return (
    <>
      <ListPageLayout
        title={WORKSPACES_LABELS.公司管理}
        icon={Building2}
        breadcrumb={[
          { label: WORKSPACES_LABELS.首頁, href: '/dashboard' },
          { label: WORKSPACES_LABELS.資料庫管理, href: '/database' },
          { label: WORKSPACES_LABELS.公司管理, href: '/database/workspaces' },
        ]}
        data={workspaces}
        loading={isLoading}
        columns={columns}
        searchFields={['name', 'code']}
        searchPlaceholder={WORKSPACES_LABELS.搜尋公司名稱或代號}
        onAdd={() => setIsAddDialogOpen(true)}
        addLabel={WORKSPACES_LABELS.新增公司}
        emptyMessage={WORKSPACES_LABELS.尚無公司資料}
      />

      {/* 新增公司對話框 */}
      <AddWorkspaceDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={fetchWorkspaces}
      />

      {/* 新增管理員對話框 */}
      <AddAdminDialog
        open={isAddAdminDialogOpen}
        onOpenChange={setIsAddAdminDialogOpen}
        workspace={selectedWorkspace}
        onSuccess={fetchWorkspaces}
      />

      {/* 編輯公司設定對話框 */}
      <EditWorkspaceDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        workspace={selectedWorkspace}
        onSuccess={fetchWorkspaces}
      />
    </>
  )
}
