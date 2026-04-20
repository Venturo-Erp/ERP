'use client'

import { LABELS } from './constants/labels'

import { logger } from '@/lib/utils/logger'
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useUserStore, userStoreHelpers } from '@/stores/user-store'
import { Employee } from '@/stores/types'
import { EmployeeForm } from '@/features/hr/components/EmployeeForm'
import { useRouter } from 'next/navigation'
import { HR_ADMIN_TABS } from './components/hr-admin-tabs'
import { Users, Edit2, UserX, Bot, Download } from 'lucide-react'
import type { UserRole } from '@/lib/rbac-config'
import { TableColumn } from '@/components/ui/enhanced-table'
import { DateCell, ActionCell } from '@/components/table-cells'
import { ConfirmDialog } from '@/components/dialog/confirm-dialog'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'

// 職務類型
interface Role {
  id: string
  name: string
  description?: string
}

export default function HRPage() {
  const router = useRouter()
  const { items: users, fetchAll, update: updateUser } = useUserStore()
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const { confirm, confirmDialogProps } = useConfirmDialog()
  const [rolesData, setRolesData] = useState<Role[]>([])

  const isAdmin = useAuthStore(state => state.isAdmin)

  useEffect(() => {
    fetchAll()

    // 載入職務列表
    const loadRoles = async () => {
      try {
        const res = await fetch('/api/permissions/roles')
        if (res.ok) {
          const data = await res.json()
          setRolesData(data)
        }
      } catch (err) {
        logger.error('載入職務失敗:', err)
      }
    }
    loadRoles()
  }, [])

  // 員工列表：只顯示在職的真人（不含 bot、不含已離職）
  const filteredEmployees = useMemo(
    () => users.filter(emp => emp.employee_type !== 'bot' && emp.status !== 'terminated'),
    [users]
  )

  const getStatusLabel = (status: Employee['status']) => {
    const statusMap = {
      active: LABELS.STATUS_ACTIVE,
      probation: LABELS.STATUS_PROBATION,
      leave: LABELS.STATUS_LEAVE,
      terminated: LABELS.STATUS_TERMINATED,
    }
    return statusMap[status]
  }

  const getStatusColor = (status: Employee['status']) => {
    const colorMap = {
      active: 'text-morandi-primary bg-morandi-container',
      probation: 'text-status-warning bg-status-warning-bg',
      leave: 'text-status-info bg-status-info-bg',
      terminated: 'text-morandi-red bg-morandi-red/10',
    }
    return colorMap[status]
  }

  const handleEmployeeClick = (employee: Employee) => {
    setExpandedEmployee(employee.id)
  }

  const handleTerminateEmployee = async (employee: Employee, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }

    const employeeName = employee.display_name || employee.chinese_name || LABELS.UNNAMED_EMPLOYEE
    const confirmed = await confirm({
      type: 'warning',
      title: LABELS.TERMINATE_TITLE,
      message: `${LABELS.TERMINATE_CONFIRM_PREFIX}${employeeName}${LABELS.TERMINATE_CONFIRM_SUFFIX}`,
      details: [LABELS.TERMINATE_DETAIL_1, LABELS.TERMINATE_DETAIL_2, LABELS.TERMINATE_DETAIL_3],
      confirmLabel: LABELS.TERMINATE_CONFIRM_LABEL,
      cancelLabel: LABELS.CANCEL,
    })

    if (!confirmed) {
      return
    }

    try {
      const currentUserId = useAuthStore.getState().user?.id
      await updateUser(employee.id, {
        status: 'terminated',
        terminated_at: new Date().toISOString(),
        terminated_by: currentUserId ?? null,
      })
      if (expandedEmployee === employee.id) {
        setExpandedEmployee(null)
      }
    } catch (err) {
      toast.error(LABELS.TERMINATE_FAILED)
    }
  }

  const columns: TableColumn<Employee>[] = useMemo(
    () => [
      {
        key: 'employee_number',
        label: LABELS.COL_EMPLOYEE_NUMBER,
        sortable: true,
        width: '80px',
        render: value => <span className="font-mono text-sm">{String(value || '')}</span>,
      },
      {
        key: 'display_name',
        label: LABELS.COL_NAME,
        sortable: true,
        width: '100px',
        render: (value, employee: Employee) => (
          <span className="font-medium">
            {String(value || employee.chinese_name || LABELS.UNNAMED_EMPLOYEE)}
          </span>
        ),
      },
      {
        key: 'job_info',
        label: '職務',
        sortable: false,
        width: '100px',
        render: (_value, employee: Employee) => {
          // 從職務列表取得職務名稱
          // role_id 優先讀頂層、fallback nested（2026-04-18 統一過渡期）
          const empRoleId =
            (employee as unknown as { role_id?: string }).role_id || employee.job_info?.role_id
          const role = rolesData.find(r => r.id === empRoleId)
          return (
            <span className={`text-sm ${role ? 'text-morandi-primary' : 'text-morandi-muted'}`}>
              {role?.name || LABELS.NOT_SET}
            </span>
          )
        },
      },
      {
        key: 'personal_info',
        label: LABELS.COL_CONTACT,
        sortable: false,
        width: '200px',
        render: (_value, employee: Employee) => {
          const info = employee.personal_info as {
            phone?: string | string[]
            email?: string
          } | null
          return (
            <div className="text-sm">
              <div>
                {Array.isArray(info?.phone) ? info.phone[0] : info?.phone || LABELS.NOT_PROVIDED}
              </div>
              <div className="text-morandi-muted text-xs truncate max-w-[200px]">
                {info?.email || LABELS.NOT_PROVIDED}
              </div>
            </div>
          )
        },
      },
      {
        key: 'status',
        label: LABELS.COL_STATUS,
        sortable: true,
        width: '70px',
        render: (_value, employee: Employee) => (
          <span
            className={`px-2 py-1 rounded text-sm font-medium ${getStatusColor(employee.status)}`}
          >
            {getStatusLabel(employee.status)}
          </span>
        ),
      },
      {
        key: 'hire_date',
        label: LABELS.COL_HIRE_DATE,
        sortable: true,
        width: '100px',
        render: (_value, employee: Employee) => {
          if (!employee.job_info?.hire_date)
            return <span className="text-morandi-muted text-sm">{LABELS.NOT_SET}</span>
          return <DateCell date={employee.job_info.hire_date} />
        },
      },
    ],
    [rolesData]
  )

  const renderActions = useCallback(
    (employee: Employee) => (
      <ActionCell
        actions={[
          {
            icon: Edit2,
            label: LABELS.ACTION_EDIT,
            onClick: () => setExpandedEmployee(employee.id),
          },
          ...(employee.status !== 'terminated'
            ? [
                {
                  icon: UserX,
                  label: LABELS.ACTION_TERMINATE,
                  onClick: () => handleTerminateEmployee(employee),
                  variant: 'danger' as const,
                },
              ]
            : []),
        ]}
      />
    ),
    []
  )

  return (
    <>
      <ListPageLayout
        title={LABELS.MANAGE_3470}
        icon={Users}
        statusTabs={HR_ADMIN_TABS.employee}
        activeStatusTab="/hr"
        onStatusTabChange={href => router.push(href)}
        data={filteredEmployees}
        columns={columns}
        searchFields={['display_name', 'employee_number', 'personal_info'] as (keyof Employee)[]}
        searchPlaceholder={LABELS.SEARCH_PLACEHOLDER}
        onRowClick={handleEmployeeClick}
        renderActions={renderActions}
        actionsWidth="280px"
        bordered={true}
        defaultSort={{ key: 'employee_number', direction: 'asc' }}
        onAdd={() => setIsAddDialogOpen(true)}
        addLabel={LABELS.ADD_EMPLOYEE}
      />

      {expandedEmployee && (
        <Dialog open={true} onOpenChange={() => setExpandedEmployee(null)}>
          <DialogContent
            level={1}
            className="max-w-6xl h-[90vh] p-0 bg-transparent shadow-none border-none"
          >
            <DialogTitle className="sr-only">編輯員工</DialogTitle>
            <EmployeeForm
              employeeId={expandedEmployee}
              onSubmit={() => {
                setExpandedEmployee(null)
                fetchAll()
              }}
              onCancel={() => setExpandedEmployee(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent
          level={1}
          className="max-w-6xl h-[90vh] p-0 bg-transparent shadow-none border-none"
        >
          <DialogTitle className="sr-only">新增員工</DialogTitle>
          <EmployeeForm
            onSubmit={() => {
              setIsAddDialogOpen(false)
              fetchAll()
            }}
            onCancel={() => {
              setIsAddDialogOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog {...confirmDialogProps} />
    </>
  )
}
