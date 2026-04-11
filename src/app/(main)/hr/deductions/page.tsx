'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Calculator, Plus, Trash2, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

interface DeductionType {
  id: string
  code: string
  name: string
  calc_method: string
  calc_config: Record<string, unknown>
  is_employer_paid: boolean
  is_active: boolean
  sort_order: number
}

interface AllowanceType {
  id: string
  code: string
  name: string
  default_amount: number
  is_taxable: boolean
  is_active: boolean
}

const CALC_METHOD_LABELS: Record<string, string> = {
  fixed: '固定金額',
  percentage: '費率',
  bracket: '級距表',
}

export default function DeductionsPage() {
  const { user } = useAuthStore()
  const [deductions, setDeductions] = useState<DeductionType[]>([])
  const [allowances, setAllowances] = useState<AllowanceType[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog
  const [showDeductionDialog, setShowDeductionDialog] = useState(false)
  const [showAllowanceDialog, setShowAllowanceDialog] = useState(false)
  const [editingDeduction, setEditingDeduction] = useState<DeductionType | null>(null)
  const [editingAllowance, setEditingAllowance] = useState<AllowanceType | null>(null)

  // 扣款表單
  const [dCode, setDCode] = useState('')
  const [dName, setDName] = useState('')
  const [dMethod, setDMethod] = useState('fixed')
  const [dAmount, setDAmount] = useState(0)
  const [dRate, setDRate] = useState(0)
  const [dEmployerPaid, setDEmployerPaid] = useState(false)
  const [saving, setSaving] = useState(false)

  // 津貼表單
  const [aCode, setACode] = useState('')
  const [aName, setAName] = useState('')
  const [aAmount, setAAmount] = useState(0)
  const [aTaxable, setATaxable] = useState(true)

  const fetchData = useCallback(async () => {
    if (!user?.workspace_id) return
    setLoading(true)
    try {
      const [{ data: d }, { data: a }] = await Promise.all([
        supabase.from('payroll_deduction_types' as never).select('*').eq('workspace_id', user.workspace_id).order('sort_order'),
        supabase.from('payroll_allowance_types' as never).select('*').eq('workspace_id', user.workspace_id).order('sort_order'),
      ])
      setDeductions((d || []) as unknown as DeductionType[])
      setAllowances((a || []) as unknown as AllowanceType[])
    } catch (err) {
      logger.error('載入扣款設定失敗:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.workspace_id])

  useEffect(() => { fetchData() }, [fetchData])

  // 初始化台灣預設扣款
  const initDefaults = async () => {
    if (!user?.workspace_id) return
    const defaults = [
      { code: 'labor_insurance', name: '勞工保險', calc_method: 'percentage', calc_config: { rate: 0.115, employee_share: 0.20 }, sort_order: 1 },
      { code: 'health_insurance', name: '全民健保', calc_method: 'percentage', calc_config: { rate: 0.0517, employee_share: 0.30 }, sort_order: 2 },
      { code: 'pension', name: '勞工退休金', calc_method: 'percentage', calc_config: { rate: 0.06, employee_share: 0 }, is_employer_paid: true, sort_order: 3 },
    ]
    for (const d of defaults) {
      await supabase.from('payroll_deduction_types' as never).upsert({
        workspace_id: user.workspace_id, ...d, is_active: true,
      } as never, { onConflict: 'workspace_id,code' } as never)
    }

    const defaultAllowances = [
      { code: 'meal', name: '伙食津貼', default_amount: 2400, is_taxable: false, sort_order: 1 },
      { code: 'transport', name: '交通津貼', default_amount: 0, is_taxable: true, sort_order: 2 },
    ]
    for (const a of defaultAllowances) {
      await supabase.from('payroll_allowance_types' as never).upsert({
        workspace_id: user.workspace_id, ...a, is_active: true,
      } as never, { onConflict: 'workspace_id,code' } as never)
    }

    toast.success('已載入台灣預設設定（勞保/健保/勞退/伙食津貼）')
    fetchData()
  }

  const handleSaveDeduction = async () => {
    if (!dCode || !dName) { toast.error('請填寫代碼和名稱'); return }
    setSaving(true)
    try {
      const config: Record<string, unknown> = {}
      if (dMethod === 'fixed') config.amount = dAmount
      if (dMethod === 'percentage') config.rate = dRate / 100

      const data = {
        workspace_id: user?.workspace_id,
        code: dCode, name: dName, calc_method: dMethod,
        calc_config: config, is_employer_paid: dEmployerPaid,
        is_active: true, sort_order: deductions.length,
      }

      if (editingDeduction) {
        await supabase.from('payroll_deduction_types' as never).update(data as never).eq('id', editingDeduction.id)
      } else {
        await supabase.from('payroll_deduction_types' as never).insert(data as never)
      }
      toast.success('已儲存')
      setShowDeductionDialog(false)
      fetchData()
    } catch (err) {
      logger.error('儲存扣款失敗:', err)
      toast.error('儲存失敗')
    } finally { setSaving(false) }
  }

  const handleSaveAllowance = async () => {
    if (!aCode || !aName) { toast.error('請填寫代碼和名稱'); return }
    setSaving(true)
    try {
      const data = {
        workspace_id: user?.workspace_id,
        code: aCode, name: aName, default_amount: aAmount,
        is_taxable: aTaxable, is_active: true, sort_order: allowances.length,
      }
      if (editingAllowance) {
        await supabase.from('payroll_allowance_types' as never).update(data as never).eq('id', editingAllowance.id)
      } else {
        await supabase.from('payroll_allowance_types' as never).insert(data as never)
      }
      toast.success('已儲存')
      setShowAllowanceDialog(false)
      fetchData()
    } catch (err) {
      logger.error('儲存津貼失敗:', err)
      toast.error('儲存失敗')
    } finally { setSaving(false) }
  }

  const deleteDeduction = async (id: string) => {
    if (!confirm('確定刪除？')) return
    await supabase.from('payroll_deduction_types' as never).delete().eq('id', id)
    fetchData()
  }

  const deleteAllowance = async (id: string) => {
    if (!confirm('確定刪除？')) return
    await supabase.from('payroll_allowance_types' as never).delete().eq('id', id)
    fetchData()
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-morandi-muted">載入中...</div>

  return (
    <ContentPageLayout
      title="薪資扣款與津貼設定"
      icon={Calculator}
      headerActions={
        deductions.length === 0 ? (
          <Button onClick={initDefaults} className="bg-morandi-gold hover:bg-morandi-gold-hover text-white">
            載入台灣預設設定
          </Button>
        ) : undefined
      }
    >
      <div className="grid md:grid-cols-2 gap-6">
        {/* 扣款類型 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-morandi-primary">扣款項目</h3>
            <Button size="sm" variant="outline" onClick={() => { setEditingDeduction(null); setDCode(''); setDName(''); setDMethod('fixed'); setDAmount(0); setDRate(0); setDEmployerPaid(false); setShowDeductionDialog(true) }}>
              <Plus size={14} className="mr-1" /> 新增
            </Button>
          </div>
          {deductions.length === 0 ? (
            <Card className="rounded-xl border border-dashed border-border p-8 text-center text-morandi-muted text-sm">
              尚未設定扣款項目，點擊上方「載入台灣預設設定」快速開始
            </Card>
          ) : (
            deductions.map(d => (
              <Card key={d.id} className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-morandi-primary">{d.name}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-morandi-container text-morandi-muted font-mono">{d.code}</span>
                      {d.is_employer_paid && <span className="text-[10px] px-1.5 py-0.5 rounded bg-status-info-bg text-status-info">雇主負擔</span>}
                    </div>
                    <p className="text-xs text-morandi-muted mt-0.5">
                      {CALC_METHOD_LABELS[d.calc_method]}
                      {d.calc_method === 'percentage' && d.calc_config?.rate ? ` · ${(Number(d.calc_config.rate) * 100).toFixed(2)}%` : ''}
                      {d.calc_method === 'fixed' && d.calc_config?.amount ? ` · $${d.calc_config.amount}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => {
                      setEditingDeduction(d); setDCode(d.code); setDName(d.name); setDMethod(d.calc_method)
                      setDAmount(Number(d.calc_config?.amount) || 0); setDRate((Number(d.calc_config?.rate) || 0) * 100)
                      setDEmployerPaid(d.is_employer_paid); setShowDeductionDialog(true)
                    }} className="p-1.5 text-morandi-secondary hover:text-morandi-gold rounded"><Edit2 size={14} /></button>
                    <button onClick={() => deleteDeduction(d.id)} className="p-1.5 text-morandi-secondary hover:text-morandi-red rounded"><Trash2 size={14} /></button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* 津貼類型 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-morandi-primary">津貼項目</h3>
            <Button size="sm" variant="outline" onClick={() => { setEditingAllowance(null); setACode(''); setAName(''); setAAmount(0); setATaxable(true); setShowAllowanceDialog(true) }}>
              <Plus size={14} className="mr-1" /> 新增
            </Button>
          </div>
          {allowances.length === 0 ? (
            <Card className="rounded-xl border border-dashed border-border p-8 text-center text-morandi-muted text-sm">
              尚未設定津貼項目
            </Card>
          ) : (
            allowances.map(a => (
              <Card key={a.id} className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-morandi-primary">{a.name}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-morandi-container text-morandi-muted font-mono">{a.code}</span>
                      {!a.is_taxable && <span className="text-[10px] px-1.5 py-0.5 rounded bg-morandi-green/10 text-morandi-green">免稅</span>}
                    </div>
                    <p className="text-xs text-morandi-muted mt-0.5">預設金額 ${a.default_amount.toLocaleString()}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => {
                      setEditingAllowance(a); setACode(a.code); setAName(a.name); setAAmount(a.default_amount); setATaxable(a.is_taxable); setShowAllowanceDialog(true)
                    }} className="p-1.5 text-morandi-secondary hover:text-morandi-gold rounded"><Edit2 size={14} /></button>
                    <button onClick={() => deleteAllowance(a.id)} className="p-1.5 text-morandi-secondary hover:text-morandi-red rounded"><Trash2 size={14} /></button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* 扣款 Dialog */}
      <Dialog open={showDeductionDialog} onOpenChange={setShowDeductionDialog}>
        <DialogContent level={1} className="max-w-md">
          <DialogHeader><DialogTitle>{editingDeduction ? '編輯扣款項目' : '新增扣款項目'}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>代碼</Label><Input value={dCode} onChange={e => setDCode(e.target.value)} placeholder="labor_insurance" className="mt-1 font-mono text-xs" /></div>
              <div><Label>名稱</Label><Input value={dName} onChange={e => setDName(e.target.value)} placeholder="勞工保險" className="mt-1" /></div>
            </div>
            <div>
              <Label>計算方式</Label>
              <select value={dMethod} onChange={e => setDMethod(e.target.value)} className="mt-1 w-full h-9 rounded-lg border border-border px-3 text-sm">
                <option value="fixed">固定金額</option>
                <option value="percentage">費率</option>
                <option value="bracket">級距表</option>
              </select>
            </div>
            {dMethod === 'fixed' && (
              <div><Label>固定金額</Label><Input type="number" value={dAmount} onChange={e => setDAmount(Number(e.target.value))} className="mt-1" /></div>
            )}
            {dMethod === 'percentage' && (
              <div><Label>費率（%）</Label><Input type="number" step="0.01" value={dRate} onChange={e => setDRate(Number(e.target.value))} className="mt-1" /></div>
            )}
            <div className="flex items-center justify-between">
              <Label>雇主全額負擔</Label>
              <Switch checked={dEmployerPaid} onCheckedChange={setDEmployerPaid} />
            </div>
            <Button onClick={handleSaveDeduction} disabled={saving} className="w-full bg-morandi-gold hover:bg-morandi-gold-hover text-white">
              {saving ? '儲存中...' : '儲存'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 津貼 Dialog */}
      <Dialog open={showAllowanceDialog} onOpenChange={setShowAllowanceDialog}>
        <DialogContent level={1} className="max-w-md">
          <DialogHeader><DialogTitle>{editingAllowance ? '編輯津貼項目' : '新增津貼項目'}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>代碼</Label><Input value={aCode} onChange={e => setACode(e.target.value)} placeholder="meal" className="mt-1 font-mono text-xs" /></div>
              <div><Label>名稱</Label><Input value={aName} onChange={e => setAName(e.target.value)} placeholder="伙食津貼" className="mt-1" /></div>
            </div>
            <div><Label>預設金額</Label><Input type="number" value={aAmount} onChange={e => setAAmount(Number(e.target.value))} className="mt-1" /></div>
            <div className="flex items-center justify-between">
              <Label>需課稅</Label>
              <Switch checked={aTaxable} onCheckedChange={setATaxable} />
            </div>
            <Button onClick={handleSaveAllowance} disabled={saving} className="w-full bg-morandi-gold hover:bg-morandi-gold-hover text-white">
              {saving ? '儲存中...' : '儲存'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ContentPageLayout>
  )
}
