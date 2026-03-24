'use client'

import { LABELS } from './constants/labels'

import { logger } from '@/lib/utils/logger'
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useUserStore, userStoreHelpers } from '@/stores/user-store'
import { useWorkspaceChannels } from '@/stores/workspace'
import {
  usePaymentRequests,
  createPaymentRequest as createPaymentRequestApi,
  createPaymentRequestItem,
  invalidatePaymentRequests,
} from '@/data'
import { Employee } from '@/stores/types'
import { EmployeeExpandedView } from '@/features/hr/components/employee-expanded-view'
import { AddEmployeeForm } from '@/features/hr/components/add-employee'
import {
  SalaryPaymentDialog,
  SalaryPaymentData,
} from '@/features/hr/components/salary-payment-dialog'
import { Users, Edit2, Trash2, UserX, DollarSign, Bot, Copy, Download } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { getRoleConfig, type UserRole } from '@/lib/rbac-config'
import { TableColumn } from '@/components/ui/enhanced-table'
import { DateCell, ActionCell } from '@/components/table-cells'
import { ConfirmDialog } from '@/components/dialog/confirm-dialog'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import { generateCompanyPaymentRequestCode } from '@/stores/utils/code-generator'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'

type EmployeeTab = 'active' | 'terminated' | 'bot'

export default function HRPage() {
  const { items: users, fetchAll, update: updateUser, delete: deleteUser } = useUserStore()
  const { workspaces, loadWorkspaces: fetchWorkspaces } = useWorkspaceChannels()
  const { items: paymentRequests } = usePaymentRequests()
  const currentUser = useAuthStore(state => state.user)
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isSalaryPaymentDialogOpen, setIsSalaryPaymentDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<EmployeeTab>('active')
  const [lineBindingEmployee, setLineBindingEmployee] = useState<Employee | null>(null)
  const { confirm, confirmDialogProps } = useConfirmDialog()

  const isSuperAdmin = useMemo(() => {
    return currentUser?.roles?.includes('super_admin') || currentUser?.roles?.includes('admin')
  }, [currentUser?.roles])

  useEffect(() => {
    fetchAll()
    fetchWorkspaces()
  }, [])

  const filteredEmployees = useMemo(() => {
    return users.filter(emp => {
      const isBot = emp.employee_type === 'bot'
      const isTerminated = emp.status === 'terminated'

      switch (activeTab) {
        case 'active':
          return !isBot && !isTerminated
        case 'terminated':
          return !isBot && isTerminated
        case 'bot':
          return isBot && isSuperAdmin
        default:
          return !isBot && !isTerminated
      }
    })
  }, [users, activeTab, isSuperAdmin])

  const tabOptions = useMemo(() => {
    const baseTabs: { value: EmployeeTab; label: string; count: number }[] = [
      {
        value: 'active',
        label: LABELS.TAB_ACTIVE,
        count: users.filter(e => e.employee_type !== 'bot' && e.status !== 'terminated').length,
      },
      {
        value: 'terminated',
        label: LABELS.TAB_TERMINATED,
        count: users.filter(e => e.employee_type !== 'bot' && e.status === 'terminated').length,
      },
    ]
    if (isSuperAdmin) {
      baseTabs.push({
        value: 'bot',
        label: LABELS.TAB_BOT,
        count: users.filter(e => e.employee_type === 'bot').length,
      })
    }
    return baseTabs
  }, [users, isSuperAdmin])

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
      await updateUser(employee.id, { status: 'terminated' })
      if (expandedEmployee === employee.id) {
        setExpandedEmployee(null)
      }
    } catch (err) {
      toast.error(LABELS.TERMINATE_FAILED)
    }
  }

  const handleDeleteEmployee = async (employee: Employee, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }

    const employeeName = employee.display_name || employee.chinese_name || LABELS.UNNAMED_EMPLOYEE
    const confirmed = await confirm({
      type: 'danger',
      title: LABELS.DELETE_TITLE,
      message: `${LABELS.DELETE_CONFIRM_PREFIX}${employeeName}${LABELS.DELETE_CONFIRM_SUFFIX}`,
      details: [
        LABELS.DELETE_DETAIL_1,
        LABELS.DELETE_DETAIL_2,
        LABELS.DELETE_DETAIL_3,
        '',
        LABELS.DELETE_DETAIL_4,
      ],
      confirmLabel: LABELS.DELETE_CONFIRM_LABEL,
      cancelLabel: LABELS.CANCEL,
    })

    if (!confirmed) {
      return
    }

    try {
      await deleteUser(employee.id)
      if (expandedEmployee === employee.id) {
        setExpandedEmployee(null)
      }
    } catch (err) {
      toast.error(LABELS.DELETE_FAILED)
    }
  }

  const getWorkspaceName = useCallback(
    (workspaceId: string | undefined) => {
      if (!workspaceId) return LABELS.NOT_SET
      const workspace = workspaces.find(w => w.id === workspaceId)
      return workspace ? workspace.name : LABELS.UNKNOWN_OFFICE
    },
    [workspaces]
  )

  const columns: TableColumn<Employee>[] = useMemo(
    () => [
      {
        key: 'employee_number',
        label: LABELS.COL_EMPLOYEE_NUMBER,
        sortable: true,
        render: value => <span className="font-mono text-sm">{String(value || '')}</span>,
      },
      {
        key: 'display_name',
        label: LABELS.COL_NAME,
        sortable: true,
        render: (value, employee: Employee) => (
          <span className="font-medium">
            {String(value || employee.chinese_name || LABELS.UNNAMED_EMPLOYEE)}
          </span>
        ),
      },
      {
        key: 'workspace_id',
        label: LABELS.COL_WORKSPACE,
        sortable: true,
        render: (_value, employee: Employee) => (
          <span className="text-sm font-medium text-morandi-primary">
            {getWorkspaceName(employee.workspace_id)}
          </span>
        ),
      },
      {
        key: 'job_info',
        label: LABELS.COL_POSITION,
        sortable: false,
        render: (_value, employee: Employee) => (
          <span className="text-sm">{employee.job_info?.position || LABELS.NOT_SET}</span>
        ),
      },
      {
        key: 'roles',
        label: LABELS.COL_ROLES,
        sortable: false,
        render: (_value, employee: Employee) => {
          const roles = employee.roles as UserRole[] | undefined
          if (!roles || roles.length === 0) {
            return <span className="text-morandi-muted text-sm">{LABELS.NOT_SET}</span>
          }
          return (
            <div className="flex flex-wrap gap-1">
              {roles.map(role => {
                const config = getRoleConfig(role)
                return (
                  <span
                    key={role}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium border ${config?.color || 'text-morandi-secondary bg-muted border-border'}`}
                  >
                    {config?.label || role}
                  </span>
                )
              })}
            </div>
          )
        },
      },
      {
        key: 'personal_info',
        label: LABELS.COL_CONTACT,
        sortable: false,
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
        render: (_value, employee: Employee) => {
          if (!employee.job_info?.hire_date)
            return <span className="text-morandi-muted text-sm">{LABELS.NOT_SET}</span>
          return <DateCell date={employee.job_info.hire_date} />
        },
      },
      {
        key: 'line_user_id',
        label: 'LINE',
        sortable: false,
        render: (_value, employee: Employee) => {
          const lineUserId = (employee as unknown as { line_user_id?: string }).line_user_id
          if (lineUserId) {
            return (
              <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                ✅ 已綁定
              </span>
            )
          }
          return (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={e => {
                e.stopPropagation()
                setLineBindingEmployee(employee)
              }}
            >
              綁定
            </Button>
          )
        },
      },
    ],
    [getWorkspaceName]
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
                  variant: 'warning' as const,
                },
              ]
            : []),
          {
            icon: Trash2,
            label: LABELS.ACTION_DELETE,
            onClick: () => handleDeleteEmployee(employee),
            variant: 'danger' as const,
          },
        ]}
      />
    ),
    []
  )

  const handleSalaryPaymentSubmit = async (data: SalaryPaymentData) => {
    try {
      const totalAmount = data.employee_salaries.reduce((sum, s) => sum + s.amount, 0)
      const code = generateCompanyPaymentRequestCode('SAL', data.request_date, paymentRequests)

      const newRequest = await createPaymentRequestApi({
        code,
        request_number: code,
        request_date: data.request_date,
        request_type: LABELS.SALARY_REQUEST_TYPE,
        request_category: 'company',
        expense_type: 'SAL',
        amount: totalAmount,
        is_special_billing: data.is_special_billing,
        notes: data.notes || `${data.employee_salaries.length}${LABELS.SALARY_NOTES_SUFFIX}`,
        status: 'pending',
        created_by: currentUser?.id,
        created_by_name: currentUser?.display_name || currentUser?.chinese_name,
      })

      if (newRequest?.id) {
        for (let i = 0; i < data.employee_salaries.length; i++) {
          const salary = data.employee_salaries[i]
          const itemNumber = `${code}-${String.fromCharCode(65 + i)}`

          await createPaymentRequestItem({
            request_id: newRequest.id,
            item_number: itemNumber,
            category: '其他' as const,
            supplier_id: salary.employee_id,
            supplier_name: salary.employee_name,
            description: `${salary.employee_name}${LABELS.SALARY_DESC_SUFFIX}`,
            unit_price: salary.amount,
            quantity: 1,
            subtotal: salary.amount,
            sort_order: i,
          } as Parameters<typeof createPaymentRequestItem>[0])
        }
      }

      await invalidatePaymentRequests()
      toast.success(
        `${LABELS.SALARY_SUCCESS_PREFIX}${data.employee_salaries.length}${LABELS.SALARY_SUCCESS_MID}${totalAmount.toLocaleString()}${LABELS.SALARY_SUCCESS_SUFFIX}`
      )
      logger.log('建立薪資請款成功：', data)
    } catch (error) {
      logger.error('建立薪資請款失敗：', error)
      toast.error(LABELS.SALARY_FAILED)
    }
  }

  return (
    <>
      <ListPageLayout
        title={LABELS.MANAGE_3470}
        icon={Users}
        breadcrumb={[
          { label: LABELS.BREADCRUMB_HOME, href: '/dashboard' },
          { label: LABELS.BREADCRUMB_HR, href: '/hr' },
        ]}
        data={filteredEmployees}
        columns={columns}
        searchFields={['display_name', 'employee_number', 'personal_info'] as (keyof Employee)[]}
        searchPlaceholder={LABELS.SEARCH_PLACEHOLDER}
        onRowClick={handleEmployeeClick}
        renderActions={renderActions}
        bordered={true}
        statusTabs={tabOptions}
        activeStatusTab={activeTab}
        onStatusTabChange={(tab) => setActiveTab(tab as EmployeeTab)}
        defaultSort={{ key: 'employee_number', direction: 'asc' }}
        headerActions={
          <div className="flex gap-3">
            <Button
              onClick={() => setIsSalaryPaymentDialogOpen(true)}
              className="bg-morandi-gold hover:bg-morandi-gold-hover text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              {LABELS.LABEL_5426}
            </Button>
            <Button
              onClick={() => {
                setIsAddDialogOpen(true)
              }}
              className="bg-morandi-gold hover:bg-morandi-gold-hover text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center"
              style={{ pointerEvents: 'auto', position: 'relative', zIndex: 9999 }}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              {LABELS.ADD_EMPLOYEE}
            </Button>
          </div>
        }
      />

      {expandedEmployee && (
        <EmployeeExpandedView
          employee_id={expandedEmployee}
          onClose={() => setExpandedEmployee(null)}
        />
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent level={1} className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{LABELS.ADD_EMPLOYEE}</DialogTitle>
          </DialogHeader>
          <AddEmployeeForm
            onSubmit={() => {
              setIsAddDialogOpen(false)
            }}
            onCancel={() => {
              setIsAddDialogOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>

      <SalaryPaymentDialog
        open={isSalaryPaymentDialogOpen}
        onOpenChange={setIsSalaryPaymentDialogOpen}
        employees={users}
        onSubmit={handleSalaryPaymentSubmit}
      />

      <ConfirmDialog {...confirmDialogProps} />

      {/* LINE 綁定 Dialog */}
      <Dialog open={!!lineBindingEmployee} onOpenChange={() => setLineBindingEmployee(null)}>
        <DialogContent level={1} className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-green-600">📱</span> LINE 綁定
            </DialogTitle>
          </DialogHeader>
          {lineBindingEmployee && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <QRCodeSVG
                  value={`https://line.me/R/oaMessage/@745gftqd?綁定 ${lineBindingEmployee.employee_number || lineBindingEmployee.id.slice(0, 8)}`}
                  size={180}
                  level="M"
                />
              </div>
              <div className="text-center">
                <p className="font-medium text-morandi-primary">
                  {lineBindingEmployee.display_name || lineBindingEmployee.chinese_name || '員工'}
                </p>
                <p className="text-sm text-morandi-secondary mt-1">請掃描 QR Code 完成綁定</p>
              </div>
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    const empCode =
                      lineBindingEmployee.employee_number || lineBindingEmployee.id.slice(0, 8)
                    const url = `https://line.me/R/oaMessage/@745gftqd?綁定 ${empCode}`
                    navigator.clipboard.writeText(url)
                    toast.success('連結已複製')
                  }}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  複製連結
                </Button>
              </div>
              <p className="text-xs text-morandi-muted text-center">
                掃碼後會打開 LINE 對話
                <br />
                自動傳送綁定指令完成綁定
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
