'use client'

import { LABELS } from './constants/labels'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import { Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWorkspaceChannels } from '@/stores/workspace'
import { useEmployeesSlim } from '@/data'
import type { Workspace } from '@/stores/workspace'
import { TableColumn } from '@/components/ui/enhanced-table'
import { DateCell, ActionCell } from '@/components/table-cells'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { CreateTenantDialog } from './create-tenant-dialog'

type WorkspaceRow = Workspace & { employee_count: number }

const WORKSPACE_TYPE_MAP: Record<string, string> = {
  travel_agency: LABELS.TYPE_TRAVEL_AGENCY,
  transportation: LABELS.TYPE_TRANSPORTATION,
  dmc: LABELS.TYPE_DMC,
  other: LABELS.TYPE_OTHER,
}

export default function TenantsPage() {
  const router = useRouter()
  const { updateWorkspace } = useWorkspaceChannels()
  const { items: employees } = useEmployeesSlim()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [allWorkspaces, setAllWorkspaces] = useState<Workspace[]>([])

  // 用 API 取全部租戶（繞過 RLS，server 端檢查 tenants 權限）
  const loadAllWorkspaces = useCallback(async () => {
    try {
      const res = await fetch('/api/workspaces')
      if (res.ok) {
        const data = await res.json()
        setAllWorkspaces(data)
      } else {
        logger.error('載入租戶列表失敗:', await res.text())
      }
    } catch (err) {
      logger.error('載入租戶列表失敗:', err)
    }
  }, [])

  // 點擊行進入詳情頁
  const handleRowClick = useCallback(
    (workspace: WorkspaceRow) => {
      router.push(`/tenants/${workspace.id}`)
    },
    [router]
  )

  useEffect(() => {
    loadAllWorkspaces()
  }, [])

  const getEmployeeCount = useCallback(
    (workspaceId: string) => {
      return (employees || []).filter(emp => emp.workspace_id === workspaceId).length
    },
    [employees]
  )

  const data: WorkspaceRow[] = useMemo(() => {
    return (allWorkspaces || []).map(ws => ({
      ...ws,
      employee_count: getEmployeeCount(ws.id),
    }))
  }, [allWorkspaces, getEmployeeCount])

  const handleToggleActive = useCallback(
    async (workspace: WorkspaceRow, e?: React.MouseEvent) => {
      if (e) e.stopPropagation()
      try {
        const newStatus = !workspace.is_active
        await updateWorkspace(workspace.id, { is_active: newStatus })
        toast.success(
          newStatus ? LABELS.TOAST_TOGGLE_SUCCESS_ACTIVE : LABELS.TOAST_TOGGLE_SUCCESS_INACTIVE
        )
      } catch (error) {
        logger.error('Failed to toggle workspace status:', error)
        toast.error(LABELS.TOAST_TOGGLE_FAILED)
      }
    },
    [updateWorkspace]
  )

  const columns: TableColumn<WorkspaceRow>[] = useMemo(
    () => [
      {
        key: 'name',
        label: LABELS.COL_NAME,
        sortable: true,
        render: value => <span className="font-medium">{String(value || '')}</span>,
      },
      {
        key: 'code',
        label: LABELS.COL_CODE,
        sortable: true,
        render: value => (
          <span className="font-mono text-sm text-morandi-primary">{String(value || '')}</span>
        ),
      },
      {
        key: 'type',
        label: LABELS.COL_TYPE,
        sortable: true,
        render: value => (
          <span className="text-sm">
            {WORKSPACE_TYPE_MAP[String(value || '')] || LABELS.TYPE_UNKNOWN}
          </span>
        ),
      },
      {
        key: 'employee_count',
        label: LABELS.COL_EMPLOYEE_COUNT,
        sortable: true,
        render: value => (
          <span className="text-sm">
            {String(value || 0)}
            {LABELS.EMPLOYEE_COUNT_SUFFIX}
          </span>
        ),
      },
      {
        key: 'is_active',
        label: LABELS.COL_STATUS,
        sortable: true,
        render: (_value, row: WorkspaceRow) => (
          <span
            className={`px-2 py-1 rounded text-sm font-medium ${
              row.is_active
                ? 'text-morandi-primary bg-morandi-container'
                : 'text-morandi-red bg-morandi-red/10'
            }`}
          >
            {row.is_active ? LABELS.STATUS_ACTIVE : LABELS.STATUS_INACTIVE}
          </span>
        ),
      },
      {
        key: 'created_at',
        label: LABELS.COL_CREATED_AT,
        sortable: true,
        render: (_value, row: WorkspaceRow) => {
          if (!row.created_at) return <span className="text-morandi-muted text-sm">-</span>
          return <DateCell date={row.created_at} />
        },
      },
    ],
    []
  )

  const renderActions = useCallback(
    (workspace: WorkspaceRow) => (
      <ActionCell
        actions={[
          {
            icon: Building2,
            label: workspace.is_active ? LABELS.STATUS_INACTIVE : LABELS.STATUS_ACTIVE,
            onClick: () => handleToggleActive(workspace),
            variant: workspace.is_active ? ('warning' as const) : undefined,
          },
        ]}
      />
    ),
    [handleToggleActive]
  )

  const handleCreateComplete = useCallback(() => {
    setIsCreateOpen(false)
    loadAllWorkspaces()
  }, [loadAllWorkspaces])

  return (
    <>
      <ListPageLayout
        title={LABELS.PAGE_TITLE}
        icon={Building2}
        data={data}
        columns={columns}
        searchFields={['name', 'code'] as (keyof WorkspaceRow)[]}
        searchPlaceholder={LABELS.SEARCH_PLACEHOLDER}
        renderActions={renderActions}
        bordered={true}
        emptyMessage={LABELS.EMPTY_MESSAGE}
        onRowClick={handleRowClick}
        headerActions={
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-morandi-gold hover:bg-morandi-gold-hover text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            {LABELS.ADD_TENANT}
          </Button>
        }
      />

      <CreateTenantDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onComplete={handleCreateComplete}
        existingCodes={(allWorkspaces || []).map(ws => ws.code || '').filter(Boolean)}
      />
    </>
  )
}
