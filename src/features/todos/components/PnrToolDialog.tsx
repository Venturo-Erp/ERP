'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Copy, Check, Plane } from 'lucide-react'
import { useMembers, useToursSlim } from '@/data'
import type { Todo } from '@/stores/types'
import { cn } from '@/lib/utils'

interface PnrToolDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  todo: Todo
}

const MONTH_AMADEUS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
]

function fmtAmadeusDate(d: string | null | undefined): string {
  if (!d) return ''
  const date = new Date(d)
  if (isNaN(date.getTime())) return ''
  const day = String(date.getDate()).padStart(2, '0')
  return `${day}${MONTH_AMADEUS[date.getMonth()]}${String(date.getFullYear()).slice(-2)}`
}

function getMemberPnrName(m: {
  passport_name?: string | null
  passport_name_print?: string | null
  chinese_name?: string | null
}): string {
  return (m.passport_name_print || m.passport_name || m.chinese_name || '').toUpperCase().trim()
}

type PaxType = 'adt' | 'chd' | 'inf'

function classifyMember(m: {
  age?: number | null
  member_type?: string | null
  identity?: string | null
  birth_date?: string | null
}): PaxType {
  const t = (m.member_type || m.identity || '').toLowerCase()
  if (t.includes('inf') || t.includes('嬰') || t.includes('infant')) return 'inf'
  if (t.includes('chd') || t.includes('童') || t.includes('child')) return 'chd'

  if (m.age != null) {
    if (m.age < 2) return 'inf'
    if (m.age < 12) return 'chd'
    return 'adt'
  }

  if (m.birth_date) {
    const birth = new Date(m.birth_date)
    if (!isNaN(birth.getTime())) {
      const now = new Date()
      const age =
        now.getFullYear() -
        birth.getFullYear() -
        (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0)
      if (age < 2) return 'inf'
      if (age < 12) return 'chd'
    }
  }
  return 'adt'
}

/**
 * PNR 訂位指令工具的內容部分（不含 Dialog 包裝）
 * 供 dialog 跟子任務內嵌兩種模式重用
 */
export function PnrToolContent({ todo }: { todo: Todo }) {
  const { items: allMembers } = useMembers()
  const { items: tours } = useToursSlim()

  const tourRelated = todo.related_items?.find(r => r.type === 'group')
  const orderRelated = todo.related_items?.find(r => r.type === 'order')

  const tour = useMemo(
    () => tours.find(t => t.id === tourRelated?.id),
    [tours, tourRelated]
  )

  const orderMembers = useMemo(
    () => (allMembers || []).filter(m => m.order_id === orderRelated?.id),
    [allMembers, orderRelated]
  )

  const [anDate, setAnDate] = useState<string>('')
  const [anFrom, setAnFrom] = useState<string>('TPE')
  const [anTo, setAnTo] = useState<string>('')

  useEffect(() => {
    if (tour?.departure_date) setAnDate(tour.departure_date)
    if (tour?.airport_code) setAnTo(tour.airport_code.toUpperCase())
  }, [tour?.departure_date, tour?.airport_code])

  const nmCommand = useMemo(() => {
    if (orderMembers.length === 0) return ''
    const adultsAndChildren = orderMembers.filter(m => classifyMember(m) !== 'inf')
    const infants = orderMembers.filter(m => classifyMember(m) === 'inf')

    const lines: string[] = []
    adultsAndChildren.forEach((m, idx) => {
      const type = classifyMember(m)
      const prefix = idx === 0 ? 'NM1' : '1'
      let name = getMemberPnrName(m)
      if (!name) return
      if (type === 'chd' && m.birth_date) {
        name = `${name}(CHD/${fmtAmadeusDate(m.birth_date)})`
      }
      if (idx === 0 && infants.length > 0) {
        const inf = infants[0]
        const infName = getMemberPnrName(inf)
        const infDate = fmtAmadeusDate(inf.birth_date)
        if (infName) name = `${name}(INF${infName}/${infDate})`
      }
      lines.push(`${prefix}${name}`)
    })
    return lines.join('\n')
  }, [orderMembers])

  const anCommand = useMemo(() => {
    if (!anDate || !anFrom || !anTo) return ''
    const date = new Date(anDate)
    if (isNaN(date.getTime())) return ''
    const day = String(date.getDate()).padStart(2, '0')
    return `AN${day}${MONTH_AMADEUS[date.getMonth()]} ${anFrom.toUpperCase()} ${anTo.toUpperCase()}`
  }, [anDate, anFrom, anTo])

  const [copiedNm, setCopiedNm] = useState(false)
  const [copiedAn, setCopiedAn] = useState(false)

  const copy = async (text: string, setter: (v: boolean) => void) => {
    await navigator.clipboard.writeText(text)
    setter(true)
    setTimeout(() => setter(false), 2000)
  }

  return (
    <div className="space-y-4">
      {/* 乘客名單 */}
      <div className="bg-card border border-border rounded-lg p-3">
        <h4 className="text-xs font-medium text-morandi-primary mb-2">
          乘客名單（{orderMembers.length} 人）
          {!orderRelated && (
            <span className="text-xs text-morandi-muted ml-2">— 請先在右側 sidebar 關聯訂單</span>
          )}
        </h4>
        {orderMembers.length === 0 ? (
          <p className="text-xs text-morandi-muted">無乘客資料</p>
        ) : (
          <div className="space-y-1 max-h-[160px] overflow-y-auto">
            {orderMembers.map(m => {
              const type = classifyMember(m)
              return (
                <div key={m.id} className="flex items-center gap-2 text-xs">
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded',
                      type === 'adt'
                        ? 'bg-morandi-container/50 text-morandi-secondary'
                        : type === 'chd'
                          ? 'bg-status-warning/10 text-status-warning'
                          : 'bg-cat-pink/10 text-cat-pink'
                    )}
                  >
                    {type === 'adt' ? '成人' : type === 'chd' ? '兒童' : '嬰兒'}
                  </span>
                  <span className="text-morandi-primary">
                    {getMemberPnrName(m) || m.chinese_name || '(無姓名)'}
                  </span>
                  {m.birth_date && (
                    <span className="text-xs text-morandi-muted">
                      {fmtAmadeusDate(m.birth_date)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* NM 指令 */}
      <div className="bg-card border border-border rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-medium text-morandi-primary">NM 旅客名字指令</h4>
          <Button
            variant="soft-gold"
            size="sm"
            onClick={() => copy(nmCommand, setCopiedNm)}
            disabled={!nmCommand}
            className="h-7 text-xs gap-1"
          >
            {copiedNm ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copiedNm ? '已複製' : '複製'}
          </Button>
        </div>
        <pre className="bg-morandi-container/30 rounded p-3 text-xs font-mono text-morandi-primary whitespace-pre-wrap break-all min-h-[60px]">
          {nmCommand || '（無乘客資料、PNR 名字無法產生）'}
        </pre>
      </div>

      {/* AN 指令 */}
      <div className="bg-card border border-border rounded-lg p-3">
        <h4 className="text-xs font-medium text-morandi-primary mb-2">AN 班機查詢指令</h4>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div>
            <label className="text-xs text-morandi-secondary mb-1 block">出發日期</label>
            <DatePicker value={anDate} onChange={setAnDate} className="h-8 text-xs" />
          </div>
          <div>
            <label className="text-xs text-morandi-secondary mb-1 block">出發機場</label>
            <Input
              value={anFrom}
              onChange={e => setAnFrom(e.target.value.toUpperCase())}
              placeholder="TPE"
              className="h-8 text-xs"
              maxLength={3}
            />
          </div>
          <div>
            <label className="text-xs text-morandi-secondary mb-1 block">抵達機場</label>
            <Input
              value={anTo}
              onChange={e => setAnTo(e.target.value.toUpperCase())}
              placeholder="NRT"
              className="h-8 text-xs"
              maxLength={3}
            />
          </div>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-morandi-secondary">產生指令</span>
          <Button
            variant="soft-gold"
            size="sm"
            onClick={() => copy(anCommand, setCopiedAn)}
            disabled={!anCommand}
            className="h-7 text-xs gap-1"
          >
            {copiedAn ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copiedAn ? '已複製' : '複製'}
          </Button>
        </div>
        <pre className="bg-morandi-container/30 rounded p-3 text-xs font-mono text-morandi-primary min-h-[40px]">
          {anCommand || '（請先填入出發日期、起降機場代碼）'}
        </pre>
      </div>
    </div>
  )
}

/**
 * Dialog 包裝（給 sidebar 業務動作按鈕觸發用）
 */
export function PnrToolDialog({ open, onOpenChange, todo }: PnrToolDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent level={2} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plane className="w-5 h-5 text-morandi-gold" />
            PNR 訂位指令工具
          </DialogTitle>
        </DialogHeader>
        <PnrToolContent todo={todo} />
      </DialogContent>
    </Dialog>
  )
}
