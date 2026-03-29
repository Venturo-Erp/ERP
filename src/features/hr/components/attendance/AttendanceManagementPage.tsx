'use client'
/**
 * 出勤紀錄管理頁面
 */

import React, { useState, useEffect } from 'react'
import { Clock, Calendar, Plus, Edit2, Trash2, Check, X, Filter } from 'lucide-react'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import { Button } from '@/components/ui/button'
import { TableColumn } from '@/components/ui/enhanced-table'
import { DateCell, ActionCell } from '@/components/table-cells'
import { DatePicker } from '@/components/ui/date-picker'
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
import { formatDate } from '@/lib/utils/format-date'
import {
  useAttendanceRecords,
  type AttendanceRecord,
  type AttendanceStatus,
  ATTENDANCE_STATUS_LABELS,
  ATTENDANCE_STATUS_COLORS,
} from '../../hooks/useAttendanceRecords'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { ATTENDANCE_PAGE_LABELS as L } from '@/features/hr/constants/labels'
import { logger } from '@/lib/utils/logger'

interface Employee {
  id: string
  name: string
}

export function AttendanceManagementPage() {
  const user = useAuthStore(state => state.user)
  const {
    loading,
    records,
    fetchRecords,
    createRecord,
    updateRecord,
    deleteRecord,
    calculateSummary,
  } = useAttendanceRecords()

  // 篩選
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date()
    date.setDate(1)
    return formatDate(date)
  })
  const [endDate, setEndDate] = useState<string>(() => formatDate(new Date()))
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')

  // 員工列表
  const [employees, setEmployees] = useState<Employee[]>([])

  // Dialog
  const [showDialog, setShowDialog] = useState(false)
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null)

  // 表單
  const [formEmployeeId, setFormEmployeeId] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formClockIn, setFormClockIn] = useState('')
  const [formClockOut, setFormClockOut] = useState('')
  const [formStatus, setFormStatus] = useState<AttendanceStatus>('present')
  const [formNotes, setFormNotes] = useState('')

  // 載入員工
  useEffect(() => {
    async function loadEmployees() {
      if (!user?.workspace_id) return

      const { data } = await supabase
        .from('employees')
        .select('id, chinese_name, display_name')
        .eq('workspace_id', user.workspace_id)
        .eq('is_active', true)
        .order('employee_number', { ascending: true })

      if (data) {
        setEmployees(
          data.map(e => ({
            id: e.id,
            name: e.display_name || e.chinese_name || L.unknown_employee,
          }))
        )
      }
    }

    loadEmployees().catch(err => logger.error('[loadEmployees]', err))
  }, [user?.workspace_id])

  // 載入紀錄
  useEffect(() => {
    fetchRecords({
      start_date: startDate,
      end_date: endDate,
      employee_id: selectedEmployeeId || undefined,
    })
  }, [fetchRecords, startDate, endDate, selectedEmployeeId])

  // 計算統計
  const summary = calculateSummary(records, selectedEmployeeId || undefined)

  // 表格欄位
  const columns: TableColumn<AttendanceRecord>[] = [
    {
      key: 'date',
      label: L.col_date,
      width: '120px',
      render: (_, row) => <DateCell date={row.date} />,
    },
    {
      key: 'employee_name',
      label: L.col_employee,
      width: '120px',
      render: (_, row) => (
        <span className="font-medium text-morandi-primary">{row.employee_name}</span>
      ),
    },
    {
      key: 'clock_in',
      label: L.col_clock_in,
      width: '100px',
      render: (_, row) => (
        <span className="font-mono text-morandi-secondary">{row.clock_in || '-'}</span>
      ),
    },
    {
      key: 'clock_out',
      label: L.col_clock_out,
      width: '100px',
      render: (_, row) => (
        <span className="font-mono text-morandi-secondary">{row.clock_out || '-'}</span>
      ),
    },
    {
      key: 'work_hours',
      label: L.col_work_hours,
      width: '80px',
      render: (_, row) => (
        <span className="font-mono text-morandi-primary">
          {row.work_hours !== null ? `${row.work_hours.toFixed(1)} h` : '-'}
        </span>
      ),
    },
    {
      key: 'overtime_hours',
      label: L.col_overtime,
      width: '80px',
      render: (_, row) => (
        <span
          className={`font-mono ${row.overtime_hours && row.overtime_hours > 0 ? 'text-morandi-gold' : 'text-morandi-muted'}`}
        >
          {row.overtime_hours !== null && row.overtime_hours > 0
            ? `${row.overtime_hours.toFixed(1)} h`
            : '-'}
        </span>
      ),
    },
    {
      key: 'status',
      label: L.col_status,
      width: '80px',
      render: (_, row) =>
        row.status ? (
          <span className={`px-2 py-0.5 rounded text-xs ${ATTENDANCE_STATUS_COLORS[row.status]}`}>
            {ATTENDANCE_STATUS_LABELS[row.status]}
          </span>
        ) : (
          <span className="text-morandi-muted">-</span>
        ),
    },
    {
      key: 'notes',
      label: L.col_notes,
      width: '150px',
      render: (_, row) => (
        <span className="text-sm text-morandi-secondary truncate">{row.notes || '-'}</span>
      ),
    },
  ]

  // 開啟新增 Dialog
  const handleAdd = () => {
    setEditingRecord(null)
    setFormEmployeeId('')
    setFormDate(formatDate(new Date()))
    setFormClockIn('')
    setFormClockOut('')
    setFormStatus('present')
    setFormNotes('')
    setShowDialog(true)
  }

  // 開啟編輯 Dialog
  const handleEdit = (record: AttendanceRecord) => {
    setEditingRecord(record)
    setFormEmployeeId(record.employee_id)
    setFormDate(record.date)
    setFormClockIn(record.clock_in || '')
    setFormClockOut(record.clock_out || '')
    setFormStatus(record.status || 'present')
    setFormNotes(record.notes || '')
    setShowDialog(true)
  }

  // 刪除
  const handleDelete = async (record: AttendanceRecord) => {
    const confirmed = await confirm(L.confirm_delete_message(record.employee_name, record.date), {
      title: L.confirm_delete_title,
      type: 'warning',
    })
    if (!confirmed) return

    const success = await deleteRecord(record.id)
    if (success) {
      await alert(L.toast_deleted, 'success')
    }
  }

  // 儲存
  const handleSave = async () => {
    if (!formEmployeeId || !formDate) {
      await alert(L.error_required, 'error')
      return
    }

    const input = {
      employee_id: formEmployeeId,
      date: formDate,
      clock_in: formClockIn || null,
      clock_out: formClockOut || null,
      status: formStatus,
      notes: formNotes || null,
    }

    let success: boolean
    if (editingRecord) {
      success = await updateRecord(editingRecord.id, input)
    } else {
      success = await createRecord(input)
    }

    if (success) {
      await alert(editingRecord ? L.toast_updated : L.toast_created, 'success')
      setShowDialog(false)
    }
  }

  // 操作按鈕
  const renderActions = (row: AttendanceRecord) => (
    <ActionCell
      actions={[
        {
          icon: Edit2,
          label: L.action_edit,
          onClick: () => handleEdit(row),
        },
        {
          icon: Trash2,
          label: L.action_delete,
          onClick: () => handleDelete(row),
          variant: 'danger',
        },
      ]}
    />
  )

  return (
    <>
      <ListPageLayout
        title={L.page_title}
        icon={Clock}
        breadcrumb={[
          { label: L.breadcrumb_hr, href: '/hr' },
          { label: L.breadcrumb_attendance, href: '/hr/attendance' },
        ]}
        data={records}
        columns={columns}
        loading={loading}
        renderActions={renderActions}
        searchable={false}
        headerActions={
          <Button
            onClick={handleAdd}
            className="gap-2 bg-morandi-gold hover:bg-morandi-gold-hover text-white"
          >
            <Plus size={16} />
            {L.btn_add}
          </Button>
        }
        beforeTable={
          <div className="space-y-4">
            {/* 篩選區 */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-morandi-secondary" />
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder={L.placeholder_start_date}
                />
                <span className="text-morandi-secondary">{L.range_separator}</span>
                <DatePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder={L.placeholder_end_date}
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter size={16} className="text-morandi-secondary" />
                <select
                  value={selectedEmployeeId}
                  onChange={e => setSelectedEmployeeId(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-morandi-gold"
                >
                  <option value="">{L.all_employees}</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 統計區 */}
            <div className="grid grid-cols-6 gap-4 p-4 bg-morandi-container/30 rounded-lg">
              <div className="text-center">
                <div className="text-sm text-morandi-secondary">{L.summary_total_days}</div>
                <div className="text-xl font-bold text-morandi-primary">{summary.total_days}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-morandi-secondary">{L.summary_present}</div>
                <div className="text-xl font-bold text-green-600">{summary.present_days}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-morandi-secondary">{L.summary_late}</div>
                <div className="text-xl font-bold text-yellow-600">{summary.late_days}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-morandi-secondary">{L.summary_absent}</div>
                <div className="text-xl font-bold text-red-600">{summary.absent_days}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-morandi-secondary">{L.summary_total_hours}</div>
                <div className="text-xl font-bold text-morandi-primary">
                  {summary.total_work_hours.toFixed(1)} h
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-morandi-secondary">{L.summary_total_overtime}</div>
                <div className="text-xl font-bold text-morandi-gold">
                  {summary.total_overtime_hours.toFixed(1)} h
                </div>
              </div>
            </div>
          </div>
        }
        emptyMessage={L.empty_message}
      />

      {/* 編輯 Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent level={1} className={DIALOG_SIZES.md}>
          <DialogHeader>
            <DialogTitle>{editingRecord ? L.dialog_title_edit : L.dialog_title_add}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label required>{L.label_employee}</Label>
                <select
                  value={formEmployeeId}
                  onChange={e => setFormEmployeeId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-morandi-gold"
                  disabled={!!editingRecord}
                >
                  <option value="">{L.placeholder_employee}</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label required>{L.label_date}</Label>
                <DatePicker
                  value={formDate}
                  onChange={setFormDate}
                  placeholder={L.placeholder_date}
                  className="mt-1 w-full"
                  disabled={!!editingRecord}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{L.label_clock_in}</Label>
                <Input
                  type="time"
                  value={formClockIn}
                  onChange={e => setFormClockIn(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>{L.label_clock_out}</Label>
                <Input
                  type="time"
                  value={formClockOut}
                  onChange={e => setFormClockOut(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>{L.label_status}</Label>
              <select
                value={formStatus}
                onChange={e => setFormStatus(e.target.value as AttendanceStatus)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-morandi-gold"
              >
                {Object.entries(ATTENDANCE_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>{L.label_notes}</Label>
              <Input
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                placeholder={L.placeholder_notes}
                className="mt-1"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                <X size={16} className="mr-2" />
                {L.btn_cancel}
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
                className="bg-morandi-gold hover:bg-morandi-gold-hover text-white"
              >
                <Check size={16} className="mr-2" />
                {editingRecord ? L.btn_update : L.btn_add}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
