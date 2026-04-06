'use client'
/**
 * 請假管理頁面
 * 整合假別設定、請假申請
 */

import React, { useState, useEffect } from 'react'
import {
  Calendar,
  Settings,
  FileText,
  Plus,
  Check,
  X,
  Trash2,
  Edit2,
  AlertCircle,
} from 'lucide-react'
import { ListPageLayout, type TabItem } from '@/components/layout/list-page-layout'
import { Button } from '@/components/ui/button'
import { TableColumn } from '@/components/ui/enhanced-table'
import { DateCell, ActionCell } from '@/components/table-cells'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DIALOG_SIZES,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { confirm, alert } from '@/lib/ui/alert-dialog'
import { useLeaveTypes, type LeaveType, type LeaveTypeInput } from '../../hooks/useLeaveTypes'
import {
  useLeaveRequests,
  type LeaveRequest,
  type LeaveRequestStatus,
} from '../../hooks/useLeaveRequests'
import { LEAVE_PAGE_LABELS as L } from '@/features/hr/constants/labels'

// 狀態標籤
const STATUS_LABELS: Record<LeaveRequestStatus, string> = {
  pending: L.status_pending,
  approved: L.status_approved,
  rejected: L.status_rejected,
  cancelled: L.status_cancelled,
}

const STATUS_COLORS: Record<LeaveRequestStatus, string> = {
  pending: 'bg-status-warning-bg text-status-warning',
  approved: 'bg-morandi-green/10 text-morandi-green',
  rejected: 'bg-morandi-red/10 text-morandi-red',
  cancelled: 'bg-morandi-container text-morandi-secondary',
}

type TabType = 'requests' | 'types'

export function LeaveManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>('requests')
  const [showTypeDialog, setShowTypeDialog] = useState(false)
  const [editingType, setEditingType] = useState<LeaveType | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectingRequest, setRejectingRequest] = useState<LeaveRequest | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  // Hooks
  const {
    loading: typesLoading,
    leaveTypes,
    fetchLeaveTypes,
    createLeaveType,
    updateLeaveType,
    deleteLeaveType,
    initializeDefaultTypes,
  } = useLeaveTypes()

  const {
    loading: requestsLoading,
    requests,
    fetchRequests,
    approveRequest,
    rejectRequest,
  } = useLeaveRequests()

  // 載入資料
  useEffect(() => {
    fetchLeaveTypes()
    fetchRequests()
  }, [fetchLeaveTypes, fetchRequests])

  // Tab 定義
  const tabs: TabItem[] = [
    { value: 'requests', label: L.tab_requests, icon: FileText },
    { value: 'types', label: L.tab_types, icon: Settings },
  ]

  // 假別類型表格欄位
  const typeColumns: TableColumn<LeaveType>[] = [
    {
      key: 'code',
      label: L.col_code,
      width: '100px',
      render: (_, row) => <span className="font-mono text-morandi-gold">{row.code}</span>,
    },
    {
      key: 'name',
      label: L.col_type_name,
      width: '150px',
      render: (_, row) => <span className="font-medium text-morandi-primary">{row.name}</span>,
    },
    {
      key: 'days_per_year',
      label: L.col_days_per_year,
      width: '100px',
      render: (_, row) => (
        <span className="text-morandi-secondary">
          {row.days_per_year !== null ? `${row.days_per_year} ${L.days_suffix}` : L.days_unlimited}
        </span>
      ),
    },
    {
      key: 'is_paid',
      label: L.col_is_paid,
      width: '80px',
      render: (_, row) => (
        <span
          className={`px-2 py-0.5 rounded text-xs ${
            row.is_paid !== false
              ? 'bg-morandi-green/10 text-morandi-green'
              : 'bg-morandi-red/10 text-morandi-red'
          }`}
        >
          {row.is_paid !== false ? L.yes : L.no}
        </span>
      ),
    },
    {
      key: 'requires_proof',
      label: L.col_requires_proof,
      width: '80px',
      render: (_, row) => (
        <span
          className={`px-2 py-0.5 rounded text-xs ${
            row.requires_proof === true
              ? 'bg-status-warning-bg text-status-warning'
              : 'bg-morandi-container text-morandi-secondary'
          }`}
        >
          {row.requires_proof === true ? L.yes : L.no}
        </span>
      ),
    },
    {
      key: 'is_active',
      label: L.col_is_active,
      width: '80px',
      render: (_, row) => (
        <span
          className={`px-2 py-0.5 rounded text-xs ${
            row.is_active !== false
              ? 'bg-morandi-green/10 text-morandi-green'
              : 'bg-morandi-container text-morandi-secondary'
          }`}
        >
          {row.is_active !== false ? L.active : L.inactive}
        </span>
      ),
    },
  ]

  // 請假申請表格欄位
  const requestColumns: TableColumn<LeaveRequest>[] = [
    {
      key: 'employee_name',
      label: L.col_employee,
      width: '120px',
      render: (_, row) => (
        <span className="font-medium text-morandi-primary">{row.employee_name}</span>
      ),
    },
    {
      key: 'leave_type_name',
      label: L.col_leave_type,
      width: '100px',
      render: (_, row) => <span className="text-morandi-secondary">{row.leave_type_name}</span>,
    },
    {
      key: 'start_date',
      label: L.col_start_date,
      width: '120px',
      render: (_, row) => <DateCell date={row.start_date} />,
    },
    {
      key: 'end_date',
      label: L.col_end_date,
      width: '120px',
      render: (_, row) => <DateCell date={row.end_date} />,
    },
    {
      key: 'days',
      label: L.col_days,
      width: '80px',
      render: (_, row) => (
        <span className="font-mono text-morandi-primary">
          {row.days} {L.days_suffix}
        </span>
      ),
    },
    {
      key: 'status',
      label: L.col_status,
      width: '100px',
      render: (_, row) => (
        <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[row.status]}`}>
          {STATUS_LABELS[row.status]}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: L.col_applied_at,
      width: '120px',
      render: (_, row) => <DateCell date={row.created_at} />,
    },
  ]

  // 初始化預設假別
  const handleInitializeTypes = async () => {
    const confirmed = await confirm(L.confirm_init, {
      title: L.confirm_init_title,
      type: 'info',
    })
    if (!confirmed) return

    const success = await initializeDefaultTypes()
    if (success) {
      await alert(L.toast_initialized, 'success')
    }
  }

  // 刪除假別類型
  const handleDeleteType = async (type: LeaveType) => {
    const confirmed = await confirm(L.confirm_delete_message(type.name), {
      title: L.confirm_delete_title,
      type: 'warning',
    })
    if (!confirmed) return

    const success = await deleteLeaveType(type.id)
    if (success) {
      await alert(L.toast_type_deleted, 'success')
    }
  }

  // 核准請假
  const handleApprove = async (request: LeaveRequest) => {
    const confirmed = await confirm(
      L.confirm_approve_message(
        request.employee_name,
        request.leave_type_name,
        request.start_date,
        request.end_date,
        request.days
      ),
      {
        title: L.confirm_approve_title,
        type: 'info',
      }
    )
    if (!confirmed) return

    const success = await approveRequest(request.id)
    if (success) {
      await alert(L.toast_approved, 'success')
    }
  }

  // 駁回請假
  const handleReject = async () => {
    if (!rejectingRequest) return
    if (!rejectReason.trim()) {
      await alert(L.error_reject_reason, 'error')
      return
    }

    const success = await rejectRequest(rejectingRequest.id, rejectReason)
    if (success) {
      await alert(L.toast_rejected, 'success')
      setRejectDialogOpen(false)
      setRejectingRequest(null)
      setRejectReason('')
    }
  }

  // 類型操作
  const renderTypeActions = (row: LeaveType) => (
    <ActionCell
      actions={[
        {
          icon: Edit2,
          label: L.action_edit,
          onClick: () => {
            setEditingType(row)
            setShowTypeDialog(true)
          },
        },
        {
          icon: Trash2,
          label: L.action_delete,
          onClick: () => handleDeleteType(row),
          variant: 'danger',
        },
      ]}
    />
  )

  // 請假操作
  const renderRequestActions = (row: LeaveRequest) => {
    if (row.status !== 'pending') return null
    return (
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => handleApprove(row)}
          className="gap-1 bg-morandi-green hover:bg-morandi-green/90 text-white"
        >
          <Check size={14} />
          {L.btn_approve}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setRejectingRequest(row)
            setRejectReason('')
            setRejectDialogOpen(true)
          }}
          className="gap-1 text-morandi-red border-morandi-red hover:bg-morandi-red hover:text-white"
        >
          <X size={14} />
          {L.btn_reject}
        </Button>
      </div>
    )
  }

  return (
    <>
      {activeTab === 'requests' ? (
        <ListPageLayout
          title={L.page_title}
          icon={Calendar}
          breadcrumb={[
            { label: L.breadcrumb_hr, href: '/hr' },
            { label: L.breadcrumb_leave, href: '/hr/leave' },
          ]}
          data={requests}
          columns={requestColumns}
          loading={requestsLoading}
          renderActions={renderRequestActions}
          searchable={false}
          statusTabs={tabs}
          activeStatusTab={activeTab}
          onStatusTabChange={tab => setActiveTab(tab as TabType)}
          emptyMessage={L.empty_requests}
        />
      ) : (
        <ListPageLayout
          title={L.page_title}
          icon={Calendar}
          breadcrumb={[
            { label: L.breadcrumb_hr, href: '/hr' },
            { label: L.breadcrumb_leave, href: '/hr/leave' },
          ]}
          data={leaveTypes}
          columns={typeColumns}
          loading={typesLoading}
          renderActions={renderTypeActions}
          searchable={false}
          statusTabs={tabs}
          activeStatusTab={activeTab}
          onStatusTabChange={tab => setActiveTab(tab as TabType)}
          headerActions={
            <Button
              onClick={() => {
                setEditingType(null)
                setShowTypeDialog(true)
              }}
              className="gap-2 bg-morandi-gold hover:bg-morandi-gold-hover text-white"
            >
              <Plus size={16} />
              {L.dialog_title_add}
            </Button>
          }
          beforeTable={
            leaveTypes.length === 0 && !typesLoading ? (
              <div className="bg-morandi-gold/10 border border-morandi-gold/30 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-morandi-gold">
                  <AlertCircle size={16} />
                  <span>{L.init_hint}</span>
                </div>
                <Button
                  onClick={handleInitializeTypes}
                  className="gap-2 bg-morandi-gold hover:bg-morandi-gold-hover text-white"
                >
                  <Plus size={16} />
                  {L.btn_init}
                </Button>
              </div>
            ) : undefined
          }
        />
      )}

      {/* 假別類型編輯 Dialog */}
      <LeaveTypeDialog
        open={showTypeDialog}
        onOpenChange={setShowTypeDialog}
        editingType={editingType}
        onSave={async input => {
          if (editingType) {
            const success = await updateLeaveType(editingType.id, input)
            if (success) {
              setShowTypeDialog(false)
              setEditingType(null)
            }
            return success
          } else {
            const success = await createLeaveType(input)
            if (success) {
              setShowTypeDialog(false)
            }
            return success
          }
        }}
      />

      {/* 駁回原因 Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent level={1} className={DIALOG_SIZES.sm}>
          <DialogHeader>
            <DialogTitle>{L.reject_dialog_title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>{L.reject_label}</Label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-morandi-gold resize-none"
                rows={3}
                placeholder={L.reject_placeholder}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                <X size={16} className="mr-2" />
                {L.btn_cancel}
              </Button>
              <Button
                onClick={handleReject}
                className="bg-morandi-red hover:bg-morandi-red/90 text-white"
              >
                <X size={16} className="mr-2" />
                {L.btn_reject_confirm}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// 假別類型編輯 Dialog
function LeaveTypeDialog({
  open,
  onOpenChange,
  editingType,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingType: LeaveType | null
  onSave: (input: LeaveTypeInput) => Promise<boolean>
}) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [daysPerYear, setDaysPerYear] = useState<string>('')
  const [isPaid, setIsPaid] = useState(true)
  const [requiresProof, setRequiresProof] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editingType) {
      setName(editingType.name)
      setCode(editingType.code)
      setDaysPerYear(editingType.days_per_year?.toString() || '')
      setIsPaid(editingType.is_paid !== false)
      setRequiresProof(editingType.requires_proof === true)
      setIsActive(editingType.is_active !== false)
    } else {
      setName('')
      setCode('')
      setDaysPerYear('')
      setIsPaid(true)
      setRequiresProof(false)
      setIsActive(true)
    }
  }, [editingType, open])

  const handleSave = async () => {
    if (!name.trim() || !code.trim()) {
      await alert(L.error_required, 'error')
      return
    }

    setSaving(true)
    const success = await onSave({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      days_per_year: daysPerYear ? parseFloat(daysPerYear) : null,
      is_paid: isPaid,
      requires_proof: requiresProof,
      is_active: isActive,
    })
    setSaving(false)

    if (success) {
      await alert(editingType ? L.toast_type_updated : L.toast_type_created, 'success')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent level={1} className={DIALOG_SIZES.md}>
        <DialogHeader>
          <DialogTitle>{editingType ? L.dialog_title_edit : L.dialog_title_add}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label required>{L.label_type_name}</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={L.placeholder_type_name}
                className="mt-1"
              />
            </div>
            <div>
              <Label required>{L.label_code}</Label>
              <Input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder={L.placeholder_code}
                className="mt-1 font-mono"
              />
            </div>
          </div>

          <div>
            <Label>{L.label_days_per_year}</Label>
            <Input
              type="number"
              value={daysPerYear}
              onChange={e => setDaysPerYear(e.target.value)}
              placeholder={L.placeholder_days}
              className="mt-1"
              min={0}
              step={0.5}
            />
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPaid}
                onChange={e => setIsPaid(e.target.checked)}
                className="w-4 h-4 rounded border-border text-morandi-gold focus:ring-morandi-gold"
              />
              <span className="text-sm text-morandi-primary">{L.checkbox_paid}</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={requiresProof}
                onChange={e => setRequiresProof(e.target.checked)}
                className="w-4 h-4 rounded border-border text-morandi-gold focus:ring-morandi-gold"
              />
              <span className="text-sm text-morandi-primary">{L.checkbox_proof}</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-border text-morandi-gold focus:ring-morandi-gold"
              />
              <span className="text-sm text-morandi-primary">{L.checkbox_active}</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X size={16} className="mr-2" />
              {L.btn_cancel}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-morandi-gold hover:bg-morandi-gold-hover text-white"
            >
              <Check size={16} className="mr-2" />
              {editingType ? L.btn_update : L.btn_add}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
