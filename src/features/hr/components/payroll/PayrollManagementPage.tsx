'use client'
/**
 * 薪資管理頁面
 */

import React, { useState, useEffect, useRef } from 'react'
import {
  DollarSign,
  Calendar,
  Plus,
  Calculator,
  Check,
  X,
  Eye,
  Printer,
  CreditCard,
  Users,
} from 'lucide-react'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import { Button } from '@/components/ui/button'
import { TableColumn } from '@/components/ui/enhanced-table'
import { CurrencyCell, ActionCell } from '@/components/table-cells'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DIALOG_SIZES,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { confirm, alert } from '@/lib/ui/alert-dialog'
import {
  usePayroll,
  type PayrollPeriod,
  type PayrollRecord,
  PAYROLL_PERIOD_STATUS_LABELS,
  PAYROLL_PERIOD_STATUS_COLORS,
} from '../../hooks/usePayroll'
import { PAYROLL_PAGE_LABELS as L } from '@/features/hr/constants/labels'

export function PayrollManagementPage() {
  const {
    loading,
    periods,
    records,
    fetchPeriods,
    createPeriod,
    fetchRecords,
    calculatePayroll,
    confirmPeriod,
    markAsPaid,
    calculateSummary,
  } = usePayroll()

  // 年度篩選
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)

  // 選中的期間
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null)

  // Dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showRecordsDialog, setShowRecordsDialog] = useState(false)
  const [showPayslipDialog, setShowPayslipDialog] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null)

  // 建立表單
  const [formYear, setFormYear] = useState(currentYear)
  const [formMonth, setFormMonth] = useState(new Date().getMonth() + 1)

  // 載入期間
  useEffect(() => {
    fetchPeriods(selectedYear)
  }, [fetchPeriods, selectedYear])

  // 期間表格欄位
  const periodColumns: TableColumn<PayrollPeriod>[] = [
    {
      key: 'period',
      label: L.col_period,
      width: '150px',
      render: (_, row) => (
        <span className="font-medium text-morandi-primary">
          {row.year}
          {L.year_suffix}
          {row.month}
          {L.month_suffix}
        </span>
      ),
    },
    {
      key: 'date_range',
      label: L.col_date_range,
      width: '200px',
      render: (_, row) => (
        <span className="text-morandi-secondary">
          {row.start_date} ~ {row.end_date}
        </span>
      ),
    },
    {
      key: 'status',
      label: L.col_status,
      width: '100px',
      render: (_, row) => (
        <span className={`px-2 py-0.5 rounded text-xs ${PAYROLL_PERIOD_STATUS_COLORS[row.status]}`}>
          {PAYROLL_PERIOD_STATUS_LABELS[row.status]}
        </span>
      ),
    },
    {
      key: 'confirmed_at',
      label: L.col_confirmed_at,
      width: '150px',
      render: (_, row) => (
        <span className="text-sm text-morandi-secondary">
          {row.confirmed_at ? new Date(row.confirmed_at).toLocaleString('zh-TW') : '-'}
        </span>
      ),
    },
  ]

  // 薪資紀錄表格欄位
  const recordColumns: TableColumn<PayrollRecord>[] = [
    {
      key: 'employee_name',
      label: L.col_employee,
      width: '120px',
      render: (_, row) => (
        <span className="font-medium text-morandi-primary">{row.employee_name}</span>
      ),
    },
    {
      key: 'base_salary',
      label: L.col_base_salary,
      width: '100px',
      render: (_, row) => <CurrencyCell amount={row.base_salary} />,
    },
    {
      key: 'overtime_pay',
      label: L.col_overtime_pay,
      width: '100px',
      render: (_, row) => <CurrencyCell amount={row.overtime_pay} />,
    },
    {
      key: 'bonus',
      label: L.col_bonus,
      width: '100px',
      render: (_, row) => <CurrencyCell amount={row.bonus} />,
    },
    {
      key: 'deductions',
      label: L.col_deductions_label,
      width: '100px',
      render: (_, row) => (
        <span className="text-morandi-red">
          -{(row.unpaid_leave_deduction + row.other_deductions).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'gross_salary',
      label: L.col_gross,
      width: '120px',
      render: (_, row) => <CurrencyCell amount={row.gross_salary} />,
    },
    {
      key: 'net_salary',
      label: L.col_net,
      width: '120px',
      render: (_, row) => <CurrencyCell amount={row.net_salary} variant="income" />,
    },
  ]

  // 處理函式
  const handleCreate = async () => {
    const period = await createPeriod(formYear, formMonth)
    if (period) {
      await alert(L.toast_period_created, 'success')
      setShowCreateDialog(false)
    }
  }

  const handleViewRecords = async (period: PayrollPeriod) => {
    setSelectedPeriod(period)
    await fetchRecords(period.id)
    setShowRecordsDialog(true)
  }

  const handleCalculate = async (period: PayrollPeriod) => {
    const confirmed = await confirm(L.confirm_calculate_message(period.year, period.month), {
      title: L.confirm_calculate_title,
      type: 'warning',
    })
    if (!confirmed) return

    const success = await calculatePayroll(period.id)
    if (success) {
      await alert(L.toast_calculated, 'success')
      await handleViewRecords(period)
    }
  }

  const handleConfirm = async (period: PayrollPeriod) => {
    const confirmed = await confirm(L.confirm_confirm_message(period.year, period.month), {
      title: L.confirm_confirm_title,
      type: 'warning',
    })
    if (!confirmed) return

    const success = await confirmPeriod(period.id)
    if (success) {
      await alert(L.toast_confirmed, 'success')
    }
  }

  const handleMarkPaid = async (period: PayrollPeriod) => {
    const confirmed = await confirm(L.confirm_paid_message(period.year, period.month), {
      title: L.confirm_paid_title,
      type: 'info',
    })
    if (!confirmed) return

    const success = await markAsPaid(period.id)
    if (success) {
      await alert(L.toast_paid, 'success')
    }
  }

  const handlePrintPayslip = (record: PayrollRecord) => {
    setSelectedRecord(record)
    setShowPayslipDialog(true)
  }

  // 統計
  const summary = calculateSummary(records)

  // 期間操作按鈕
  const renderPeriodActions = (row: PayrollPeriod) => (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleViewRecords(row)}
        className="gap-1"
      >
        <Eye size={14} />
        {L.btn_view}
      </Button>
      {row.status === 'draft' && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleCalculate(row)}
          className="gap-1"
        >
          <Calculator size={14} />
          {L.btn_calculate}
        </Button>
      )}
      {row.status === 'draft' && (
        <Button
          size="sm"
          onClick={() => handleConfirm(row)}
          className="gap-1 bg-morandi-gold hover:bg-morandi-gold-hover text-white"
        >
          <Check size={14} />
          {L.btn_confirm}
        </Button>
      )}
      {row.status === 'confirmed' && (
        <Button
          size="sm"
          onClick={() => handleMarkPaid(row)}
          className="gap-1 bg-morandi-green hover:opacity-80 text-white"
        >
          <CreditCard size={14} />
          {L.btn_mark_paid}
        </Button>
      )}
    </div>
  )

  // 薪資紀錄操作
  const renderRecordActions = (row: PayrollRecord) => (
    <ActionCell
      actions={[
        {
          icon: Printer,
          label: L.action_payslip,
          onClick: () => handlePrintPayslip(row),
        },
      ]}
    />
  )

  return (
    <>
      <ListPageLayout
        title={L.page_title}
        icon={DollarSign}
        breadcrumb={[
          { label: L.breadcrumb_hr, href: '/hr' },
          { label: L.breadcrumb_payroll, href: '/hr/payroll' },
        ]}
        data={periods}
        columns={periodColumns}
        loading={loading}
        renderActions={renderPeriodActions}
        searchable={false}
        headerActions={
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="gap-2 bg-morandi-gold hover:bg-morandi-gold-hover text-white"
          >
            <Plus size={16} />
            {L.btn_create}
          </Button>
        }
        beforeTable={
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-morandi-secondary" />
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-morandi-gold"
              >
                {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map(year => (
                  <option key={year} value={year}>
                    {year} {L.year_suffix}
                  </option>
                ))}
              </select>
            </div>
          </div>
        }
        emptyMessage={L.empty_message}
      />

      {/* 建立期間 Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent level={1} className={DIALOG_SIZES.sm}>
          <DialogHeader>
            <DialogTitle>{L.dialog_create_title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label required>{L.label_year}</Label>
                <select
                  value={formYear}
                  onChange={e => setFormYear(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-morandi-gold"
                >
                  {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label required>{L.label_month}</Label>
                <select
                  value={formMonth}
                  onChange={e => setFormMonth(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-morandi-gold"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <option key={month} value={month}>
                      {month} {L.month_suffix}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                <X size={16} className="mr-2" />
                {L.btn_cancel}
              </Button>
              <Button
                onClick={handleCreate}
                disabled={loading}
                className="bg-morandi-gold hover:bg-morandi-gold-hover text-white"
              >
                <Plus size={16} className="mr-2" />
                {L.btn_create}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 薪資紀錄 Dialog */}
      <Dialog open={showRecordsDialog} onOpenChange={setShowRecordsDialog}>
        <DialogContent level={1} className={DIALOG_SIZES['2xl']}>
          <DialogHeader>
            <DialogTitle>
              {selectedPeriod
                ? L.records_dialog_title(selectedPeriod.year, selectedPeriod.month)
                : L.records_dialog_title_default}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {/* 統計區 */}
            <div className="grid grid-cols-5 gap-4 mb-4 p-4 bg-morandi-container/30 rounded-lg">
              <div className="text-center">
                <div className="text-sm text-morandi-secondary">{L.summary_employees}</div>
                <div className="text-xl font-bold text-morandi-primary flex items-center justify-center gap-1">
                  <Users size={16} />
                  {summary.totalEmployees}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-morandi-secondary">{L.summary_gross}</div>
                <div className="text-xl font-bold text-morandi-primary">
                  {summary.totalGrossSalary.toLocaleString()}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-morandi-secondary">{L.summary_net}</div>
                <div className="text-xl font-bold text-morandi-green">
                  {summary.totalNetSalary.toLocaleString()}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-morandi-secondary">{L.summary_overtime}</div>
                <div className="text-xl font-bold text-morandi-gold">
                  {summary.totalOvertimePay.toLocaleString()}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-morandi-secondary">{L.summary_deductions}</div>
                <div className="text-xl font-bold text-morandi-red">
                  {summary.totalDeductions.toLocaleString()}
                </div>
              </div>
            </div>

            {/* 表格 */}
            <div className="max-h-[400px] overflow-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-morandi-container/50 sticky top-0">
                  <tr>
                    {recordColumns.map(col => (
                      <th key={col.key} className="px-4 py-3 text-left font-medium text-morandi-primary" style={{ width: col.width }}>
                        {col.label}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left font-medium text-morandi-primary w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {records.map(record => (
                    <tr key={record.id} className="hover:bg-morandi-container/20">
                      {recordColumns.map(col => (
                        <td key={col.key} className="px-4 py-3">
                          {col.render ? col.render(undefined, record) : '-'}
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        {renderRecordActions(record)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {records.length === 0 && !loading && (
                <div className="text-center py-8 text-morandi-secondary">{L.empty_records}</div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 薪資單 Dialog */}
      <Dialog open={showPayslipDialog} onOpenChange={setShowPayslipDialog}>
        <DialogContent level={1} className={DIALOG_SIZES.md}>
          <DialogHeader>
            <DialogTitle>{L.payslip_title}</DialogTitle>
          </DialogHeader>
          {selectedRecord && selectedPeriod && (
            <PayslipContent record={selectedRecord} period={selectedPeriod} />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// 薪資單內容組件
function PayslipContent({ record, period }: { record: PayrollRecord; period: PayrollPeriod }) {
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    if (printRef.current) {
      const printContent = printRef.current.innerHTML
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${L.payslip_print_title(record.employee_name)}</title>
            <style>
              body { font-family: 'Microsoft JhengHei', sans-serif; padding: 20px; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f5f5f5; }
              .header { text-align: center; margin-bottom: 20px; }
              .total { font-weight: bold; background-color: #fdf6e9; }
              .amount { text-align: right; }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  return (
    <div className="py-4">
      <div ref={printRef}>
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold">{L.payslip_title}</h2>
          <p className="text-morandi-secondary">
            {period.year}
            {L.year_suffix}
            {period.month}
            {L.month_suffix}
          </p>
        </div>

        <div className="mb-4 p-3 bg-morandi-container/30 rounded-lg">
          <p>
            <strong>{L.payslip_employee_name}</strong>
            {record.employee_name}
          </p>
          <p>
            <strong>{L.payslip_period}</strong>
            {period.start_date} ~ {period.end_date}
          </p>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-morandi-container/40">
              <th className="border border-border p-2 text-left">{L.payslip_col_item}</th>
              <th className="border border-border p-2 text-right w-32">{L.payslip_col_amount}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-border p-2">{L.payslip_base_salary}</td>
              <td className="border border-border p-2 text-right">
                {record.base_salary.toLocaleString()}
              </td>
            </tr>
            <tr>
              <td className="border border-border p-2">
                {L.payslip_overtime(record.overtime_hours.toFixed(1))}
              </td>
              <td className="border border-border p-2 text-right">
                {record.overtime_pay.toLocaleString()}
              </td>
            </tr>
            <tr>
              <td className="border border-border p-2">{L.payslip_bonus}</td>
              <td className="border border-border p-2 text-right">
                {record.bonus.toLocaleString()}
              </td>
            </tr>
            <tr>
              <td className="border border-border p-2">{L.payslip_allowances}</td>
              <td className="border border-border p-2 text-right">
                {record.allowances.toLocaleString()}
              </td>
            </tr>
            <tr>
              <td className="border border-border p-2">{L.payslip_other_additions}</td>
              <td className="border border-border p-2 text-right">
                {record.other_additions.toLocaleString()}
              </td>
            </tr>
            <tr className="bg-morandi-container/20">
              <td className="border border-border p-2 font-medium">{L.payslip_gross}</td>
              <td className="border border-border p-2 text-right font-medium">
                {record.gross_salary.toLocaleString()}
              </td>
            </tr>
            <tr>
              <td className="border border-border p-2 text-morandi-red">
                {L.payslip_unpaid_leave(record.unpaid_leave_days)}
              </td>
              <td className="border border-border p-2 text-right text-morandi-red">
                -{record.unpaid_leave_deduction.toLocaleString()}
              </td>
            </tr>
            <tr>
              <td className="border border-border p-2 text-morandi-red">
                {L.payslip_other_deductions}
              </td>
              <td className="border border-border p-2 text-right text-morandi-red">
                -{record.other_deductions.toLocaleString()}
              </td>
            </tr>
            <tr className="bg-morandi-gold/10">
              <td className="border border-border p-2 font-bold text-lg">{L.payslip_net}</td>
              <td className="border border-border p-2 text-right font-bold text-lg text-morandi-green">
                {record.net_salary.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4 text-sm text-morandi-secondary">
          <p>{L.payslip_work_days(record.actual_work_days, record.work_days)}</p>
          <p>{L.payslip_paid_leave(record.paid_leave_days)}</p>
          <p>{L.payslip_unpaid_leave_days(record.unpaid_leave_days)}</p>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
        <Button
          onClick={handlePrint}
          className="gap-2 bg-morandi-gold hover:bg-morandi-gold-hover text-white"
        >
          <Printer size={16} />
          {L.btn_print}
        </Button>
      </div>
    </div>
  )
}
