'use client'

import React, { forwardRef, useImperativeHandle, useState, useEffect } from 'react'
import { Employee } from '@/stores/types'
import { TrendingUp } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUserStore } from '@/stores/user-store'
import { supabase } from '@/lib/supabase/client'
import { DateCell, CurrencyCell } from '@/components/table-cells'
import { HR_LABELS } from './constants/labels'
import { logger } from '@/lib/utils/logger'

interface SalaryTabProps {
  employee: Employee
  isEditing?: boolean
  setIsEditing?: (editing: boolean) => void
}

export const SalaryTab = forwardRef<{ handleSave: () => void }, SalaryTabProps>(
  ({ employee, isEditing }, ref) => {
    const employeeWithSalary = employee as Employee & { monthly_salary?: number }
    const [monthlySalary, setMonthlySalary] = useState(employeeWithSalary.monthly_salary ?? 30000)
    const [insuredSalary, setInsuredSalary] = useState(0)
    const [healthDependents, setHealthDependents] = useState(0)
    const { update } = useUserStore()

    // 載入 employee_payroll_config
    useEffect(() => {
      const load = async () => {
        try {
          const { data } = await supabase
            .from('employee_payroll_config' as never)
            .select('insured_salary, health_dependents')
            .eq('employee_id', employee.id)
            .single()
          if (data) {
            const config = data as { insured_salary?: number; health_dependents?: number }
            setInsuredSalary(config.insured_salary || 0)
            setHealthDependents(config.health_dependents || 0)
          }
        } catch {}
      }
      load()
    }, [employee.id])

    useImperativeHandle(ref, () => ({
      handleSave: async () => {
        await update(employee.id, { monthly_salary: monthlySalary } as Partial<
          Employee & { monthly_salary: number }
        >)
        // 儲存 payroll config
        try {
          await supabase.from('employee_payroll_config' as never).upsert(
            {
              employee_id: employee.id,
              insured_salary: insuredSalary,
              health_dependents: healthDependents,
              updated_at: new Date().toISOString(),
            } as never,
            { onConflict: 'employee_id' } as never
          )
        } catch (err) {
          logger.error('儲存薪資設定失敗:', err)
        }
      },
    }))

    const allowances = employee.salary_info?.allowances || []
    const totalAllowances = allowances.reduce((sum, allowance) => sum + allowance.amount, 0)
    const baseSalary = employee.salary_info?.base_salary || 0
    const salaryHistory = employee.salary_info?.salary_history || []

    return (
      <div className="space-y-6">
        {/* 月薪設定（主要薪資）*/}
        <div className="bg-morandi-gold/10 rounded-lg p-4 border-2 border-morandi-gold/30">
          <h4 className="font-medium text-morandi-primary mb-3">{HR_LABELS.LABEL_5360}</h4>
          <div className="flex items-center gap-4">
            {isEditing ? (
              <>
                <span className="text-sm text-morandi-secondary">NT$</span>
                <Input
                  type="number"
                  value={monthlySalary}
                  onChange={e => setMonthlySalary(Number(e.target.value))}
                  className="w-48 text-xl font-bold"
                />
              </>
            ) : (
              <CurrencyCell
                amount={monthlySalary}
                className="text-3xl font-bold text-morandi-primary"
              />
            )}
          </div>
          <p className="text-xs text-morandi-secondary mt-2">{HR_LABELS.LABEL_3358}</p>
        </div>

        {/* 投保薪資與眷屬 */}
        <div className="bg-morandi-container/10 rounded-lg p-4">
          <h4 className="font-medium text-morandi-primary mb-3">投保設定</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-morandi-secondary">投保薪資</Label>
              {isEditing ? (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-morandi-secondary">NT$</span>
                  <Input
                    type="number"
                    value={insuredSalary}
                    onChange={e => setInsuredSalary(Number(e.target.value))}
                    className="w-40"
                  />
                </div>
              ) : (
                <CurrencyCell
                  amount={insuredSalary}
                  className="text-lg font-medium text-morandi-primary mt-1"
                />
              )}
              <p className="text-xs text-morandi-muted mt-1">勞健保計算基礎</p>
            </div>
            <div>
              <Label className="text-sm text-morandi-secondary">健保眷屬人數</Label>
              {isEditing ? (
                <Input
                  type="number"
                  min={0}
                  value={healthDependents}
                  onChange={e => setHealthDependents(Number(e.target.value))}
                  className="w-24 mt-1"
                />
              ) : (
                <p className="text-lg font-medium text-morandi-primary mt-1">
                  {healthDependents} 人
                </p>
              )}
              <p className="text-xs text-morandi-muted mt-1">影響健保費用計算</p>
            </div>
          </div>
        </div>

        {/* 目前薪資資訊（舊系統 salary_info）*/}
        {(baseSalary > 0 || allowances.length > 0) && (
          <div className="bg-morandi-container/10 rounded-lg p-4">
            <h4 className="font-medium text-morandi-primary mb-3 text-sm">
              {HR_LABELS.LABEL_6093}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <CurrencyCell
                  amount={baseSalary}
                  className="text-xl font-bold text-morandi-primary"
                />
                <p className="text-xs text-morandi-muted">{HR_LABELS.LABEL_786}</p>
              </div>
              <div className="text-center">
                <CurrencyCell
                  amount={totalAllowances}
                  className="text-xl font-bold text-morandi-gold"
                />
                <p className="text-xs text-morandi-muted">{HR_LABELS.LABEL_295}</p>
              </div>
              <div className="text-center">
                <CurrencyCell
                  amount={baseSalary + totalAllowances}
                  className="text-xl font-bold text-status-success"
                />
                <p className="text-xs text-morandi-muted">{HR_LABELS.TOTAL_2192}</p>
              </div>
            </div>
          </div>
        )}

        {/* 津貼明細 */}
        <div className="bg-morandi-container/10 rounded-lg p-4">
          <h4 className="font-medium text-morandi-primary mb-3">{HR_LABELS.LABEL_4237}</h4>
          {allowances.length > 0 ? (
            <div className="space-y-2">
              {allowances.map((allowance, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center py-2 border-b border-border/30"
                >
                  <span className="text-morandi-primary">{allowance.type}</span>
                  <CurrencyCell amount={allowance.amount} className="font-medium" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-morandi-muted text-sm">{HR_LABELS.LABEL_8719}</p>
          )}
        </div>

        {/* 薪資調整歷史 */}
        <div className="bg-morandi-container/10 rounded-lg p-4">
          <h4 className="font-medium text-morandi-primary mb-3 flex items-center gap-2">
            <TrendingUp size={16} />
            {HR_LABELS.LABEL_4231}
          </h4>
          <div className="space-y-3">
            {salaryHistory.map((record, index: number) => (
              <div
                key={index}
                className="flex justify-between items-center p-3 bg-card rounded border"
              >
                <div>
                  <CurrencyCell
                    amount={record.base_salary}
                    className="font-medium text-morandi-primary"
                  />
                  <p className="text-sm text-morandi-muted">{record.reason}</p>
                </div>
                <div className="text-right">
                  <DateCell
                    date={record.effective_date}
                    showIcon={false}
                    className="text-sm text-morandi-secondary"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }
)
